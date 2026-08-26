'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { fetchConnectedFriends, connectWithUser } from '@/lib/my-life-service';
import type { Profile } from '@/lib/types';
import { initials } from '@/lib/helpers';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, Search, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface FriendsManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  onFriendsUpdated?: () => void;
}

export function FriendsManagerModal({
  open,
  onOpenChange,
  currentUserId,
  onFriendsUpdated,
}: FriendsManagerModalProps) {
  const [friends, setFriends] = useState<Profile[]>([]);
  const [suggestedPeople, setSuggestedPeople] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !currentUserId) return;

    let isMounted = true;
    setLoading(true);

    async function loadData() {
      try {
        const [friendsList, { data: allProfiles }] = await Promise.all([
          fetchConnectedFriends(currentUserId),
          supabase.from('profiles').select('*').neq('id', currentUserId).limit(20),
        ]);

        if (!isMounted) return;

        setFriends(friendsList);
        const friendIds = new Set(friendsList.map((f) => f.id));
        const suggestions = ((allProfiles as Profile[]) || []).filter(
          (p) => !friendIds.has(p.id)
        );
        setSuggestedPeople(suggestions);
      } catch (err) {
        console.error('Error loading friends in modal:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [open, currentUserId]);

  const handleConnect = async (targetUser: Profile) => {
    setConnectingId(targetUser.id);
    try {
      const { success, error } = await connectWithUser(currentUserId, targetUser.id);
      if (error || !success) throw error || new Error('Failed to connect');

      setFriends((prev) => [targetUser, ...prev]);
      setSuggestedPeople((prev) => prev.filter((p) => p.id !== targetUser.id));
      toast.success(`Đã kết nối thành công với ${targetUser.username}!`);
      onFriendsUpdated?.();
    } catch {
      toast.error('Không thể kết nối. Vui lòng thử lại.');
    } finally {
      setConnectingId(null);
    }
  };

  const filteredSuggestions = suggestedPeople.filter((p) =>
    p.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.full_name && p.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-3 border-b border-border/60">
          <DialogTitle className="flex items-center gap-2 text-lg font-display">
            <Users className="h-5 w-5 text-primary" />
            Bạn bè & Kết nối học tập
          </DialogTitle>
          <DialogDescription className="text-xs">
            Chia sẻ nhật ký học tập và tương tác động viên nhau cùng tiến bộ.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5 py-3 pr-1 scrollbar-thin">
          {/* Connected friends section */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Đã kết nối ({friends.length})
              </h4>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-12 rounded-xl bg-muted/40 animate-pulse" />
                ))}
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-5 px-4 rounded-xl border border-dashed border-border/70 bg-muted/20">
                <Users className="h-7 w-7 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground font-medium">
                  Chưa có bạn bè nào được kết nối.
                </p>
                <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                  Kết nối với bạn học bên dưới để cùng chia sẻ nhật ký!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {friends.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-card hover:bg-muted/30 transition-colors"
                  >
                    <Link
                      href={`/app/profile/${f.username}`}
                      onClick={() => onOpenChange(false)}
                      className="flex items-center gap-3 min-w-0"
                    >
                      <Avatar className="h-9 w-9 border border-primary/20">
                        {f.avatar_url && <AvatarImage src={f.avatar_url} alt={f.username} />}
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                          {initials(f.username)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate hover:text-primary transition-colors">
                          {f.username}
                        </p>
                        {f.full_name && (
                          <p className="text-xs text-muted-foreground truncate">{f.full_name}</p>
                        )}
                      </div>
                    </Link>
                    <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                      Bạn bè
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Connect suggestions section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Gợi ý bạn học cùng tiến
              </h4>
            </div>

            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo username..."
                className="h-8 pl-8 text-xs bg-muted/40"
              />
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {filteredSuggestions.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">
                  Không tìm thấy bạn học phù hợp.
                </p>
              ) : (
                filteredSuggestions.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2 rounded-xl border border-border/40 bg-muted/10 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="h-8 w-8">
                        {user.avatar_url && <AvatarImage src={user.avatar_url} />}
                        <AvatarFallback className="bg-muted text-xs font-semibold">
                          {initials(user.username)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{user.username}</p>
                        {user.bio ? (
                          <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">{user.bio}</p>
                        ) : (
                          <p className="text-[11px] text-muted-foreground">Thành viên Life OS</p>
                        )}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      disabled={connectingId === user.id}
                      onClick={() => handleConnect(user)}
                      className="h-7 text-xs px-2.5 gap-1 rounded-lg hover:bg-primary hover:text-primary-foreground transition-all"
                    >
                      {connectingId === user.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <UserPlus className="h-3 w-3" />
                      )}
                      Kết nối
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-border/50 flex justify-between items-center text-xs">
          <Link
            href="/app/find-people"
            onClick={() => onOpenChange(false)}
            className="text-primary hover:underline flex items-center gap-1 font-medium"
          >
            Tìm thêm bạn học trên Life OS <ArrowRight className="h-3 w-3" />
          </Link>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
