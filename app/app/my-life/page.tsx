'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import {
  fetchUserHabits,
  fetchHabitLogsForDates,
  fetchMoodEntries,
  fetchJournalFeed,
  fetchConnectedFriends,
} from '@/lib/my-life-service';
import type { Habit, HabitLog, MoodEntry, JournalEntry, Profile } from '@/lib/types';
import { MyLifeHeader, type MyLifeTab } from '@/components/my-life/my-life-header';
import { JournalTab } from '@/components/my-life/journal-tab';
import { HabitsTab } from '@/components/my-life/habits-tab';
import { MoodTab } from '@/components/my-life/mood-tab';
import { FriendsManagerModal } from '@/components/my-life/friends-manager-modal';
import { Loader2 } from 'lucide-react';

export default function MyLifePage() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<MyLifeTab>('journal');
  const [loading, setLoading] = useState(true);

  // Core data states
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [friends, setFriends] = useState<Profile[]>([]);

  // Modals
  const [friendsModalOpen, setFriendsModalOpen] = useState(false);
  const [presetModalOpen, setPresetModalOpen] = useState(false);

  // Load all user data for the My Life module
  const loadAllData = useCallback(async () => {
    if (!user) return;

    try {
      // Calculate date window (past 14 days for logs)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 14);
      const startStr = startDate.toISOString().split('T')[0];
      const endStr = new Date().toISOString().split('T')[0];

      const [habitsData, logsData, moodData, journalData, friendsData] = await Promise.all([
        fetchUserHabits(user.id),
        fetchHabitLogsForDates(user.id, startStr, endStr),
        fetchMoodEntries(user.id, 14),
        fetchJournalFeed(user.id, 'friends'),
        fetchConnectedFriends(user.id),
      ]);

      setHabits(habitsData);
      setHabitLogs(logsData);
      setMoodEntries(moodData);
      setJournals(journalData);
      setFriends(friendsData);
    } catch (err) {
      console.error('Error loading My Life data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Today's mood entry helper
  const todayStr = new Date().toISOString().split('T')[0];
  const todayMood = moodEntries.find(
    (m) =>
      m.entry_date === todayStr ||
      (m.created_at && m.created_at.split('T')[0] === todayStr)
  ) || null;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-28 rounded-2xl bg-muted/40" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-muted/40" />
          ))}
        </div>
        <div className="h-10 w-80 rounded-xl bg-muted/40" />
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-muted/40" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Module Header & High-level Metrics */}
      <MyLifeHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        habits={habits}
        todayMood={todayMood}
        friendsCount={friends.length}
        onOpenFriendsModal={() => setFriendsModalOpen(true)}
        onOpenPresetModal={() => {
          setActiveTab('habits');
          setPresetModalOpen(true);
        }}
      />

      {/* Feature 1: Journal (Nhật ký học tập - Public cho Bạn bè & Tương tác) */}
      {activeTab === 'journal' && (
        <JournalTab
          currentUserId={user.id}
          currentUserProfile={profile}
          journals={journals}
          onJournalsUpdated={loadAllData}
          onOpenFriendsModal={() => setFriendsModalOpen(true)}
        />
      )}

      {/* Feature 2: Habits (Quản lý Thói quen - Private & Thói quen mẫu & Tùy biến) */}
      {activeTab === 'habits' && (
        <HabitsTab
          currentUserId={user.id}
          habits={habits}
          habitLogs={habitLogs}
          onHabitsUpdated={loadAllData}
          presetModalOpen={presetModalOpen}
          onOpenPresetModalChange={setPresetModalOpen}
        />
      )}

      {/* Feature 3: Mood Tracker (Theo dõi cảm xúc & Phân tích tổng kết cuối tuần) */}
      {activeTab === 'mood' && (
        <MoodTab
          currentUserId={user.id}
          moodEntries={moodEntries}
          userHabits={habits}
          habitLogs={habitLogs}
          onMoodUpdated={loadAllData}
          onHabitsUpdated={loadAllData}
        />
      )}

      {/* Friends Manager Modal */}
      <FriendsManagerModal
        open={friendsModalOpen}
        onOpenChange={setFriendsModalOpen}
        currentUserId={user.id}
        onFriendsUpdated={loadAllData}
      />
    </div>
  );
}
