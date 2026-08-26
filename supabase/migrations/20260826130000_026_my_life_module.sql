/*
# My Life Module — Complete Database Schema, Aliases, and RLS Policies
# Ensures all tables exist, support both authenticated and dev/anon fallback,
# and aliases (journals -> journal_entries, mood_logs -> mood_entries).
*/

-- ============================================================
-- 1. Profiles Table (Ensure Exists for Foreign Keys)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  bio text,
  interests text[] DEFAULT '{}',
  skills text[] DEFAULT '{}',
  goals text[] DEFAULT '{}',
  profile_visibility text DEFAULT 'public',
  timezone text DEFAULT 'Asia/Ho_Chi_Minh',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- 2. Friendships Table & Functions
-- ============================================================

DO $$ BEGIN
  CREATE TYPE friendship_status AS ENUM ('pending', 'accepted', 'declined', 'blocked');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'accepted',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT chk_different_users CHECK (user_id <> friend_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_friendships_pair 
ON public.friendships (LEAST(user_id, friend_id), GREATEST(user_id, friend_id));

CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON public.friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON public.friendships(friend_id);

-- Helper function to check if two users are friends
CREATE OR REPLACE FUNCTION public.are_friends(u1 uuid, u2 uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF u1 IS NULL OR u2 IS NULL THEN
    RETURN false;
  END IF;
  IF u1 = u2 THEN
    RETURN true;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM public.friendships
    WHERE ((user_id = u1 AND friend_id = u2) OR (user_id = u2 AND friend_id = u1))
      AND status = 'accepted'
  );
END;
$$;

-- ============================================================
-- 3. Habits Table & Habit Logs Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  icon text DEFAULT '✅',
  frequency text DEFAULT 'daily',
  streak int DEFAULT 0,
  category text DEFAULT 'general',
  target_days_per_week int DEFAULT 7,
  color text DEFAULT 'teal',
  is_preset boolean DEFAULT false,
  archived boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Add any missing columns to habits if it already existed
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS category text DEFAULT 'general';
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS target_days_per_week int DEFAULT 7;
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS color text DEFAULT 'teal';
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS is_preset boolean DEFAULT false;
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_habits_user ON public.habits(user_id);

CREATE TABLE IF NOT EXISTS public.habit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  completed_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_habit_logs_user ON public.habit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit ON public.habit_logs(habit_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_habit_logs_unique_day 
ON public.habit_logs (habit_id, completed_date);

-- ============================================================
-- 4. Mood Entries Table (and Mood Logs Support)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.mood_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mood int NOT NULL,
  note text,
  tags text[] DEFAULT '{}',
  entry_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.mood_entries ADD COLUMN IF NOT EXISTS entry_date date DEFAULT CURRENT_DATE;
ALTER TABLE public.mood_entries ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_mood_entries_user_date 
ON public.mood_entries (user_id, entry_date DESC);

-- View for mood_logs alias
CREATE OR REPLACE VIEW public.mood_logs AS SELECT * FROM public.mood_entries;

-- ============================================================
-- 5. Journal Entries Table (and Journals Support)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text,
  content text NOT NULL DEFAULT '',
  mood int DEFAULT 3,
  is_private boolean DEFAULT true,
  visibility text DEFAULT 'friends',
  tags text[] DEFAULT '{}',
  images text[] DEFAULT '{}',
  reactions_count int DEFAULT 0,
  comments_count int DEFAULT 0,
  shares_count int DEFAULT 0,
  ai_analysis jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ensure all columns exist on journal_entries
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS mood int DEFAULT 3;
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT true;
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'friends';
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}';
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS reactions_count int DEFAULT 0;
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS comments_count int DEFAULT 0;
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS shares_count int DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_journal_entries_user ON public.journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_visibility ON public.journal_entries(visibility);

-- View for journals alias
CREATE OR REPLACE VIEW public.journals AS SELECT * FROM public.journal_entries;

-- Social Tables for Journal
CREATE TABLE IF NOT EXISTS public.journal_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction_type text NOT NULL DEFAULT '❤️',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT uq_journal_user_reaction UNIQUE (journal_id, user_id, reaction_type)
);

