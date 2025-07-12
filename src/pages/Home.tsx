import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, TrendingUp, Clock, MessageCircle } from 'lucide-react';
import QuestionCard from '@/components/questions/QuestionCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Question {
  id: string;
  title: string;
  description: string;
  votes_count: number;
  answers_count: number;
  views_count: number;
  is_answered: boolean;
  created_at: string;
  tags?: { name: string; color: string }[];
  profiles?: {
    username: string;
    display_name: string;
  };
}

export default function Home() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [tags, setTags] = useState<{ name: string; color: string }[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Get search query from URL params
    const urlSearch = searchParams.get('search');
    if (urlSearch) {
      setSearchTerm(urlSearch);
    }
    fetchQuestions();
    fetchTags();
  }, [sortBy, selectedTag, searchParams]);

  useEffect(() => {
    // Re-fetch when search term changes
    const timeoutId = setTimeout(() => {
      fetchQuestions();
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const fetchQuestions = async () => {
    setLoading(true);
    
    let query = supabase
      .from('questions')
      .select(`
        *,
        profiles!questions_user_id_fkey (username, display_name),
        question_tags (
          tags (name, color)
        )
      `);

    // Apply tag filter
    if (selectedTag) {
      query = query.eq('question_tags.tags.name', selectedTag);
    }

    // Apply sorting
    switch (sortBy) {
      case 'votes':
        query = query.order('votes_count', { ascending: false });
        break;
      case 'answers':
        query = query.order('answers_count', { ascending: false });
        break;
      case 'views':
        query = query.order('views_count', { ascending: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching questions:', error);
    } else if (data) {
      // Transform the data to match our interface
      const transformedQuestions = data.map((q: any) => ({
        ...q,
        tags: q.question_tags?.map((qt: any) => qt.tags).filter(Boolean) || [],
        profiles: q.profiles || { username: 'Unknown', display_name: 'Unknown User' }
      }));
      setQuestions(transformedQuestions);
    }
    
    setLoading(false);
  };

  const fetchTags = async () => {
    const { data } = await supabase
      .from('tags')
      .select('name, color')
      .order('name');
    
    if (data) {
      setTags(data);
    }
  };

  const filteredQuestions = questions.filter(question =>
    question.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    question.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">All Questions</h1>
            <p className="text-muted-foreground">
              {questions.length} questions found
            </p>
          </div>
          
          {user && (
            <Button onClick={() => navigate('/ask')} className="mt-4 lg:mt-0">
              <Plus className="mr-2 h-4 w-4" />
              Ask Question
            </Button>
          )}
        </div>

        {/* Filters Section */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search questions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">
                <div className="flex items-center">
                  <Clock className="mr-2 h-4 w-4" />
                  Newest
                </div>
              </SelectItem>
              <SelectItem value="votes">
                <div className="flex items-center">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Most Votes
                </div>
              </SelectItem>
              <SelectItem value="answers">
                <div className="flex items-center">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Most Answers
                </div>
              </SelectItem>
              <SelectItem value="views">Most Views</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tags Filter */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-foreground mb-2">Filter by tags:</h3>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedTag === '' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedTag('')}
            >
              All
            </Badge>
            {tags.map((tag) => (
              <Badge
                key={tag.name}
                variant={selectedTag === tag.name ? 'default' : 'outline'}
                className="cursor-pointer"
                style={{
                  borderColor: tag.color,
                  backgroundColor: selectedTag === tag.name ? tag.color : 'transparent',
                  color: selectedTag === tag.name ? 'white' : tag.color
                }}
                onClick={() => setSelectedTag(tag.name)}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading questions...</p>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No questions found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'Try adjusting your search terms.' : 'Be the first to ask a question!'}
              </p>
              {user && (
                <Button onClick={() => navigate('/ask')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Ask the first question
                </Button>
              )}
            </div>
          ) : (
            filteredQuestions.map((question) => (
              <QuestionCard key={question.id} question={question} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}