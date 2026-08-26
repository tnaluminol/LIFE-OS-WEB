/*
# My Life Module — Database Schema & Policies
# Features:
# 1. Friendships (Friend connections for journal sharing)
# 2. Learning Journal (Public to friends, with reactions, comments, shares)
# 3. Habits Tracker (Private mode, presets, custom habits, streaks)
# 4. Mood Tracker (Private mode, daily logging, 7-day history, weekly analysis & recommendations)
*/

-- ============================================================
-- 1. Friendships Table & Functions
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

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "friendships_select_own" ON public.friendships;
CREATE POLICY "friendships_select_own" ON public.friendships
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

DROP POLICY IF EXISTS "friendships_insert_own" ON public.friendships;
CREATE POLICY "friendships_insert_own" ON public.friendships
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "friendships_update_own" ON public.friendships;
CREATE POLICY "friendships_update_own" ON public.friendships
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = friend_id);

DROP POLICY IF EXISTS "friendships_delete_own" ON public.friendships;
CREATE POLICY "friendships_delete_own" ON public.friendships
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Helper function to check if two users are friends
CREATE OR REPLACE FUNCTION public.are_friends(u1 uuid, u2 uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
-- 2. Learning Journal System Upgrades & Social Tables
-- ============================================================

-- Add new columns to existing journal_entries
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'friends';
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}';
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS reactions_count int DEFAULT 0;
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS comments_count int DEFAULT 0;
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS shares_count int DEFAULT 0;

-- Journal Reactions Table
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

ALTER TABLE public.journal_reactions ENABLE ROW LEVEL SECURITY;

-- Journal Comments Table
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

ALTER TABLE public.journal_comments ENABLE ROW LEVEL SECURITY;

-- Journal Shares Table
CREATE TABLE IF NOT EXISTS public.journal_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_journal_shares_journal ON public.journal_shares(journal_id);
CREATE INDEX IF NOT EXISTS idx_journal_shares_user ON public.journal_shares(user_id);

ALTER TABLE public.journal_shares ENABLE ROW LEVEL SECURITY;

-- Triggers for automatic counter management on journal_entries
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

-- RLS Policies for Journal Entries
DROP POLICY IF EXISTS "journal_select_own" ON public.journal_entries;
DROP POLICY IF EXISTS "journal_select_accessible" ON public.journal_entries;
CREATE POLICY "journal_select_accessible" ON public.journal_entries
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR visibility = 'public'
    OR (
      visibility = 'friends' 
      AND public.are_friends(auth.uid(), user_id)
    )
  );

DROP POLICY IF EXISTS "journal_insert_own" ON public.journal_entries;
CREATE POLICY "journal_insert_own" ON public.journal_entries
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "journal_update_own" ON public.journal_entries;
CREATE POLICY "journal_update_own" ON public.journal_entries
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "journal_delete_own" ON public.journal_entries;
CREATE POLICY "journal_delete_own" ON public.journal_entries
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for Journal Reactions
DROP POLICY IF EXISTS "jreaction_select" ON public.journal_reactions;
CREATE POLICY "jreaction_select" ON public.journal_reactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.journal_entries j
      WHERE j.id = journal_reactions.journal_id
        AND (
          j.user_id = auth.uid()
          OR j.visibility = 'public'
          OR (j.visibility = 'friends' AND public.are_friends(auth.uid(), j.user_id))
        )
    )
  );

DROP POLICY IF EXISTS "jreaction_insert_own" ON public.journal_reactions;
CREATE POLICY "jreaction_insert_own" ON public.journal_reactions
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.journal_entries j
      WHERE j.id = journal_reactions.journal_id
        AND (
          j.user_id = auth.uid()
          OR j.visibility = 'public'
          OR (j.visibility = 'friends' AND public.are_friends(auth.uid(), j.user_id))
        )
    )
  );

