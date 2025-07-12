-- Create function to create notifications for question answers
CREATE OR REPLACE FUNCTION public.create_answer_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  question_owner_id uuid;
  question_title text;
BEGIN
  -- Get the question owner and title
  SELECT user_id, title INTO question_owner_id, question_title
  FROM public.questions 
  WHERE id = NEW.question_id;
  
  -- Don't notify if the answer author is the same as question owner
  IF question_owner_id != NEW.user_id THEN
    -- Insert notification for question owner
    INSERT INTO public.notifications (user_id, type, title, message, question_id, answer_id)
    VALUES (
      question_owner_id,
      'answer',
      'New Answer',
      'Someone answered your question: "' || question_title || '"',
      NEW.question_id,
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for answer notifications
CREATE TRIGGER trigger_answer_notification
  AFTER INSERT ON public.answers
  FOR EACH ROW
  EXECUTE FUNCTION public.create_answer_notification();

-- Create function to create notifications for accepted answers
CREATE OR REPLACE FUNCTION public.create_accept_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  answer_author_id uuid;
  question_title text;
BEGIN
  -- Only proceed if accepted_answer_id was set (not null)
  IF NEW.accepted_answer_id IS NOT NULL AND (OLD.accepted_answer_id IS NULL OR OLD.accepted_answer_id != NEW.accepted_answer_id) THEN
    -- Get the answer author
    SELECT user_id INTO answer_author_id
    FROM public.answers 
    WHERE id = NEW.accepted_answer_id;
    
    -- Don't notify if the question owner is the same as answer author
    IF answer_author_id != NEW.user_id THEN
      -- Insert notification for answer author
      INSERT INTO public.notifications (user_id, type, title, message, question_id, answer_id)
      VALUES (
        answer_author_id,
        'accepted',
        'Answer Accepted',
        'Your answer was accepted for: "' || NEW.title || '"',
        NEW.id,
        NEW.accepted_answer_id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for accepted answer notifications
CREATE TRIGGER trigger_accept_notification
  AFTER UPDATE ON public.questions
  FOR EACH ROW
  EXECUTE FUNCTION public.create_accept_notification();

-- Create function to create notifications for votes (optional)
CREATE OR REPLACE FUNCTION public.create_vote_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  content_owner_id uuid;
  content_title text;
  vote_target text;
BEGIN
  -- Only notify for upvotes
  IF NEW.vote_type = 1 THEN
    IF NEW.question_id IS NOT NULL THEN
      -- Get question owner and title
      SELECT user_id, title INTO content_owner_id, content_title
      FROM public.questions 
      WHERE id = NEW.question_id;
      
      vote_target := 'question';
    ELSIF NEW.answer_id IS NOT NULL THEN
      -- Get answer owner and related question title
      SELECT a.user_id, q.title INTO content_owner_id, content_title
      FROM public.answers a
      JOIN public.questions q ON q.id = a.question_id
      WHERE a.id = NEW.answer_id;
      
      vote_target := 'answer';
    END IF;
    
    -- Don't notify if voter is the same as content owner
    IF content_owner_id IS NOT NULL AND content_owner_id != NEW.user_id THEN
      -- Insert notification for content owner
      INSERT INTO public.notifications (user_id, type, title, message, question_id, answer_id)
      VALUES (
        content_owner_id,
        'vote',
        'Upvoted',
        'Someone upvoted your ' || vote_target || ' on: "' || content_title || '"',
        CASE WHEN NEW.question_id IS NOT NULL THEN NEW.question_id ELSE NULL END,
        CASE WHEN NEW.answer_id IS NOT NULL THEN NEW.answer_id ELSE NULL END
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for vote notifications (optional - can be disabled if too noisy)
CREATE TRIGGER trigger_vote_notification
  AFTER INSERT ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION public.create_vote_notification();