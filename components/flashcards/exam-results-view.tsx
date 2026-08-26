'use client';

import { useState } from 'react';
import type { QuizResult } from '@/lib/types';
import { LatexContent } from './latex-content';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Trophy,
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Filter,
  Layers,
} from 'lucide-react';

interface ExamResultsViewProps {
  result: QuizResult;
  onRetake: () => void;
  onPracticeWrongOnly?: () => void;
  onBackToSets: () => void;
}

export function ExamResultsView({
  result,
  onRetake,
  onPracticeWrongOnly,
  onBackToSets,
}: ExamResultsViewProps) {
  const [filterType, setFilterType] = useState<'all' | 'wrong' | 'correct'>('all');

  const {
    total_questions,
    correct_answers,
    score_percentage,
    time_spent_seconds,
    answers_summary = [],
  } = result;

  const wrongCount = total_questions - correct_answers;
  const filteredAnswers = answers_summary.filter((item) => {
    if (filterType === 'correct') return item.is_correct;
    if (filterType === 'wrong') return !item.is_correct;
    return true;
  });

  // Calculate performance tier & badge
  let performanceTier = {
    title: 'Cần cố gắng thêm! 💪',
    color: 'text-destructive',
    badgeBg: 'bg-destructive/10 text-destructive border-destructive/20',
    description: 'Hãy ôn lại các câu trả lời sai và làm bài thêm một lần nữa nhé.',
  };

  if (score_percentage >= 90) {
    performanceTier = {
      title: 'Xuất sắc tuyệt vời! 🌟',
      color: 'text-amber-500',
      badgeBg: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      description: 'Bạn đã nắm vững toàn bộ kiến thức của bộ thẻ này!',
    };
  } else if (score_percentage >= 75) {
    performanceTier = {
      title: 'Rất tốt! 🎉',
      color: 'text-success',
      badgeBg: 'bg-success/10 text-success border-success/20',
      description: 'Kết quả ấn tượng! Tiếp tục phát huy trong các bộ thẻ khác.',
    };
  } else if (score_percentage >= 50) {
    performanceTier = {
      title: 'Đạt yêu cầu! 🍃',
      color: 'text-primary',
      badgeBg: 'bg-primary/10 text-primary border-primary/20',
      description: 'Bạn đã nắm được các điểm chính, hãy củng cố thêm phần lý thuyết.',
    };
  }

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins > 0 ? `${mins} phút ` : ''}${secs} giây`;
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
      {/* 1. Top Score Card */}
      <Card className="border-border/70 bg-gradient-to-br from-card via-card to-primary/5 shadow-md overflow-hidden rounded-3xl">
        <CardContent className="p-6 sm:p-8 text-center space-y-5">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary mb-1 shadow-inner">
            <Trophy className="h-8 w-8" />
          </div>

          <div className="space-y-1">
            <Badge className={`text-xs px-3 py-1 font-bold ${performanceTier.badgeBg}`}>
              {performanceTier.title}
            </Badge>
            <div className="text-4xl sm:text-5xl font-display font-black text-foreground pt-2">
              {score_percentage}%
            </div>
            <p className="text-xs text-muted-foreground max-w-md mx-auto pt-1">
              {performanceTier.description}
            </p>
          </div>

          {/* Metrics summary row */}
          <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto pt-2">
            <div className="bg-background/80 backdrop-blur-sm p-3.5 rounded-2xl border border-border/60 text-center">
              <span className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Câu đúng
              </span>
              <p className="text-lg font-bold text-success mt-0.5">
                {correct_answers} / {total_questions}
              </p>
            </div>

            <div className="bg-background/80 backdrop-blur-sm p-3.5 rounded-2xl border border-border/60 text-center">
              <span className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                <XCircle className="h-3.5 w-3.5 text-destructive" /> Câu sai
              </span>
              <p className="text-lg font-bold text-destructive mt-0.5">
                {wrongCount}
              </p>
            </div>

            <div className="bg-background/80 backdrop-blur-sm p-3.5 rounded-2xl border border-border/60 text-center">
              <span className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                <Clock className="h-3.5 w-3.5 text-primary" /> Thời gian
              </span>
              <p className="text-xs font-bold text-foreground mt-1.5 truncate">
                {formatTime(time_spent_seconds)}
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-3 border-t border-border/50">
            <Button
              variant="outline"
              size="sm"
              onClick={onRetake}
              className="rounded-2xl text-xs font-semibold px-4 h-9 gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Làm lại bài thi
            </Button>

            {wrongCount > 0 && onPracticeWrongOnly && (
              <Button
                size="sm"
                onClick={onPracticeWrongOnly}
                className="rounded-2xl text-xs font-semibold px-4 h-9 gap-1.5 bg-destructive hover:bg-destructive/90 text-white shadow-sm"
              >
                <Sparkles className="h-3.5 w-3.5" /> Luyện riêng {wrongCount} câu sai
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={onBackToSets}
              className="rounded-2xl text-xs px-3 h-9"
            >
              Về danh sách bộ thẻ <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. Detailed Question-by-Question Review */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" /> Chi tiết từng câu hỏi ({filteredAnswers.length})
          </h3>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-2xl border border-border/50 text-xs w-fit">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-xl font-medium transition-all ${
                filterType === 'all'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Tất cả ({answers_summary.length})
            </button>
            <button
              onClick={() => setFilterType('wrong')}
              className={`px-3 py-1 rounded-xl font-medium transition-all ${
                filterType === 'wrong'
                  ? 'bg-destructive/15 text-destructive font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Câu sai ({wrongCount})
            </button>
            <button
              onClick={() => setFilterType('correct')}
              className={`px-3 py-1 rounded-xl font-medium transition-all ${
                filterType === 'correct'
                  ? 'bg-success/15 text-success font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Câu đúng ({correct_answers})
            </button>
          </div>
        </div>

        {/* Answers List */}
        <div className="space-y-3">
          {filteredAnswers.map((item, idx) => (
            <div
              key={item.card_id || idx}
              className={`p-4 sm:p-5 rounded-3xl border transition-all text-xs space-y-3 ${
                item.is_correct
                  ? 'bg-card border-success/30'
                  : 'bg-card border-destructive/30'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-6 w-6 rounded-lg text-xs font-bold flex items-center justify-center ${
                      item.is_correct
                        ? 'bg-success/15 text-success'
                        : 'bg-destructive/15 text-destructive'
                    }`}
                  >
                    #{idx + 1}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {item.card_type === 'multiple_choice'
                      ? 'Trắc nghiệm'
                      : item.card_type === 'fill_in_blank'
                      ? 'Điền từ'
                      : 'Flashcard'}
                  </Badge>
                </div>

                <div className="flex items-center gap-1 font-semibold text-xs">
                  {item.is_correct ? (
                    <span className="text-success flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" /> Đúng
                    </span>
                  ) : (
                    <span className="text-destructive flex items-center gap-1">
                      <XCircle className="h-4 w-4" /> Sai
                    </span>
                  )}
                </div>
              </div>

              {/* Question */}
              <div className="text-sm font-semibold text-foreground">
                <LatexContent content={item.question} />
              </div>

              {/* Answers Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div
                  className={`p-3 rounded-2xl border text-xs space-y-0.5 ${
                    item.is_correct
                      ? 'bg-success/5 border-success/20 text-success'
                      : 'bg-destructive/5 border-destructive/20 text-destructive'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Câu trả lời của bạn:
                  </span>
                  <div className="font-semibold">
                    <LatexContent content={item.user_answer || '(Chưa trả lời)'} />
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-muted/40 border border-border/50 text-xs space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Đáp án chính xác:
                  </span>
                  <div className="font-semibold text-foreground">
                    <LatexContent content={item.correct_answer} />
                  </div>
                </div>
              </div>

              {/* Explanation */}
              {item.explanation && (
                <div className="p-3 rounded-2xl bg-muted/30 border border-border/40 text-[11px] text-foreground/80 leading-relaxed space-y-1">
                  <span className="font-semibold text-primary block">Giải thích chi tiết:</span>
                  <LatexContent content={item.explanation} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
