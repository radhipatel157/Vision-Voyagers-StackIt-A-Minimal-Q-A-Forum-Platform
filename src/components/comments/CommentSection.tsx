import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageCircle, Reply, Edit, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    display_name: string;
  };
}

interface CommentSectionProps {
  questionId?: string;
  answerId?: string;
  comments: Comment[];
  onCommentsUpdate: () => void;
}

export default function CommentSection({ 
  questionId, 
  answerId, 
  comments, 
  onCommentsUpdate 
}: CommentSectionProps) {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmitComment = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to comment",
        variant: "destructive",
      });
      return;
    }

    if (!newComment.trim()) {
      toast({
        title: "Error",
        description: "Please write a comment",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('comments')
        .insert([{
          content: newComment.trim(),
          user_id: user.id,
          question_id: questionId || null,
          answer_id: answerId || null
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Comment added successfully!",
      });

      setNewComment('');
      setShowCommentForm(false);
      onCommentsUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add comment",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id); // Ensure user can only delete their own comments

      if (error) throw error;

      toast({
        title: "Success",
        description: "Comment deleted successfully!",
      });

      onCommentsUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete comment",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mt-4 space-y-4">
      {/* Comments List */}
      {comments.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
          </h4>
          
          {comments.map((comment) => (
            <div key={comment.id} className="flex space-x-3 p-3 bg-accent/50 rounded-lg">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="text-xs">
                  {comment.profiles.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">
                      {comment.profiles.display_name || comment.profiles.username}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  
                  {user && user.id === comment.user_id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteComment(comment.id)}
                      className="h-6 px-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                
                <p className="text-sm text-foreground mt-1">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Comment Button/Form */}
      {user ? (
        <div className="space-y-3">
          {!showCommentForm ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCommentForm(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Add a comment
            </Button>
          ) : (
            <div className="space-y-3 p-3 bg-accent/30 rounded-lg">
              <Textarea
                placeholder="Write your comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                className="resize-none"
              />
              
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  onClick={handleSubmitComment}
                  disabled={isSubmitting || !newComment.trim()}
                >
                  {isSubmitting ? 'Adding...' : 'Add Comment'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowCommentForm(false);
                    setNewComment('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          <a href="/auth" className="text-primary hover:underline">
            Sign in
          </a>{' '}
          to add a comment
        </p>
      )}
    </div>
  );
}