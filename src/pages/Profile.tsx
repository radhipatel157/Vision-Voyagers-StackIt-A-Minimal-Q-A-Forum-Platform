import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { 
  User, 
  Edit3, 
  Save, 
  X, 
  Trophy, 
  MessageCircle, 
  ThumbsUp, 
  Calendar,
  Mail,
  Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  reputation: number;
  created_at: string;
  updated_at: string;
}

interface Question {
  id: string;
  title: string;
  description: string;
  votes_count: number;
  answers_count: number;
  views_count: number;
  is_answered: boolean;
  created_at: string;
  tags: { name: string; color: string }[];
}

interface Answer {
  id: string;
  content: string;
  votes_count: number;
  is_accepted: boolean;
  created_at: string;
  question_id: string;
  question: {
    title: string;
  };
}

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    username: '',
    display_name: '',
    bio: '',
    avatar_url: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchProfile();
    fetchUserQuestions();
    fetchUserAnswers();
  }, [user, navigate]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    } else if (data) {
      setProfile(data);
      setEditForm({
        username: data.username || '',
        display_name: data.display_name || '',
        bio: data.bio || '',
        avatar_url: data.avatar_url || ''
      });
    }
  };

  const fetchUserQuestions = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('questions')
      .select(`
        *,
        question_tags (
          tags (name, color)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching questions:', error);
    } else if (data) {
      const transformedQuestions = data.map(q => ({
        ...q,
        tags: q.question_tags?.map((qt: any) => qt.tags).filter(Boolean) || []
      }));
      setQuestions(transformedQuestions);
    }
  };

  const fetchUserAnswers = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('answers')
      .select(`
        *,
        questions!inner(title)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching answers:', error);
    } else if (data) {
      const transformedAnswers = data.map(answer => ({
        ...answer,
        question: { title: answer.questions.title }
      }));
      setAnswers(transformedAnswers);
    }
    
    setLoading(false);
  };

  const handleSaveProfile = async () => {
    if (!user || !profile) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: editForm.username,
          display_name: editForm.display_name,
          bio: editForm.bio,
          avatar_url: editForm.avatar_url,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });

      setIsEditing(false);
      fetchProfile();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (profile) {
      setEditForm({
        username: profile.username || '',
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        avatar_url: profile.avatar_url || ''
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

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Profile not found</h2>
          <Button onClick={() => navigate('/')}>Go back home</Button>
        </div>
      </div>
    );
  }

  const totalVotes = questions.reduce((sum, q) => sum + q.votes_count, 0) + 
                    answers.reduce((sum, a) => sum + a.votes_count, 0);
  const acceptedAnswers = answers.filter(a => a.is_accepted).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Profile Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={profile.avatar_url || ''} />
                  <AvatarFallback className="text-2xl">
                    {profile.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-3xl font-bold">{profile.display_name || profile.username}</h1>
                  <p className="text-muted-foreground">@{profile.username}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Joined {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => setIsEditing(!isEditing)}
                variant="outline"
                size="sm"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          </CardHeader>
          
          <CardContent>
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={editForm.username}
                      onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="Enter username"
                    />
                  </div>
                  <div>
                    <Label htmlFor="display_name">Display Name</Label>
                    <Input
                      id="display_name"
                      value={editForm.display_name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, display_name: e.target.value }))}
                      placeholder="Enter display name"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="avatar_url">Avatar URL</Label>
                  <Input
                    id="avatar_url"
                    value={editForm.avatar_url}
                    onChange={(e) => setEditForm(prev => ({ ...prev, avatar_url: e.target.value }))}
                    placeholder="Enter avatar URL"
                  />
                </div>
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={editForm.bio}
                    onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tell us about yourself..."
                    rows={4}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button onClick={handleSaveProfile} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button variant="outline" onClick={handleCancelEdit}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {profile.bio && (
                  <p className="text-muted-foreground mb-4">{profile.bio}</p>
                )}
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span>{user?.email}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{profile.reputation}</p>
                  <p className="text-sm text-muted-foreground">Reputation</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <MessageCircle className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{questions.length}</p>
                  <p className="text-sm text-muted-foreground">Questions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Check className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{answers.length}</p>
                  <p className="text-sm text-muted-foreground">Answers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <ThumbsUp className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{totalVotes}</p>
                  <p className="text-sm text-muted-foreground">Total Votes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Questions and Answers Tabs */}
        <Tabs defaultValue="questions" className="w-full">
          <TabsList>
            <TabsTrigger value="questions">My Questions ({questions.length})</TabsTrigger>
            <TabsTrigger value="answers">My Answers ({answers.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="questions" className="space-y-4">
            {questions.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-muted-foreground mb-4">You haven't asked any questions yet.</p>
                  <Button onClick={() => navigate('/ask')}>Ask Your First Question</Button>
                </CardContent>
              </Card>
            ) : (
              questions.map((question) => (
                <Card key={question.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="pt-6" onClick={() => navigate(`/questions/${question.id}`)}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2">{question.title}</h3>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                          <span>{question.votes_count} votes</span>
                          <span>{question.answers_count} answers</span>
                          <span>{question.views_count} views</span>
                          <span>{formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}</span>
                        </div>
                        {question.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
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
                      </div>
                      {question.is_answered && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          <Check className="w-3 h-3 mr-1" />
                          Answered
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
          
          <TabsContent value="answers" className="space-y-4">
            {answers.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-muted-foreground">You haven't answered any questions yet.</p>
                </CardContent>
              </Card>
            ) : (
              answers.map((answer) => (
                <Card key={answer.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="pt-6" onClick={() => navigate(`/questions/${answer.question_id}`)}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2">{answer.question.title}</h3>
                        <div 
                          className="prose max-w-none text-sm text-muted-foreground mb-3 line-clamp-3"
                          dangerouslySetInnerHTML={{ __html: answer.content }}
                        />
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>{answer.votes_count} votes</span>
                          <span>{formatDistanceToNow(new Date(answer.created_at), { addSuffix: true })}</span>
                        </div>
                      </div>
                      {answer.is_accepted && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          <Check className="w-3 h-3 mr-1" />
                          Accepted
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}