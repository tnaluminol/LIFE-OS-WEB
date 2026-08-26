'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import {
  fetchFlashcardSetById,
  PRESET_FLASHCARD_SETS,
} from '@/lib/flashcard-quiz-service';
import type { FlashcardSet, Flashcard, QuizResult } from '@/lib/types';
import { FlashcardViewer } from '@/components/flashcards/flashcard-viewer';
import { QuizPlayer } from '@/components/flashcards/quiz-player';
import { ExamResultsView } from '@/components/flashcards/exam-results-view';
import { LatexContent } from '@/components/flashcards/latex-content';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  BookOpen,
  Sparkles,
  Layers,
  Clock,
  ArrowLeft,
  List,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function FlashcardStudyHubPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const setId = (params?.id as string) || '';

  const [loading, setLoading] = useState(true);
  const [setInfo, setSetInfo] = useState<FlashcardSet | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [activeTab, setActiveTab] = useState<'flashcard' | 'practice' | 'exam' | 'list'>('flashcard');

  // Exam Result state
  const [examResult, setExamResult] = useState<QuizResult | null>(null);
  const [practiceCardsFilter, setPracticeCardsFilter] = useState<Flashcard[] | null>(null);

  const loadSetData = useCallback(async () => {
    if (!setId) return;
    setLoading(true);

    try {
      // Check if it matches a preset set index
      if (setId.startsWith('preset-')) {
        const presetIdx = parseInt(setId.replace('preset-', ''), 10);
        const preset = PRESET_FLASHCARD_SETS[presetIdx];
        if (preset) {
          const fakeSet: FlashcardSet = {
            id: setId,
            user_id: user?.id || 'preset-user',
            title: preset.set.title,
            description: preset.set.description,
            subject: preset.set.subject,
            grade_level: preset.set.grade_level,
            visibility: 'public',
            tags: preset.set.tags,
            card_count: preset.cards.length,
            likes_count: preset.set.likes_count,
            is_ai_generated: preset.set.is_ai_generated,
            cover_image: preset.set.cover_image,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const fakeCards: Flashcard[] = preset.cards.map((c, i) => ({
            id: `card-${setId}-${i}`,
            set_id: setId,
            card_type: c.card_type,
            front_text: c.front_text,
            back_text: c.back_text,
            options: c.options || [],
            correct_option: c.correct_option || null,
            explanation: c.explanation || null,
            hint: c.hint || null,
            order_index: i,
            ease_factor: 2.5,
            interval_days: 1,
            repetitions: 0,
            next_review_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));

          setSetInfo(fakeSet);
          setCards(fakeCards);
          setLoading(false);
          return;
        }
      }

      // Fetch from Supabase
      const { set, cards: fetchedCards, error } = await fetchFlashcardSetById(setId);
      if (error || !set) {
        toast.error('Không tìm thấy bộ thẻ này');
        router.push('/app/flashcards');
        return;
      }

      setSetInfo(set);
      setCards(fetchedCards);
    } catch (err) {
      console.error('[FlashcardStudyHub] Error loading set:', err);
      toast.error('Lỗi khi tải dữ liệu bộ thẻ');
    } finally {
      setLoading(false);
    }
  }, [setId, user, router]);

  useEffect(() => {
    loadSetData();
  }, [loadSetData]);

  const handleExamFinish = (result: QuizResult) => {
    setExamResult(result);
  };

  const handleRetakeExam = () => {
    setExamResult(null);
    setPracticeCardsFilter(null);
  };

  const handlePracticeWrongOnly = () => {
    if (!examResult) return;
    const wrongCardIds = new Set(
      examResult.answers_summary.filter((a) => !a.is_correct).map((a) => a.card_id)
    );
    const filtered = cards.filter((c) => wrongCardIds.has(c.id));
    if (filtered.length > 0) {
      setPracticeCardsFilter(filtered);
      setExamResult(null);
      setActiveTab('practice');
      toast.info(`Bắt đầu luyện tập lại ${filtered.length} câu đã trả lời sai!`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Đang tải bộ thẻ & câu hỏi...</p>
      </div>
    );
  }

  if (!setInfo) return null;

  const currentCardsToStudy = practiceCardsFilter || cards;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 sm:p-5 rounded-2xl border border-border/70 shadow-sm">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/app/flashcards')}
            className="h-8 px-2 text-muted-foreground hover:text-foreground rounded-xl"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Bộ thẻ
          </Button>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-display font-bold text-foreground">
                {setInfo.title}
              </h1>
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                {setInfo.subject}
              </Badge>
              <Badge variant="secondary" className="text-xs text-muted-foreground">
                {setInfo.grade_level}
              </Badge>
              {setInfo.is_ai_generated && (
                <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 text-[10px] gap-1">
                  <Sparkles className="h-2.5 w-2.5" /> AI
                </Badge>
              )}
            </div>

            {setInfo.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{setInfo.description}</p>
            )}
          </div>
        </div>

        {/* Set metadata right info */}
        <div className="flex items-center gap-3 self-end sm:self-center">
          <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1">
            <Layers className="h-3.5 w-3.5 mr-1 text-primary" /> {cards.length} câu hỏi
          </Badge>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(val: any) => {
          setActiveTab(val);
          setExamResult(null);
          setPracticeCardsFilter(null);
        }}
        className="w-full space-y-6"
      >
        <TabsList className="grid grid-cols-4 max-w-2xl bg-muted/60 p-1 rounded-2xl h-11 border border-border/60">
          <TabsTrigger
            value="flashcard"
            className="text-xs font-semibold rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-xs gap-1.5"
          >
            <BookOpen className="h-3.5 w-3.5 text-primary" /> Flashcard 2 mặt
          </TabsTrigger>
          <TabsTrigger
            value="practice"
            className="text-xs font-semibold rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-xs gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5 text-success" /> Luyện tập tự do
          </TabsTrigger>
          <TabsTrigger
            value="exam"
            className="text-xs font-semibold rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-xs gap-1.5"
          >
            <Clock className="h-3.5 w-3.5 text-destructive" /> Thi thử tính giờ
          </TabsTrigger>
          <TabsTrigger
            value="list"
            className="text-xs font-semibold rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-xs gap-1.5"
          >
            <List className="h-3.5 w-3.5 text-muted-foreground" /> Danh sách ({cards.length})
          </TabsTrigger>
        </TabsList>

        {/* 1. FLASHCARD MODE */}
        <TabsContent value="flashcard" className="space-y-4">
          <FlashcardViewer
            currentUserId={user?.id || 'demo-user'}
            cards={cards}
            onComplete={() => toast.success('🎉 Bạn đã hoàn thành lượt ôn tập tất cả các thẻ!')}
          />
        </TabsContent>

        {/* 2. PRACTICE MODE (Instant grading & solutions) */}
        <TabsContent value="practice" className="space-y-4">
          {examResult ? (
            <ExamResultsView
              result={examResult}
              onRetake={handleRetakeExam}
              onPracticeWrongOnly={handlePracticeWrongOnly}
              onBackToSets={() => router.push('/app/flashcards')}
            />
          ) : (
            <QuizPlayer
              setId={setId}
              currentUserId={user?.id || 'demo-user'}
              cards={currentCardsToStudy}
              mode="practice"
              onFinish={handleExamFinish}
            />
          )}
        </TabsContent>

        {/* 3. EXAM MODE (Timed test with countdown timer & review report) */}
        <TabsContent value="exam" className="space-y-4">
          {examResult ? (
            <ExamResultsView
              result={examResult}
              onRetake={handleRetakeExam}
              onPracticeWrongOnly={handlePracticeWrongOnly}
              onBackToSets={() => router.push('/app/flashcards')}
            />
          ) : (
            <QuizPlayer
              setId={setId}
              currentUserId={user?.id || 'demo-user'}
              cards={cards}
              mode="exam"
              examDurationMinutes={Math.max(5, Math.ceil(cards.length * 1.5))}
              onFinish={handleExamFinish}
            />
          )}
        </TabsContent>

        {/* 4. CARD LIST & ALL QUESTIONS OVERVIEW */}
        <TabsContent value="list" className="space-y-4">
          <div className="grid grid-cols-1 gap-3 max-w-4xl mx-auto">
            {cards.map((c, i) => (
              <Card key={c.id || i} className="border-border/70 bg-card/90 shadow-xs">
                <CardContent className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-6 w-6 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                        #{i + 1}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {c.card_type === 'multiple_choice'
                          ? 'Trắc nghiệm 4 lựa chọn'
                          : c.card_type === 'fill_in_blank'
                          ? 'Điền vào chỗ trống'
                          : 'Flashcard 2 mặt'}
                      </Badge>
                    </div>

                    {c.interval_days && c.interval_days > 1 && (
                      <span className="text-[11px] text-muted-foreground">
                        Chu kỳ ôn: {c.interval_days} ngày
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-foreground">
                      <span className="text-xs text-muted-foreground mr-1">Đề bài:</span>
                      <LatexContent content={c.front_text} />
                    </div>

                    <div className="bg-muted/30 p-3 rounded-xl border border-border/50 text-xs">
                      <span className="font-semibold text-success mr-1">Đáp án:</span>
                      <LatexContent content={c.back_text || c.correct_option || ''} />
                    </div>

                    {c.explanation && (
                      <div className="text-[11px] text-muted-foreground pl-1">
                        <span className="font-semibold text-primary">Giải thích: </span>
                        <LatexContent content={c.explanation} />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