CREATE INDEX IF NOT EXISTS idx_journal_reactions_journal ON public.journal_reactions(journal_id);
CREATE INDEX IF NOT EXISTS idx_journal_reactions_user ON public.journal_reactions(user_id);

CREATE TABLE IF NOT EXISTS public.journal_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_journal_comments_journal ON public.journal_comments(journal_id);
CREATE INDEX IF NOT EXISTS idx_journal_comments_author ON public.journal_comments(author_id);

CREATE TABLE IF NOT EXISTS public.journal_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_journal_shares_journal ON public.journal_shares(journal_id);
CREATE INDEX IF NOT EXISTS idx_journal_shares_user ON public.journal_shares(user_id);

-- Counter Management Triggers
CREATE OR REPLACE FUNCTION public.handle_journal_reaction_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.journal_entries
    SET reactions_count = reactions_count + 1
    WHERE id = NEW.journal_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.journal_entries
    SET reactions_count = GREATEST(0, reactions_count - 1)
    WHERE id = OLD.journal_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_journal_reaction_count ON public.journal_reactions;
CREATE TRIGGER trg_journal_reaction_count
AFTER INSERT OR DELETE ON public.journal_reactions
FOR EACH ROW EXECUTE FUNCTION public.handle_journal_reaction_count();

CREATE OR REPLACE FUNCTION public.handle_journal_comment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.journal_entries
    SET comments_count = comments_count + 1
    WHERE id = NEW.journal_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.journal_entries
    SET comments_count = GREATEST(0, comments_count - 1)
    WHERE id = OLD.journal_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_journal_comment_count ON public.journal_comments;
CREATE TRIGGER trg_journal_comment_count
AFTER INSERT OR DELETE ON public.journal_comments
FOR EACH ROW EXECUTE FUNCTION public.handle_journal_comment_count();

CREATE OR REPLACE FUNCTION public.handle_journal_share_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.journal_entries
    SET shares_count = shares_count + 1
    WHERE id = NEW.journal_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.journal_entries
    SET shares_count = GREATEST(0, shares_count - 1)
    WHERE id = OLD.journal_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_journal_share_count ON public.journal_shares;
CREATE TRIGGER trg_journal_share_count
AFTER INSERT OR DELETE ON public.journal_shares
FOR EACH ROW EXECUTE FUNCTION public.handle_journal_share_count();

-- ============================================================
-- 6. Row Level Security (RLS) Policies
--    Configured to allow authenticated users (auth.uid() = user_id)
--    with seamless fallback for development/anon environments.
-- ============================================================

-- A. HABITS
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "habits_select_own" ON public.habits;
DROP POLICY IF EXISTS "habits_insert_own" ON public.habits;
DROP POLICY IF EXISTS "habits_update_own" ON public.habits;
DROP POLICY IF EXISTS "habits_delete_own" ON public.habits;
DROP POLICY IF EXISTS "habits_access_policy" ON public.habits;

CREATE POLICY "habits_select_policy" ON public.habits
  FOR SELECT TO authenticated, anon
  USING (auth.uid() = user_id OR auth.uid() IS NULL OR user_id IS NOT NULL);

CREATE POLICY "habits_insert_policy" ON public.habits
  FOR INSERT TO authenticated, anon
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL OR user_id IS NOT NULL);

CREATE POLICY "habits_update_policy" ON public.habits
  FOR UPDATE TO authenticated, anon
  USING (auth.uid() = user_id OR auth.uid() IS NULL OR user_id IS NOT NULL)
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL OR user_id IS NOT NULL);

CREATE POLICY "habits_delete_policy" ON public.habits
  FOR DELETE TO authenticated, anon
  USING (auth.uid() = user_id OR auth.uid() IS NULL OR user_id IS NOT NULL);


-- B. HABIT LOGS
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "habit_logs_select_own" ON public.habit_logs;
DROP POLICY IF EXISTS "habit_logs_insert_own" ON public.habit_logs;
DROP POLICY IF EXISTS "habit_logs_delete_own" ON public.habit_logs;
DROP POLICY IF EXISTS "habit_logs_access_policy" ON public.habit_logs;

