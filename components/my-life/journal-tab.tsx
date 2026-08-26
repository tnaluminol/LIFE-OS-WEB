'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  fetchJournalFeed,
  createJournalEntry,
  deleteJournalEntry,
  toggleJournalReaction,
  addJournalComment,
  deleteJournalComment,
  shareJournalEntry,
} from '@/lib/my-life-service';
import type { JournalEntry, JournalComment, Profile } from '@/lib/types';
import { moodEmoji, moodLabel, formatRelativeTime, initials } from '@/lib/helpers';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  BookOpen,
  Send,
  MessageCircle,
  Share2,
  Lock,
  Users,
  Globe,
  Trash2,
  MoreVertical,
  Loader2,
  Sparkles,
  Smile,
  Copy,
  Check,
  Hash,
  X,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

const POPULAR_STUDY_TAGS = ['Toán', 'IELTS', 'Coding', 'Lý', 'Hóa', 'Ôn Thi', 'DeepWork', 'Đọc sách', 'Dự án'];
const REACTION_EMOJIS = ['❤️', '👍', '💡', '🔥', '🎉', '👏'];

interface JournalTabProps {
  currentUserId: string;
  currentUserProfile: Profile | null;
  journals: JournalEntry[];
  onJournalsUpdated: () => void;
  onOpenFriendsModal: () => void;
}

