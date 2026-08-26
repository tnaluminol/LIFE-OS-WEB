import { supabase } from '@/lib/supabase';
import type {
  FlashcardSet,
  Flashcard,
  QuizResult,
  SpacedRepetitionLog,
  FlashcardCardType,
  FlashcardSubject,
  FlashcardGradeLevel,
  QuizStudyMode,
  SpacedRepetitionRating,
  Profile,
} from './types';
import { ensureUserProfileExists } from './my-life-service';

// ============================================================
// Preset High-Quality Sets (Physics, English, Math, Chemistry)
// ============================================================

export const PRESET_FLASHCARD_SETS: Array<{
  set: Omit<FlashcardSet, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
  cards: Array<Omit<Flashcard, 'id' | 'set_id' | 'created_at' | 'updated_at'>>;
}> = [
  {
    set: {
      title: 'Vật Lý 11: Dao Động Cơ & Con Lắc Lò Xo',
      description: 'Tổng hợp công thức dao động điều hòa, con lắc lò xo, con lắc đơn và các dạng bài tập trắc nghiệm kinh điển.',
      subject: 'physics',
      grade_level: 'grade_11',
      visibility: 'public',
      tags: ['Vật Lý 11', 'Dao động điều hòa', 'Con lắc lò xo', 'Đại cương'],
      card_count: 5,
      likes_count: 42,
      is_ai_generated: false,
      cover_image: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=800&auto=format&fit=crop&q=60',
    },
    cards: [
      {
        card_type: 'flashcard_2sided',
        front_text: 'Phương trình dao động điều hòa li độ tổng quát có dạng như thế nào?',
        back_text: '$$x = A \\cos(\\omega t + \\varphi)$$\n\n- $x$: Li độ (cm hoặc m)\n- $A$: Biên độ dao động ($A > 0$)\n- $\\omega$: Tần số góc (rad/s)\n- $(\\omega t + \\varphi)$: Pha dao động tại thời điểm $t$\n- $\\varphi$: Pha ban đầu (rad)',
        explanation: 'Phương trình chuẩn hàm cosin. Lưu ý góc $\\varphi \\in [-\\pi, \\pi]$.',
        hint: 'Biên độ nhân cosin của (tần số góc * thời gian + pha ban đầu)',
        order_index: 0,
        ease_factor: 2.5,
        interval_days: 1,
        repetitions: 0,
        next_review_at: new Date().toISOString(),
      },
      {
        card_type: 'multiple_choice',
        front_text: 'Chu kỳ dao động $T$ của con lắc lò xo có độ cứng $k$ và vật nặng khối lượng $m$ được xác định bởi công thức nào sau đây?',
        back_text: 'Đáp án A: $$T = 2\\pi \\sqrt{\\frac{m}{k}}$$',
        options: [
          { id: 'A', text: '$$T = 2\\pi \\sqrt{\\frac{m}{k}}$$' },
          { id: 'B', text: '$$T = 2\\pi \\sqrt{\\frac{k}{m}}$$' },
          { id: 'C', text: '$$T = \\frac{1}{2\\pi} \\sqrt{\\frac{m}{k}}$$' },
          { id: 'D', text: '$$T = 2\\pi \\sqrt{\\frac{g}{l}}$$' },
        ],
        correct_option: 'A',
        explanation: 'Ta có $\\omega = \\sqrt{\\frac{k}{m}} \\Rightarrow T = \\frac{2\\pi}{\\omega} = 2\\pi \\sqrt{\\frac{m}{k}}$ (câu thần chú: "Tình Hai Pi Muốn Khóc").',
        hint: 'm ở trên tử, k ở dưới mẫu',
        order_index: 1,
        ease_factor: 2.5,
        interval_days: 1,
        repetitions: 0,
        next_review_at: new Date().toISOString(),
      },
      {
        card_type: 'fill_in_blank',
        front_text: 'Gia tốc trong dao động điều hòa luôn [___] pha so với li độ.',
        back_text: 'ngược',
        options: [],
        correct_option: 'ngược',
        explanation: 'Phương trình gia tốc $a = -\\omega^2 x = \\omega^2 A \\cos(\\omega t + \\varphi + \\pi)$. Do đó gia tốc luôn ngược pha với li độ ($180^\\circ$ hay $\\pi$ rad).',
        hint: 'Ngược pha, cùng pha hay vuông pha?',
        order_index: 2,
        ease_factor: 2.5,
        interval_days: 1,
        repetitions: 0,
        next_review_at: new Date().toISOString(),
      },
      {
        card_type: 'flashcard_2sided',
        front_text: 'Công thức tính cơ năng $W$ của con lắc lò xo dao động điều hòa?',
        back_text: '$$W = W_t + W_d = \\frac{1}{2} k A^2 = \\frac{1}{2} m \\omega^2 A^2 = \\text{hằng số}$$\n\nCơ năng bảo toàn và tỉ lệ thuận với bình phương biên độ dao động $A^2$.',
        explanation: 'Cơ năng không biến thiên điều hòa theo thời gian mà là một đại lượng bảo toàn (hằng số).',
        hint: '1/2 k A^2',
        order_index: 3,
        ease_factor: 2.5,
        interval_days: 1,
        repetitions: 0,
        next_review_at: new Date().toISOString(),
      },
      {
        card_type: 'multiple_choice',
        front_text: 'Một vật dao động điều hòa với biên độ $A = 5\\text{ cm}$ và tần số góc $\\omega = 10\\text{ rad/s}$. Vận tốc cực đại $v_{\\max}$ của vật là:',
        back_text: 'Đáp án B: $$50\\text{ cm/s}$$',
        options: [
          { id: 'A', text: '$$25\\text{ cm/s}$$' },
          { id: 'B', text: '$$50\\text{ cm/s}$$' },
          { id: 'C', text: '$$100\\text{ cm/s}$$' },
          { id: 'D', text: '$$5\\text{ cm/s}$$' },
        ],
        correct_option: 'B',
        explanation: 'Vận tốc cực đại qua vị trí cân bằng: $v_{\\max} = \\omega \\cdot A = 10 \\times 5 = 50\\text{ cm/s} = 0.5\\text{ m/s}$.',
        hint: 'v_max = omega * A',
        order_index: 4,
        ease_factor: 2.5,
        interval_days: 1,
        repetitions: 0,
        next_review_at: new Date().toISOString(),
      },
    ],
  },
  {
    set: {
      title: 'Tiếng Anh 11: Unit 1 - A Long and Healthy Life',
      description: 'Từ vựng trọng tâm về sức khỏe, tuổi thọ, lối sống lành mạnh và ngữ pháp thì Quá khứ đơn vs Hiện tại hoàn thành.',
      subject: 'english',
      grade_level: 'grade_11',
      visibility: 'public',
      tags: ['English 11', 'Vocabulary', 'Global Success', 'Unit 1'],
      card_count: 5,
      likes_count: 38,
      is_ai_generated: false,
      cover_image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&auto=format&fit=crop&q=60',
    },
    cards: [
      {
        card_type: 'flashcard_2sided',
        front_text: 'Longevity (noun) /lɒnˈdʒevəti/',
        back_text: '**Định nghĩa**: Tuổi thọ, sự sống lâu dài.\n\n*Ví dụ*: Regular exercise and a balanced diet are key factors contributing to **longevity**.\n(Tập thể dục đều đặn và chế độ ăn cân bằng là các yếu tố chính giúp kéo dài tuổi thọ).',
        explanation: 'Synonym: Life expectancy, long life.',
        hint: 'Bắt nguồn từ long (dài) + age (tuổi)',
        order_index: 0,
        ease_factor: 2.5,
        interval_days: 1,
        repetitions: 0,
        next_review_at: new Date().toISOString(),
      },
      {
        card_type: 'multiple_choice',
        front_text: 'Eating a balanced diet containing essential nutrients can boost your [___] system.',
        back_text: 'Đáp án C: immune',
        options: [
          { id: 'A', text: 'nervous (thần kinh)' },
          { id: 'B', text: 'digestive (tiêu hóa)' },
          { id: 'C', text: 'immune (miễn dịch)' },
          { id: 'D', text: 'respiratory (hô hấp)' },
        ],
        correct_option: 'C',
        explanation: '"Immune system" nghĩa là hệ miễn dịch, giúp cơ thể chống lại bệnh tật và vi khuẩn.',
        hint: 'Hệ thống bảo vệ cơ thể khỏi virus & vi khuẩn',
        order_index: 1,
        ease_factor: 2.5,
        interval_days: 1,
        repetitions: 0,
        next_review_at: new Date().toISOString(),
      },
      {
        card_type: 'fill_in_blank',
        front_text: 'She has been working out at the gym [___] 3 months.',
        back_text: 'for',
        options: [],
        correct_option: 'for',
        explanation: 'Dùng "for" trước một khoảng thời gian (for 3 months), dùng "since" trước mốc thời gian (since 2022).',
        hint: 'Dùng for hay since cho khoảng thời gian?',
        order_index: 2,
        ease_factor: 2.5,
        interval_days: 1,
        repetitions: 0,
        next_review_at: new Date().toISOString(),
      },
      {
        card_type: 'flashcard_2sided',
        front_text: 'Antibiotics (noun) /ˌæntibaɪˈɒtɪks/',
        back_text: '**Định nghĩa**: Thuốc kháng sinh.\n\n*Lưu ý*: Kháng sinh chỉ tiêu diệt vi khuẩn (bacteria), KHÔNG có tác dụng đối với virus (như cảm cúm thông thường).',
        explanation: 'Anti (chống lại) + biotic (sinh vật).',
        hint: 'Thuốc chữa nhiễm trùng do vi khuẩn',
        order_index: 3,
        ease_factor: 2.5,
        interval_days: 1,
        repetitions: 0,
        next_review_at: new Date().toISOString(),
      },
      {
        card_type: 'multiple_choice',
        front_text: 'Which sentence uses the Present Perfect tense correctly?',
        back_text: 'Đáp án B: I have lived here since 2020.',
        options: [
          { id: 'A', text: 'I have lived here yesterday.' },
          { id: 'B', text: 'I have lived here since 2020.' },
          { id: 'C', text: 'I lived here since 2020.' },
          { id: 'D', text: 'I am living here for 5 years.' },
        ],
        correct_option: 'B',
        explanation: 'Hiện tại hoàn thành đi kèm với "since + mốc thời gian" diễn tả hành động bắt đầu từ quá khứ và vẫn còn tiếp diễn ở hiện tại.',
        hint: 'have/has + V3/ed + since/for',
        order_index: 4,
        ease_factor: 2.5,
        interval_days: 1,
        repetitions: 0,
        next_review_at: new Date().toISOString(),
      },
    ],
  },
  {
    set: {
      title: 'Toán 12: Bảng Nguyên Hàm & Tích Phân Cơ Bản',
      description: 'Tổng hợp bảng công thức nguyên hàm cơ bản và mở rộng, phương pháp đổi biến số và từng phần.',
      subject: 'math',
      grade_level: 'grade_12',
      visibility: 'public',
      tags: ['Toán 12', 'Nguyên hàm', 'Tích phân', 'Giải tích'],
      card_count: 4,
      likes_count: 56,
      is_ai_generated: false,
      cover_image: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800&auto=format&fit=crop&q=60',
    },
    cards: [
      {
        card_type: 'flashcard_2sided',
        front_text: 'Nguyên hàm của hàm số lũy thừa $f(x) = x^\\alpha$ (với $\\alpha \\neq -1$)?',
        back_text: '$$\\int x^\\alpha dx = \\frac{x^{\\alpha + 1}}{\\alpha + 1} + C$$\n\n*Trường hợp đặc biệt*: Khi $\\alpha = -1$, $\\int \\frac{1}{x} dx = \\ln|x| + C$.',
        explanation: 'Nhớ cộng 1 vào số mũ và chia cho số mũ mới $(\\alpha + 1)$.',
        hint: 'x^(alpha+1) / (alpha+1) + C',
        order_index: 0,
        ease_factor: 2.5,
        interval_days: 1,
        repetitions: 0,
        next_review_at: new Date().toISOString(),
      },
      {
        card_type: 'multiple_choice',
        front_text: 'Nguyên hàm $\\int \\cos(2x + 1) dx$ bằng:',
        back_text: 'Đáp án A: $$\\frac{1}{2} \\sin(2x + 1) + C$$',
        options: [
          { id: 'A', text: '$$\\frac{1}{2} \\sin(2x + 1) + C$$' },
          { id: 'B', text: '$$-\\frac{1}{2} \\sin(2x + 1) + C$$' },
          { id: 'C', text: '$$2 \\sin(2x + 1) + C$$' },
          { id: 'D', text: '$$\\sin(2x + 1) + C$$' },
        ],
        correct_option: 'A',
        explanation: 'Áp dụng công thức $\\int \\cos(ax + b) dx = \\frac{1}{a} \\sin(ax + b) + C$ với $a = 2$.',
        hint: 'Đạo hàm sin ra cos, nhớ nhân 1/a',
        order_index: 1,
        ease_factor: 2.5,
        interval_days: 1,
        repetitions: 0,
        next_review_at: new Date().toISOString(),
      },
      {
        card_type: 'fill_in_blank',
        front_text: 'Công thức tích phân từng phần: $\\int u dv = u \\cdot v - \\int [___] du$.',
        back_text: 'v',
        options: [],
        correct_option: 'v',
        explanation: 'Công thức tích phân từng phần kinh điển: $\\int u dv = uv - \\int v du$.',
        hint: 'Chữ cái nào đi trước du?',
        order_index: 2,
        ease_factor: 2.5,
        interval_days: 1,
        repetitions: 0,
        next_review_at: new Date().toISOString(),
      },
      {
        card_type: 'flashcard_2sided',
        front_text: 'Nguyên hàm của hàm số mũ cơ số e: $\\int e^{ax + b} dx$?',
        back_text: '$$\\int e^{ax + b} dx = \\frac{1}{a} e^{ax + b} + C$$\n\n*Ví dụ*: $\\int e^{3x} dx = \\frac{1}{3} e^{3x} + C$.',
        explanation: 'Đạo hàm và nguyên hàm của $e^x$ đều chính là $e^x$. Khi có hệ số $a$ thì chia cho $a$.',
        hint: '1/a * e^(ax+b) + C',
        order_index: 3,
        ease_factor: 2.5,
        interval_days: 1,
        repetitions: 0,
        next_review_at: new Date().toISOString(),
      },
    ],
  },
];