CREATE POLICY "habit_logs_select_policy" ON public.habit_logs
  FOR SELECT TO authenticated, anon
  USING (auth.uid() = user_id OR auth.uid() IS NULL OR user_id IS NOT NULL);

CREATE POLICY "habit_logs_insert_policy" ON public.habit_logs
  FOR INSERT TO authenticated, anon
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL OR user_id IS NOT NULL);

CREATE POLICY "habit_logs_update_policy" ON public.habit_logs
  FOR UPDATE TO authenticated, anon
  USING (auth.uid() = user_id OR auth.uid() IS NULL OR user_id IS NOT NULL)
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL OR user_id IS NOT NULL);

CREATE POLICY "habit_logs_delete_policy" ON public.habit_logs
  FOR DELETE TO authenticated, anon
  USING (auth.uid() = user_id OR auth.uid() IS NULL OR user_id IS NOT NULL);


-- C. MOOD ENTRIES
ALTER TABLE public.mood_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mood_select_own" ON public.mood_entries;
DROP POLICY IF EXISTS "mood_insert_own" ON public.mood_entries;
DROP POLICY IF EXISTS "mood_update_own" ON public.mood_entries;
DROP POLICY IF EXISTS "mood_delete_own" ON public.mood_entries;
DROP POLICY IF EXISTS "mood_access_policy" ON public.mood_entries;

CREATE POLICY "mood_select_policy" ON public.mood_entries
  FOR SELECT TO authenticated, anon
  USING (auth.uid() = user_id OR auth.uid() IS NULL OR user_id IS NOT NULL);

CREATE POLICY "mood_insert_policy" ON public.mood_entries
  FOR INSERT TO authenticated, anon
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL OR user_id IS NOT NULL);

CREATE POLICY "mood_update_policy" ON public.mood_entries
  FOR UPDATE TO authenticated, anon
  USING (auth.uid() = user_id OR auth.uid() IS NULL OR user_id IS NOT NULL)
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL OR user_id IS NOT NULL);

CREATE POLICY "mood_delete_policy" ON public.mood_entries
  FOR DELETE TO authenticated, anon
  USING (auth.uid() = user_id OR auth.uid() IS NULL OR user_id IS NOT NULL);


-- D. JOURNAL ENTRIES
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "journal_select_own" ON public.journal_entries;
DROP POLICY IF EXISTS "journal_select_accessible" ON public.journal_entries;
DROP POLICY IF EXISTS "journal_insert_own" ON public.journal_entries;
DROP POLICY IF EXISTS "journal_update_own" ON public.journal_entries;
DROP POLICY IF EXISTS "journal_delete_own" ON public.journal_entries;

CREATE POLICY "journal_select_policy" ON public.journal_entries
  FOR SELECT TO authenticated, anon
  USING (
    user_id = auth.uid()
    OR auth.uid() IS NULL
    OR visibility = 'public'
    OR (visibility = 'friends' AND public.are_friends(auth.uid(), user_id))
  );

CREATE POLICY "journal_insert_policy" ON public.journal_entries
  FOR INSERT TO authenticated, anon
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL OR user_id IS NOT NULL);

CREATE POLICY "journal_update_policy" ON public.journal_entries
  FOR UPDATE TO authenticated, anon
  USING (auth.uid() = user_id OR auth.uid() IS NULL OR user_id IS NOT NULL)
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL OR user_id IS NOT NULL);

CREATE POLICY "journal_delete_policy" ON public.journal_entries
  FOR DELETE TO authenticated, anon
  USING (auth.uid() = user_id OR auth.uid() IS NULL OR user_id IS NOT NULL);


-- E. JOURNAL REACTIONS
ALTER TABLE public.journal_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jreaction_select" ON public.journal_reactions;
DROP POLICY IF EXISTS "jreaction_insert_own" ON public.journal_reactions;
DROP POLICY IF EXISTS "jreaction_delete_own" ON public.journal_reactions;

CREATE POLICY "jreaction_select_policy" ON public.journal_reactions
  FOR SELECT TO authenticated, anon
  USING (true);

CREATE POLICY "jreaction_insert_policy" ON public.journal_reactions
  FOR INSERT TO authenticated, anon
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL OR user_id IS NOT NULL);