DROP POLICY IF EXISTS "jreaction_delete_own" ON public.journal_reactions;
CREATE POLICY "jreaction_delete_own" ON public.journal_reactions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for Journal Comments
DROP POLICY IF EXISTS "jcomment_select" ON public.journal_comments;
CREATE POLICY "jcomment_select" ON public.journal_comments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.journal_entries j
      WHERE j.id = journal_comments.journal_id
        AND (
          j.user_id = auth.uid()
          OR j.visibility = 'public'
          OR (j.visibility = 'friends' AND public.are_friends(auth.uid(), j.user_id))
        )
    )
  );

DROP POLICY IF EXISTS "jcomment_insert_own" ON public.journal_comments;
CREATE POLICY "jcomment_insert_own" ON public.journal_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM public.journal_entries j
      WHERE j.id = journal_comments.journal_id
        AND (
          j.user_id = auth.uid()
          OR j.visibility = 'public'
          OR (j.visibility = 'friends' AND public.are_friends(auth.uid(), j.user_id))
        )
    )
  );

DROP POLICY IF EXISTS "jcomment_update_own" ON public.journal_comments;
CREATE POLICY "jcomment_update_own" ON public.journal_comments
  FOR UPDATE TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "jcomment_delete_own" ON public.journal_comments;
CREATE POLICY "jcomment_delete_own" ON public.journal_comments
  FOR DELETE TO authenticated
  USING (
    auth.uid() = author_id
    OR EXISTS (
      SELECT 1 FROM public.journal_entries j
      WHERE j.id = journal_comments.journal_id AND j.user_id = auth.uid()
    )
  );

-- RLS Policies for Journal Shares
DROP POLICY IF EXISTS "jshare_select" ON public.journal_shares;
CREATE POLICY "jshare_select" ON public.journal_shares
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "jshare_insert_own" ON public.journal_shares;
CREATE POLICY "jshare_insert_own" ON public.journal_shares
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "jshare_delete_own" ON public.journal_shares;
CREATE POLICY "jshare_delete_own" ON public.journal_shares
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);


-- ============================================================
-- 3. Habits Tracker System Upgrades (Private Mode)
-- ============================================================

ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS category text DEFAULT 'general';
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS target_days_per_week int DEFAULT 7;
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS color text DEFAULT 'teal';
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS is_preset boolean DEFAULT false;
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;

-- Habit logs unique constraint per date
CREATE UNIQUE INDEX IF NOT EXISTS idx_habit_logs_unique_day 
ON public.habit_logs (habit_id, completed_date);

-- Ensure strict private RLS for habits
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "habits_select_own" ON public.habits;
CREATE POLICY "habits_select_own" ON public.habits
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "habits_insert_own" ON public.habits;
CREATE POLICY "habits_insert_own" ON public.habits
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "habits_update_own" ON public.habits;
CREATE POLICY "habits_update_own" ON public.habits
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "habits_delete_own" ON public.habits;
CREATE POLICY "habits_delete_own" ON public.habits
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Ensure strict private RLS for habit logs
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "habit_logs_select_own" ON public.habit_logs;
CREATE POLICY "habit_logs_select_own" ON public.habit_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "habit_logs_insert_own" ON public.habit_logs;
CREATE POLICY "habit_logs_insert_own" ON public.habit_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "habit_logs_delete_own" ON public.habit_logs;
CREATE POLICY "habit_logs_delete_own" ON public.habit_logs
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);


-- ============================================================
-- 4. Mood Tracker System Upgrades (Private Mode)
-- ============================================================

ALTER TABLE public.mood_entries ADD COLUMN IF NOT EXISTS entry_date date DEFAULT CURRENT_DATE;

CREATE INDEX IF NOT EXISTS idx_mood_entries_user_date 
ON public.mood_entries (user_id, entry_date DESC);

-- Ensure strict private RLS for mood_entries
ALTER TABLE public.mood_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mood_select_own" ON public.mood_entries;
CREATE POLICY "mood_select_own" ON public.mood_entries
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "mood_insert_own" ON public.mood_entries;
CREATE POLICY "mood_insert_own" ON public.mood_entries
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "mood_update_own" ON public.mood_entries;
CREATE POLICY "mood_update_own" ON public.mood_entries
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "mood_delete_own" ON public.mood_entries;
CREATE POLICY "mood_delete_own" ON public.mood_entries
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