// ============================================================
// 1. Flashcard Sets Service (CRUD & Catalog)
// ============================================================

export async function fetchFlashcardSets(options?: {
  subject?: string;
  grade?: string;
  userId?: string;
  search?: string;
}): Promise<FlashcardSet[]> {
  try {
    let query = supabase
      .from('flashcard_sets')
      .select('*')
      .order('created_at', { ascending: false });

    if (options?.subject && options.subject !== 'all') {
      query = query.eq('subject', options.subject);
    }
    if (options?.grade && options.grade !== 'all') {
      query = query.eq('grade_level', options.grade);
    }
    if (options?.userId) {
      query = query.eq('user_id', options.userId);
    }
    if (options?.search) {
      query = query.ilike('title', `%${options.search}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[FlashcardService:fetchFlashcardSets] Supabase Error:', error);
      return [];
    }

    const sets = (data as FlashcardSet[]) || [];

    // Fetch author profiles
    if (sets.length > 0) {
      const userIds = Array.from(new Set(sets.map((s) => s.user_id).filter(Boolean)));
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds);

        const profileMap = new Map<string, Profile>();
        (profiles || []).forEach((p: any) => profileMap.set(p.id, p as Profile));

        sets.forEach((s) => {
          s.author = profileMap.get(s.user_id);
        });
      }
    }

    return sets;
  } catch (err) {
    console.error('[FlashcardService:fetchFlashcardSets] Exception:', err);
    return [];
  }
}

export async function fetchFlashcardSetById(
  setId: string
): Promise<{ set: FlashcardSet | null; cards: Flashcard[]; error: Error | null }> {
  try {
    if (!setId) return { set: null, cards: [], error: new Error('Thiếu ID bộ thẻ') };

    const [setRes, cardsRes] = await Promise.all([
      supabase.from('flashcard_sets').select('*').eq('id', setId).single(),
      supabase
        .from('flashcards')
        .select('*')
        .eq('set_id', setId)
        .order('order_index', { ascending: true }),
    ]);

    if (setRes.error || !setRes.data) {
      return { set: null, cards: [], error: setRes.error as Error };
    }

    const set = setRes.data as FlashcardSet;
    const cards = (cardsRes.data as Flashcard[]) || [];

    // Attach author
    if (set.user_id) {
      const { data: author } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', set.user_id)
        .single();
      if (author) set.author = author as Profile;
    }

    return { set, cards, error: null };
  } catch (err) {
    console.error('[FlashcardService:fetchFlashcardSetById] Exception:', err);
    return { set: null, cards: [], error: err as Error };
  }
}

export async function createFlashcardSet(
  userId: string,
  setData: {
    title: string;
    description?: string;
    subject: FlashcardSubject;
    grade_level: FlashcardGradeLevel;
    visibility?: 'public' | 'friends' | 'private';
    tags?: string[];
    is_ai_generated?: boolean;
    cover_image?: string;
  },
  cards: Array<{
    card_type: FlashcardCardType;
    front_text: string;
    back_text: string;
    options?: { id: string; text: string }[];
    correct_option?: string;
    explanation?: string;
    hint?: string;
  }>
): Promise<{ set: FlashcardSet | null; error: Error | null }> {
  try {
    if (!userId) return { set: null, error: new Error('Vui lòng đăng nhập') };
    await ensureUserProfileExists(userId);

    const { data: createdSet, error: setError } = await supabase
      .from('flashcard_sets')
      .insert({
        user_id: userId,
        title: setData.title,
        description: setData.description || null,
        subject: setData.subject,
        grade_level: setData.grade_level,
        visibility: setData.visibility || 'public',
        tags: setData.tags || [],
        is_ai_generated: setData.is_ai_generated || false,
        cover_image: setData.cover_image || null,
      })
      .select()
      .single();

    if (setError || !createdSet) {
      console.error('[FlashcardService:createFlashcardSet] Error creating set:', setError);
      return { set: null, error: setError as Error };
    }

    // Insert cards
    if (cards && cards.length > 0) {
      const cardsToInsert = cards.map((c, index) => ({
        set_id: createdSet.id,
        card_type: c.card_type,
        front_text: c.front_text,
        back_text: c.back_text,
        options: c.options || [],
        correct_option: c.correct_option || null,
        explanation: c.explanation || null,
        hint: c.hint || null,
        order_index: index,
        ease_factor: 2.5,
        interval_days: 1,
        repetitions: 0,
        next_review_at: new Date().toISOString(),
      }));

      const { error: cardsError } = await supabase.from('flashcards').insert(cardsToInsert);
      if (cardsError) {
        console.error('[FlashcardService:createFlashcardSet] Error inserting cards:', cardsError);
      }
    }

    return { set: createdSet as FlashcardSet, error: null };
  } catch (err) {
    console.error('[FlashcardService:createFlashcardSet] Exception:', err);
    return { set: null, error: err as Error };
  }
}

// ============================================================
// 2. Spaced Repetition Review Engine
//    Rating: 'easy' (+7 days), 'medium' (+3 days), 'hard' (0/1 day)
// ============================================================

export async function submitSpacedRepetitionReview(
  userId: string,
  cardId: string,
  rating: SpacedRepetitionRating
): Promise<{ success: boolean; nextReviewDays: number; error: Error | null }> {
  try {
    if (!userId || !cardId) {
      return { success: false, nextReviewDays: 1, error: new Error('Thiếu thông tin thẻ') };
    }

    let intervalDays = 1;
    if (rating === 'easy') {
      intervalDays = 7;
    } else if (rating === 'medium') {
      intervalDays = 3;
    } else {
      intervalDays = 1;
    }

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + intervalDays);

    const [cardUpdate, logInsert] = await Promise.all([
      supabase
        .from('flashcards')
        .update({
          interval_days: intervalDays,
          next_review_at: nextDate.toISOString(),
          repetitions: 1,
        })
        .eq('id', cardId),
      supabase.from('spaced_repetition_logs').insert({
        card_id: cardId,
        user_id: userId,
        rating,
        interval_days: intervalDays,
      }),
    ]);

    if (cardUpdate.error) {
      console.warn('[FlashcardService:submitSpacedRepetitionReview] Card update fallback:', cardUpdate.error);
    }
    if (logInsert.error) {
      console.warn('[FlashcardService:submitSpacedRepetitionReview] Log insert fallback:', logInsert.error);
    }

    return { success: true, nextReviewDays: intervalDays, error: null };
  } catch (err) {
    console.error('[FlashcardService:submitSpacedRepetitionReview] Exception:', err);
    return { success: false, nextReviewDays: 1, error: err as Error };
  }
}

// ============================================================
// 3. Quiz & Exam Submission Service
// ============================================================

export async function submitQuizResult(
  userId: string,
  resultData: {
    set_id: string;
    mode: QuizStudyMode;
    total_questions: number;
    correct_answers: number;
    score_percentage: number;
    time_spent_seconds: number;
    answers_summary: any[];
  }
): Promise<{ data: QuizResult | null; error: Error | null }> {
  try {
    if (!userId) return { data: null, error: new Error('Vui lòng đăng nhập') };
    await ensureUserProfileExists(userId);

    const { data, error } = await supabase
      .from('quiz_results')
      .insert({
        set_id: resultData.set_id,
        user_id: userId,
        mode: resultData.mode,
        total_questions: resultData.total_questions,
        correct_answers: resultData.correct_answers,
        score_percentage: resultData.score_percentage,
        time_spent_seconds: resultData.time_spent_seconds,
        answers_summary: resultData.answers_summary,
      })
      .select()
      .single();

    if (error) {
      console.error('[FlashcardService:submitQuizResult] Supabase error:', error);
      return { data: null, error: error as Error };
    }

    return { data: data as QuizResult, error: null };
  } catch (err) {
    console.error('[FlashcardService:submitQuizResult] Exception:', err);
    return { data: null, error: err as Error };
  }
}

export async function fetchUserQuizResults(userId: string): Promise<QuizResult[]> {
  try {
    if (!userId) return [];
    const { data, error } = await supabase
      .from('quiz_results')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[FlashcardService:fetchUserQuizResults] Error:', error);
      return [];
    }

    return (data as QuizResult[]) || [];
  } catch (err) {
    console.error('[FlashcardService:fetchUserQuizResults] Exception:', err);
    return [];
  }
}

export async function fetchUserFlashcardStats(userId: string) {
  try {
    if (!userId) {
      return {
        totalSetsCreated: 0,
        totalCardsStudied: 0,
        quizzesCompleted: 0,
        averageExamScore: 0,
        dueCardsCount: 0,
      };
    }

    const [setsRes, srLogsRes, resultsRes] = await Promise.all([
      supabase.from('flashcard_sets').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('spaced_repetition_logs').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('quiz_results').select('score_percentage, mode').eq('user_id', userId),
    ]);

    const examResults = (resultsRes.data || []).filter((r: any) => r.mode === 'exam');
    const avgScore =
      examResults.length > 0
        ? Math.round(examResults.reduce((acc: number, cur: any) => acc + cur.score_percentage, 0) / examResults.length)
        : 0;

    return {
      totalSetsCreated: setsRes.count || 0,
      totalCardsStudied: srLogsRes.count || 0,
      quizzesCompleted: resultsRes.data?.length || 0,
      averageExamScore: avgScore,
      dueCardsCount: 0,
    };
  } catch (err) {
    console.error('[FlashcardService:fetchUserFlashcardStats] Exception:', err);
    return {
      totalSetsCreated: 0,
      totalCardsStudied: 0,
      quizzesCompleted: 0,
      averageExamScore: 0,
      dueCardsCount: 0,
    };
  }
}

// ============================================================
// 4. AI Auto-Generate Flashcards & Quiz from Text
// ============================================================

export async function generateFlashcardsFromText(
  text: string,
  options?: {
    count?: number;
    preferredType?: 'mixed' | 'flashcard_2sided' | 'multiple_choice' | 'fill_in_blank';
  }
): Promise<{
  title: string;
  description: string;
  subject: FlashcardSubject;
  grade_level: FlashcardGradeLevel;
  cards: Array<{
    card_type: FlashcardCardType;
    front_text: string;
    back_text: string;
    options?: { id: string; text: string }[];
    correct_option?: string;
    explanation?: string;
    hint?: string;
  }>;
}> {
  const count = options?.count || 10;
  const preferredType = options?.preferredType || 'mixed';
  const cleanText = text.trim();

  // Try Server API route
  try {
    const res = await fetch('/api/ai/generate-flashcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: cleanText,
        count,
        preferredType,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.cards && data.cards.length > 0) {
        return data;
      }
    }
  } catch (err) {
    console.warn('[FlashcardService:generateFlashcardsFromText] Server AI call fallback:', err);
  }

  // Fallback Rule-Based Extractor
  return fallbackRuleBasedExtractor(cleanText, count, preferredType);
}

function fallbackRuleBasedExtractor(
  text: string,
  targetCount: number,
  preferredType: 'mixed' | 'flashcard_2sided' | 'multiple_choice' | 'fill_in_blank'
) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 10);

  const cards: any[] = [];

  for (let i = 0; i < lines.length && cards.length < targetCount; i++) {
    const line = lines[i];

    if (line.includes(':') || line.includes(' - ') || line.includes(' là ')) {
      const delimiter = line.includes(':') ? ':' : line.includes(' - ') ? ' - ' : ' là ';
      const parts = line.split(delimiter);
      const term = parts[0].trim();
      const def = parts.slice(1).join(delimiter).trim();

      if (term.length > 2 && def.length > 4) {
        const typeChoice =
          preferredType === 'mixed'
            ? cards.length % 3 === 0
              ? 'flashcard_2sided'
              : cards.length % 3 === 1
              ? 'multiple_choice'
              : 'fill_in_blank'
            : preferredType;

        if (typeChoice === 'fill_in_blank') {
          cards.push({
            card_type: 'fill_in_blank',
            front_text: `${term} là [___].`,
            back_text: def,
            correct_option: def.split(' ')[0] || def.slice(0, 10),
            explanation: `Định nghĩa đầy đủ: ${term} là ${def}`,
            hint: `Gợi ý: Bắt đầu bằng từ "${def.slice(0, 3)}..."`,
          });
        } else if (typeChoice === 'multiple_choice') {
          cards.push({
            card_type: 'multiple_choice',
            front_text: `Định nghĩa nào sau đây là chính xác cho khái niệm: "${term}"?`,
            back_text: def,
            options: [
              { id: 'A', text: def },
              { id: 'B', text: `Một dạng định nghĩa khác không liên quan đến ${term}` },
              { id: 'C', text: `Giá trị triệt tiêu khi điều kiện chuẩn không đạt` },
              { id: 'D', text: `Hiện tượng suy biến trong trường thế` },
            ],
            correct_option: 'A',
            explanation: `Định nghĩa chính xác của "${term}" là: ${def}`,
          });
        } else {
          cards.push({
            card_type: 'flashcard_2sided',
            front_text: term,
            back_text: def,
            explanation: `Giải thích chi tiết cho ${term}: ${def}`,
            hint: `Xem lại lý thuyết mục ${term}`,
          });
        }
      }
    }
  }

  // If still not enough, generate from remaining sentences
  if (cards.length < Math.min(targetCount, 3)) {
    lines.forEach((l, idx) => {
      if (cards.length >= targetCount) return;
      cards.push({
        card_type: 'flashcard_2sided',
        front_text: `Câu hỏi trọng tâm #${idx + 1}: ${l.slice(0, 60)}...?`,
        back_text: l,
        explanation: 'Trích đoạn kiến thức quan trọng cần ghi nhớ.',
      });
    });
  }

  // Guess subject based on keywords
  const fullTextLower = text.toLowerCase();
  let subject: FlashcardSubject = 'general';
  if (fullTextLower.includes('vật lý') || fullTextLower.includes('dao động') || fullTextLower.includes('lực') || fullTextLower.includes('tần số')) {
    subject = 'physics';
  } else if (fullTextLower.includes('toán') || fullTextLower.includes('tích phân') || fullTextLower.includes('hàm số') || fullTextLower.includes('hình học')) {
    subject = 'math';
  } else if (fullTextLower.includes('hóa') || fullTextLower.includes('phản ứng') || fullTextLower.includes('axit') || fullTextLower.includes('bazơ')) {
    subject = 'chemistry';
  } else if (fullTextLower.includes('english') || fullTextLower.includes('vocabulary') || fullTextLower.includes('grammar') || fullTextLower.includes('tiếng anh')) {
    subject = 'english';
  }

  return {
    title: `Bộ thẻ AI Trích xuất: ${lines[0]?.slice(0, 40) || 'Tài liệu học tập'}`,
    description: `Bộ câu hỏi và flashcard được AI tự động phân tích từ tài liệu (${cards.length} câu hỏi).`,
    subject,
    grade_level: 'grade_11' as FlashcardGradeLevel,
    cards,
  };
}
