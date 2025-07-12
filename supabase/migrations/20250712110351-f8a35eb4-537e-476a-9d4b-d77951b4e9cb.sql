-- Create comments table
CREATE TABLE public.comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content text NOT NULL,
  user_id uuid NOT NULL,
  question_id uuid NULL,
  answer_id uuid NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT comments_has_target CHECK (
    (question_id IS NOT NULL AND answer_id IS NULL) OR 
    (question_id IS NULL AND answer_id IS NOT NULL)
  )
);

-- Enable RLS on comments
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for comments
CREATE POLICY "Comments are viewable by everyone" 
ON public.comments 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create comments" 
ON public.comments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" 
ON public.comments 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" 
ON public.comments 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to create notifications for comments
CREATE OR REPLACE FUNCTION public.create_comment_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_owner_id uuid;
  question_title text;
  notification_type text;
BEGIN
  IF NEW.question_id IS NOT NULL THEN
    -- Comment on question
    SELECT user_id, title INTO target_owner_id, question_title
    FROM public.questions 
    WHERE id = NEW.question_id;
    
    notification_type := 'comment_question';
  ELSIF NEW.answer_id IS NOT NULL THEN
    -- Comment on answer
    SELECT a.user_id, q.title INTO target_owner_id, question_title
    FROM public.answers a
    JOIN public.questions q ON q.id = a.question_id
    WHERE a.id = NEW.answer_id;
    
    notification_type := 'comment_answer';
  END IF;
  
  -- Don't notify if the commenter is the same as target owner
  IF target_owner_id IS NOT NULL AND target_owner_id != NEW.user_id THEN
    -- Insert notification for target owner
    INSERT INTO public.notifications (user_id, type, title, message, question_id, answer_id)
    VALUES (
      target_owner_id,
      notification_type,
      'New Comment',
      'Someone commented on your ' || CASE 
        WHEN NEW.question_id IS NOT NULL THEN 'question'
        ELSE 'answer'
      END || ': "' || question_title || '"',
      CASE WHEN NEW.question_id IS NOT NULL THEN NEW.question_id ELSE NULL END,
      CASE WHEN NEW.answer_id IS NOT NULL THEN NEW.answer_id ELSE NULL END
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for comment notifications
CREATE TRIGGER trigger_comment_notification
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.create_comment_notification();