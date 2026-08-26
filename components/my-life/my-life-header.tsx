'use client';

import { Flame, Heart, Users, BookOpen, CheckCircle2, Sparkles, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { moodEmoji, moodLabel } from '@/lib/helpers';
import type { MoodEntry, Habit } from '@/lib/types';

export type MyLifeTab = 'journal' | 'habits' | 'mood';

interface MyLifeHeaderProps {
  activeTab: MyLifeTab;
  onTabChange: (tab: MyLifeTab) => void;
  habits: Habit[];
  todayMood: MoodEntry | null;
  friendsCount: number;
  onOpenFriendsModal: () => void;
  onOpenPresetModal: () => void;
}

export function MyLifeHeader({
  activeTab,
  onTabChange,
  habits,
  todayMood,
  friendsCount,
  onOpenFriendsModal,
  onOpenPresetModal,
}: MyLifeHeaderProps) {
  const maxStreak = habits.length > 0 ? Math.max(...habits.map((h) => h.streak || 0)) : 0;
  const activeHabitsCount = habits.length;

  return (
    <div className="space-y-5">
      {/* Title & Stats Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl lg:text-3xl font-display font-bold tracking-tight">
              My Life
            </h1>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs px-2.5 py-0.5">
              Personal Growth Hub
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Không gian ghi chép nhật ký học tập, rèn luyện thói quen cá nhân và theo dõi sức khỏe cảm xúc.
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenPresetModal}
            className="gap-1.5 text-xs rounded-xl border-border/80 hover:border-primary/50 shadow-sm"
          >
            <PlusCircle className="h-3.5 w-3.5 text-primary" />
            Thói quen mẫu
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenFriendsModal}
            className="gap-1.5 text-xs rounded-xl border-border/80 hover:border-primary/50 shadow-sm"
          >
            <Users className="h-3.5 w-3.5 text-primary" />
            Bạn bè ({friendsCount})
          </Button>
        </div>
      </div>

      {/* Highlights Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Streak Highlight */}
        <div className="p-3.5 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm shadow-sm flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20">
            <Flame className="h-6 w-6 animate-pulse" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-medium">Chuỗi thói quen cao nhất</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-bold font-display">{maxStreak}</span>
              <span className="text-xs text-muted-foreground">ngày liên tiếp</span>
            </div>
          </div>
        </div>

        {/* Today's Mood Status */}
        <div className="p-3.5 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm shadow-sm flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <Heart className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-medium">Cảm xúc hôm nay</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {todayMood ? (
                <>
                  <span className="text-lg">{moodEmoji(todayMood.mood)}</span>
                  <span className="text-sm font-semibold truncate">{moodLabel(todayMood.mood, 'vi')}</span>
                </>
              ) : (
                <span className="text-xs text-amber-500 font-medium flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Chưa ghi nhận
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Habits Total */}
        <div className="p-3.5 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm shadow-sm flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-medium">Thói quen đang theo dõi</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-bold font-display">{activeHabitsCount}</span>
              <span className="text-xs text-muted-foreground">mục tiêu cá nhân</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation Switcher */}
      <div className="flex border-b border-border/60 gap-2 overflow-x-auto pb-0.5 scrollbar-none">
        <button
          onClick={() => onTabChange('journal')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-px whitespace-nowrap ${
            activeTab === 'journal'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Nhật ký học tập (Journal)
        </button>

        <button
          onClick={() => onTabChange('habits')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-px whitespace-nowrap ${
            activeTab === 'habits'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          Quản lý thói quen (Habits)
        </button>

        <button
          onClick={() => onTabChange('mood')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-px whitespace-nowrap ${
            activeTab === 'mood'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Heart className="h-4 w-4" />
          Theo dõi cảm xúc (Mood Tracker)
        </button>
      </div>
    </div>
  );
}
