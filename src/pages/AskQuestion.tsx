import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import RichTextEditor from '@/components/editor/RichTextEditor';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Tag {
  id: string;
  name: string;
  color: string;
}

export default function AskQuestion() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchTags();
  }, [user, navigate]);

  const fetchTags = async () => {
    const { data } = await supabase
      .from('tags')
      .select('*')
      .order('name');
    
    if (data) {
      setAvailableTags(data);
    }
  };

  const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      addTag(tagInput.trim());
    }
  };

  const addTag = async (tagName: string) => {
    if (selectedTags.some(tag => tag.name.toLowerCase() === tagName.toLowerCase())) {
      setTagInput('');
      return;
    }

    // Check if tag exists
    let existingTag = availableTags.find(tag => 
      tag.name.toLowerCase() === tagName.toLowerCase()
    );

    if (!existingTag) {
      // Create new tag
      const { data, error } = await supabase
        .from('tags')
        .insert([{ name: tagName }])
        .select()
        .single();

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create tag",
          variant: "destructive",
        });
        return;
      }

      existingTag = data;
      setAvailableTags(prev => [...prev, existingTag!]);
    }

    setSelectedTags(prev => [...prev, existingTag!]);
    setTagInput('');
  };

  const removeTag = (tagToRemove: Tag) => {
    setSelectedTags(prev => prev.filter(tag => tag.id !== tagToRemove.id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to ask a question",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim() || !description.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create question
      const { data: question, error: questionError } = await supabase
        .from('questions')
        .insert([{
          title: title.trim(),
          description: description,
          user_id: user.id
        }])
        .select()
        .single();

      if (questionError) throw questionError;

      // Link tags to question
      if (selectedTags.length > 0) {
        const tagLinks = selectedTags.map(tag => ({
          question_id: question.id,
          tag_id: tag.id
        }));

        const { error: tagError } = await supabase
          .from('question_tags')
          .insert(tagLinks);

        if (tagError) throw tagError;
      }

      toast({
        title: "Success",
        description: "Question posted successfully!",
      });

      navigate(`/questions/${question.id}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to post question",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Ask a Question</CardTitle>
            <p className="text-muted-foreground">
              Be specific and imagine you're asking a question to another person
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="e.g. How to implement authentication in React?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Be specific and clear. This is the first thing people will see.
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>
                  Description <span className="text-destructive">*</span>
                </Label>
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  placeholder="Provide detailed information about your question. Include code examples, error messages, or any relevant context..."
                  className="min-h-64"
                />
                <p className="text-xs text-muted-foreground">
                  Include all the information someone would need to answer your question.
                </p>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <div className="space-y-3">
                  <Input
                    id="tags"
                    placeholder="Add tags (press Enter to add)"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagInput}
                  />
                  
                  {selectedTags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedTags.map((tag) => (
                        <Badge
                          key={tag.id}
                          style={{ 
                            backgroundColor: tag.color,
                            color: 'white'
                          }}
                          className="flex items-center gap-1"
                        >
                          {tag.name}
                          <X
                            className="h-3 w-3 cursor-pointer hover:opacity-70"
                            onClick={() => removeTag(tag)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    Add up to 5 tags to describe what your question is about. Start typing to see suggestions.
                  </p>
                </div>
              </div>

              {/* Submit */}
              <div className="flex gap-4">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Posting...' : 'Post Question'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/')}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}