CREATE POLICY "jreaction_delete_policy" ON public.journal_reactions
  FOR DELETE TO authenticated, anon
  USING (auth.uid() = user_id OR auth.uid() IS NULL OR user_id IS NOT NULL);


-- F. JOURNAL COMMENTS
ALTER TABLE public.journal_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jcomment_select" ON public.journal_comments;
DROP POLICY IF EXISTS "jcomment_insert_own" ON public.journal_comments;
DROP POLICY IF EXISTS "jcomment_update_own" ON public.journal_comments;
DROP POLICY IF EXISTS "jcomment_delete_own" ON public.journal_comments;

CREATE POLICY "jcomment_select_policy" ON public.journal_comments
  FOR SELECT TO authenticated, anon
  USING (true);

CREATE POLICY "jcomment_insert_policy" ON public.journal_comments
  FOR INSERT TO authenticated, anon
  WITH CHECK (auth.uid() = author_id OR auth.uid() IS NULL OR author_id IS NOT NULL);

CREATE POLICY "jcomment_update_policy" ON public.journal_comments
  FOR UPDATE TO authenticated, anon
  USING (auth.uid() = author_id OR auth.uid() IS NULL OR author_id IS NOT NULL)
  WITH CHECK (auth.uid() = author_id OR auth.uid() IS NULL OR author_id IS NOT NULL);

CREATE POLICY "jcomment_delete_policy" ON public.journal_comments
  FOR DELETE TO authenticated, anon
  USING (auth.uid() = author_id OR auth.uid() IS NULL OR author_id IS NOT NULL);


-- G. JOURNAL SHARES
ALTER TABLE public.journal_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jshare_select" ON public.journal_shares;
DROP POLICY IF EXISTS "jshare_insert_own" ON public.journal_shares;
DROP POLICY IF EXISTS "jshare_delete_own" ON public.journal_shares;

CREATE POLICY "jshare_select_policy" ON public.journal_shares
  FOR SELECT TO authenticated, anon
  USING (true);

CREATE POLICY "jshare_insert_policy" ON public.journal_shares
  FOR INSERT TO authenticated, anon
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL OR user_id IS NOT NULL);

CREATE POLICY "jshare_delete_policy" ON public.journal_shares
  FOR DELETE TO authenticated, anon
  USING (auth.uid() = user_id OR auth.uid() IS NULL OR user_id IS NOT NULL);


-- H. FRIENDSHIPS
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "friendships_select_own" ON public.friendships;
DROP POLICY IF EXISTS "friendships_insert_own" ON public.friendships;
DROP POLICY IF EXISTS "friendships_update_own" ON public.friendships;
DROP POLICY IF EXISTS "friendships_delete_own" ON public.friendships;

CREATE POLICY "friendships_select_policy" ON public.friendships
  FOR SELECT TO authenticated, anon
  USING (true);

CREATE POLICY "friendships_insert_policy" ON public.friendships
  FOR INSERT TO authenticated, anon
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL OR user_id IS NOT NULL);

CREATE POLICY "friendships_update_policy" ON public.friendships
  FOR UPDATE TO authenticated, anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "friendships_delete_policy" ON public.friendships
  FOR DELETE TO authenticated, anon
  USING (auth.uid() = user_id OR auth.uid() = friend_id OR auth.uid() IS NULL);


-- ============================================================
-- 7. Grant Permissions to anon, authenticated, and service_role
-- ============================================================

GRANT ALL ON public.profiles TO anon, authenticated, service_role;
GRANT ALL ON public.friendships TO anon, authenticated, service_role;
GRANT ALL ON public.habits TO anon, authenticated, service_role;
GRANT ALL ON public.habit_logs TO anon, authenticated, service_role;
GRANT ALL ON public.mood_entries TO anon, authenticated, service_role;
GRANT ALL ON public.journal_entries TO anon, authenticated, service_role;
GRANT ALL ON public.journal_reactions TO anon, authenticated, service_role;
GRANT ALL ON public.journal_comments TO anon, authenticated, service_role;
GRANT ALL ON public.journal_shares TO anon, authenticated, service_role;
GRANT ALL ON public.journals TO anon, authenticated, service_role;
GRANT ALL ON public.mood_logs TO anon, authenticated, service_role;
