/*
# Flashcards & Quiz Module (Quizlet Clone)
# Tables: flashcard_sets, flashcards, quiz_results, spaced_repetition_logs
# Fully featured with Spaced Repetition (Easy 7d, Medium 3d, Hard 0d),
# Multiple Choice, Fill-in-the-blank, Manual & AI Generator support,
# Practice and Exam Modes, and Permissive + Dev Fallback RLS policies.
*/

-- ============================================================
-- 1. Flashcard Sets Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.flashcard_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  subject text NOT NULL DEFAULT 'general',
  grade_level text NOT NULL DEFAULT 'grade_11',
  visibility text NOT NULL DEFAULT 'public',
  tags text[] DEFAULT '{}',
  card_count int NOT NULL DEFAULT 0,
  likes_count int NOT NULL DEFAULT 0,
  is_ai_generated boolean NOT NULL DEFAULT false,
  cover_image text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flashcard_sets_user ON public.flashcard_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_sets_subject ON public.flashcard_sets(subject);
CREATE INDEX IF NOT EXISTS idx_flashcard_sets_visibility ON public.flashcard_sets(visibility);
CREATE INDEX IF NOT EXISTS idx_flashcard_sets_created ON public.flashcard_sets(created_at DESC);

-- ============================================================
-- 2. Flashcards Table (Supports 3 Types)
--    - flashcard_2sided (Spaced Repetition)
--    - multiple_choice (A/B/C/D + LaTeX)
--    - fill_in_blank (Cloze deletion)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id uuid NOT NULL REFERENCES public.flashcard_sets(id) ON DELETE CASCADE,
  card_type text NOT NULL DEFAULT 'flashcard_2sided',
  front_text text NOT NULL,
  back_text text NOT NULL,
  options jsonb DEFAULT '[]'::jsonb,
  correct_option text,
  explanation text,
  hint text,
  order_index int NOT NULL DEFAULT 0,
  ease_factor float NOT NULL DEFAULT 2.5,
  interval_days int NOT NULL DEFAULT 1,
  repetitions int NOT NULL DEFAULT 0,
  next_review_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flashcards_set ON public.flashcards(set_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_order ON public.flashcards(set_id, order_index ASC);
CREATE INDEX IF NOT EXISTS idx_flashcards_next_review ON public.flashcards(next_review_at);

-- Counter trigger for flashcard_sets.card_count
CREATE OR REPLACE FUNCTION public.handle_flashcard_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.flashcard_sets
    SET card_count = card_count + 1, updated_at = now()
    WHERE id = NEW.set_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.flashcard_sets
    SET card_count = GREATEST(0, card_count - 1), updated_at = now()
    WHERE id = OLD.set_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_flashcard_count ON public.flashcards;
CREATE TRIGGER trg_flashcard_count
AFTER INSERT OR DELETE ON public.flashcards
FOR EACH ROW EXECUTE FUNCTION public.handle_flashcard_count();

-- ============================================================
-- 3. Quiz & Exam Results Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.quiz_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id uuid NOT NULL REFERENCES public.flashcard_sets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'practice', -- 'practice' | 'exam'
  total_questions int NOT NULL DEFAULT 0,
  correct_answers int NOT NULL DEFAULT 0,
  score_percentage float NOT NULL DEFAULT 0.0,
  time_spent_seconds int NOT NULL DEFAULT 0,
  answers_summary jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_results_user ON public.quiz_results(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_set ON public.quiz_results(set_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_created ON public.quiz_results(created_at DESC);

-- ============================================================
-- 4. Spaced Repetition Logs Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.spaced_repetition_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating text NOT NULL, -- 'easy' | 'medium' | 'hard'
  interval_days int NOT NULL DEFAULT 1,
  reviewed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sr_logs_user ON public.spaced_repetition_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sr_logs_card ON public.spaced_repetition_logs(card_id);
CREATE INDEX IF NOT EXISTS idx_sr_logs_reviewed ON public.spaced_repetition_logs(reviewed_at DESC);

-- ============================================================
-- 5. Row Level Security (RLS) Policies
--    Full CRUD for authenticated users with fallback for dev/anon
-- ============================================================

-- A. FLASHCARD SETS
ALTER TABLE public.flashcard_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "flashcard_sets_select" ON public.flashcard_sets;
DROP POLICY IF EXISTS "flashcard_sets_insert" ON public.flashcard_sets;
DROP POLICY IF EXISTS "flashcard_sets_update" ON public.flashcard_sets;
DROP POLICY IF EXISTS "flashcard_sets_delete" ON public.flashcard_sets;

CREATE POLICY "flashcard_sets_select" ON public.flashcard_sets
  FOR SELECT TO authenticated, anon
  USING (
    visibility = 'public'
    OR auth.uid() = user_id
    OR auth.uid() IS NULL
    OR (visibility = 'friends' AND public.are_friends(auth.uid(), user_id))
  );

CREATE POLICY "flashcard_sets_insert" ON public.flashcard_sets
  FOR INSERT TO authenticated, anon
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL OR user_id IS NOT NULL);

CREATE POLICY "flashcard_sets_update" ON public.flashcard_sets
  FOR UPDATE TO authenticated, anon
  USING (auth.uid() = user_id OR auth.uid() IS NULL OR user_id IS NOT NULL)
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL OR user_id IS NOT NULL);

CREATE POLICY "flashcard_sets_delete" ON public.flashcard_sets
  FOR DELETE TO authenticated, anon
  USING (auth.uid() = user_id OR auth.uid() IS NULL OR user_id IS NOT NULL);


-- B. FLASHCARDS
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "flashcards_select" ON public.flashcards;
DROP POLICY IF EXISTS "flashcards_insert" ON public.flashcards;
DROP POLICY IF EXISTS "flashcards_update" ON public.flashcards;
DROP POLICY IF EXISTS "flashcards_delete" ON public.flashcards;

CREATE POLICY "flashcards_select" ON public.flashcards
  FOR SELECT TO authenticated, anon
  USING (true);

CREATE POLICY "flashcards_insert" ON public.flashcards
  FOR INSERT TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "flashcards_update" ON public.flashcards
  FOR UPDATE TO authenticated, anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "flashcards_delete" ON public.flashcards
  FOR DELETE TO authenticated, anon
  USING (true);


-- C. QUIZ RESULTS
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quiz_results_select" ON public.quiz_results;
DROP POLICY IF EXISTS "quiz_results_insert" ON public.quiz_results;
DROP POLICY IF EXISTS "quiz_results_delete" ON public.quiz_results;

CREATE POLICY "quiz_results_select" ON public.quiz_results
  FOR SELECT TO authenticated, anon
  USING (auth.uid() = user_id OR auth.uid() IS NULL OR user_id IS NOT NULL);

CREATE POLICY "quiz_results_insert" ON public.quiz_results
  FOR INSERT TO authenticated, anon
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL OR user_id IS NOT NULL);

