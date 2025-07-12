import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowUp, ArrowDown, MessageCircle, Check, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import RichTextEditor from '@/components/editor/RichTextEditor';
import CommentSection from '@/components/comments/CommentSection';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Question {
  id: string;
  title: string;
  description: string;
  votes_count: number;
  answers_count: number;
  views_count: number;
  is_answered: boolean;
  accepted_answer_id: string | null;
  created_at: string;
  user_id: string;
  tags: { name: string; color: string }[];
  profiles: {
    username: string;
    display_name: string;
  };
}

interface Answer {
  id: string;
  content: string;
  votes_count: number;
  is_accepted: boolean;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    display_name: string;
  };
}

export default function QuestionDetail() {
  const { id } = useParams<{ id: string }>();
  const [question, setQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [questionComments, setQuestionComments] = useState<any[]>([]);
  const [answerComments, setAnswerComments] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [answerContent, setAnswerContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      fetchQuestion();
      fetchAnswers();
      fetchComments();
      incrementViewCount();
    }
  }, [id]);

  const fetchQuestion = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from('questions')
      .select(`
        *,
        question_tags (
          tags (name, color)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching question:', error);
      navigate('/');
      return;
    }

    if (data) {
      // Fetch the profile data separately
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, display_name')
        .eq('user_id', data.user_id)
        .single();

      const transformedQuestion = {
        ...data,
        tags: data.question_tags?.map((qt: any) => qt.tags).filter(Boolean) || [],
        profiles: profileData || { username: 'Unknown', display_name: 'Unknown User' }
      };
      setQuestion(transformedQuestion);
    }
  };

  const fetchAnswers = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from('answers')
      .select('*')
      .eq('question_id', id)
      .order('is_accepted', { ascending: false })
      .order('votes_count', { ascending: false });

    if (error) {
      console.error('Error fetching answers:', error);
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      // Fetch profiles for all answers
      const userIds = data.map(answer => answer.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, username, display_name')
        .in('user_id', userIds);

      const transformedAnswers = data.map(answer => {
        const profile = profilesData?.find(p => p.user_id === answer.user_id) || 
          { username: 'Unknown', display_name: 'Unknown User' };
        return {
          ...answer,
          profiles: profile
        };
      });
      setAnswers(transformedAnswers);
    } else {
      setAnswers([]);
    }
    
    setLoading(false);
  };

  const fetchComments = async () => {
    if (!id) return;

    // Fetch question comments
    const { data: qComments } = await supabase
      .from('comments')
      .select(`
        *,
        profiles!comments_user_id_fkey(username, display_name)
      `)
      .eq('question_id', id)
      .order('created_at', { ascending: true });

    if (qComments) {
      // Transform comments with proper profile data
      const transformedQComments = await Promise.all(
        qComments.map(async (comment) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username, display_name')
            .eq('user_id', comment.user_id)
            .single();

          return {
            ...comment,
            profiles: profileData || { username: 'Unknown', display_name: 'Unknown User' }
          };
        })
      );
      setQuestionComments(transformedQComments);
    }

    // Fetch answer comments
    const { data: aComments } = await supabase
      .from('comments')
      .select(`
        *,
        profiles!comments_user_id_fkey(username, display_name)
      `)
      .not('answer_id', 'is', null)
      .order('created_at', { ascending: true });

    if (aComments) {
      // Transform comments with proper profile data
      const transformedAComments = await Promise.all(
        aComments.map(async (comment) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username, display_name')
            .eq('user_id', comment.user_id)
            .single();

          return {
            ...comment,
            profiles: profileData || { username: 'Unknown', display_name: 'Unknown User' }
          };
        })
      );

      // Group by answer_id
      const groupedComments: Record<string, any[]> = {};
      transformedAComments.forEach(comment => {
        if (comment.answer_id) {
          if (!groupedComments[comment.answer_id]) {
            groupedComments[comment.answer_id] = [];
          }
          groupedComments[comment.answer_id].push(comment);
        }
      });
      setAnswerComments(groupedComments);
    }
  };

  const incrementViewCount = async () => {
    if (!id) return;
    
    await supabase
      .from('questions')
      .update({ views_count: question?.views_count ? question.views_count + 1 : 1 })
      .eq('id', id);
  };

  const handleVote = async (targetType: 'question' | 'answer', targetId: string, voteType: number) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to vote",
        variant: "destructive",
      });
      return;
    }

    const table = targetType === 'question' ? 'questions' : 'answers';
    const column = targetType === 'question' ? 'question_id' : 'answer_id';

    // Check if user already voted
    const { data: existingVote } = await supabase
      .from('votes')
      .select('*')
      .eq('user_id', user.id)
      .eq(column, targetId)
      .single();

    if (existingVote) {
      if (existingVote.vote_type === voteType) {
        // Remove vote
        await supabase
          .from('votes')
          .delete()
          .eq('id', existingVote.id);
      } else {
        // Update vote
        await supabase
          .from('votes')
          .update({ vote_type: voteType })
          .eq('id', existingVote.id);
      }
    } else {
      // Create new vote
      await supabase
        .from('votes')
        .insert([{
          user_id: user.id,
          [column]: targetId,
          vote_type: voteType
        }]);
    }

    // Refresh data
    if (targetType === 'question') {
      fetchQuestion();
    } else {
      fetchAnswers();
    }
  };

  const submitAnswer = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to answer",
        variant: "destructive",
      });
      return;
    }

    if (!answerContent.trim()) {
      toast({
        title: "Error",
        description: "Please write an answer",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('answers')
        .insert([{
          question_id: id,
          user_id: user.id,
          content: answerContent
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Answer posted successfully!",
      });

      setAnswerContent('');
      fetchAnswers();
      fetchQuestion(); // Refresh to update answer count
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to post answer",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const acceptAnswer = async (answerId: string) => {
    if (!user || !question || question.user_id !== user.id) {
      toast({
        title: "Error",
        description: "Only the question author can accept answers",
        variant: "destructive",
      });
      return;
    }

    try {
      await supabase
        .from('questions')
        .update({ 
          accepted_answer_id: answerId,
          is_answered: true 
        })
        .eq('id', id);

      await supabase
        .from('answers')
        .update({ is_accepted: true })
        .eq('id', answerId);

      fetchQuestion();
      fetchAnswers();

      toast({
        title: "Success",
        description: "Answer accepted!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to accept answer",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Question not found</h2>
          <Button onClick={() => navigate('/')}>Go back home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Question */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-foreground mb-2">{question.title}</h1>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center">
                    <Eye className="w-4 h-4 mr-1" />
                    {question.views_count} views
                  </span>
                  <span className="flex items-center">
                    <MessageCircle className="w-4 h-4 mr-1" />
                    {question.answers_count} answers
                  </span>
                  <span>
                    Asked {formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
              {question.is_answered && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <Check className="w-3 h-3 mr-1" />
                  Answered
                </Badge>
              )}
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="flex gap-4">
              {/* Vote buttons */}
              <div className="flex flex-col items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleVote('question', question.id, 1)}
                  className="h-8 px-2"
                >
                  <ArrowUp className="w-5 h-5" />
                </Button>
                <span className="text-lg font-medium py-1">{question.votes_count}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleVote('question', question.id, -1)}
                  className="h-8 px-2"
                >
                  <ArrowDown className="w-5 h-5" />
                </Button>
              </div>

              {/* Content */}
              <div className="flex-1">
                <div 
                  className="prose max-w-none mb-4"
                  dangerouslySetInnerHTML={{ __html: question.description }}
                />
                
                {/* Tags */}
                {question.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {question.tags.map((tag, index) => (
                      <Badge 
                        key={index}
                        variant="outline"
                        style={{ 
                          borderColor: tag.color,
                          color: tag.color 
                        }}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Author */}
                <div className="flex items-center space-x-2 text-sm">
                  <Avatar className="w-6 h-6">
                    <AvatarFallback>
                      {question.profiles.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{question.profiles.display_name}</span>
                  <span className="text-muted-foreground">
                    {formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}
                  </span>
                </div>

                {/* Question Comments */}
                <CommentSection
                  questionId={question.id}
                  comments={questionComments}
                  onCommentsUpdate={fetchComments}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Answers */}
        <div className="space-y-4 mb-6">
          <h2 className="text-xl font-semibold">
            {answers.length} {answers.length === 1 ? 'Answer' : 'Answers'}
          </h2>
          
          {answers.map((answer) => (
            <Card key={answer.id} className={answer.is_accepted ? 'ring-2 ring-green-500' : ''}>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  {/* Vote buttons */}
                  <div className="flex flex-col items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVote('answer', answer.id, 1)}
                      className="h-8 px-2"
                    >
                      <ArrowUp className="w-5 h-5" />
                    </Button>
                    <span className="text-lg font-medium py-1">{answer.votes_count}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVote('answer', answer.id, -1)}
                      className="h-8 px-2"
                    >
                      <ArrowDown className="w-5 h-5" />
                    </Button>
                    
                    {answer.is_accepted && (
                      <div className="mt-2">
                        <Check className="w-6 h-6 text-green-600" />
                      </div>
                    )}
                    
                    {user && question.user_id === user.id && !answer.is_accepted && !question.is_answered && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => acceptAnswer(answer.id)}
                        className="mt-2 p-1"
                        title="Accept this answer"
                      >
                        <Check className="w-6 h-6 text-gray-400 hover:text-green-600" />
                      </Button>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div 
                      className="prose max-w-none mb-4"
                      dangerouslySetInnerHTML={{ __html: answer.content }}
                    />
                    
                    {/* Author */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-sm">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback>
                            {answer.profiles.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{answer.profiles.display_name}</span>
                        <span className="text-muted-foreground">
                          answered {formatDistanceToNow(new Date(answer.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      
                      {answer.is_accepted && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Accepted Answer
                        </Badge>
                      )}
                    </div>

                    {/* Answer Comments */}
                    <CommentSection
                      answerId={answer.id}
                      comments={answerComments[answer.id] || []}
                      onCommentsUpdate={fetchComments}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Answer Form */}
        {user ? (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Your Answer</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <RichTextEditor
                  value={answerContent}
                  onChange={setAnswerContent}
                  placeholder="Write your answer here..."
                  className="min-h-48"
                />
                <Button onClick={submitAnswer} disabled={isSubmitting}>
                  {isSubmitting ? 'Posting...' : 'Post Your Answer'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground mb-4">
                You must be logged in to post an answer.
              </p>
              <Button onClick={() => navigate('/auth')}>
                Sign In to Answer
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}