-- Add mentioned_users column to chat_messages
ALTER TABLE public.chat_messages 
ADD COLUMN mentioned_users JSONB DEFAULT '[]'::JSONB;

-- Create mentions notifications table
CREATE TABLE public.mention_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mentioned_by_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE NOT NULL,
  mentioned_username TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mention_notifications ENABLE ROW LEVEL SECURITY;

-- Mention notifications policies
CREATE POLICY "Users can view own mention notifications" 
ON public.mention_notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own mention notifications" 
ON public.mention_notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Only system can insert mention notifications" 
ON public.mention_notifications 
FOR INSERT 
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_mention_notifications_updated_at
BEFORE UPDATE ON public.mention_notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for mention notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.mention_notifications;
