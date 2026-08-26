import { supabase } from './supabase';
import type {
  Habit,
  HabitLog,
  PresetHabit,
  MoodEntry,
  MoodAnalysisResult,
  JournalEntry,
  JournalComment,
  JournalReaction,
  Friendship,
  Profile,
} from './types';

// Helper to ensure profile exists for user before foreign key operations
async function ensureUserProfileExists(userId: string): Promise<void> {
  try {
    const { data } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle();
    if (!data) {
      console.warn('[MyLifeService] User profile missing, auto-creating profile for:', userId);
      await supabase.from('profiles').upsert({
        id: userId,
        username: `student_${userId.slice(0, 8)}`,
        full_name: 'Học sinh Life OS',
        profile_visibility: 'public',
      });
    }
  } catch (err) {
    console.error('[MyLifeService] Error in ensureUserProfileExists:', err);
  }
}

// Helper to format error details
function formatSupabaseError(context: string, err: any): Error {
  const message = err?.message || err?.details || err?.hint || 'Lỗi không xác định từ máy chủ';
  console.error(`[MyLifeService:${context}] Database Error:`, {
    message: err?.message,
    details: err?.details,
    hint: err?.hint,
    code: err?.code,
  });
  return new Error(message);
}

// ============================================================
// 1. Preset Habits Library
// ============================================================

export const PRESET_HABITS: PresetHabit[] = [
  {
    name: 'Đọc sách 20 phút',
    icon: '📖',
    category: 'study',
    description: 'Đọc sách phát triển bản thân hoặc chuyên môn mỗi ngày',
    suggestedTarget: 7,
    color: 'emerald',
    tags: ['học tập', 'tri thức', 'tập trung'],
  },
  {
    name: 'Chạy bộ rèn sức bền',
    icon: '🏃',
    category: 'fitness',
    description: 'Chạy bộ 2-5km ngoài trời hoặc trên máy chạy',
    suggestedTarget: 4,
    color: 'orange',
    tags: ['thể chất', 'sức khỏe', 'giải tỏa stress'],
  },
  {
    name: 'Thiền định 10 phút',
    icon: '🧘',
    category: 'mindfulness',
    description: 'Ngồi thiền hoặc hít thở sâu để tĩnh tâm và tái tạo năng lượng',
    suggestedTarget: 7,
    color: 'purple',
    tags: ['tâm trí', 'bình an', 'giảm căng thẳng'],
  },
  {
    name: 'Bơi lội thể thao',
    icon: '🏊',
    category: 'fitness',
    description: 'Bơi lội rèn luyện toàn diện cơ bắp và hệ hô hấp',
    suggestedTarget: 3,
    color: 'cyan',
    tags: ['thể thao', 'sảng khoái', 'sức bền'],
  },
  {
    name: 'Tập thể dục / Gym',
    icon: '💪',
    category: 'fitness',
    description: 'Vận động thể hình, chống đẩy hoặc cardio tại nhà',
    suggestedTarget: 5,
    color: 'rose',
    tags: ['cơ bắp', 'năng lượng', 'sức khỏe'],
  },
  {
    name: 'Học tiếng Anh 30 phút',
    icon: '🗣️',
    category: 'study',
    description: 'Luyện từ vựng, nghe podcast hoặc phát âm tiếng Anh',
    suggestedTarget: 6,
    color: 'blue',
    tags: ['ngoại ngữ', 'kỹ năng', 'tương lai'],
  },
  {
    name: 'Viết code & Giải thuật',
    icon: '💻',
    category: 'study',
    description: 'Luyện tập coding, giải bài LeetCode hoặc làm project',
    suggestedTarget: 5,
    color: 'indigo',
    tags: ['lập trình', 'tư duy logic', 'dự án'],
  },
  {
    name: 'Uống đủ 2L nước',
    icon: '💧',
    category: 'health',
    description: 'Duy trì đủ nước cho cơ thể và não bộ hoạt động tối ưu',
    suggestedTarget: 7,
    color: 'teal',
    tags: ['thanh lọc', 'sức khỏe', 'nước'],
  },
  {
    name: 'Ngủ trước 23:00',
    icon: '😴',
    category: 'health',
    description: 'Đi ngủ đúng giờ để phục hồi trí não và thể lực',
    suggestedTarget: 7,
    color: 'violet',
    tags: ['giấc ngủ', 'phục hồi', 'kỷ luật'],
  },
  {
    name: 'Viết nhật ký phản tư',
    icon: '✍️',
    category: 'mindfulness',
    description: 'Ghi lại 3 điều biết ơn và bài học tâm đắc trong ngày',
    suggestedTarget: 7,
    color: 'amber',
    tags: ['chiêm nghiệm', 'biết ơn', 'tự nhìn nhận'],
  },
];

