'use client';

import { useState } from 'react';
import type {
  FlashcardCardType,
  FlashcardSubject,
  FlashcardGradeLevel,
  FlashcardSet,
} from '@/lib/types';
import { generateFlashcardsFromText, createFlashcardSet } from '@/lib/flashcard-quiz-service';
import { LatexContent } from './latex-content';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Loader2,
  BookOpen,
  CheckCircle2,
  ArrowRight,
  HelpCircle,
  FileText,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

interface AiGenerateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  onSetCreated: (set: FlashcardSet) => void;
}

export function AiGenerateModal({
  open,
  onOpenChange,
  currentUserId,
  onSetCreated,
}: AiGenerateModalProps) {
  const [inputText, setInputText] = useState('');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [preferredType, setPreferredType] = useState<
    'mixed' | 'flashcard_2sided' | 'multiple_choice' | 'fill_in_blank'
  >('mixed');

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Result Preview
  const [generatedData, setGeneratedData] = useState<{
    title: string;
    description: string;
    subject: FlashcardSubject;
    grade_level: FlashcardGradeLevel;
    cards: any[];
  } | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || inputText.trim().length < 20) {
      toast.error('Vui lòng dán ít nhất 20 ký tự văn bản hoặc lý thuyết để AI xử lý');
      return;
    }

    setGenerating(true);
    try {
      const res = await generateFlashcardsFromText(inputText.trim(), {
        count: questionCount,
        preferredType,
      });

      if (!res.cards || res.cards.length === 0) {
        throw new Error('AI không trích xuất được câu hỏi phù hợp. Vui lòng thử lại với đoạn văn rõ ràng hơn.');
      }

      setGeneratedData(res);
      toast.success(`🎉 AI đã tạo thành công ${res.cards.length} câu hỏi Flashcard & Quiz!`);
    } catch (err: any) {
      console.error('[AiGenerateModal:generate] Error:', err);
      toast.error(err?.message || 'Không thể tạo câu hỏi từ văn bản này');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveSet = async () => {
    if (!generatedData || !currentUserId) return;
    setSaving(true);

    try {
      const { set: createdSet, error } = await createFlashcardSet(
        currentUserId,
        {
          title: generatedData.title,
          description: generatedData.description,
          subject: generatedData.subject,
          grade_level: generatedData.grade_level,
          visibility: 'public',
          is_ai_generated: true,
          tags: ['AI-Generated', generatedData.subject],
        },
        generatedData.cards
      );

      if (error || !createdSet) throw error || new Error('Không thể lưu bộ thẻ');

      toast.success(`Đã lưu bộ thẻ "${createdSet.title}" vào tài khoản của bạn!`);
      onSetCreated(createdSet);
      onOpenChange(false);

      // Reset
      setInputText('');
      setGeneratedData(null);
    } catch (err: any) {
      console.error('[AiGenerateModal:save] Error:', err);
      toast.error(err?.message || 'Lỗi khi lưu bộ thẻ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-display">
            <Sparkles className="h-5 w-5 text-primary" /> AI Auto-Generate Flashcard & Quiz
          </DialogTitle>
          <DialogDescription className="text-xs">
            Dán văn bản, bài giảng hoặc lý thuyết môn học (Toán, Lý, Hóa, Tiếng Anh...). AI sẽ tự động trích xuất thành bộ Flashcard và câu hỏi trắc nghiệm thông minh.
          </DialogDescription>
        </DialogHeader>

        {!generatedData ? (
          /* INPUT & CONFIGURATION FORM */
          <form onSubmit={handleGenerate} className="space-y-5 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Dán văn bản / lý thuyết bài học:</span>
                <span className="text-muted-foreground font-normal text-[11px]">
                  {inputText.length} ký tự
                </span>
              </label>
              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Dán đoạn văn, định nghĩa, công thức toán lý hóa hoặc từ vựng vào đây... Ví dụ:&#10;&#10;Dao động điều hòa là dao động trong đó li độ của vật là một hàm cosin (hay sin) của thời gian. Phương trình li độ: x = A*cos(omega*t + phi)..."
                rows={8}
                className="text-xs bg-muted/20 resize-none font-mono"
                required
              />
            </div>

            {/* Config Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-2xl border border-border/60">
              {/* Question Count */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Số lượng câu hỏi cần tạo</label>
                <div className="flex gap-2">
                  {[5, 10, 15, 20].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setQuestionCount(c)}
                      className={`flex-1 py-1.5 text-xs rounded-xl border font-semibold transition-all ${
                        questionCount === c
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-muted-foreground border-border/70'
                      }`}
                    >
                      {c} câu
                    </button>
                  ))}
                </div>
              </div>

              {/* Preferred Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Định dạng câu hỏi ưu tiên</label>
                <select
                  value={preferredType}
                  onChange={(e: any) => setPreferredType(e.target.value)}
                  className="w-full h-9 rounded-xl border border-border/70 bg-background px-3 text-xs font-medium"
                >
                  <option value="mixed">✨ Hỗn hợp (Flashcard + Trắc nghiệm + Điền từ)</option>
                  <option value="flashcard_2sided">📖 Thẻ 2 mặt (Flashcard Spaced Repetition)</option>
                  <option value="multiple_choice">📝 Trắc nghiệm 4 lựa chọn (A/B/C/D)</option>
                  <option value="fill_in_blank">✍️ Điền vào chỗ trống [___]</option>
                </select>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/50">
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Hủy
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={generating || inputText.trim().length < 20}
                className="gap-1.5 font-semibold"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    AI Đang phân tích văn bản...
                  </>
                ) : (
                  <>
                    <Zap className="h-3.5 w-3.5" />
                    Tạo câu hỏi ngay bằng AI
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          /* GENERATED PREVIEW & SAVE CONFIRMATION */
          <div className="space-y-5 py-2">
            {/* Set summary */}
            <div className="bg-primary/5 p-4 rounded-2xl border border-primary/20 space-y-2">
              <div className="flex items-center justify-between">
                <Badge className="bg-primary/15 text-primary border-primary/30 text-xs font-semibold gap-1">
                  <Sparkles className="h-3 w-3" /> Đã tạo {generatedData.cards.length} câu hỏi
                </Badge>
                <span className="text-xs text-muted-foreground font-medium">Môn: {generatedData.subject}</span>
              </div>

              <div className="space-y-1">
                <Input
                  value={generatedData.title}
                  onChange={(e) =>
                    setGeneratedData({ ...generatedData, title: e.target.value })
                  }
                  className="font-bold text-sm bg-background"
                />
                <Input
                  value={generatedData.description}
                  onChange={(e) =>
                    setGeneratedData({ ...generatedData, description: e.target.value })
                  }
                  className="text-xs bg-background"
                />
              </div>
            </div>

            {/* Questions preview list */}
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {generatedData.cards.map((c, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl border border-border/70 bg-card text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary">Câu #{i + 1}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {c.card_type === 'multiple_choice'
                        ? 'Trắc nghiệm'
                        : c.card_type === 'fill_in_blank'
                        ? 'Điền từ'
                        : 'Flashcard'}
                    </Badge>
                  </div>
                  <p className="font-medium text-foreground">
                    <LatexContent content={c.front_text} />
                  </p>
                  <div className="bg-muted/40 p-2 rounded-lg text-foreground/80 text-[11px]">
                    <span className="font-semibold text-success">Đáp án: </span>
                    <LatexContent content={c.back_text || c.correct_option} />
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setGeneratedData(null)}
                className="text-xs"
              >
                Nhập lại văn bản
              </Button>
              <Button
                size="sm"
                onClick={handleSaveSet}
                disabled={saving}
                className="gap-1.5 font-semibold"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                Lưu & Bắt đầu học ngay
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
