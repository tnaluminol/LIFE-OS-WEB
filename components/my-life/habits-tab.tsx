'use client';

import { useState } from 'react';
import {
  PRESET_HABITS,
  createCustomHabit,
  addPresetHabit,
  toggleHabitLog,
  deleteHabit,
} from '@/lib/my-life-service';
import type { Habit, HabitLog, PresetHabit, HabitCategory } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  CheckCircle2,
  Circle,
  Plus,
  Flame,
  Sparkles,
  BookOpen,
  Trash2,
  Calendar,
  Loader2,
  Lock,
  Zap,
  Target,
} from 'lucide-react';
import { toast } from 'sonner';

const EMOJI_OPTIONS = ['📖', '🏃', '🧘', '🏊', '💪', '🗣️', '💻', '💧', '😴', '✍️', '🍎', '🎯', '🎸', '🎨', '🚴', '🌱'];
const CATEGORY_OPTIONS: { id: HabitCategory; label: string }[] = [
  { id: 'study', label: 'Học tập' },
  { id: 'fitness', label: 'Thể chất' },
  { id: 'mindfulness', label: 'Tâm trí & Thiền' },
  { id: 'health', label: 'Sức khỏe' },
  { id: 'productivity', label: 'Năng suất' },
  { id: 'general', label: 'Khác' },
];

interface HabitsTabProps {
  currentUserId: string;
  habits: Habit[];
  habitLogs: HabitLog[];
  onHabitsUpdated: () => void;
  presetModalOpen: boolean;
  onOpenPresetModalChange: (open: boolean) => void;
}