// ============================================================
// 2. Habits Service (Private Mode)
// ============================================================

export async function fetchUserHabits(userId: string): Promise<Habit[]> {
  try {
    if (!userId) return [];
    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      formatSupabaseError('fetchUserHabits', error);
      return [];
    }
    return (data as Habit[]) || [];
  } catch (err) {
    console.error('[MyLifeService:fetchUserHabits] Unexpected error:', err);
    return [];
  }
}

export async function fetchHabitLogsForDates(
  userId: string,
  startDate: string,
  endDate: string
): Promise<HabitLog[]> {
  try {
    if (!userId) return [];
    const { data, error } = await supabase
      .from('habit_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('completed_date', startDate)
      .lte('completed_date', endDate);

    if (error) {
      formatSupabaseError('fetchHabitLogsForDates', error);
      return [];
    }
    return (data as HabitLog[]) || [];
  } catch (err) {
    console.error('[MyLifeService:fetchHabitLogsForDates] Unexpected error:', err);
    return [];
  }
}

export async function createCustomHabit(
  userId: string,
  habit: {
    name: string;
    icon?: string;
    category?: string;
    color?: string;
    frequency?: string;
    target_days_per_week?: number;
  }
): Promise<{ data: Habit | null; error: Error | null }> {
  try {
    if (!userId || !habit.name.trim()) {
      return { data: null, error: new Error('Thiếu thông tin người dùng hoặc tên thói quen') };
    }

    await ensureUserProfileExists(userId);

    const payload: any = {
      user_id: userId,
      name: habit.name.trim(),
      icon: habit.icon || '✅',
      category: habit.category || 'general',
      color: habit.color || 'teal',
      frequency: habit.frequency || 'daily',
      target_days_per_week: habit.target_days_per_week || 7,
      streak: 0,
      is_preset: false,
    };

    let { data, error } = await supabase.from('habits').insert(payload).select().single();

    // Fallback if extended columns are not yet in DB
    if (error && error.message?.includes('column')) {
      console.warn('[MyLifeService:createCustomHabit] Extended columns missing, falling back to core fields');
      const corePayload = {
        user_id: userId,
        name: habit.name.trim(),
        icon: habit.icon || '✅',
        frequency: 'daily',
        streak: 0,
      };
      const fallbackRes = await supabase.from('habits').insert(corePayload).select().single();
      data = fallbackRes.data;
      error = fallbackRes.error;
    }

    if (error) {
      return { data: null, error: formatSupabaseError('createCustomHabit', error) };
    }
    return { data: data as Habit, error: null };
  } catch (err) {
    console.error('[MyLifeService:createCustomHabit] Exception:', err);
    return { data: null, error: err as Error };
  }
}

export async function addPresetHabit(
  userId: string,
  preset: PresetHabit
): Promise<{ data: Habit | null; error: Error | null }> {
  try {
    if (!userId) return { data: null, error: new Error('Người dùng chưa đăng nhập') };

    await ensureUserProfileExists(userId);

    const payload: any = {
      user_id: userId,
      name: preset.name,
      icon: preset.icon,
      category: preset.category,
      color: preset.color,
      frequency: 'daily',
      target_days_per_week: preset.suggestedTarget,
      streak: 0,
      is_preset: true,
    };

    let { data, error } = await supabase.from('habits').insert(payload).select().single();

    if (error && error.message?.includes('column')) {
      console.warn('[MyLifeService:addPresetHabit] Falling back to core columns');
      const corePayload = {
        user_id: userId,
        name: preset.name,
        icon: preset.icon,
        frequency: 'daily',
        streak: 0,
      };
      const fallbackRes = await supabase.from('habits').insert(corePayload).select().single();
      data = fallbackRes.data;
      error = fallbackRes.error;
    }

    if (error) {
      return { data: null, error: formatSupabaseError('addPresetHabit', error) };
    }
    return { data: data as Habit, error: null };
  } catch (err) {
    console.error('[MyLifeService:addPresetHabit] Exception:', err);
    return { data: null, error: err as Error };
  }
}

export async function toggleHabitLog(
  userId: string,
  habitId: string,
  date: string,
  isCurrentlyCompleted: boolean,
  currentStreak: number
): Promise<{ success: boolean; newStreak: number; error: Error | null }> {
  try {
    if (!userId || !habitId) return { success: false, newStreak: currentStreak, error: new Error('Thiếu ID') };

    await ensureUserProfileExists(userId);

    if (isCurrentlyCompleted) {
      const { error } = await supabase
        .from('habit_logs')
        .delete()
        .eq('habit_id', habitId)
        .eq('user_id', userId)
        .eq('completed_date', date);

      if (error) {
        return { success: false, newStreak: currentStreak, error: formatSupabaseError('toggleHabitLog:delete', error) };
      }

      const newStreak = Math.max(0, currentStreak - 1);
      await supabase.from('habits').update({ streak: newStreak }).eq('id', habitId);

      return { success: true, newStreak, error: null };
    } else {
      const { error } = await supabase
        .from('habit_logs')
        .insert({
          habit_id: habitId,
          user_id: userId,
          completed_date: date,
        });

      if (error) {
        return { success: false, newStreak: currentStreak, error: formatSupabaseError('toggleHabitLog:insert', error) };
      }

      const newStreak = currentStreak + 1;
      await supabase.from('habits').update({ streak: newStreak }).eq('id', habitId);

      return { success: true, newStreak, error: null };
    }
  } catch (err) {
    console.error('[MyLifeService:toggleHabitLog] Exception:', err);
    return { success: false, newStreak: currentStreak, error: err as Error };
  }
}

export async function deleteHabit(habitId: string): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase.from('habits').delete().eq('id', habitId);
    if (error) {
      return { success: false, error: formatSupabaseError('deleteHabit', error) };
    }
    return { success: true, error: null };
  } catch (err) {
    console.error('[MyLifeService:deleteHabit] Exception:', err);
    return { success: false, error: err as Error };
  }
}

