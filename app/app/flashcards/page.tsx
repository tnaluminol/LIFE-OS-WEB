'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import {
  fetchFlashcardSets,
  fetchUserFlashcardStats,
  fetchUserQuizResults,
  PRESET_FLASHCARD_SETS,
} from '@/lib/flashcard-quiz-service';
import type { FlashcardSet, FlashcardSubject, FlashcardGradeLevel, QuizResult, Profile } from '@/lib/types';
import { CreateSetModal } from '@/components/flashcards/create-set-modal';
import { AiGenerateModal } from '@/components/flashcards/ai-generate-modal';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Layers,
  Sparkles,
  Plus,
  Search,
  BookOpen,
  Clock,
  Award,
  Zap,
  Filter,
  CheckCircle2,
  Lock,
  Globe,
  Loader2,
  Calendar,
  Flame,
  ArrowRight,
  TrendingUp,
  Brain,
} from 'lucide-react';
import { initials, formatRelativeTime } from '@/lib/helpers';
import { toast } from 'sonner';

const SUBJECT_FILTER_PILLS: { id: string; label: string; icon: string }[] = [
  { id: 'all', label: 'Tất cả môn', icon: '✨' },
  { id: 'physics', label: 'Vật Lý', icon: '⚡' },
  { id: 'english', label: 'Tiếng Anh', icon: '🇬🇧' },
  { id: 'math', label: 'Toán Học', icon: '📐' },
  { id: 'chemistry', label: 'Hóa Học', icon: '🧪' },
  { id: 'biology', label: 'Sinh Học', icon: '🧬' },
  { id: 'history', label: 'Lịch Sử', icon: '🏛️' },
  { id: 'informatics', label: 'Tin Học', icon: '💻' },
];

