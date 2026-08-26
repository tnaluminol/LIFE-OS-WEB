'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  Flashcard,
  QuizStudyMode,
  QuizResult,
  QuizAnswerSummaryItem,
} from '@/lib/types';
import { submitQuizResult } from '@/lib/flashcard-quiz-service';
import { LatexContent } from './latex-content';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Flag,
  RotateCcw,
  Sparkles,
  Send,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

interface QuizPlayerProps {
  setId: string;
  currentUserId: string;
  cards: Flashcard[];
  mode: QuizStudyMode; // 'practice' | 'exam'
  examDurationMinutes?: number;
  onFinish?: (result: QuizResult) => void;
  onExit?: () => void;
}

export function QuizPlayer({
  setId,
  currentUserId,
  cards,
  mode,
  examDurationMinutes = 15,
  onFinish,
  onExit,
}: QuizPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const [fillInput, setFillInput] = useState('');
  const [isInstantChecked, setIsInstantChecked] = useState(false);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Timer state for Exam Mode
  const [secondsRemaining, setSecondsRemaining] = useState(examDurationMinutes * 60);
  const [timeSpent, setTimeSpent] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentCard = cards[currentIndex];

  // Evaluate correctness of an answer
  const isAnswerCorrect = useCallback((card: Flashcard, answer: string): boolean => {
    if (!answer) return false;
    if (card.card_type === 'multiple_choice') {
      return (
        answer.toUpperCase() === (card.correct_option || '').toUpperCase() ||
        answer.trim().toLowerCase() === (card.back_text || '').trim().toLowerCase()
      );
    }
    if (card.card_type === 'fill_in_blank') {
      const cleanAnswer = answer.trim().toLowerCase().replace(/[\s\-_.,]/g, '');
      const cleanTarget = (card.correct_option || card.back_text || '')
        .trim()
        .toLowerCase()
        .replace(/[\s\-_.,]/g, '');
      return cleanAnswer === cleanTarget;
    }
    return answer.toLowerCase() === 'correct';
  }, []);

  const calculateFinalResult = useCallback(() => {
    const summary: QuizAnswerSummaryItem[] = cards.map((card) => {
      const userAns = userAnswers[card.id] || '';
      const correct = isAnswerCorrect(card, userAns);

      let correctAnsText = card.correct_option || card.back_text || '';
      if (card.card_type === 'multiple_choice' && card.options) {
        const matchingOpt = card.options.find((o) => o.id === card.correct_option);
        if (matchingOpt) {
          correctAnsText = `${matchingOpt.id}. ${matchingOpt.text}`;
        }
      }

      return {
        card_id: card.id,
        card_type: card.card_type,
        question: card.front_text,
        user_answer: userAns,
        correct_answer: correctAnsText,
        is_correct: correct,
        explanation: card.explanation,
      };
    });

    const correctCount = summary.filter((s) => s.is_correct).length;
    const scorePct = Number(((correctCount / cards.length) * 100).toFixed(1));

    return {
      set_id: setId,
      mode,
      total_questions: cards.length,
      correct_answers: correctCount,
      score_percentage: scorePct,
      time_spent_seconds: timeSpent,
      answers_summary: summary,
    };
  }, [cards, userAnswers, setId, mode, timeSpent, isAnswerCorrect]);

  const handleSubmitQuiz = useCallback(async () => {
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const computedResult = calculateFinalResult();
      const { data, error } = await submitQuizResult(currentUserId, computedResult);

      if (error) {
        toast.error('Lỗi khi lưu kết quả bài thi');
      }

      setIsSubmitDialogOpen(false);

      if (onFinish) {
        onFinish(
          data || {
            id: 'temp-' + Date.now(),
            created_at: new Date().toISOString(),
            ...computedResult,
            user_id: currentUserId,
          }
        );
      }
    } catch {
      toast.error('Lỗi khi hoàn tất bài kiểm tra');
    } finally {
      setSubmitting(false);
    }
  }, [calculateFinalResult, currentUserId, onFinish]);

  const handleAutoSubmitOnTimeOut = useCallback(() => {
    toast.warning('Hết giờ làm bài! Hệ thống đang tự động nộp bài...');
    handleSubmitQuiz();
  }, [handleSubmitQuiz]);

  // Start timer in Exam Mode
  useEffect(() => {
    if (mode === 'exam') {
      timerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleAutoSubmitOnTimeOut();
            return 0;
          }
          return prev - 1;
        });
        setTimeSpent((prev) => prev + 1);
      }, 1000);
    } else {
      timerRef.current = setInterval(() => {
        setTimeSpent((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mode, handleAutoSubmitOnTimeOut]);

  // Sync fillInput with current question's saved answer
  useEffect(() => {
    if (currentCard) {
      setFillInput(userAnswers[currentCard.id] || '');
      setIsInstantChecked(false);
    }
  }, [currentIndex, currentCard, userAnswers]);

  // Format seconds to mm:ss
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (optionId: string) => {
    if (!currentCard) return;

    setUserAnswers((prev) => ({
      ...prev,
      [currentCard.id]: optionId,
    }));

    if (mode === 'practice') {
      setIsInstantChecked(true);
    }
  };

  const handleSaveFillInBlank = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentCard || !fillInput.trim()) return;

    setUserAnswers((prev) => ({
      ...prev,
      [currentCard.id]: fillInput.trim(),
    }));

    if (mode === 'practice') {
      setIsInstantChecked(true);
    }
  };

  const toggleFlag = (cardId: string) => {
    setFlaggedQuestions((prev) => ({
      ...prev,
      [cardId]: !prev[cardId],
    }));
  };

  if (!currentCard) return null;

  const currentAnswer = userAnswers[currentCard.id];
  const isCurrentCorrect = currentAnswer ? isAnswerCorrect(currentCard, currentAnswer) : false;
  const isAnswered = Boolean(currentAnswer);
  const answeredCount = Object.keys(userAnswers).length;
  const progressPct = Math.round(((currentIndex + 1) / cards.length) * 100);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* 1. Header Bar with Timer & Status */}
      <div className="bg-card p-4 sm:p-5 rounded-3xl border border-border/70 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <Badge
            variant={mode === 'exam' ? 'destructive' : 'default'}
            className="text-xs font-semibold uppercase tracking-wider px-3 py-1"
          >
            {mode === 'exam' ? 'Chế độ Thi Thử (Tính giờ)' : 'Chế độ Luyện Tập (Xem giải ngay)'}
          </Badge>

          <span className="text-xs text-muted-foreground font-medium">
            Câu <strong>{currentIndex + 1}</strong> / {cards.length}
          </span>
        </div>

        {/* Timer */}
        <div className="flex items-center gap-3">
          {mode === 'exam' ? (
            <div
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl border font-mono font-bold text-sm ${
                secondsRemaining <= 180
                  ? 'bg-destructive/15 text-destructive border-destructive/40 animate-pulse'
                  : 'bg-muted/40 text-foreground border-border/60'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>{formatTime(secondsRemaining)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-muted/30 text-xs text-muted-foreground font-mono">
              <Clock className="h-3.5 w-3.5" />
              <span>{formatTime(timeSpent)}</span>
            </div>
          )}

          {/* Quick Submit button in Exam mode */}
          {mode === 'exam' && (
            <Button
              size="sm"
              variant="default"
              onClick={() => setIsSubmitDialogOpen(true)}
              className="text-xs font-semibold rounded-2xl h-8 px-3.5"
            >
              Nộp bài ({answeredCount}/{cards.length})
            </Button>
          )}
        </div>
      </div>

      <Progress value={progressPct} className="h-1.5" />

      {/* 2. Main Question Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border/80 shadow-md space-y-6">
        {/* Question Header & Flag button */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-7 w-7 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
              #{currentIndex + 1}
            </span>
            <Badge variant="outline" className="text-xs">
              {currentCard.card_type === 'multiple_choice'
                ? 'Trắc nghiệm 4 lựa chọn'
                : currentCard.card_type === 'fill_in_blank'
                ? 'Điền từ vào chỗ trống'
                : 'Flashcard tự kiểm tra'}
            </Badge>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleFlag(currentCard.id)}
            className={`h-8 px-2 text-xs rounded-xl ${
              flaggedQuestions[currentCard.id]
                ? 'text-amber-500 bg-amber-500/10'
                : 'text-muted-foreground'
            }`}
            title="Đánh dấu câu hỏi cần xem lại"
          >
            <Flag className="h-3.5 w-3.5 mr-1" />
            {flaggedQuestions[currentCard.id] ? 'Đã đánh dấu' : 'Đánh dấu'}
          </Button>
        </div>

        {/* Question Text */}
        <div className="text-base sm:text-lg font-display font-semibold text-foreground leading-relaxed">
          <LatexContent content={currentCard.front_text} />
        </div>

        {/* 3. Input / Options based on card type */}
        {currentCard.card_type === 'multiple_choice' && currentCard.options && (
          <div className="space-y-3 pt-2">
            {currentCard.options.map((opt) => {
              const isSelected = currentAnswer === opt.id;
              const isThisCorrect =
                opt.id.toUpperCase() === (currentCard.correct_option || '').toUpperCase();

              let optStyles =
                'border-border/70 hover:border-primary/40 hover:bg-muted/30 text-foreground';

              if (mode === 'practice' && isAnswered) {
                if (isThisCorrect) {
                  optStyles =
                    'border-success bg-success/10 text-success font-semibold shadow-xs';
                } else if (isSelected && !isThisCorrect) {
                  optStyles =
                    'border-destructive bg-destructive/10 text-destructive font-semibold shadow-xs';
                }
              } else if (isSelected) {
                optStyles =
                  'border-primary bg-primary/10 text-primary font-semibold shadow-xs ring-1 ring-primary/30';
              }

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectOption(opt.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 flex items-start gap-3 text-sm ${optStyles}`}
                >
                  <span
                    className={`h-6 w-6 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 border ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/50 text-muted-foreground border-border/70'
                    }`}
                  >
                    {opt.id}
                  </span>
                  <div className="flex-1 pt-0.5 leading-relaxed">
                    <LatexContent content={opt.text} />
                  </div>

                  {mode === 'practice' && isAnswered && (
                    <div className="shrink-0 pt-0.5">
                      {isThisCorrect ? (
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      ) : isSelected ? (
                        <XCircle className="h-5 w-5 text-destructive" />
                      ) : null}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Fill in the blank input */}
        {currentCard.card_type === 'fill_in_blank' && (
          <div className="space-y-4 pt-2">
            <form onSubmit={handleSaveFillInBlank} className="flex gap-2">
              <Input
                value={fillInput}
                onChange={(e) => setFillInput(e.target.value)}
                placeholder="Gõ từ hoặc con số chính xác vào đây..."
                className="text-sm rounded-2xl h-11 bg-muted/20"
                autoFocus
              />
              <Button
                type="submit"
                disabled={!fillInput.trim()}
                className="rounded-2xl h-11 px-5 text-xs font-semibold gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" /> Xác nhận
              </Button>
            </form>

            {mode === 'practice' && isAnswered && (
              <div
                className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-1 ${
                  isCurrentCorrect
                    ? 'bg-success/10 border-success/30 text-success'
                    : 'bg-destructive/10 border-destructive/30 text-destructive'
                }`}
              >
                <div className="font-semibold flex items-center gap-1.5">
                  {isCurrentCorrect ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" /> Chính xác!
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4" /> Chưa chính xác!
                    </>
                  )}
                </div>
                <div>
                  <span className="text-foreground/80 font-medium">Đáp án đúng: </span>
                  <strong className="underline">{currentCard.correct_option || currentCard.back_text}</strong>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2-sided Flashcard check for practice */}
        {currentCard.card_type === 'flashcard_2sided' && (
          <div className="space-y-3 pt-2">
            {mode === 'practice' && !isAnswered ? (
              <div className="bg-muted/30 p-4 rounded-2xl text-center space-y-2 border border-border/50">
                <p className="text-xs text-muted-foreground">
                  Hãy suy nghĩ câu trả lời trong đầu trước khi lật xem đáp án
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSelectOption('correct')}
                  className="rounded-xl text-xs font-semibold"
                >
                  Xem đáp án & Ghi nhận đã thuộc
                </Button>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 text-xs text-foreground/90 space-y-1.5">
                <span className="font-semibold text-primary block">Đáp án chuẩn:</span>
                <LatexContent content={currentCard.back_text} />
              </div>
            )}
          </div>
        )}

        {/* Instant Solution / Explanation Box (Practice Mode Only) */}
        {mode === 'practice' && isAnswered && currentCard.explanation && (
          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 text-xs text-foreground/90 leading-relaxed space-y-1.5 animate-fade-in">
            <span className="font-bold text-primary flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" /> Lời giải chi tiết:
            </span>
            <LatexContent content={currentCard.explanation} />
          </div>
        )}
      </div>

      {/* 4. Navigator & Bottom Actions */}
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          className="rounded-2xl text-xs font-semibold px-4 h-10 gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" /> Câu trước
        </Button>

        {currentIndex < cards.length - 1 ? (
          <Button
            onClick={() => setCurrentIndex((prev) => prev + 1)}
            className="rounded-2xl text-xs font-semibold px-4 h-10 gap-1.5 shadow-sm"
          >
            Câu tiếp theo <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={() => setIsSubmitDialogOpen(true)}
            className="rounded-2xl text-xs font-semibold px-5 h-10 gap-1.5 bg-success hover:bg-success/90 text-white shadow-sm"
          >
            Hoàn thành bài thi <CheckCircle2 className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>

      {/* 5. Question Palette Navigator Matrix */}
      <div className="bg-card p-4 rounded-3xl border border-border/70 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
          <span>Bảng điều hướng câu hỏi:</span>
          <span>Đã làm: {answeredCount}/{cards.length} câu</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {cards.map((card, idx) => {
            const hasAnswer = Boolean(userAnswers[card.id]);
            const isFlag = flaggedQuestions[card.id];
            const isCurrent = idx === currentIndex;

            let btnBg = 'bg-muted/40 text-muted-foreground border-border/60';
            if (isCurrent) {
              btnBg = 'bg-primary text-primary-foreground border-primary shadow-xs ring-2 ring-primary/30';
            } else if (hasAnswer) {
              btnBg = 'bg-primary/20 text-primary border-primary/40 font-bold';
            }

            return (
              <button
                key={card.id}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`relative h-9 w-9 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center ${btnBg}`}
              >
                {idx + 1}
                {isFlag && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-background" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. Confirm Submit Dialog Modal */}
      <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <DialogContent className="max-w-md p-6 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-display">
              <CheckCircle2 className="h-5 w-5 text-primary" /> Xác nhận nộp bài
            </DialogTitle>
            <DialogDescription className="text-xs">
              Bạn có chắc chắn muốn nộp bài và kết thúc lượt kiểm tra này không?
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-2 text-xs">
            <div className="flex justify-between p-2.5 rounded-xl bg-muted/40">
              <span className="text-muted-foreground">Tổng số câu:</span>
              <strong className="text-foreground">{cards.length} câu</strong>
            </div>
            <div className="flex justify-between p-2.5 rounded-xl bg-muted/40">
              <span className="text-muted-foreground">Đã trả lời:</span>
              <strong className="text-primary">{answeredCount} câu</strong>
            </div>
            {cards.length - answeredCount > 0 && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-medium">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Còn {cards.length - answeredCount} câu chưa trả lời.</span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSubmitDialogOpen(false)}
              disabled={submitting}
              className="rounded-xl text-xs"
            >
              Làm tiếp
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitQuiz}
              disabled={submitting}
              className="rounded-xl text-xs font-semibold gap-1.5"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Nộp bài ngay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
