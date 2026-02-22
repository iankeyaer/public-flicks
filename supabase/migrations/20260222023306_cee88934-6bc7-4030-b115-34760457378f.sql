
-- Add foreign key from reviews.user_id to profiles.user_id so we can join them
ALTER TABLE public.reviews
ADD CONSTRAINT reviews_user_id_profiles_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Also add for watch_history and movie_requests
ALTER TABLE public.watch_history
ADD CONSTRAINT watch_history_user_id_profiles_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.movie_requests
ADD CONSTRAINT movie_requests_user_id_profiles_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