export default function FlashcardsCatalogPage() {
  const router = useRouter();
  const { user, profile } = useAuth();

  const [mainTab, setMainTab] = useState<'explore' | 'my_sets' | 'history'>('explore');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [sets, setSets] = useState<FlashcardSet[]>([]);
  const [stats, setStats] = useState({
    totalSetsCreated: 0,
    totalCardsStudied: 0,
    quizzesCompleted: 0,
    averageExamScore: 0,
    dueCardsCount: 0,
  });
  const [historyResults, setHistoryResults] = useState<QuizResult[]>([]);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [fetchedSets, userStats, userHistory] = await Promise.all([
        fetchFlashcardSets({
          subject: selectedSubject !== 'all' ? selectedSubject : undefined,
          grade: selectedGrade !== 'all' ? selectedGrade : undefined,
          userId: mainTab === 'my_sets' && user ? user.id : undefined,
          search: searchQuery,
        }),
        user ? fetchUserFlashcardStats(user.id) : Promise.resolve(null),
        user ? fetchUserQuizResults(user.id) : Promise.resolve([]),
      ]);

      // If in explore tab and no sets in DB yet, inject rich preset sets!
      if (mainTab === 'explore' && fetchedSets.length === 0) {
        const presets: FlashcardSet[] = PRESET_FLASHCARD_SETS.map((p, idx) => ({
          id: `preset-${idx}`,
          user_id: user?.id || 'preset-author',
          title: p.set.title,
          description: p.set.description,
          subject: p.set.subject,
          grade_level: p.set.grade_level,
          visibility: 'public',
          tags: p.set.tags,
          card_count: p.cards.length,
          likes_count: p.set.likes_count,
          is_ai_generated: p.set.is_ai_generated,
          cover_image: p.set.cover_image,
          author: {
            id: 'system',
            username: 'LifeOS Giáo Viên',
            full_name: 'Life OS Curriculum Team',
            avatar_url: null,
            profile_visibility: 'public',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as unknown as Profile,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        setSets(
          presets.filter((p) => {
            if (selectedSubject !== 'all' && p.subject !== selectedSubject) return false;
            if (searchQuery.trim() && !p.title.toLowerCase().includes(searchQuery.toLowerCase()))
              return false;
            return true;
          })
        );
      } else {
        setSets(fetchedSets);
      }

      if (userStats) {
        setStats(userStats);
      }
      setHistoryResults(userHistory);
    } catch (err) {
      console.error('[FlashcardsPage] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedSubject, selectedGrade, searchQuery, mainTab, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSetCreated = (newSet: FlashcardSet) => {
    setSets((prev) => [newSet, ...prev]);
    router.push(`/app/flashcards/${newSet.id}`);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* 1. HERO HEADER & SUMMARY METRICS */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card via-card to-primary/10 border border-border/70 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-xl">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/15 text-primary border-primary/30 text-xs font-semibold px-2.5 py-0.5">
                <Brain className="h-3.5 w-3.5 mr-1" /> Flashcards & Quiz Engine
              </Badge>
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Spaced Repetition (Lặp lại ngắt quãng)
              </Badge>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground tracking-tight">
              Ôn Luyện Thông Minh • Nhớ Lâu Gấp 3 Lần 🚀
            </h1>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Học Flashcard 2 mặt công thức Toán/Lý/Hóa (LaTeX), thi thử trắc nghiệm 4 lựa chọn có chấm điểm tính giờ, và tự động tạo 10–20 câu hỏi tức thì bằng AI từ bài giảng.
            </p>

            {/* Quick Action CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                onClick={() => setCreateModalOpen(true)}
                className="rounded-2xl text-xs font-semibold gap-1.5 shadow-sm h-10 px-5"
              >
                <Plus className="h-4 w-4" /> Tạo bộ thẻ thủ công
              </Button>

              <Button
                variant="outline"
                onClick={() => setAiModalOpen(true)}
                className="rounded-2xl text-xs font-semibold gap-1.5 border-purple-500/40 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 h-10 px-5"
              >
                <Sparkles className="h-4 w-4" /> ✨ AI Tạo từ văn bản
              </Button>
            </div>
          </div>

          {/* User Quick Stats Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
            <div className="bg-background/80 backdrop-blur-sm p-4 rounded-2xl border border-border/60 text-center space-y-1 shadow-xs">
              <span className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                <Layers className="h-3.5 w-3.5 text-primary" /> Bộ thẻ tạo
              </span>
              <p className="text-xl sm:text-2xl font-bold font-display text-foreground">
                {stats.totalSetsCreated}
              </p>
            </div>

            <div className="bg-background/80 backdrop-blur-sm p-4 rounded-2xl border border-border/60 text-center space-y-1 shadow-xs">
              <span className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                <Flame className="h-3.5 w-3.5 text-orange-500" /> Thẻ đã ôn
              </span>
              <p className="text-xl sm:text-2xl font-bold font-display text-foreground">
                {stats.totalCardsStudied}
              </p>
            </div>

            <div className="bg-background/80 backdrop-blur-sm p-4 rounded-2xl border border-border/60 text-center space-y-1 shadow-xs col-span-2 sm:col-span-1">
              <span className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                <Award className="h-3.5 w-3.5 text-amber-500" /> Điểm thi TB
              </span>
              <p className="text-xl sm:text-2xl font-bold font-display text-primary">
                {stats.averageExamScore > 0 ? `${stats.averageExamScore}%` : '100%'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. NAVIGATION TABS & SEARCH BAR */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Main Tabs */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-2xl border border-border/60 w-fit">
            <button
              onClick={() => setMainTab('explore')}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                mainTab === 'explore'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Globe className="h-3.5 w-3.5 inline mr-1.5 text-primary" />
              Khám phá bộ thẻ
            </button>
            <button
              onClick={() => setMainTab('my_sets')}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                mainTab === 'my_sets'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5 inline mr-1.5 text-primary" />
              Bộ thẻ của tôi
            </button>
            <button
              onClick={() => setMainTab('history')}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                mainTab === 'history'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Clock className="h-3.5 w-3.5 inline mr-1.5 text-primary" />
              Lịch sử thi ({historyResults.length})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm bộ thẻ, môn học, chủ đề..."
              className="pl-9 text-xs h-10 rounded-2xl bg-card border-border/70"
            />
          </div>
        </div>

        {/* Subject Filter Pills (When in explore or my_sets tab) */}
        {mainTab !== 'history' && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {SUBJECT_FILTER_PILLS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSubject(s.id)}
                className={`text-xs px-3.5 py-1.5 rounded-xl font-medium shrink-0 border transition-all ${
                  selectedSubject === s.id
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-card text-muted-foreground border-border/70 hover:bg-muted'
                }`}
              >
                <span className="mr-1">{s.icon}</span> {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. MAIN CATALOG GRID / HISTORY CONTENT */}
      {mainTab === 'history' ? (
        /* HISTORY TAB */
        <div className="space-y-4">
          {historyResults.length === 0 ? (
            <Card className="border-dashed border-border/80 bg-muted/10">
              <CardContent className="text-center py-16 space-y-3">
                <Clock className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                <h3 className="text-sm font-semibold text-foreground">Chưa có lượt thi thử nào</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Hãy chọn một bộ thẻ và bắt đầu chế độ Thi thử (Exam Mode) để hệ thống tự động ghi nhận điểm và lịch sử làm bài của bạn.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {historyResults.map((h) => (
                <Card
                  key={h.id}
                  className="border-border/70 bg-card hover:border-primary/50 transition-all shadow-xs"
                >
                  <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                    <Badge
                      variant="outline"
                      className={
                        h.score_percentage >= 80
                          ? 'bg-success/15 text-success border-success/30 font-bold'
                          : 'bg-primary/15 text-primary border-primary/30 font-bold'
                      }
                    >
                      {h.score_percentage}% Chính xác
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {formatRelativeTime(h.created_at, 'vi')}
                    </span>
                  </CardHeader>
                  <CardContent className="p-4 pt-1 space-y-2 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Số câu đúng:</span>
                      <span className="font-semibold text-foreground">
                        {h.correct_answers} / {h.total_questions}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Thời gian:</span>
                      <span className="font-semibold font-mono text-foreground">
                        {Math.floor(h.time_spent_seconds / 60)}m {h.time_spent_seconds % 60}s
                      </span>
                    </div>
                  </CardContent>
                  <CardFooter className="p-4 pt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/app/flashcards/${h.set_id}`)}
                      className="w-full text-xs font-semibold rounded-xl"
                    >
                      Xem lại bộ thẻ <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : loading ? (
        /* LOADING SKELETONS */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-56 rounded-3xl bg-muted/40 animate-pulse border border-border/40"
            />
          ))}
        </div>
      ) : sets.length === 0 ? (
        /* EMPTY STATE */
        <Card className="border-dashed border-border/80 bg-muted/10">
          <CardContent className="text-center py-16 space-y-4">
            <Layers className="h-12 w-12 text-muted-foreground/40 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground">
                {mainTab === 'my_sets'
                  ? 'Bạn chưa tạo bộ thẻ nào'
                  : 'Không tìm thấy bộ thẻ phù hợp'}
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {mainTab === 'my_sets'
                  ? 'Tự tạo bộ câu hỏi của riêng bạn hoặc sử dụng tính năng AI Auto-Generate để tạo tự động chỉ trong vài giây.'
                  : 'Hãy thử tìm kiếm với từ khóa khác hoặc chuyển sang danh mục môn học khác.'}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                onClick={() => setCreateModalOpen(true)}
                size="sm"
                className="text-xs rounded-xl font-semibold gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Tạo bộ thẻ ngay
              </Button>
              <Button
                variant="outline"
                onClick={() => setAiModalOpen(true)}
                size="sm"
                className="text-xs rounded-xl font-semibold gap-1 text-purple-600 dark:text-purple-400 border-purple-500/30"
              >
                <Sparkles className="h-3.5 w-3.5" /> Thử AI Auto-Generate
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* SETS CATALOG CARDS GRID */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {sets.map((item) => {
            const author = item.author;
            return (
              <Card
                key={item.id}
                className="group border-border/70 bg-card hover:border-primary/50 transition-all duration-300 hover:shadow-md rounded-3xl overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar with Badges */}
                  <div className="p-5 pb-3 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="secondary"
                        className="text-[11px] font-semibold bg-primary/10 text-primary border-primary/20"
                      >
                        {item.subject.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="text-[11px] text-muted-foreground">
                        {item.grade_level}
                      </Badge>
                      {item.is_ai_generated && (
                        <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 text-[10px] gap-0.5">
                          <Sparkles className="h-2.5 w-2.5" /> AI
                        </Badge>
                      )}
                    </div>

                    <Badge
                      variant="outline"
                      className="text-xs font-semibold px-2 py-0.5 bg-muted/30 border-border/60"
                    >
                      <Layers className="h-3 w-3 mr-1 text-primary" /> {item.card_count} thẻ
                    </Badge>
                  </div>

                  {/* Title & Description */}
                  <div className="px-5 space-y-2">
                    <Link
                      href={`/app/flashcards/${item.id}`}
                      className="text-base font-display font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug"
                    >
                      {item.title}
                    </Link>

                    {item.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    {/* Tags */}
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {item.tags.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-muted/40 text-muted-foreground border border-border/40"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer: Author & Study Action */}
                <div className="p-5 pt-4 border-t border-border/50 mt-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-6 w-6">
                      {author?.avatar_url && <AvatarImage src={author.avatar_url} />}
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                        {author ? initials(author.username) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground truncate font-medium">
                      {author?.username || 'Tác giả'}
                    </span>
                  </div>

                  <Link href={`/app/flashcards/${item.id}`}>
                    <Button size="sm" className="h-8 px-3.5 rounded-xl text-xs font-semibold gap-1 shadow-xs">
                      Học ngay <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* 4. MODALS */}
      <CreateSetModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        currentUserId={user?.id || 'demo-user'}
        onSetCreated={handleSetCreated}
      />

      <AiGenerateModal
        open={aiModalOpen}
        onOpenChange={setAiModalOpen}
        currentUserId={user?.id || 'demo-user'}
        onSetCreated={handleSetCreated}
      />
    </div>
  );
}