CREATE POLICY "quiz_results_delete" ON public.quiz_results
  FOR DELETE TO authenticated, anon
  USING (auth.uid() = user_id OR auth.uid() IS NULL OR user_id IS NOT NULL);


-- D. SPACED REPETITION LOGS
ALTER TABLE public.spaced_repetition_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sr_logs_select" ON public.spaced_repetition_logs;
DROP POLICY IF EXISTS "sr_logs_insert" ON public.spaced_repetition_logs;
DROP POLICY IF EXISTS "sr_logs_delete" ON public.spaced_repetition_logs;

CREATE POLICY "sr_logs_select" ON public.spaced_repetition_logs
  FOR SELECT TO authenticated, anon
  USING (auth.uid() = user_id OR auth.uid() IS NULL OR user_id IS NOT NULL);

CREATE POLICY "sr_logs_insert" ON public.spaced_repetition_logs
  FOR INSERT TO authenticated, anon
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL OR user_id IS NOT NULL);

CREATE POLICY "sr_logs_delete" ON public.spaced_repetition_logs
  FOR DELETE TO authenticated, anon
  USING (auth.uid() = user_id OR auth.uid() IS NULL OR user_id IS NOT NULL);


-- ============================================================
-- 6. Grant Permissions
-- ============================================================

GRANT ALL ON public.flashcard_sets TO anon, authenticated, service_role;
GRANT ALL ON public.flashcards TO anon, authenticated, service_role;
GRANT ALL ON public.quiz_results TO anon, authenticated, service_role;
GRANT ALL ON public.spaced_repetition_logs TO anon, authenticated, service_role;
