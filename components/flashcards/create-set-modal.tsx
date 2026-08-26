'use client';

import { useState } from 'react';
import type {
  FlashcardCardType,
  FlashcardSubject,
  FlashcardGradeLevel,
  FlashcardSet,
} from '@/lib/types';
import { createFlashcardSet } from '@/lib/flashcard-quiz-service';
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
  Plus,
  Trash2,
  BookOpen,
  Sparkles,
  Loader2,
  CheckCircle2,
  Code2,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface CreateSetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  onSetCreated: (set: FlashcardSet) => void;
}

interface DraftCard {
  card_type: FlashcardCardType;
  front_text: string;
  back_text: string;
  options: { id: string; text: string }[];
  correct_option: string;
  explanation: string;
  hint: string;
}

export function CreateSetModal({
  open,
  onOpenChange,
  currentUserId,
  onSetCreated,
}: CreateSetModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState<FlashcardSubject>('physics');
  const [gradeLevel, setGradeLevel] = useState<FlashcardGradeLevel>('grade_11');
  const [tagsInput, setTagsInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [cards, setCards] = useState<DraftCard[]>([
    {
      card_type: 'flashcard_2sided',
      front_text: '',
      back_text: '',
      options: [
        { id: 'A', text: '' },
        { id: 'B', text: '' },
        { id: 'C', text: '' },
        { id: 'D', text: '' },
      ],
      correct_option: 'A',
      explanation: '',
      hint: '',
    },
  ]);

  const handleAddCard = (type: FlashcardCardType = 'flashcard_2sided') => {
    setCards((prev) => [
      ...prev,
      {
        card_type: type,
        front_text: '',
        back_text: '',
        options: [
          { id: 'A', text: '' },
          { id: 'B', text: '' },
          { id: 'C', text: '' },
          { id: 'D', text: '' },
        ],
        correct_option: 'A',
        explanation: '',
        hint: '',
      },
    ]);
  };

  const handleRemoveCard = (index: number) => {
    if (cards.length <= 1) {
      toast.error('Bộ thẻ cần tối thiểu ít nhất 1 câu hỏi');
      return;
    }
    setCards((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateCard = (index: number, fields: Partial<DraftCard>) => {
    setCards((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...fields };
      return next;
    });
  };

  const handleInsertLatexSnippet = (index: number, snippet: string) => {
    const card = cards[index];
    handleUpdateCard(index, {
      front_text: card.front_text ? `${card.front_text} ${snippet}` : snippet,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Vui lòng nhập tiêu đề bộ thẻ');
      return;
    }

    // Validate cards
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      if (!c.front_text.trim()) {
        toast.error(`Câu hỏi #${i + 1} chưa có nội dung đề bài`);
        return;
      }
      if (c.card_type === 'flashcard_2sided' && !c.back_text.trim()) {
        toast.error(`Thẻ #${i + 1} chưa có nội dung mặt sau (đáp án)`);
        return;
      }
      if (c.card_type === 'multiple_choice') {
        const hasEmptyOpt = c.options.some((o) => !o.text.trim());
        if (hasEmptyOpt) {
          toast.error(`Câu trắc nghiệm #${i + 1} cần điền đủ 4 đáp án A/B/C/D`);
          return;
        }
      }
      if (c.card_type === 'fill_in_blank' && !c.correct_option.trim()) {
        toast.error(`Câu điền từ #${i + 1} cần nhập đáp án đúng`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const { set: createdSet, error } = await createFlashcardSet(
        currentUserId,
        {
          title: title.trim(),
          description: description.trim() || undefined,
          subject,
          grade_level: gradeLevel,
          visibility: 'public',
          tags,
          is_ai_generated: false,
        },
        cards.map((c) => ({
          card_type: c.card_type,
          front_text: c.front_text.trim(),
          back_text:
            c.card_type === 'fill_in_blank'
              ? c.correct_option.trim()
              : c.card_type === 'multiple_choice'
              ? `Đáp án ${c.correct_option}`
              : c.back_text.trim(),
          options: c.card_type === 'multiple_choice' ? c.options : undefined,
          correct_option: c.correct_option || undefined,
          explanation: c.explanation.trim() || undefined,
          hint: c.hint.trim() || undefined,
        }))
      );

      if (error || !createdSet) {
        throw error || new Error('Không thể tạo bộ thẻ');
      }

      toast.success(`Đã tạo thành công bộ thẻ "${createdSet.title}"! 🎉`);
      onSetCreated(createdSet);
      onOpenChange(false);

      // Reset form
      setTitle('');
      setDescription('');
      setTagsInput('');
      setCards([
        {
          card_type: 'flashcard_2sided',
          front_text: '',
          back_text: '',
          options: [
            { id: 'A', text: '' },
            { id: 'B', text: '' },
            { id: 'C', text: '' },
            { id: 'D', text: '' },
          ],
          correct_option: 'A',
          explanation: '',
          hint: '',
        },
      ]);
    } catch (err: any) {
      console.error('[CreateSetModal] Error:', err);
      toast.error(err?.message || 'Lỗi khi tạo bộ thẻ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-display">
            <BookOpen className="h-5 w-5 text-primary" /> Tạo bộ thẻ Flashcard & Quiz mới
          </DialogTitle>
          <DialogDescription className="text-xs">
            Nhập tiêu đề, môn học và thêm các câu hỏi Flashcard 2 mặt, Trắc nghiệm A/B/C/D hoặc Điền vào chỗ trống.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-2">
          {/* 1. General Set Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/20 p-4 rounded-2xl border border-border/60">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-foreground">Tiêu đề bộ thẻ *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Vật Lý 11 - Dao động điều hòa & Con lắc lò xo"
                className="text-xs bg-background"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Môn học</label>
              <select
                value={subject}
                onChange={(e: any) => setSubject(e.target.value)}
                className="w-full h-9 rounded-xl border border-border/70 bg-background px-3 text-xs font-medium"
              >
                <option value="physics">⚡ Vật Lý</option>
                <option value="english">🇬🇧 Tiếng Anh</option>
                <option value="math">📐 Toán Học</option>
                <option value="chemistry">🧪 Hóa Học</option>
                <option value="biology">🧬 Sinh Học</option>
                <option value="history">🏛️ Lịch Sử</option>
                <option value="informatics">💻 Tin Học</option>
                <option value="general">✨ Kiến thức chung</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Khối lớp / Trình độ</label>
              <select
                value={gradeLevel}
                onChange={(e: any) => setGradeLevel(e.target.value)}
                className="w-full h-9 rounded-xl border border-border/70 bg-background px-3 text-xs font-medium"
              >
                <option value="grade_10">Lớp 10</option>
                <option value="grade_11">Lớp 11</option>
                <option value="grade_12">Lớp 12</option>
                <option value="university">Đại học / Cao đẳng</option>
                <option value="ielts">Luyện thi IELTS / TOEIC</option>
                <option value="other">Khác</option>
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-foreground">Mô tả ngắn gọn</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tóm tắt nội dung trọng tâm của bộ thẻ..."
                rows={2}
                className="text-xs bg-background resize-none"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-foreground">Tags (phân cách bằng dấu phẩy)</label>
              <Input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Lý 11, Dao động cơ, Đại cương, Ôn thi..."
                className="text-xs bg-background"
              />
            </div>
          </div>

          {/* 2. Questions List Editor */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span>Danh sách câu hỏi</span>
                <Badge variant="outline" className="text-xs">
                  {cards.length} câu
                </Badge>
              </h3>

              {/* Add card button group */}
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddCard('flashcard_2sided')}
                  className="h-8 text-xs font-medium rounded-xl gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> + Thẻ 2 mặt
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddCard('multiple_choice')}
                  className="h-8 text-xs font-medium rounded-xl gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> + Trắc nghiệm
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddCard('fill_in_blank')}
                  className="h-8 text-xs font-medium rounded-xl gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> + Điền từ
                </Button>
              </div>
            </div>

            <div className="space-y-5">
              {cards.map((card, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-3xl border border-border/80 bg-card shadow-xs space-y-4 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-6 w-6 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                        #{idx + 1}
                      </span>

                      {/* Card Type Switcher */}
                      <select
                        value={card.card_type}
                        onChange={(e: any) =>
                          handleUpdateCard(idx, { card_type: e.target.value })
                        }
                        className="h-7 text-xs rounded-lg border border-border/70 bg-background px-2 font-medium"
                      >
                        <option value="flashcard_2sided">📖 Thẻ 2 mặt (Flashcard)</option>
                        <option value="multiple_choice">📝 Trắc nghiệm 4 lựa chọn (A/B/C/D)</option>
                        <option value="fill_in_blank">✍️ Điền vào chỗ trống [___]</option>
                      </select>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveCard(idx)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive rounded-lg"
                      title="Xóa câu hỏi này"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* LaTeX snippet helper */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] text-muted-foreground">
                    <span className="shrink-0 font-medium">Chèn nhanh LaTeX:</span>
                    {[
                      { label: '√x', code: '$\\sqrt{x}$' },
                      { label: 'a/b', code: '$\\frac{a}{b}$' },
                      { label: '∫', code: '$\\int f(x)dx$' },
                      { label: 'ω', code: '$\\omega$' },
                      { label: 'π', code: '$\\pi$' },
                      { label: 'Δ', code: '$\\Delta$' },
                    ].map((s) => (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => handleInsertLatexSnippet(idx, s.code)}
                        className="px-2 py-0.5 rounded-md bg-muted/60 hover:bg-muted text-foreground border border-border/50 font-mono text-[10px]"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>

                  {/* Question (Front) */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span>Mặt trước (Câu hỏi / Đề bài / Công thức) *</span>
                      {card.front_text && (
                        <span className="text-muted-foreground font-normal text-[10px]">
                          Hỗ trợ công thức: $công thức$
                        </span>
                      )}
                    </label>
                    <Textarea
                      value={card.front_text}
                      onChange={(e) => handleUpdateCard(idx, { front_text: e.target.value })}
                      placeholder="Nhập câu hỏi hoặc định nghĩa... Ví dụ: Công thức chu kỳ con lắc lò xo T = 2\pi\sqrt{m/k} là gì?"
                      rows={2}
                      className="text-xs bg-muted/20 resize-none font-mono"
                      required
                    />
                  </div>

                  {/* 1. Flashcard 2-sided Back Text */}
                  {card.card_type === 'flashcard_2sided' && (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">
                        Mặt sau (Đáp án & Lời giải) *
                      </label>
                      <Textarea
                        value={card.back_text}
                        onChange={(e) => handleUpdateCard(idx, { back_text: e.target.value })}
                        placeholder="Nhập đáp án chi tiết, ví dụ minh họa hoặc công thức mở rộng..."
                        rows={2}
                        className="text-xs bg-muted/20 resize-none font-mono"
                        required
                      />
                    </div>
                  )}

                  {/* 2. Multiple Choice Options A/B/C/D */}
                  {card.card_type === 'multiple_choice' && (
                    <div className="space-y-2.5 bg-muted/20 p-3.5 rounded-2xl border border-border/50">
                      <label className="text-xs font-semibold text-foreground block">
                        4 Phương án lựa chọn (Chọn phương án đúng):
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {card.options.map((opt) => (
                          <div key={opt.id} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleUpdateCard(idx, { correct_option: opt.id })}
                              className={`h-7 w-7 rounded-lg text-xs font-bold shrink-0 border transition-all ${
                                card.correct_option === opt.id
                                  ? 'bg-success text-white border-success'
                                  : 'bg-background text-muted-foreground border-border/80 hover:border-success/50'
                              }`}
                              title="Đánh dấu đáp án đúng"
                            >
                              {opt.id}
                            </button>
                            <Input
                              value={opt.text}
                              onChange={(e) => {
                                const newOpts = card.options.map((o) =>
                                  o.id === opt.id ? { ...o, text: e.target.value } : o
                                );
                                handleUpdateCard(idx, { options: newOpts });
                              }}
                              placeholder={`Nội dung lựa chọn ${opt.id}...`}
                              className="text-xs h-8 bg-background font-mono"
                              required
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3. Fill in the blank correct word */}
                  {card.card_type === 'fill_in_blank' && (
                    <div className="space-y-1 bg-muted/20 p-3.5 rounded-2xl border border-border/50">
                      <label className="text-xs font-semibold text-foreground">
                        Từ / con số chính xác cần điền vào [___] *
                      </label>
                      <Input
                        value={card.correct_option}
                        onChange={(e) =>
                          handleUpdateCard(idx, { correct_option: e.target.value })
                        }
                        placeholder="Nhập từ hoặc con số chuẩn xác..."
                        className="text-xs h-8 bg-background font-mono"
                        required
                      />
                    </div>
                  )}

                  {/* Extra Hint & Explanation */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <Input
                      value={card.hint}
                      onChange={(e) => handleUpdateCard(idx, { hint: e.target.value })}
                      placeholder="Gợi ý (tùy chọn)..."
                      className="text-xs h-8 bg-muted/20"
                    />
                    <Input
                      value={card.explanation}
                      onChange={(e) => handleUpdateCard(idx, { explanation: e.target.value })}
                      placeholder="Lời giải thích chi tiết (tùy chọn)..."
                      className="text-xs h-8 bg-muted/20"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="text-xs font-semibold gap-1.5"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              Lưu & Bắt đầu học
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
