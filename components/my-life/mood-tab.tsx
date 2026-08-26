'use client';

import { useState } from 'react';
import {
  logDailyMood,
  analyzeWeeklyMoodAndRecommendations,
  toggleHabitLog,
  addPresetHabit,
} from '@/lib/my-life-service';
import type { MoodEntry, Habit, HabitLog, MoodAnalysisResult, PresetHabit } from '@/lib/types';
import { moodEmoji, moodLabel, formatDate, formatRelativeTime } from '@/lib/helpers';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Heart,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Calendar,
  Lock,
  Loader2,
  CheckCircle2,
  PlusCircle,
  Flame,
  ArrowRight,
  Smile,
  Zap,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

const MOOD_OPTIONS = [
  { level: 1, label: 'Rất tệ', emoji: '😞', color: 'text-rose-500 bg-rose-500/10 border-rose-500/30' },
  { level: 2, label: 'Buồn / Áp lực', emoji: '😕', color: 'text-amber-500 bg-amber-500/10 border-amber-500/30' },
  { level: 3, label: 'Bình thường', emoji: '😐', color: 'text-blue-500 bg-blue-500/10 border-blue-500/30' },
  { level: 4, label: 'Vui vẻ / Tốt', emoji: '🙂', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30' },
  { level: 5, label: 'Tuyệt vời', emoji: '😄', color: 'text-primary bg-primary/10 border-primary/30' },
];

const EMOTION_TAGS = [
  '🙏 Biết ơn',
  '🍃 Bình yên',
  '⚡ Căng thẳng',
  '🚀 Năng động',
  '🥱 Mệt mỏi',
  '✨ Hào hứng',
  '💭 Lo lắng',
  '🏆 Tự hào',
  '📚 Áp lực thi',
  '💡 Tập trung',
];

interface MoodTabProps {
  currentUserId: string;
  moodEntries: MoodEntry[];
  userHabits: Habit[];
  habitLogs: HabitLog[];
  onMoodUpdated: () => void;
  onHabitsUpdated: () => void;
}

export function MoodTab({
  currentUserId,
  moodEntries,
  userHabits,
  habitLogs,
  onMoodUpdated,
  onHabitsUpdated,
}: MoodTabProps) {
  // Check-in form state
  const [selectedMood, setSelectedMood] = useState(4);
  const [note, setNote] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['🙏 Biết ơn']);
  const [savingMood, setSavingMood] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  // Check if today already has a mood entry
  const todayEntry = moodEntries.find(
    (m) =>
      m.entry_date === todayStr ||
      (m.created_at && m.created_at.split('T')[0] === todayStr)
  );

  // Compute 7-day history array
  const last7DaysData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const entry = moodEntries.find(
      (m) =>
        m.entry_date === dateStr ||
        (m.created_at && m.created_at.split('T')[0] === dateStr)
    );
    const dayLabel = d.toLocaleDateString('vi-VN', { weekday: 'short' });
    const formattedDate = d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' });

    last7DaysData.push({
      dateStr,
      dayLabel,
      formattedDate,
      entry,
      score: entry?.mood || 0,
    });
  }

  // Run weekly recommendation engine
  const analysis: MoodAnalysisResult = analyzeWeeklyMoodAndRecommendations(
    moodEntries,
    userHabits
  );

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSaveMood = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMood(true);
    try {
      const { data, error } = await logDailyMood(
        currentUserId,
        selectedMood,
        note,
        selectedTags,
        todayStr
      );

      if (error || !data) throw error || new Error('Failed to save mood');

      toast.success('Đã lưu nhật ký cảm xúc hôm nay!');
      setNote('');
      onMoodUpdated();
    } catch {
      toast.error('Không thể lưu cảm xúc. Vui lòng thử lại.');
    } finally {
      setSavingMood(false);
    }
  };

  const handleExecuteHabitAction = async (habit: Habit) => {
    setActionLoadingId(habit.id);
    try {
      const isAlreadyCompleted = habitLogs.some(
        (l) => l.habit_id === habit.id && l.completed_date === todayStr
      );

      if (isAlreadyCompleted) {
        toast.info(`Bạn đã hoàn thành thói quen "${habit.name}" trong ngày hôm nay rồi!`);
        return;
      }

      const { success, error } = await toggleHabitLog(
        currentUserId,
        habit.id,
        todayStr,
        false,
        habit.streak || 0
      );

      if (error || !success) throw error;

      toast.success(`🎉 Tuyệt vời! Đã hoàn thành thói quen "${habit.name}" để phục hồi tinh thần!`);
      onHabitsUpdated();
    } catch {
      toast.error('Không thể cập nhật thói quen');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAddSuggestedPreset = async (preset: PresetHabit) => {
    setActionLoadingId(preset.name);
    try {
      const { data, error } = await addPresetHabit(currentUserId, preset);
      if (error || !data) throw error;

      toast.success(`Đã thêm thói quen gợi ý "${preset.name}" vào danh sách Habits của bạn!`);
      onHabitsUpdated();
    } catch {
      toast.error('Không thể thêm thói quen');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. DAILY MOOD CHECK-IN */}
      <Card className="border-border/70 shadow-sm bg-card/90 backdrop-blur-sm overflow-hidden">
        <div className="bg-rose-500/5 px-5 py-3 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Heart className="h-4 w-4 text-rose-500" />
            Check-in Cảm xúc Hôm nay
          </div>
          <Badge variant="outline" className="text-[10px] gap-1 bg-muted/60 text-muted-foreground">
            <Lock className="h-2.5 w-2.5" /> Chế độ Cá nhân (Private)
          </Badge>
        </div>

        <form onSubmit={handleSaveMood}>
          <CardContent className="p-5 space-y-4">
            {/* Emotion 5-Face Buttons */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2.5">
                Bạn cảm thấy thế nào hôm nay?
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {MOOD_OPTIONS.map((item) => {
                  const isSelected = selectedMood === item.level;
                  return (
                    <button
                      key={item.level}
                      type="button"
                      onClick={() => setSelectedMood(item.level)}
                      className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                        isSelected
                          ? `${item.color} shadow-sm scale-105 ring-2 ring-primary/20`
                          : 'border-border/60 bg-muted/20 hover:bg-muted/60 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <span className="text-3xl">{item.emoji}</span>
                      <span className="text-xs font-semibold">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Emotion Tags */}
            <div className="space-y-1.5 pt-1">
              <p className="text-xs font-semibold text-muted-foreground">
                Gắn thẻ trạng thái cảm xúc:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {EMOTION_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleToggleTag(tag)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                      selectedTags.includes(tag)
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 font-medium'
                        : 'bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/70'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Reflection Note */}
            <div className="space-y-1.5 pt-1">
              <p className="text-xs font-semibold text-muted-foreground">
                Nhật ký ngắn / Lý do cảm xúc (Tùy chọn):
              </p>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Điều gì đã mang lại niềm vui hoặc làm bạn suy nghĩ trong ngày hôm nay?"
                rows={2}
                className="text-xs resize-none bg-muted/20 border-border/60"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              {todayEntry ? (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Hôm nay đã ghi nhận: {moodEmoji(todayEntry.mood)} {moodLabel(todayEntry.mood, 'vi')}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Ghi nhận hàng ngày giúp phát hiện chu kỳ cảm xúc
                </span>
              )}

              <Button
                type="submit"
                size="sm"
                disabled={savingMood}
                className="gap-1.5 text-xs font-semibold shadow-sm"
              >
                {savingMood && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {todayEntry ? 'Cập nhật cảm xúc' : 'Lưu cảm xúc hôm nay'}
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>

      {/* 2. 7-DAY MOOD HISTORY & TREND VISUALIZER */}
      <Card className="border-border/70 shadow-sm bg-card/90 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Lịch sử Cảm xúc 7 Ngày Gần nhất
            </CardTitle>
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
              Điểm TB: {analysis.averageMood}/5.0
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Theo dõi sự thay đổi và biến động cảm xúc theo chu kỳ 1 tuần.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Visual Chart Strip */}
          <div className="grid grid-cols-7 gap-2 pt-2 pb-1">
            {last7DaysData.map((d) => {
              const hasData = d.score > 0;
              const heightPercent = hasData ? (d.score / 5) * 100 : 15;

              return (
                <div
                  key={d.dateStr}
                  className="flex flex-col items-center gap-2 p-2 rounded-2xl bg-muted/20 border border-border/40 hover:bg-muted/40 transition-all"
                >
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {d.dayLabel}
                  </span>

                  {/* Vertical bar */}
                  <div className="h-28 w-8 rounded-xl bg-muted/60 flex flex-col justify-end p-1 relative overflow-hidden">
                    <div
                      className={`w-full rounded-lg transition-all duration-500 flex items-center justify-center ${
                        d.score >= 4
                          ? 'bg-emerald-500 text-white'
                          : d.score === 3
                          ? 'bg-blue-500 text-white'
                          : d.score > 0
                          ? 'bg-rose-500 text-white'
                          : 'bg-muted-foreground/20'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    >
                      {hasData && (
                        <span className="text-[10px] font-bold">{d.score}</span>
                      )}
                    </div>
                  </div>

                  {/* Emoji & Date */}
                  <span className="text-lg">
                    {hasData ? moodEmoji(d.score) : '—'}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{d.formattedDate}</span>
                </div>
              );
            })}
          </div>

          {/* Quick 3-Metric Summary Bar */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50 text-center">
            <div className="p-2.5 rounded-xl bg-muted/30">
              <p className="text-[11px] text-muted-foreground">Trạng thái chủ đạo</p>
              <p className="text-sm font-bold text-foreground mt-0.5 flex items-center justify-center gap-1">
                <span>{analysis.dominantMoodEmoji}</span> {analysis.dominantMood}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-muted/30">
              <p className="text-[11px] text-muted-foreground">Ngày tích cực</p>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {analysis.positiveCount} ngày (🙂/😄)
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-muted/30">
              <p className="text-[11px] text-muted-foreground">Ngày cần nạp lại</p>
              <p className="text-sm font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                {analysis.negativeCount} ngày (😞/😕)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. WEEKLY MOOD SUMMARY & HABIT RECOMMENDATION ENGINE */}
      <Card
        className={`border shadow-sm overflow-hidden ${
          analysis.trend === 'negative'
            ? 'border-amber-500/40 bg-gradient-to-br from-amber-500/5 via-card to-rose-500/5'
            : analysis.trend === 'positive'
            ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-500/5 via-card to-primary/5'
            : 'border-blue-500/40 bg-gradient-to-br from-blue-500/5 via-card to-card'
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              <CardTitle className="text-base font-display">
                Phân tích & Tổng kết Cảm xúc Cuối tuần
              </CardTitle>
            </div>
            <Badge
              variant="outline"
              className={`text-xs px-2.5 py-0.5 font-semibold ${
                analysis.trend === 'negative'
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                  : analysis.trend === 'positive'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
              }`}
            >
              {analysis.trend === 'negative'
                ? 'Cần nạp năng lượng ☕'
                : analysis.trend === 'positive'
                ? 'Tuần tích cực 🌟'
                : 'Cân bằng & Ổn định 🍃'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Analysis & Advice Content */}
          <div className="p-4 rounded-2xl bg-background/80 border border-border/60 space-y-2">
            <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
              {analysis.trend === 'negative' ? (
                <TrendingDown className="h-4 w-4 text-amber-500" />
              ) : (
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              )}
              {analysis.title}
            </h4>
            <p className="text-xs text-foreground/90 leading-relaxed">
              {analysis.insight}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed pt-1 border-t border-border/40">
              💡 <span className="font-semibold text-foreground">Lời khuyên dành cho bạn:</span> {analysis.detailedAdvice}
            </p>
          </div>

          {/* DYNAMIC HABIT SUGGESTIONS LINKED FROM USER'S HABITS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-primary" />
                Gợi ý Thói quen Phù hợp dành riêng cho bạn
              </h4>
            </div>

            {analysis.recommendedHabits.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                Tiếp tục ghi lại cảm xúc để nhận gợi ý thói quen thông minh.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {analysis.recommendedHabits.map((item, idx) => {
                  const habit = item.habit;
                  const preset = item.presetSuggestion;
                  const isUserHabit = item.actionType === 'check_in' && habit;

                  const habitName = habit?.name || preset?.name || 'Thói quen';
                  const habitIcon = habit?.icon || preset?.icon || '✅';
                  const isCompletedToday = habit
                    ? habitLogs.some((l) => l.habit_id === habit.id && l.completed_date === todayStr)
                    : false;

                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl border border-border/60 bg-card hover:border-primary/40 transition-all flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{habitIcon}</span>
                            <span className="text-xs font-bold text-foreground truncate">
                              {habitName}
                            </span>
                          </div>
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20"
                          >
                            {isUserHabit ? 'Từ Habits của bạn' : 'Gợi ý thêm mới'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {item.reason}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-border/40 flex justify-end">
                        {isUserHabit && habit ? (
                          <Button
                            size="sm"
                            disabled={isCompletedToday || actionLoadingId === habit.id}
                            onClick={() => handleExecuteHabitAction(habit)}
                            className={`h-7 text-xs px-3 rounded-lg gap-1 font-semibold ${
                              isCompletedToday ? 'bg-emerald-500/20 text-emerald-600' : ''
                            }`}
                          >
                            {actionLoadingId === habit.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : isCompletedToday ? (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Đã hoàn thành
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5" /> Thực hiện ngay
                              </>
                            )}
                          </Button>
                        ) : preset ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actionLoadingId === preset.name}
                            onClick={() => handleAddSuggestedPreset(preset)}
                            className="h-7 text-xs px-3 rounded-lg gap-1 border-primary/40 text-primary hover:bg-primary/10 font-semibold"
                          >
                            {actionLoadingId === preset.name ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <PlusCircle className="h-3.5 w-3.5" /> Thêm vào Habits
                              </>
                            )}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