export function HabitsTab({
  currentUserId,
  habits,
  habitLogs,
  onHabitsUpdated,
  presetModalOpen,
  onOpenPresetModalChange,
}: HabitsTabProps) {
  // Custom habit creation modal state
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [habitName, setHabitName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('📖');
  const [selectedCategory, setSelectedCategory] = useState<HabitCategory>('study');
  const [targetDays, setTargetDays] = useState(7);
  const [submittingCustom, setSubmittingCustom] = useState(false);
  const [addingPresetKey, setAddingPresetKey] = useState<string | null>(null);

  // Today's date string YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

  // Helper to check if a habit is completed today
  const isHabitCompletedToday = (habitId: string) => {
    return habitLogs.some(
      (log) => log.habit_id === habitId && log.completed_date === todayStr
    );
  };

  // Calculate today's completion stats
  const completedTodayCount = habits.filter((h) => isHabitCompletedToday(h.id)).length;
  const completionRate = habits.length > 0 ? Math.round((completedTodayCount / habits.length) * 100) : 0;

  // Generate last 7 days for mini tracker
  const last7Days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last7Days.push(d.toISOString().split('T')[0]);
  }

  const handleToggleHabit = async (habit: Habit) => {
    const isCompleted = isHabitCompletedToday(habit.id);
    try {
      const { success, error } = await toggleHabitLog(
        currentUserId,
        habit.id,
        todayStr,
        isCompleted,
        habit.streak || 0
      );

      if (error || !success) throw error;

      toast.success(
        isCompleted
          ? `Đã hủy check-in thói quen "${habit.name}"`
          : `🎉 Tuyệt vời! Đã hoàn thành thói quen "${habit.name}" hôm nay!`
      );
      onHabitsUpdated();
    } catch {
      toast.error('Không thể cập nhật thói quen');
    }
  };

  const handleAddPreset = async (preset: PresetHabit) => {
    setAddingPresetKey(preset.name);
    try {
      const { data, error } = await addPresetHabit(currentUserId, preset);
      if (error || !data) throw error;

      toast.success(`Đã thêm thói quen "${preset.name}" vào danh sách!`);
      onHabitsUpdated();
      onOpenPresetModalChange(false);
    } catch {
      toast.error('Không thể thêm thói quen');
    } finally {
      setAddingPresetKey(null);
    }
  };

  const handleCreateCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitName.trim()) {
      toast.error('Vui lòng nhập tên thói quen');
      return;
    }

    setSubmittingCustom(true);
    try {
      const { data, error } = await createCustomHabit(currentUserId, {
        name: habitName.trim(),
        icon: selectedEmoji,
        category: selectedCategory,
        target_days_per_week: targetDays,
      });

      if (error || !data) throw error;

      toast.success('Đã tạo thói quen mới thành công!');
      setHabitName('');
      setSelectedEmoji('📖');
      setCustomModalOpen(false);
      onHabitsUpdated();
    } catch {
      toast.error('Không thể tạo thói quen');
    } finally {
      setSubmittingCustom(false);
    }
  };

  const handleDeleteHabit = async (habitId: string, habitName: string) => {
    if (!confirm(`Bạn có chắc muốn xóa thói quen "${habitName}" không?`)) return;
    try {
      const { success, error } = await deleteHabit(habitId);
      if (error || !success) throw error;
      toast.success('Đã xóa thói quen');
      onHabitsUpdated();
    } catch {
      toast.error('Không thể xóa thói quen');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. DAILY PROGRESS HERO CARD */}
      <Card className="border-border/70 bg-gradient-to-br from-card to-muted/30 shadow-sm overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs px-2.5">
                  <Lock className="h-3 w-3 mr-1" /> Chế độ Cá nhân (Private)
                </Badge>
                <span className="text-xs text-muted-foreground">Chỉ mình bạn nhìn thấy</span>
              </div>
              <h2 className="text-xl lg:text-2xl font-display font-bold">
                Tiến độ Thói quen Hôm nay
              </h2>
              <p className="text-sm text-muted-foreground">
                {habits.length === 0
                  ? 'Hãy thêm thói quen đầu tiên để bắt đầu xây dựng lối sống kỷ luật và cân bằng.'
                  : completedTodayCount === habits.length
                  ? '🏆 Đỉnh cao! Bạn đã hoàn thành 100% tất cả các thói quen trong ngày!'
                  : completedTodayCount > 0
                  ? `🔥 Rất tốt! Bạn đã hoàn thành ${completedTodayCount}/${habits.length} thói quen (${completionRate}%). Hãy tiếp tục duy trì!`
                  : `Bạn có ${habits.length} thói quen cần hoàn thành hôm nay. Bắt đầu ngay nhé!`}
              </p>
            </div>

            {/* Circular / Bar completion visual */}
            <div className="flex items-center gap-4 shrink-0 bg-background/80 p-4 rounded-2xl border border-border/60 shadow-xs">
              <div className="text-center">
                <p className="text-3xl font-display font-bold text-primary">
                  {completedTodayCount}
                  <span className="text-lg text-muted-foreground">/{habits.length}</span>
                </p>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
                  Hoàn thành ({completionRate}%)
                </p>
              </div>
              <div className="w-24 h-3 rounded-full bg-muted overflow-hidden border border-border/50">
                <div
                  className="h-full bg-gradient-to-r from-primary to-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. ACTION TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setCustomModalOpen(true)}
            className="gap-2 text-xs font-semibold shadow-sm"
          >
            <Plus className="h-4 w-4" /> Tạo thói quen mới
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenPresetModalChange(true)}
            className="gap-2 text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10"
          >
            <Sparkles className="h-4 w-4" /> Thư viện thói quen mẫu (10+)
          </Button>
        </div>

        <span className="text-xs text-muted-foreground self-center sm:self-auto">
          {habits.length} thói quen đang kích hoạt
        </span>
      </div>

      {/* 3. HABITS LIST */}
      {habits.length === 0 ? (
        <Card className="border-dashed border-border/80 bg-muted/10">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3">
              <Zap className="h-7 w-7" />
            </div>
            <h3 className="text-base font-semibold">Chưa có thói quen nào</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              Xây dựng thói quen nhỏ mỗi ngày là chìa khóa để đạt được những thành tựu lớn.
            </p>
            <div className="flex gap-2 mt-4">
              <Button
                size="sm"
                onClick={() => onOpenPresetModalChange(true)}
                className="gap-1.5 text-xs font-semibold"
              >
                <Sparkles className="h-3.5 w-3.5" /> Chọn từ thói quen mẫu
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCustomModalOpen(true)}
                className="gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" /> Tự tạo thói quen
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {habits.map((habit) => {
            const isCompleted = isHabitCompletedToday(habit.id);

            return (
              <Card
                key={habit.id}
                className={`border transition-all duration-200 ${
                  isCompleted
                    ? 'border-emerald-500/40 bg-emerald-500/5 shadow-xs'
                    : 'border-border/70 bg-card hover:border-primary/40'
                }`}
              >
                <CardContent className="p-4 flex items-center gap-3.5">
                  {/* Big Checkbox Toggle */}
                  <button
                    onClick={() => handleToggleHabit(habit)}
                    className={`h-11 w-11 shrink-0 rounded-2xl flex items-center justify-center transition-all ${
                      isCompleted
                        ? 'bg-emerald-500 text-white shadow-sm scale-105'
                        : 'bg-muted/70 hover:bg-primary/20 text-muted-foreground hover:text-primary'
                    }`}
                    title={isCompleted ? 'Hủy check-in hôm nay' : 'Check-in hoàn thành hôm nay'}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-6 w-6 stroke-[2.5]" />
                    ) : (
                      <Circle className="h-6 w-6 stroke-[1.5]" />
                    )}
                  </button>

                  {/* Habit Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{habit.icon || '✅'}</span>
                      <h4
                        className={`font-semibold text-sm truncate ${
                          isCompleted ? 'text-foreground line-through opacity-80' : 'text-foreground'
                        }`}
                      >
                        {habit.name}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {/* Streak Badge */}
                      <Badge
                        variant="outline"
                        className={`text-[10px] gap-1 px-2 py-0.5 font-bold ${
                          (habit.streak || 0) > 0
                            ? 'bg-orange-500/10 text-orange-500 border-orange-500/30'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <Flame className="h-3 w-3" />
                        {habit.streak || 0} ngày liên tiếp
                      </Badge>

                      {/* Mini 7-day tracker dots */}
                      <div className="flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded-lg">
                        {last7Days.map((date) => {
                          const isDone = habitLogs.some(
                            (l) => l.habit_id === habit.id && l.completed_date === date
                          );
                          const isToday = date === todayStr;
                          return (
                            <span
                              key={date}
                              className={`h-2 w-2 rounded-full transition-all ${
                                isDone
                                  ? 'bg-emerald-500'
                                  : isToday
                                  ? 'border border-dashed border-primary bg-primary/20'
                                  : 'bg-muted-foreground/20'
                              }`}
                              title={`${date}: ${isDone ? 'Đã hoàn thành' : 'Chưa'}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Delete Action */}
                  <button
                    onClick={() => handleDeleteHabit(habit.id, habit.name)}
                    className="p-2 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors shrink-0"
                    title="Xóa thói quen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 4. PRESET HABITS LIBRARY MODAL */}
      <Dialog open={presetModalOpen} onOpenChange={onOpenPresetModalChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader className="pb-3 border-b border-border/60">
            <DialogTitle className="flex items-center gap-2 text-lg font-display">
              <Sparkles className="h-5 w-5 text-primary" />
              Thư viện Thói quen Mẫu phổ biến
            </DialogTitle>
            <DialogDescription className="text-xs">
              Chọn các thói quen khoa học đã được kiểm chứng để thêm nhanh vào lộ trình của bạn.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-3 pr-1 space-y-3 scrollbar-thin">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRESET_HABITS.map((preset) => {
                const alreadyAdded = habits.some(
                  (h) => h.name.toLowerCase() === preset.name.toLowerCase()
                );

                return (
                  <div
                    key={preset.name}
                    className="p-3.5 rounded-2xl border border-border/60 bg-card hover:border-primary/40 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl p-2 rounded-xl bg-muted/60 shrink-0">
                        {preset.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-semibold text-sm text-foreground">{preset.name}</h4>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {preset.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
                      <div className="flex gap-1">
                        {preset.tags.slice(0, 2).map((t) => (
                          <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {t}
                          </Badge>
                        ))}
                      </div>

                      <Button
                        size="sm"
                        variant={alreadyAdded ? 'secondary' : 'default'}
                        disabled={alreadyAdded || addingPresetKey === preset.name}
                        onClick={() => handleAddPreset(preset)}
                        className="h-7 text-xs px-2.5 rounded-lg"
                      >
                        {addingPresetKey === preset.name ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : alreadyAdded ? (
                          'Đã có'
                        ) : (
                          '+ Thêm'
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-border/50">
            <Button variant="outline" size="sm" onClick={() => onOpenPresetModalChange(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. CUSTOM HABIT CREATOR MODAL */}
      <Dialog open={customModalOpen} onOpenChange={setCustomModalOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-display">
              <Target className="h-4 w-4 text-primary" /> Tạo thói quen tùy biến mới
            </DialogTitle>
            <DialogDescription className="text-xs">
              Thiết lập mục tiêu cá nhân theo nhịp độ của riêng bạn.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCustom} className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="habit-name" className="text-xs font-semibold">
                Tên thói quen *
              </Label>
              <Input
                id="habit-name"
                value={habitName}
                onChange={(e) => setHabitName(e.target.value)}
                placeholder="Ví dụ: Ôn tập 10 từ mới, Đi bộ 15 phút..."
                className="text-xs"
                required
              />
            </div>

            {/* Emoji Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Chọn Biểu tượng (Icon)</Label>
              <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-muted/40 border border-border/50">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setSelectedEmoji(emoji)}
                    className={`text-xl p-1.5 rounded-lg transition-all ${
                      selectedEmoji === emoji
                        ? 'bg-background shadow-xs scale-110'
                        : 'opacity-50 hover:opacity-100'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Danh mục</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {CATEGORY_OPTIONS.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`text-xs p-2 rounded-xl border font-medium transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Target days */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Mục tiêu tần suất: {targetDays} ngày / tuần
              </Label>
              <input
                type="range"
                min={1}
                max={7}
                value={targetDays}
                onChange={(e) => setTargetDays(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>1 ngày</span>
                <span>Hàng ngày (7 ngày)</span>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-border/50">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCustomModalOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit" size="sm" disabled={submittingCustom} className="font-semibold">
                {submittingCustom ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  'Lưu thói quen'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