export function JournalTab({
  currentUserId,
  currentUserProfile,
  journals,
  onJournalsUpdated,
  onOpenFriendsModal,
}: JournalTabProps) {
  // Feed filter state
  const [feedFilter, setFeedFilter] = useState<'friends' | 'mine' | 'public'>('friends');

  // Composer state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState(4);
  const [visibility, setVisibility] = useState<'friends' | 'private' | 'public'>('friends');
  const [selectedTags, setSelectedTags] = useState<string[]>(['IELTS', 'DeepWork']);
  const [customTagInput, setCustomTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Active Comment Drawer / Inline state
  const [activeCommentJournalId, setActiveCommentJournalId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Share Dialog state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sharingJournal, setSharingJournal] = useState<JournalEntry | null>(null);
  const [shareNote, setShareNote] = useState('');
  const [submittingShare, setSubmittingShare] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Filter journals based on active tab
  const filteredJournals = journals.filter((j) => {
    if (feedFilter === 'mine') return j.user_id === currentUserId;
    if (feedFilter === 'public') return j.visibility === 'public';
    // 'friends'
    return j.user_id === currentUserId || j.visibility === 'friends' || j.visibility === 'public';
  });

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && customTagInput.trim()) {
      e.preventDefault();
      const cleaned = customTagInput.trim().replace(/^#/, '');
      if (!selectedTags.includes(cleaned)) {
        setSelectedTags([...selectedTags, cleaned]);
      }
      setCustomTagInput('');
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error('Vui lòng nhập nội dung nhật ký học tập');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await createJournalEntry(currentUserId, {
        title: title.trim() || undefined,
        content: content.trim(),
        mood,
        visibility,
        tags: selectedTags,
      });

      if (error) throw error;

      toast.success(
        visibility === 'friends'
          ? 'Đã chia sẻ nhật ký học tập với bạn bè!'
          : visibility === 'private'
          ? 'Đã lưu nhật ký riêng tư!'
          : 'Đã đăng bài viết công khai!'
      );

      // Reset form
      setTitle('');
      setContent('');
      setMood(4);
      setSelectedTags([]);
      onJournalsUpdated();
    } catch (err: any) {
      console.error('[JournalTab:createPost] Error:', err);
      toast.error(err?.message ? `Lỗi: ${err.message}` : 'Không thể lưu nhật ký. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async (journalId: string) => {
    try {
      const { success, error } = await deleteJournalEntry(journalId);
      if (error || !success) throw error || new Error('Không thể xóa bài viết');
      toast.success('Đã xóa bài viết');
      onJournalsUpdated();
    } catch (err: any) {
      console.error('[JournalTab:deletePost] Error:', err);
      toast.error(err?.message ? `Lỗi: ${err.message}` : 'Không thể xóa bài viết');
    }
  };

  const handleReaction = async (journalId: string, emoji: string) => {
    try {
      const { error } = await toggleJournalReaction(currentUserId, journalId, emoji);
      if (error) throw error;
      onJournalsUpdated();
    } catch (err: any) {
      console.error('[JournalTab:reaction] Error:', err);
      toast.error(err?.message ? `Lỗi: ${err.message}` : 'Không thể thả biểu cảm');
    }
  };

  const handleSendComment = async (journalId: string) => {
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const { error } = await addJournalComment(currentUserId, journalId, commentText);
      if (error) throw error;
      setCommentText('');
      toast.success('Đã gửi bình luận');
      onJournalsUpdated();
    } catch (err: any) {
      console.error('[JournalTab:sendComment] Error:', err);
      toast.error(err?.message ? `Lỗi: ${err.message}` : 'Không thể gửi bình luận');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { success, error } = await deleteJournalComment(commentId);
      if (error || !success) throw error || new Error('Không thể xóa bình luận');
      toast.success('Đã xóa bình luận');
      onJournalsUpdated();
    } catch (err: any) {
      console.error('[JournalTab:deleteComment] Error:', err);
      toast.error(err?.message ? `Lỗi: ${err.message}` : 'Không thể xóa bình luận');
    }
  };

  const handleOpenShare = (journal: JournalEntry) => {
    setSharingJournal(journal);
    setShareNote('');
    setCopiedLink(false);
    setShareDialogOpen(true);
  };

  const handleConfirmShare = async () => {
    if (!sharingJournal) return;
    setSubmittingShare(true);
    try {
      const { success, error } = await shareJournalEntry(
        currentUserId,
        sharingJournal.id,
        shareNote
      );
      if (error || !success) throw error || new Error('Không thể chia sẻ bài viết');
      toast.success('Đã chia sẻ bài viết thành công!');
      setShareDialogOpen(false);
      onJournalsUpdated();
    } catch (err: any) {
      console.error('[JournalTab:share] Error:', err);
      toast.error(err?.message ? `Lỗi: ${err.message}` : 'Không thể chia sẻ bài viết');
    } finally {
      setSubmittingShare(false);
    }
  };

  const handleCopyLink = (journalId: string) => {
    const shareUrl = `${window.location.origin}/app/my-life?journal=${journalId}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    toast.success('Đã sao chép liên kết vào clipboard');
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* 1. JOURNAL COMPOSER CARD */}
      <Card className="border-border/70 shadow-sm overflow-hidden bg-card/80 backdrop-blur-sm">
        <div className="bg-primary/5 px-5 py-3 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <BookOpen className="h-4 w-4 text-primary" />
            Nhật ký & Tiến trình học tập
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setVisibility('friends')}
              className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                visibility === 'friends'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <Users className="h-3 w-3" /> Bạn bè
            </button>
            <button
              type="button"
              onClick={() => setVisibility('private')}
              className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                visibility === 'private'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <Lock className="h-3 w-3" /> Riêng tư
            </button>
            <button
              type="button"
              onClick={() => setVisibility('public')}
              className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                visibility === 'public'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <Globe className="h-3 w-3" /> Công khai
            </button>
          </div>
        </div>

        <form onSubmit={handleCreatePost}>
          <CardContent className="p-5 space-y-4">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tiêu đề nhật ký hôm nay... (Ví dụ: Hoàn thành 50 câu IELTS Listening)"
              className="font-medium text-sm border-border/60 bg-muted/20"
            />

            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Chia sẻ những gì bạn đã học được, kiến thức tâm đắc, hoặc khó khăn bạn đã vượt qua..."
              rows={4}
              className="resize-none text-sm border-border/60 bg-muted/20 focus-visible:ring-primary/20"
            />

            {/* Mood selector & Tag Picker Row */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                {/* Mood picker */}
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-medium flex items-center gap-1">
                    <Smile className="h-3.5 w-3.5 text-primary" /> Cảm xúc buổi học:
                  </span>
                  <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl">
                    {[1, 2, 3, 4, 5].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMood(m)}
                        className={`text-lg p-1.5 rounded-lg transition-all ${
                          mood === m
                            ? 'bg-background shadow-xs scale-110'
                            : 'opacity-40 hover:opacity-100'
                        }`}
                        title={moodLabel(m, 'vi')}
                      >
                        {moodEmoji(m)}
                      </button>
                    ))}
                    <span className="text-[11px] font-semibold text-foreground px-1.5">
                      {moodLabel(mood, 'vi')}
                    </span>
                  </div>
                </div>

                {/* Submit button */}
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting || !content.trim()}
                  className="gap-1.5 px-4 font-semibold shadow-sm"
                >
                  {submitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Đăng nhật ký
                </Button>
              </div>

              {/* Tag Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Hash className="h-3 w-3 text-primary" /> Gắn thẻ chủ đề:
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {POPULAR_STUDY_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleTag(tag)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                        selectedTags.includes(tag)
                          ? 'bg-primary/10 text-primary border-primary/30 font-medium'
                          : 'bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/70'
                      }`}
                    >
                      #{tag}
                    </button>
                  ))}
                  <Input
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    onKeyDown={handleAddCustomTag}
                    placeholder="+ Thêm thẻ..."
                    className="h-7 w-24 text-xs bg-muted/20 border-dashed border-border/70"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </form>
      </Card>

      {/* 2. FEED FILTER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/60 p-3 rounded-2xl border border-border/60 backdrop-blur-sm">
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl">
          <button
            onClick={() => setFeedFilter('friends')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              feedFilter === 'friends'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="h-3.5 w-3.5 text-primary" />
            Bản tin Bạn bè
          </button>
          <button
            onClick={() => setFeedFilter('mine')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              feedFilter === 'mine'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5 text-primary" />
            Nhật ký của tôi
          </button>
          <button
            onClick={() => setFeedFilter('public')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              feedFilter === 'public'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Globe className="h-3.5 w-3.5 text-primary" />
            Cộng đồng
          </button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenFriendsModal}
          className="text-xs text-primary hover:text-primary gap-1 font-medium"
        >
          <Users className="h-3.5 w-3.5" /> Quản lý kết nối bạn bè
        </Button>
      </div>

      {/* 3. JOURNAL POSTS FEED */}
      {filteredJournals.length === 0 ? (
        <Card className="border-dashed border-border/80 bg-muted/10">
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <h3 className="text-sm font-semibold text-foreground">
              {feedFilter === 'mine'
                ? 'Bạn chưa có bài viết nhật ký nào'
                : feedFilter === 'friends'
                ? 'Chưa có nhật ký nào từ bạn bè'
                : 'Chưa có bài viết công khai'}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              {feedFilter === 'friends'
                ? 'Hãy kết nối thêm bạn bè hoặc bắt đầu chia sẻ quá trình học tập của bạn ở khung phía trên!'
                : 'Ghi lại hành trình học tập mỗi ngày để theo dõi sự tiến bộ của bản thân.'}
            </p>
            {feedFilter === 'friends' && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenFriendsModal}
                className="mt-4 text-xs gap-1.5 rounded-xl border-primary/30 text-primary hover:bg-primary/10"
              >
                <Users className="h-3.5 w-3.5" /> Tìm & Kết nối bạn bè
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredJournals.map((journal) => {
            const author = journal.author || currentUserProfile;
            const isOwner = journal.user_id === currentUserId;
            const isCommentsOpen = activeCommentJournalId === journal.id;
            const commentsList = journal.comments || [];
            const reactionsList = journal.reactions || [];

            // Group reactions by emoji type
            const reactionCounts: Record<string, number> = {};
            reactionsList.forEach((r) => {
              reactionCounts[r.reaction_type] = (reactionCounts[r.reaction_type] || 0) + 1;
            });

            return (
              <Card
                key={journal.id}
                className="border-border/60 bg-card/90 backdrop-blur-sm shadow-xs hover:border-border transition-all"
              >
                {/* Header */}
                <CardHeader className="p-4 pb-3 flex flex-row items-start justify-between space-y-0">
                  <div className="flex items-center gap-3">
                    <Link href={author ? `/app/profile/${author.username}` : '#'}>
                      <Avatar className="h-10 w-10 border border-primary/20 hover:ring-2 hover:ring-primary/20 transition-all">
                        {author?.avatar_url && <AvatarImage src={author.avatar_url} />}
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                          {author ? initials(author.username) : 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={author ? `/app/profile/${author.username}` : '#'}
                          className="font-semibold text-sm hover:text-primary transition-colors"
                        >
                          {author?.username || 'Bạn học'}
                        </Link>
                        {author?.verification_status === 'verified' && (
                          <Badge className="bg-success/10 text-success border-success/20 text-[10px] py-0">
                            Verified
                          </Badge>
                        )}
                        {/* Visibility badge */}
                        <Badge
                          variant="secondary"
                          className="text-[10px] gap-1 px-1.5 py-0 bg-muted/60 text-muted-foreground font-normal"
                        >
                          {journal.visibility === 'private' ? (
                            <>
                              <Lock className="h-2.5 w-2.5" /> Riêng tư
                            </>
                          ) : journal.visibility === 'public' ? (
                            <>
                              <Globe className="h-2.5 w-2.5" /> Công khai
                            </>
                          ) : (
                            <>
                              <Users className="h-2.5 w-2.5" /> Bạn bè
                            </>
                          )}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {formatRelativeTime(journal.created_at, 'vi')}
                      </p>
                    </div>
                  </div>

                  {/* Right Header: Mood Badge & Actions */}
                  <div className="flex items-center gap-2">
                    {journal.mood && (
                      <div
                        className="flex items-center gap-1 bg-muted/40 border border-border/50 px-2 py-1 rounded-xl text-xs"
                        title={moodLabel(journal.mood, 'vi')}
                      >
                        <span className="text-base leading-none">{moodEmoji(journal.mood)}</span>
                        <span className="text-[11px] font-medium text-foreground">
                          {moodLabel(journal.mood, 'vi')}
                        </span>
                      </div>
                    )}

                    {isOwner && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleDeletePost(journal.id)}
                            className="text-destructive gap-2 text-xs"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Xóa bài viết
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardHeader>

                {/* Content */}
                <CardContent className="px-4 py-2 space-y-3">
                  {journal.title && (
                    <h4 className="font-semibold text-base text-foreground leading-snug">
                      {journal.title}
                    </h4>
                  )}
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                    {journal.content}
                  </p>

                  {/* Tags */}
                  {journal.tags && journal.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {journal.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-[11px] font-normal bg-muted/30 border-border/60 text-muted-foreground"
                        >
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Active Reactions Pills */}
                  {reactionsList.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/40">
                      {Object.entries(reactionCounts).map(([emoji, count]) => (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(journal.id, emoji)}
                          className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all ${
                            journal.user_has_reacted === emoji
                              ? 'bg-primary/10 border-primary text-primary font-bold'
                              : 'bg-muted/40 border-border/50 text-foreground hover:bg-muted'
                          }`}
                        >
                          <span>{emoji}</span>
                          <span className="text-[11px]">{count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>

                {/* Footer Interaction Bar */}
                <CardFooter className="px-4 py-2.5 border-t border-border/50 bg-muted/10 flex items-center justify-between">
                  {/* Reaction Picker Bar */}
                  <div className="flex items-center gap-1">
                    {REACTION_EMOJIS.map((emoji) => {
                      const isSelected = journal.user_has_reacted === emoji;
                      return (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleReaction(journal.id, emoji)}
                          className={`text-lg p-1.5 rounded-lg hover:scale-125 transition-transform ${
                            isSelected ? 'bg-primary/20 scale-110 shadow-xs' : 'opacity-70 hover:opacity-100'
                          }`}
                          title={`Thả ${emoji}`}
                        >
                          {emoji}
                        </button>
                      );
                    })}
                  </div>

                  {/* Comments & Share triggers */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setActiveCommentJournalId(isCommentsOpen ? null : journal.id)
                      }
                      className={`h-8 px-2.5 text-xs gap-1.5 font-medium ${
                        isCommentsOpen ? 'text-primary bg-primary/10' : 'text-muted-foreground'
                      }`}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      <span>{commentsList.length > 0 ? commentsList.length : 'Bình luận'}</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenShare(journal)}
                      className="h-8 px-2.5 text-xs gap-1.5 text-muted-foreground hover:text-primary font-medium"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      <span>{(journal.shares_count || 0) > 0 ? journal.shares_count : 'Chia sẻ'}</span>
                    </Button>
                  </div>
                </CardFooter>

                {/* Inline Comments Section */}
                {isCommentsOpen && (
                  <div className="px-4 py-3 border-t border-border/60 bg-muted/20 space-y-3 animate-slide-in-down">
                    {/* Add Comment Input */}
                    <div className="flex gap-2">
                      <Avatar className="h-7 w-7 mt-0.5 shrink-0">
                        {currentUserProfile?.avatar_url && (
                          <AvatarImage src={currentUserProfile.avatar_url} />
                        )}
                        <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                          {currentUserProfile ? initials(currentUserProfile.username) : 'U'}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 flex gap-1.5">
                        <Input
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendComment(journal.id);
                            }
                          }}
                          placeholder="Viết bình luận động viên bạn học..."
                          className="h-8 text-xs bg-background"
                        />
                        <Button
                          size="sm"
                          disabled={submittingComment || !commentText.trim()}
                          onClick={() => handleSendComment(journal.id)}
                          className="h-8 px-3 text-xs"
                        >
                          {submittingComment ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Send className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Comments List */}
                    {commentsList.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        Chưa có bình luận nào. Hãy là người đầu tiên để lại lời nhắn!
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {commentsList.map((c) => {
                          const isCommentAuthor = c.author_id === currentUserId;
                          return (
                            <div
                              key={c.id}
                              className="flex items-start gap-2.5 p-2 rounded-xl bg-background border border-border/40 text-xs"
                            >
                              <Link href={c.author ? `/app/profile/${c.author.username}` : '#'}>
                                <Avatar className="h-6 w-6">
                                  {c.author?.avatar_url && <AvatarImage src={c.author.avatar_url} />}
                                  <AvatarFallback className="bg-muted text-[9px] font-semibold">
                                    {c.author ? initials(c.author.username) : 'U'}
                                  </AvatarFallback>
                                </Avatar>
                              </Link>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <Link
                                    href={c.author ? `/app/profile/${c.author.username}` : '#'}
                                    className="font-semibold hover:underline truncate text-[11px]"
                                  >
                                    {c.author?.username || 'Bạn học'}
                                  </Link>
                                  <span className="text-[10px] text-muted-foreground">
                                    {formatRelativeTime(c.created_at, 'vi')}
                                  </span>
                                </div>
                                <p className="text-foreground/90 mt-0.5 whitespace-pre-wrap">
                                  {c.content}
                                </p>
                              </div>

                              {isCommentAuthor && (
                                <button
                                  onClick={() => handleDeleteComment(c.id)}
                                  className="text-muted-foreground/60 hover:text-destructive p-1 rounded transition-colors"
                                  title="Xóa bình luận"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* 4. SHARE JOURNAL MODAL */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-display">
              <Share2 className="h-4 w-4 text-primary" /> Chia sẻ bài viết học tập
            </DialogTitle>
            <DialogDescription className="text-xs">
              Lan tỏa cảm hứng học tập và kiến thức hữu ích đến bạn bè trên Life OS.
            </DialogDescription>
          </DialogHeader>

          {sharingJournal && (
            <div className="space-y-4 py-2">
              {/* Preview card */}
              <div className="p-3 rounded-xl border border-border/60 bg-muted/30 text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-semibold">
                  <span>{sharingJournal.author?.username || 'Bạn học'}</span>
                  {sharingJournal.mood && <span>{moodEmoji(sharingJournal.mood)}</span>}
                </div>
                {sharingJournal.title && (
                  <p className="font-medium text-foreground">{sharingJournal.title}</p>
                )}
                <p className="text-muted-foreground line-clamp-2">{sharingJournal.content}</p>
              </div>

              {/* Share note */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  Ghi chú chia sẻ (Tùy chọn):
                </label>
                <Textarea
                  value={shareNote}
                  onChange={(e) => setShareNote(e.target.value)}
                  placeholder="Thêm suy nghĩ của bạn khi chia sẻ bài viết này..."
                  rows={2}
                  className="text-xs resize-none"
                />
              </div>

              {/* Copy link option */}
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-background">
                <span className="text-xs text-muted-foreground">Sao chép liên kết trực tiếp</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopyLink(sharingJournal.id)}
                  className="h-7 text-xs gap-1"
                >
                  {copiedLink ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                  {copiedLink ? 'Đã chép' : 'Sao chép'}
                </Button>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" size="sm" onClick={() => setShareDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmShare}
              disabled={submittingShare}
              className="gap-1.5 font-semibold"
            >
              {submittingShare && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Chia sẻ bài viết
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
