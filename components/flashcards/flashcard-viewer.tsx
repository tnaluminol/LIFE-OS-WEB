'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Flashcard, SpacedRepetitionRating } from '@/lib/types';
import { submitSpacedRepetitionReview } from '@/lib/flashcard-quiz-service';
import { LatexContent } from './latex-content';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Volume2,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Lightbulb,
  Sparkles,
  Smile,
  Meh,
  Frown,
  Maximize2,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

interface FlashcardViewerProps {
  cards: Flashcard[];
  currentUserId: string;
  onComplete?: () => void;
}

export function FlashcardViewer({ cards, currentUserId, onComplete }: FlashcardViewerProps) {
  const [deck, setDeck] = useState<Flashcard[]>(cards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isRatingSubmitting, setIsRatingSubmitting] = useState(false);
  const [ratedCards, setRatedCards] = useState<Record<string, SpacedRepetitionRating>>({});

  useEffect(() => {
    setDeck(cards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
    setRatedCards({});
  }, [cards]);

  const currentCard = deck[currentIndex];
  const progressPct = deck.length > 0 ? Math.round(((currentIndex + 1) / deck.length) * 100) : 0;

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex < deck.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
      setShowHint(false);
    } else {
      if (onComplete) onComplete();
    }
  }, [currentIndex, deck.length, onComplete]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setIsFlipped(false);
      setShowHint(false);
    }
  }, [currentIndex]);

  const handleShuffle = () => {
    const shuffled = [...deck].sort(() => Math.random() - 0.5);
    setDeck(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
    toast.success('Đã xáo trộn thứ tự các thẻ!');
  };

  const handleSpeech = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.replace(/[$#*_]/g, ''));
      utterance.rate = 0.9;
      // Auto detect english
      if (/^[A-Za-z0-9\s.,?!'"-]+$/.test(text.slice(0, 30))) {
        utterance.lang = 'en-US';
      } else {
        utterance.lang = 'vi-VN';
      }
      window.speechSynthesis.speak(utterance);
    } else {
      toast.error('Trình duyệt không hỗ trợ phát âm (TTS)');
    }
  };

  const handleRating = useCallback(async (rating: SpacedRepetitionRating) => {
    if (!currentCard || !currentUserId) return;
    setIsRatingSubmitting(true);

    try {
      const { success, nextReviewDays } = await submitSpacedRepetitionReview(
        currentUserId,
        currentCard.id,
        rating
      );

      if (success) {
        setRatedCards((prev) => ({ ...prev, [currentCard.id]: rating }));

        if (rating === 'easy') {
          toast.success(`Dễ: Ôn lại sau ${nextReviewDays} ngày! 🚀`);
        } else if (rating === 'medium') {
          toast.info(`Bình thường: Ôn lại sau ${nextReviewDays} ngày! 📅`);
        } else {
          toast.warning(`Khó: Sẽ ôn lại trong hôm nay / ngày mai! 🔁`);
        }

        setTimeout(() => {
          handleNext();
        }, 300);
      }
    } catch {
      toast.error('Lỗi khi lưu đánh giá ghi nhớ');
    } finally {
      setIsRatingSubmitting(false);
    }
  }, [currentCard, currentUserId, handleNext]);

  // Keyboard shortcut listener (Space = flip, ArrowLeft = prev, ArrowRight = next, 1/2/3 = rating)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is in an input field
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === '1' && isFlipped) {
        e.preventDefault();
        handleRating('hard');
      } else if (e.key === '2' && isFlipped) {
        e.preventDefault();
        handleRating('medium');
      } else if (e.key === '3' && isFlipped) {
        e.preventDefault();
        handleRating('easy');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFlip, handleNext, handlePrev, handleRating, isFlipped]);

  if (!currentCard) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-sm">Không tìm thấy thẻ ghi nhớ nào trong bộ thẻ này.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto select-none">
      {/* Top Bar: Progress & Tools */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5">
            Thẻ {currentIndex + 1} / {deck.length}
          </Badge>
          {ratedCards[currentCard.id] && (
            <Badge
              className={
                ratedCards[currentCard.id] === 'easy'
                  ? 'bg-success/15 text-success border-success/30'
                  : ratedCards[currentCard.id] === 'medium'
                  ? 'bg-warning/15 text-warning border-warning/30'
                  : 'bg-destructive/15 text-destructive border-destructive/30'
              }
            >
              {ratedCards[currentCard.id] === 'easy'
                ? 'Đã nhớ tốt'
                : ratedCards[currentCard.id] === 'medium'
                ? 'Bình thường'
                : 'Cần ôn lại'}
            </Badge>
          )}
        </div>

        <div className="flex-1 max-w-xs hidden sm:block">
          <Progress value={progressPct} className="h-2" />
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHint(!showHint)}
            disabled={!currentCard.hint}
            className={`h-8 px-2 text-xs rounded-xl ${
              showHint ? 'text-amber-500 bg-amber-500/10' : 'text-muted-foreground'
            }`}
            title="Xem gợi ý"
          >
            <Lightbulb className="h-3.5 w-3.5 mr-1" />
            Gợi ý
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleShuffle}
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground rounded-xl"
            title="Xáo trộn thẻ"
          >
            <Shuffle className="h-3.5 w-3.5 mr-1" />
            Xáo trộn
          </Button>
        </div>
      </div>

      {/* 3D Flip Card Container */}
      <div
        onClick={handleFlip}
        className="relative w-full min-h-[360px] sm:min-h-[420px] rounded-3xl cursor-pointer perspective-1000 group transition-all duration-300"
      >
        <div
          className={`relative w-full h-full min-h-[360px] sm:min-h-[420px] rounded-3xl p-6 sm:p-10 border transition-all duration-500 transform-style-3d shadow-md hover:shadow-xl flex flex-col justify-between ${
            isFlipped
              ? 'bg-card border-primary/40 rotate-y-180'
              : 'bg-gradient-to-br from-card via-card to-primary/5 border-border/80'
          }`}
        >
          {/* Card Top Header */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {isFlipped ? 'Mặt sau (Đáp án & Giải thích)' : 'Mặt trước (Câu hỏi / Thuật ngữ)'}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => handleSpeech(isFlipped ? currentCard.back_text : currentCard.front_text, e)}
                className="p-1.5 rounded-lg hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                title="Nghe phát âm (TTS)"
              >
                <Volume2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Main Card Content */}
          <div className="flex-1 flex flex-col items-center justify-center text-center my-6 px-2 sm:px-6">
            {!isFlipped ? (
              /* FRONT SIDE */
              <div className="space-y-4">
                <div className="text-xl sm:text-2xl lg:text-3xl font-display font-bold text-foreground leading-snug">
                  <LatexContent content={currentCard.front_text} />
                </div>
                {showHint && currentCard.hint && (
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-medium max-w-md mx-auto animate-fade-in">
                    💡 <strong>Gợi ý:</strong> {currentCard.hint}
                  </div>
                )}
              </div>
            ) : (
              /* BACK SIDE */
              <div className="space-y-4 w-full text-left sm:text-center">
                <div className="text-lg sm:text-xl font-semibold text-primary leading-relaxed">
                  <LatexContent content={currentCard.back_text} />
                </div>

                {currentCard.explanation && (
                  <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 text-xs text-foreground/80 leading-relaxed text-left max-w-xl mx-auto space-y-1">
                    <span className="font-semibold text-primary block">Giải thích chi tiết:</span>
                    <LatexContent content={currentCard.explanation} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card Bottom Hint */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/40">
            <span className="text-[11px] hidden sm:inline">
              Nhấn <strong>Space</strong> hoặc click vào thẻ để lật
            </span>
            <div className="flex items-center gap-1.5 ml-auto text-primary font-medium text-xs">
              <RotateCw className="h-3.5 w-3.5" />
              {isFlipped ? 'Xem lại câu hỏi' : 'Lật xem đáp án'}
            </div>
          </div>
        </div>
      </div>

      {/* Spaced Repetition 3-Tier Recall Rating Buttons (Shown when flipped) */}
      {isFlipped ? (
        <div className="p-4 rounded-3xl bg-card border border-border/70 shadow-sm space-y-3 animate-slide-up">
          <div className="text-center">
            <p className="text-xs font-semibold text-foreground">Bạn nhớ kiến thức này ở mức độ nào?</p>
            <p className="text-[11px] text-muted-foreground">
              Hệ thống Spaced Repetition sẽ tự động tính toán lịch ôn tập tối ưu cho bạn.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* HARD: 1 day */}
            <Button
              variant="outline"
              onClick={() => handleRating('hard')}
              disabled={isRatingSubmitting}
              className="flex flex-col h-auto py-2.5 px-3 rounded-2xl border-destructive/30 hover:bg-destructive/10 hover:border-destructive text-destructive font-semibold transition-all group"
            >
              <div className="flex items-center gap-1.5 text-xs">
                <Frown className="h-4 w-4 text-destructive" /> Khó (1 ngày)
              </div>
              <span className="text-[10px] text-muted-foreground font-normal mt-0.5 group-hover:text-destructive">
                Ôn lại ngay (Phím 1)
              </span>
            </Button>

            {/* MEDIUM: 3 days */}
            <Button
              variant="outline"
              onClick={() => handleRating('medium')}
              disabled={isRatingSubmitting}
              className="flex flex-col h-auto py-2.5 px-3 rounded-2xl border-warning/40 hover:bg-warning/10 hover:border-warning text-amber-600 dark:text-amber-400 font-semibold transition-all group"
            >
              <div className="flex items-center gap-1.5 text-xs">
                <Meh className="h-4 w-4 text-amber-500" /> Bình thường (3 ngày)
              </div>
              <span className="text-[10px] text-muted-foreground font-normal mt-0.5 group-hover:text-amber-600">
                Nhớ tương đối (Phím 2)
              </span>
            </Button>

            {/* EASY: 7 days */}
            <Button
              variant="outline"
              onClick={() => handleRating('easy')}
              disabled={isRatingSubmitting}
              className="flex flex-col h-auto py-2.5 px-3 rounded-2xl border-success/40 hover:bg-success/10 hover:border-success text-success font-semibold transition-all group"
            >
              <div className="flex items-center gap-1.5 text-xs">
                <Smile className="h-4 w-4 text-success" /> Dễ (7 ngày)
              </div>
              <span className="text-[10px] text-muted-foreground font-normal mt-0.5 group-hover:text-success">
                Đã nhớ rõ (Phím 3)
              </span>
            </Button>
          </div>
        </div>
      ) : null}

      {/* Navigation Controls */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="rounded-2xl text-xs font-semibold px-4 h-10 gap-1.5"
        >
          <ChevronLeft className="h-4 w-4" /> Thẻ trước
        </Button>

        <div className="text-xs text-muted-foreground font-medium">
          Dùng phím mũi tên <strong>←</strong> / <strong>→</strong> để chuyển thẻ
        </div>

        <Button
          onClick={handleNext}
          className="rounded-2xl text-xs font-semibold px-4 h-10 gap-1.5 shadow-sm"
        >
          {currentIndex < deck.length - 1 ? (
            <>
              Thẻ tiếp theo <ChevronRight className="h-4 w-4" />
            </>
          ) : (
            <>
              Hoàn thành <CheckCircle2 className="h-4 w-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