// ============================================================
// 3. Mood Tracker Service & Weekly Recommendation Engine
// ============================================================

export async function fetchMoodEntries(userId: string, limitDays = 14): Promise<MoodEntry[]> {
  try {
    if (!userId) return [];
    const { data, error } = await supabase
      .from('mood_entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limitDays);

    if (error) {
      formatSupabaseError('fetchMoodEntries', error);
      return [];
    }
    return (data as MoodEntry[]) || [];
  } catch (err) {
    console.error('[MyLifeService:fetchMoodEntries] Unexpected error:', err);
    return [];
  }
}

export async function logDailyMood(
  userId: string,
  mood: number,
  note?: string,
  tags: string[] = [],
  entryDate?: string
): Promise<{ data: MoodEntry | null; error: Error | null }> {
  try {
    if (!userId) return { data: null, error: new Error('Người dùng chưa đăng nhập') };

    await ensureUserProfileExists(userId);

    const today = entryDate || new Date().toISOString().split('T')[0];
    const payload: any = {
      user_id: userId,
      mood: Number(mood) || 3,
      note: note?.trim() || null,
      tags: tags || [],
      entry_date: today,
    };

    let { data, error } = await supabase
      .from('mood_entries')
      .insert(payload)
      .select()
      .single();

    // Fallback if entry_date or tags column is missing on remote DB
    if (error && error.message?.includes('column')) {
      console.warn('[MyLifeService:logDailyMood] Falling back to core columns for mood_entries');
      const corePayload = {
        user_id: userId,
        mood: Number(mood) || 3,
        note: note?.trim() || null,
      };
      const fallbackRes = await supabase.from('mood_entries').insert(corePayload).select().single();
      data = fallbackRes.data;
      error = fallbackRes.error;
    }

    if (error) {
      return { data: null, error: formatSupabaseError('logDailyMood', error) };
    }
    return { data: data as MoodEntry, error: null };
  } catch (err) {
    console.error('[MyLifeService:logDailyMood] Exception:', err);
    return { data: null, error: err as Error };
  }
}

export function analyzeWeeklyMoodAndRecommendations(
  moodEntries: MoodEntry[],
  userHabits: Habit[]
): MoodAnalysisResult {
  const recentEntries = moodEntries.slice(0, 7);

  if (recentEntries.length === 0) {
    return {
      averageMood: 3,
      trend: 'neutral',
      dominantMood: 'Bình thường',
      dominantMoodEmoji: '😐',
      positiveCount: 0,
      negativeCount: 0,
      neutralCount: 0,
      totalLoggedDays: 0,
      title: 'Chưa có đủ dữ liệu tuần',
      insight: 'Hãy bắt đầu ghi lại cảm xúc mỗi ngày để Life OS có thể phân tích và đưa ra lời khuyên phù hợp cho bạn.',
      detailedAdvice: 'Chỉ cần dành 30 giây mỗi tối để chọn cảm xúc và ghi lại vài dòng suy nghĩ ngắn.',
      recommendedHabits: [],
    };
  }

  let totalScore = 0;
  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;

  const moodCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  for (const entry of recentEntries) {
    totalScore += entry.mood;
    moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
    if (entry.mood >= 4) positiveCount++;
    else if (entry.mood <= 2) negativeCount++;
    else neutralCount++;
  }

  const averageMood = Number((totalScore / recentEntries.length).toFixed(1));

  let dominantMoodLevel = 3;
  let maxCount = -1;
  for (let m = 1; m <= 5; m++) {
    if ((moodCounts[m] || 0) > maxCount) {
      maxCount = moodCounts[m] || 0;
      dominantMoodLevel = m;
    }
  }

  const moodLabels = ['Rất tệ', 'Buồn bã / Áp lực', 'Bình thường', 'Vui vẻ / Tích cực', 'Tuyệt vời'];
  const moodEmojis = ['😞', '😕', '😐', '🙂', '😄'];
  const dominantMood = moodLabels[dominantMoodLevel - 1];
  const dominantMoodEmoji = moodEmojis[dominantMoodLevel - 1];

  if (negativeCount >= 3 || averageMood < 2.8) {
    const wellnessHabits = userHabits.filter((h) =>
      ['mindfulness', 'fitness', 'health'].includes(h.category || '') ||
      h.name.toLowerCase().includes('thiền') ||
      h.name.toLowerCase().includes('chạy') ||
      h.name.toLowerCase().includes('sách') ||
      h.name.toLowerCase().includes('nước') ||
      h.name.toLowerCase().includes('ngủ') ||
      h.name.toLowerCase().includes('thể dục') ||
      h.name.toLowerCase().includes('bơi')
    );

    const recommendations: MoodAnalysisResult['recommendedHabits'] = [];

    if (wellnessHabits.length > 0) {
      wellnessHabits.slice(0, 3).forEach((h) => {
        let reason = 'Giúp xua tan mệt mỏi và tái tạo năng lượng';
        if (h.name.toLowerCase().includes('thiền')) {
          reason = 'Thiền định giúp thả lỏng tâm trí và giảm áp lực học tập ngay tức thì.';
        } else if (h.name.toLowerCase().includes('chạy') || h.name.toLowerCase().includes('thể dục') || h.name.toLowerCase().includes('bơi')) {
          reason = 'Vận động thể chất kích thích hormone endorphin giúp cải thiện tâm trạng nhanh chóng.';
        } else if (h.name.toLowerCase().includes('sách')) {
          reason = 'Đọc vài trang sách giúp bạn lắng đọng và tìm lại sự bình yên.';
        } else if (h.name.toLowerCase().includes('ngủ')) {
          reason = 'Giấc ngủ ngon là liều thuốc tốt nhất khi cơ thể và tinh thần kiệt sức.';
        }
        recommendations.push({
          habit: h,
          reason,
          actionType: 'check_in',
        });
      });
    }

    if (recommendations.length < 2) {
      const presetsToSuggest = PRESET_HABITS.filter(
        (p) =>
          ['Thiền định 10 phút', 'Chạy bộ rèn sức bền', 'Ngủ trước 23:00', 'Uống đủ 2L nước'].includes(p.name) &&
          !userHabits.some((uh) => uh.name.toLowerCase().includes(p.name.toLowerCase().slice(0, 4)))
      );

      presetsToSuggest.slice(0, 2).forEach((p) => {
        recommendations.push({
          presetSuggestion: p,
          reason: `Hệ thống gợi ý bạn bổ sung thói quen "${p.name}" để chủ động chăm sóc sức khỏe tinh thần.`,
          actionType: 'add_habit',
        });
      });
    }

    return {
      averageMood,
      trend: 'negative',
      dominantMood,
      dominantMoodEmoji,
      positiveCount,
      negativeCount,
      neutralCount,
      totalLoggedDays: recentEntries.length,
      title: 'Tuần này có đôi chút căng thẳng & áp lực ☕',
      insight: `Bạn đã trải qua ${negativeCount} ngày có cảm xúc chưa được tốt trong tuần qua (Điểm trung bình: ${averageMood}/5.0). Điều này hoàn toàn bình thường trong quá trình học tập và phát triển.`,
      detailedAdvice:
        'Hãy cho phép bản thân nghỉ ngơi ngắn, hít thở sâu và không tự tạo thêm áp lực. Dưới đây là những thói quen phục hồi từ chính danh sách của bạn giúp lấy lại cân bằng:',
      recommendedHabits: recommendations,
    };
  } else if (positiveCount >= 3 || averageMood >= 3.6) {
    const highStreakHabits = [...userHabits].sort((a, b) => b.streak - a.streak).slice(0, 2);
    const recommendations: MoodAnalysisResult['recommendedHabits'] = [];

    if (highStreakHabits.length > 0) {
      highStreakHabits.forEach((h) => {
        recommendations.push({
          habit: h,
          reason: `Duy trì chuỗi ${h.streak} ngày thói quen "${h.name}" đang tạo động lực rất lớn cho bạn!`,
          actionType: 'check_in',
        });
      });
    }

    const studyPreset = PRESET_HABITS.find((p) => p.name.includes('Viết code') || p.name.includes('Đọc sách'));
    if (studyPreset && !userHabits.some((uh) => uh.name.includes(studyPreset.name.slice(0, 4)))) {
      recommendations.push({
        presetSuggestion: studyPreset,
        reason: 'Khi năng lượng dồi dào, hãy thử thách bản thân với mục tiêu học tập mới!',
        actionType: 'add_habit',
      });
    }

    return {
      averageMood,
      trend: 'positive',
      dominantMood,
      dominantMoodEmoji,
      positiveCount,
      negativeCount,
      neutralCount,
      totalLoggedDays: recentEntries.length,
      title: 'Tuần lễ tràn đầy năng lượng tích cực! 🌟',
      insight: `Xuất sắc! Bạn đã có ${positiveCount} ngày cảm xúc tích cực với mức điểm trung bình ${averageMood}/5.0. Năng lượng này sẽ là đòn bẩy tuyệt vời cho các mục tiêu sắp tới.`,
      detailedAdvice:
        'Hãy tiếp tục duy trì nhịp độ này, ghi nhận những thành quả nhỏ của bản thân và chia sẻ niềm cảm hứng học tập đến bạn bè trong cộng đồng!',
      recommendedHabits: recommendations,
    };
  } else {
    const recommendations: MoodAnalysisResult['recommendedHabits'] = [];
    if (userHabits.length > 0) {
      recommendations.push({
        habit: userHabits[0],
        reason: 'Duy trì đều đặn thói quen mỗi ngày giúp giữ vững sự ổn định.',
        actionType: 'check_in',
      });
    }

    return {
      averageMood,
      trend: 'neutral',
      dominantMood,
      dominantMoodEmoji,
      positiveCount,
      negativeCount,
      neutralCount,
      totalLoggedDays: recentEntries.length,
      title: 'Tuần lễ ổn định & cân bằng 🍃',
      insight: `Bạn đang giữ được trạng thái ổn định với mức điểm cảm xúc ${averageMood}/5.0. Sự kiên trì thầm lặng mỗi ngày là chìa khóa cho sự bứt phá.`,
      detailedAdvice:
        'Hãy đặt thêm 1 mục tiêu nhỏ thú vị cho tuần tới để thêm phần hào hứng và duy trì đều đặn các thói quen tốt nhé!',
      recommendedHabits: recommendations,
    };
  }
}

// ============================================================
// 4. Friendships Service (Friend Connections)
// ============================================================

export async function fetchConnectedFriends(userId: string): Promise<Profile[]> {
  try {
    if (!userId) return [];
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        id,
        user_id,
        friend_id,
        status,
        user:profiles!friendships_user_id_fkey(*),
        friend:profiles!friendships_friend_id_fkey(*)
      `)
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .eq('status', 'accepted');

    if (error) {
      formatSupabaseError('fetchConnectedFriends', error);
      return [];
    }

    const friends: Profile[] = [];
    (data || []).forEach((row: any) => {
      if (row.user_id === userId && row.friend) {
        friends.push(row.friend as Profile);
      } else if (row.friend_id === userId && row.user) {
        friends.push(row.user as Profile);
      }
    });

    return friends;
  } catch (err) {
    console.error('[MyLifeService:fetchConnectedFriends] Unexpected error:', err);
    return [];
  }
}

export async function connectWithUser(
  currentUserId: string,
  targetUserId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    if (!currentUserId || !targetUserId) {
      return { success: false, error: new Error('Thiếu thông tin người dùng') };
    }

    await ensureUserProfileExists(currentUserId);
    await ensureUserProfileExists(targetUserId);

    const { error } = await supabase.from('friendships').insert({
      user_id: currentUserId,
      friend_id: targetUserId,
      status: 'accepted',
    });

    if (error) {
      return { success: false, error: formatSupabaseError('connectWithUser', error) };
    }
    return { success: true, error: null };
  } catch (err) {
    console.error('[MyLifeService:connectWithUser] Exception:', err);
    return { success: false, error: err as Error };
  }
}

// ============================================================
// 5. Learning Journal Service (Social & Friends Interactions)
// ============================================================

export async function fetchJournalFeed(
  userId: string,
  filter: 'friends' | 'mine' | 'public' = 'friends'
): Promise<JournalEntry[]> {
  try {
    if (!userId) return [];

    let query = supabase
      .from('journal_entries')
      .select(`
        *,
        author:profiles(*)
      `)
      .order('created_at', { ascending: false })
      .limit(30);

    if (filter === 'mine') {
      query = query.eq('user_id', userId);
    } else if (filter === 'public') {
      query = query.eq('visibility', 'public');
    } else {
      query = query.or(`user_id.eq.${userId},visibility.eq.friends,visibility.eq.public`);
    }

    const { data: entries, error } = await query;
    if (error) {
      formatSupabaseError('fetchJournalFeed', error);
      return [];
    }

    if (!entries || entries.length === 0) return [];

    const journalIds = entries.map((e) => e.id);

    const [reactionsRes, commentsRes] = await Promise.all([
      supabase
        .from('journal_reactions')
        .select('*, user_profile:profiles(*)')
        .in('journal_id', journalIds),
      supabase
        .from('journal_comments')
        .select('*, author:profiles(*)')
        .in('journal_id', journalIds)
        .order('created_at', { ascending: true }),
    ]);

    const reactionsMap: Record<string, JournalReaction[]> = {};
    const commentsMap: Record<string, JournalComment[]> = {};

    (reactionsRes.data || []).forEach((r: any) => {
      if (!reactionsMap[r.journal_id]) reactionsMap[r.journal_id] = [];
      reactionsMap[r.journal_id].push(r as JournalReaction);
    });

    (commentsRes.data || []).forEach((c: any) => {
      if (!commentsMap[c.journal_id]) commentsMap[c.journal_id] = [];
      commentsMap[c.journal_id].push(c as JournalComment);
    });

    return entries.map((entry) => {
      const entryReactions = reactionsMap[entry.id] || [];
      const userReaction = entryReactions.find((r) => r.user_id === userId)?.reaction_type || null;

      return {
        ...(entry as JournalEntry),
        reactions: entryReactions,
        comments: commentsMap[entry.id] || [],
        user_has_reacted: userReaction,
      };
    });
  } catch (err) {
    console.error('[MyLifeService:fetchJournalFeed] Unexpected error:', err);
    return [];
  }
}

export async function createJournalEntry(
  userId: string,
  payload: {
    title?: string;
    content: string;
    mood?: number;
    tags?: string[];
    visibility?: 'friends' | 'private' | 'public';
    images?: string[];
  }
): Promise<{ data: JournalEntry | null; error: Error | null }> {
  try {
    if (!userId || !payload.content.trim()) {
      return { data: null, error: new Error('Thiếu thông tin người dùng hoặc nội dung') };
    }

    await ensureUserProfileExists(userId);

    const visibility = payload.visibility || 'friends';
    const insertPayload: any = {
      user_id: userId,
      title: payload.title?.trim() || null,
      content: payload.content.trim(),
      mood: payload.mood || 3,
      tags: payload.tags || [],
      visibility,
      is_private: visibility === 'private',
      images: payload.images || [],
    };

    let { data, error } = await supabase
      .from('journal_entries')
      .insert(insertPayload)
      .select(`
        *,
        author:profiles(*)
      `)
      .single();

    // Fallback if visibility or tags column is missing on remote DB
    if (error && error.message?.includes('column')) {
      console.warn('[MyLifeService:createJournalEntry] Falling back to core columns for journal_entries');
      const corePayload = {
        user_id: userId,
        title: payload.title?.trim() || null,
        content: payload.content.trim(),
        mood: payload.mood || 3,
        is_private: visibility === 'private',
      };
      const fallbackRes = await supabase
        .from('journal_entries')
        .insert(corePayload)
        .select(`*, author:profiles(*)`)
        .single();
      data = fallbackRes.data;
      error = fallbackRes.error;
    }

    if (error) {
      return { data: null, error: formatSupabaseError('createJournalEntry', error) };
    }
    return { data: data as JournalEntry, error: null };
  } catch (err) {
    console.error('[MyLifeService:createJournalEntry] Exception:', err);
    return { data: null, error: err as Error };
  }
}

export async function deleteJournalEntry(journalId: string): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase.from('journal_entries').delete().eq('id', journalId);
    if (error) {
      return { success: false, error: formatSupabaseError('deleteJournalEntry', error) };
    }
    return { success: true, error: null };
  } catch (err) {
    console.error('[MyLifeService:deleteJournalEntry] Exception:', err);
    return { success: false, error: err as Error };
  }
}

export async function toggleJournalReaction(
  userId: string,
  journalId: string,
  reactionType = '❤️'
): Promise<{ success: boolean; added: boolean; error: Error | null }> {
  try {
    if (!userId || !journalId) return { success: false, added: false, error: new Error('Thiếu ID') };

    await ensureUserProfileExists(userId);

    const { data: existing } = await supabase
      .from('journal_reactions')
      .select('id, reaction_type')
      .eq('journal_id', journalId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      if (existing.reaction_type === reactionType) {
        await supabase.from('journal_reactions').delete().eq('id', existing.id);
        return { success: true, added: false, error: null };
      } else {
        await supabase
          .from('journal_reactions')
          .update({ reaction_type: reactionType })
          .eq('id', existing.id);
        return { success: true, added: true, error: null };
      }
    } else {
      const { error } = await supabase.from('journal_reactions').insert({
        journal_id: journalId,
        user_id: userId,
        reaction_type: reactionType,
      });
      if (error) {
        return { success: false, added: false, error: formatSupabaseError('toggleJournalReaction', error) };
      }
      return { success: true, added: true, error: null };
    }
  } catch (err) {
    console.error('[MyLifeService:toggleJournalReaction] Exception:', err);
    return { success: false, added: false, error: err as Error };
  }
}

export async function addJournalComment(
  userId: string,
  journalId: string,
  content: string
): Promise<{ data: JournalComment | null; error: Error | null }> {
  try {
    if (!userId || !journalId || !content.trim()) {
      return { data: null, error: new Error('Nội dung bình luận không được để trống') };
    }

    await ensureUserProfileExists(userId);

    const { data, error } = await supabase
      .from('journal_comments')
      .insert({
        journal_id: journalId,
        author_id: userId,
        content: content.trim(),
      })
      .select(`
        *,
        author:profiles(*)
      `)
      .single();

    if (error) {
      return { data: null, error: formatSupabaseError('addJournalComment', error) };
    }
    return { data: data as JournalComment, error: null };
  } catch (err) {
    console.error('[MyLifeService:addJournalComment] Exception:', err);
    return { data: null, error: err as Error };
  }
}

export async function deleteJournalComment(commentId: string): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase.from('journal_comments').delete().eq('id', commentId);
    if (error) {
      return { success: false, error: formatSupabaseError('deleteJournalComment', error) };
    }
    return { success: true, error: null };
  } catch (err) {
    console.error('[MyLifeService:deleteJournalComment] Exception:', err);
    return { success: false, error: err as Error };
  }
}

export async function shareJournalEntry(
  userId: string,
  journalId: string,
  note?: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    if (!userId || !journalId) return { success: false, error: new Error('Thiếu ID') };

    await ensureUserProfileExists(userId);

    const { error } = await supabase.from('journal_shares').insert({
      journal_id: journalId,
      user_id: userId,
      note: note?.trim() || null,
    });

    if (error) {
      return { success: false, error: formatSupabaseError('shareJournalEntry', error) };
    }
    return { success: true, error: null };
  } catch (err) {
    console.error('[MyLifeService:shareJournalEntry] Exception:', err);
    return { success: false, error: err as Error };
  }
}
