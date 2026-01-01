import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Send, Check, CheckCheck, Cloud, User, Bell, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ProfileModal } from "@/components/desktop/ProfileModal";
import { ActivityHistory } from "@/components/desktop/ActivityHistory";
import { AnonAiModal } from "@/components/desktop/AnonAiModal";
import CloudAiModal from "@/components/desktop/CloudAiModal";
import { MentionAutocomplete } from "@/components/desktop/MentionAutocomplete";
import { extractMentions, detectMentionAtCursor, renderMentionedText } from "@/lib/mention-utils";

interface Message {
  id: string;
  username: string;
  message: string;
  created_at: string;
  user_id: string;
  profiles: {
    avatar_url: string | null;
  } | null;
  mentioned_users?: string[];
}

export const CloudChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; points: number; isAdmin?: boolean } | null>(null);
  const [typingUsers, setTypingUsers] = useState<Array<{ id: string; username: string }>>([]);
  const [onlineUsers, setOnlineUsers] = useState<Array<{ user_id: string }>>([]);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [adminUserInput, setAdminUserInput] = useState("");
  const [adminPassInput, setAdminPassInput] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [mentionActive, setMentionActive] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [notifications, setNotifications] = useState<Array<{ id: string; username: string; message: string; created_at: string }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  interface ProfileRow { points?: number; is_admin?: boolean }

  const fetchUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // load server-side profile (points + is_admin) if available, fallback to localStorage
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("points, is_admin")
        .eq("user_id", user.id)
        .maybeSingle();
      const stored = localStorage.getItem(`pc:user:${user.id}`);
      const parsed = stored ? JSON.parse(stored) : null;
      const profileSafe = profile && typeof profile === "object" ? (profile as ProfileRow) : null;
      setCurrentUser({
        id: user.id,
        email: user.email || "Anonymous",
        points: (profileSafe && typeof profileSafe.points === "number") ? profileSafe.points : (parsed?.points ?? 100),
        isAdmin: (profileSafe && !!profileSafe.is_admin) || parsed?.isAdmin || false,
      });
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*, profiles(avatar_url)")
      .eq("room", "general")
      .order("created_at", { ascending: true })
      .limit(100);

    if (Array.isArray(data)) {
      const mapped: Message[] = data.map((d: any) => {
        const profilesObj = d?.profiles && typeof d.profiles === 'object' ? d.profiles as { avatar_url?: string | null } : null;
        return {
          id: d.id,
          username: d.username,
          message: d.message,
          created_at: d.created_at,
          user_id: d.user_id,
          profiles: profilesObj && typeof profilesObj.avatar_url === 'string' ? { avatar_url: profilesObj.avatar_url } : null,
          mentioned_users: (d.mentioned_users as string[]) || [],
        };
      });

      setMessages(mapped);
    }
  }, []);

  useEffect(() => {
    fetchUser();
    fetchMessages();

    const channel = supabase.channel("chat-messages", {
      config: {
        presence: {
          key: currentUser?.id,
        },
      },
    });

    channel
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const n = payload.new as any;
          const profileObj = n?.profiles && typeof n.profiles === 'object' ? n.profiles as { avatar_url?: string | null } : null;
          const safeMsg: Message = {
            id: n.id,
            username: n.username,
            message: n.message,
            created_at: n.created_at,
            user_id: n.user_id,
            profiles: profileObj && typeof profileObj.avatar_url === 'string' ? { avatar_url: profileObj.avatar_url } : null,
            mentioned_users: (n.mentioned_users as string[]) || [],
          };
          setMessages((prev) => [...prev, safeMsg]);
        }
      )
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload.user.id !== currentUser?.id) {
          setTypingUsers((current) => {
            if (!current.some((user) => user.id === payload.payload.user.id)) {
              return [...current, payload.payload.user];
            }
            return current;
          });

          setTimeout(() => {
            setTypingUsers((current) =>
              current.filter((user) => user.id !== payload.payload.user.id)
            );
          }, 3000);
        }
      })
        .on("presence", { event: "sync" }, () => {
        const newState = channel.presenceState();
        // Normalize presence entries: some backends use `user_id`, others use `presence_ref` for guests.
        const users = Object.values(newState)
          .flatMap((p) => (Array.isArray(p) ? p : []))
          .map((entry) => {
            const e = entry as unknown as { user_id?: string; presence_ref?: string };
            if (typeof e.user_id === 'string') return { user_id: e.user_id };
            if (typeof e.presence_ref === 'string') return { user_id: e.presence_ref };
            return null;
          })
          .filter((u): u is { user_id: string } => u !== null);
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Accept either a user_id or a presence_ref; provide a small union type to satisfy TypeScript
          type TrackPayload = { user_id: string } | { presence_ref: string };
          if (currentUser?.id) {
            await channel.track({ user_id: currentUser.id } as TrackPayload);
          } else {
            const presencePayload: TrackPayload = { presence_ref: `guest-${Date.now()}` };
            await channel.track(presencePayload);
          }
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, fetchUser, fetchMessages]);

  // Listen for mention notifications
  useEffect(() => {
    if (!currentUser) return;

    const notificationsChannel = (supabase as any)
      .channel(`mentions-${currentUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mention_notifications",
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload: any) => {
          const n = payload.new;
          setNotifications((prev) => [
            ...prev,
            {
              id: n.id,
              username: n.mentioned_username,
              message: n.message_id,
              created_at: n.created_at,
            },
          ]);
          toast.info(`@${n.mentioned_username} mentioned you!`);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsChannel);
    };
  }, [currentUser]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    // Extract mentions from the message
    const mentions = extractMentions(newMessage.trim());
    
    // Get mentioned user IDs
    let mentionedUserIds: string[] = [];
    if (mentions.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username")
        .in("username", mentions);

      if (profiles) {
        mentionedUserIds = profiles.map((p) => p.user_id);
      }
    }

    const { data: insertedMessage, error } = await supabase.from("chat_messages").insert({
      user_id: currentUser.id,
      username: currentUser.email.split("@")[0],
      message: newMessage.trim(),
      room: "general",
      mentioned_users: mentionedUserIds.length > 0 ? mentionedUserIds : null,
    }).select("id").single();

    if (!error && insertedMessage) {
      setNewMessage("");
      
      // Create mention notifications for each mentioned user
      if (mentionedUserIds.length > 0) {
        const notifications = mentionedUserIds.map((userId) => ({
          user_id: userId,
          mentioned_by_id: currentUser.id,
          message_id: insertedMessage.id,
          mentioned_username: currentUser.email.split("@")[0],
        }));

        // Use type casting since the table might not be in the generated types yet
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any).from("mention_notifications").insert(notifications);
        } catch (e) {
          console.warn('Failed to create mention notifications', e);
        }
      }

      // award a point for sending a message and persist
      setCurrentUser((cu) => {
        if (!cu) return cu;
        const next = { ...cu, points: (cu.points || 0) + 1 };
        try {
          localStorage.setItem(`pc:user:${cu.id}`, JSON.stringify({ points: next.points, isAdmin: !!next.isAdmin }));
        } catch (e) {
          console.warn("Failed to persist points", e);
        }
        return next;
      });
      // record activity server-side (best-effort)
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('user_activity').insert({
          user_id: currentUser.id,
          type: 'message',
          message: newMessage.trim(),
          created_at: new Date().toISOString(),
        });
      } catch (e) {
        // ignore - server may not have the table yet
        console.warn('Activity logging failed', e);
      }
    }
  };

  const handleTyping = () => {
    if (currentUser) {
      const channel = supabase.channel("chat-messages");
      channel.send({
        type: "broadcast",
        event: "typing",
        payload: { user: { id: currentUser.id, username: currentUser.email.split("@")[0] } },
      });
    }
  };

  const handleMessageInputChange = (text: string) => {
    setNewMessage(text);
    handleTyping();

    // Detect mention autocomplete
    if (!inputRef.current) return;

    const cursorPos = inputRef.current.selectionStart || 0;
    const { isActive, query, startIndex } = detectMentionAtCursor(text, cursorPos);

    if (isActive) {
      setMentionActive(true);
      setMentionQuery(query);

      // Calculate position for autocomplete dropdown
      const input = inputRef.current;
      const rect = input.getBoundingClientRect();
      const textBeforeMention = text.substring(0, startIndex);
      const estimatedLeft = rect.left + (textBeforeMention.length * 8);

      setMentionPosition({
        top: rect.bottom + 5,
        left: Math.max(0, estimatedLeft),
      });
    } else {
      setMentionActive(false);
      setMentionQuery("");
    }
  };

  const handleSelectMention = (username: string) => {
    const cursorPos = inputRef.current?.selectionStart || 0;
    const { startIndex } = detectMentionAtCursor(newMessage, cursorPos);

    if (startIndex === -1) return;

    // Replace @query with @username
    const beforeMention = newMessage.substring(0, startIndex);
    const afterMention = newMessage.substring(cursorPos);
    const newText = `${beforeMention}@${username} ${afterMention}`;

    setNewMessage(newText);
    setMentionActive(false);
    setMentionQuery("");

    // Focus back to input
    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPos = startIndex + username.length + 2;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleAdminLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    // Client-side admin check (insecure, for demo only)
    if (adminUserInput === "Anon111" && adminPassInput === "VIC123##") {
      if (currentUser) {
        const next = { ...currentUser, isAdmin: true };
        setCurrentUser(next);
        try {
          localStorage.setItem(`pc:user:${currentUser.id}`, JSON.stringify({ points: next.points, isAdmin: true }));
        } catch (err) {
          console.warn("Failed to persist admin flag", err);
        }
      } else {
        // create a guest admin session (demo only)
        const guest = { id: "guest-admin", email: "admin@local", points: 0, isAdmin: true };
        setCurrentUser(guest);
        try {
          localStorage.setItem(`pc:guest-admin`, JSON.stringify(guest));
        } catch (err) {
          console.warn("Failed to persist guest admin", err);
        }
      }
      setAdminLoginOpen(false);
      toast.success("Admin login successful");
    } else {
      toast.error("Admin login failed");
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = [];
  messages.forEach((msg) => {
    const dateStr = formatDate(msg.created_at);
    const lastGroup = groupedMessages[groupedMessages.length - 1];
    if (lastGroup && lastGroup.date === dateStr) {
      lastGroup.messages.push(msg);
    } else {
      groupedMessages.push({ date: dateStr, messages: [msg] });
    }
  });

  // Get color for username
  const getUserColor = (userId: string) => {
    const colors = [
      "text-emerald-400",
      "text-blue-400",
      "text-purple-400",
      "text-pink-400",
      "text-orange-400",
      "text-cyan-400",
      "text-yellow-400",
      "text-red-400",
    ];
    const hash = userId.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <div className="h-full flex flex-col relative" style={{ 
      background: "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--card)) 100%)" 
    }}>
      {/* Header - WhatsApp style */}
      <div className="flex items-center gap-3 p-3 bg-card border-b border-border neon-flash">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center shadow-lg">
          <Cloud className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h3 className={`font-semibold ${currentUser?.isAdmin ? 'text-white' : 'text-foreground'}`}>Cloud Chat</h3>
          <p className={`text-xs ${currentUser?.isAdmin ? 'text-pink-300' : 'text-muted-foreground'}`}>CloudSpace Community</p>
          {currentUser && (
            <p className="text-xs text-muted-foreground/80">Points: <span className="font-medium">{currentUser.points}</span></p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-xs text-muted-foreground">{onlineUsers.length} Online</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setProfileOpen(true)} className="text-xs px-2 py-1 rounded bg-card/80 border border-border text-muted-foreground">Profile</button>
            {(!currentUser || !currentUser.isAdmin) && (
              <button onClick={() => setAdminLoginOpen(true)} className="text-xs px-2 py-1 rounded bg-card/80 border border-border text-muted-foreground">Admin Login</button>
            )}
            {currentUser && currentUser.isAdmin && (
              <span className="px-2 py-1 rounded text-[12px] font-semibold bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.45)]">ADMIN</span>
            )}
          </div>
        </div>
      </div>

      {/* Main content area with AI panels */}
      <div className="flex-1 flex gap-3 min-h-0 p-3">
        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0 bg-card border border-border rounded-lg overflow-hidden">
          {/* Chat messages */}
          <div 
            className="flex-1 overflow-auto relative"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          >
            <div className="p-4 space-y-2">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-20">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                    <Cloud className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-muted-foreground text-center">No messages yet</p>
                  <p className="text-xs text-muted-foreground/60 text-center mt-1">Start the conversation!</p>
                </div>
              ) : (
                groupedMessages.map((group, groupIndex) => (
                  <div key={groupIndex}>
                    {/* Date divider */}
                    <div className="flex items-center justify-center my-4">
                      <span className="px-3 py-1 text-xs text-muted-foreground bg-card/80 rounded-full border border-border/50 backdrop-blur-sm">
                        {group.date}
                      </span>
                    </div>

                    {group.messages.map((msg, msgIndex) => {
                      const isOwn = msg.user_id === currentUser?.id;
                      const showUsername = !isOwn && (msgIndex === 0 || group.messages[msgIndex - 1]?.user_id !== msg.user_id);
                      
                      const showAvatar = !isOwn && (msgIndex === group.messages.length - 1 || group.messages[msgIndex + 1]?.user_id !== msg.user_id);

                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className={`flex items-end gap-2 ${isOwn ? "justify-end" : "justify-start"} mb-1`}
                        >
                          {!isOwn && (
                            <div className="w-8">
                              {showAvatar && (
                                <Avatar className="w-8 h-8">
                                  <AvatarImage src={msg.profiles?.avatar_url || undefined} />
                                  <AvatarFallback>
                                    <User className="w-4 h-4 text-muted-foreground" />
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                          )}
                          <div
                            className={`relative max-w-[75%] rounded-lg px-3 py-2 shadow-sm ${
                              isOwn
                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                : "bg-card border border-border rounded-bl-sm"
                            }`}
                          >
                            {/* Message tail */}
                            <div 
                              className={`absolute bottom-0 w-3 h-3 ${
                                isOwn ? "right-[-6px]" : "left-[-6px]"
                              }`}
                              style={{
                                background: isOwn ? "hsl(var(--primary))" : "hsl(var(--card))",
                                clipPath: isOwn 
                                  ? "polygon(0 0, 0% 100%, 100% 100%)" 
                                  : "polygon(100% 0, 0% 100%, 100% 100%)",
                              }}
                            />
                            
                            {showUsername && (
                              <p className={`text-xs font-semibold mb-1 ${getUserColor(msg.user_id)}`}>
                                ~{msg.username}
                              </p>
                            )}
                            <p className="text-sm leading-relaxed break-words">
                              {renderMentionedText(msg.message, "text-blue-400")}
                            </p>
                            <div className={`flex items-center justify-end gap-1 mt-1 ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                              <span className="text-[10px]">{formatTime(msg.created_at)}</span>
                              {isOwn && <CheckCheck className="w-3.5 h-3.5" />}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            {typingUsers.length > 0 && (
              <div className="absolute bottom-2 left-4 text-xs text-muted-foreground italic">
                {typingUsers.map(u => u.username).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
              </div>
            )}
            {adminLoginOpen && (
              <div className="absolute top-6 right-6 bg-black/80 p-3 rounded-lg border border-border z-50 w-64">
                <form onSubmit={handleAdminLogin} className="flex flex-col gap-2">
                  <input value={adminUserInput} onChange={(e) => setAdminUserInput(e.target.value)} placeholder="username" className="px-2 py-1 bg-card border border-border rounded text-sm" />
                  <input value={adminPassInput} onChange={(e) => setAdminPassInput(e.target.value)} placeholder="password" type="password" className="px-2 py-1 bg-card border border-border rounded text-sm" />
                  <div className="flex items-center justify-between">
                    <button type="submit" className="px-3 py-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white rounded text-sm">Login</button>
                    <button type="button" onClick={() => setAdminLoginOpen(false)} className="px-3 py-1 text-sm text-muted-foreground">Cancel</button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Input area */}
          <form onSubmit={sendMessage} className="p-3 bg-card border-t border-border flex items-center gap-2 relative">
            <div className="flex-1 relative">
              <div className="relative">
                <input
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => handleMessageInputChange(e.target.value)}
                  placeholder="Type a message... (use @ to mention)"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-full text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground neon-item"
                />
                {/* Mention Autocomplete */}
                <MentionAutocomplete
                  isActive={mentionActive}
                  query={mentionQuery}
                  position={mentionPosition}
                  onSelectMention={handleSelectMention}
                  currentUserId={currentUser?.id}
                />
              </div>
            </div>
            <button 
              type="submit" 
              disabled={!newMessage.trim()}
              className="w-10 h-10 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              <Send className="w-4 h-4 text-primary-foreground" />
            </button>

            {/* Notification Bell */}
            {notifications.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors relative"
                >
                  <Bell className="w-4 h-4 text-foreground" />
                  <span className="absolute top-0 right-0 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                    {notifications.length}
                  </span>
                </button>
              </div>
            )}
          </form>
        </div>

        {/* AI Panels Sidebar */}
        <div className="w-96 flex flex-col gap-3 min-h-0">
          {/* Cloud AI Panel - Always visible */}
          <div className="flex-1 flex flex-col bg-card border border-border rounded-lg overflow-hidden shadow-lg">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-cyan-600 border-b border-border">
              <h3 className="font-semibold text-white text-sm">Cloud AI</h3>
              <p className="text-xs text-blue-200">Always available</p>
            </div>
            <div className="flex-1 overflow-hidden">
              <CloudAiModal isOpen={true} onClose={() => {}} sophistication="very-high" />
            </div>
          </div>

          {/* Anon AI Panel - Admin only */}
          {currentUser?.isAdmin && (
            <div className="flex-1 flex flex-col bg-card border border-border rounded-lg overflow-hidden shadow-lg">
              <div className="p-3 bg-gradient-to-r from-purple-600 to-pink-600 border-b border-border">
                <h3 className="font-semibold text-white text-sm">Anon AI</h3>
                <p className="text-xs text-purple-200">Admin access required</p>
              </div>
              <div className="flex-1 overflow-hidden">
                <AnonAiModal isOpen={true} onClose={() => {}} sophistication="very-high" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {profileOpen && (
        <ProfileModal
          isOpen={profileOpen}
          onClose={() => setProfileOpen(false)}
          points={currentUser?.points}
          activity={currentUser ? messages.filter(m => m.user_id === currentUser.id).slice(-5).map(m => `${new Date(m.created_at).toLocaleString()}: ${m.message}`) : []}
        />
      )}

      {/* Activity history modal */}
      <ActivityHistory isOpen={profileOpen && !!currentUser} onClose={() => setProfileOpen(false)} userId={currentUser?.id} />

      {/* Notifications Panel */}
      <AnimatePresence>
        {notifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-6 right-6 bg-card border border-border rounded-lg shadow-xl p-4 max-w-xs z-50"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground text-sm">Mentions</h3>
              <button
                onClick={() => setNotifications([])}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {notifications.map((notif) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-2 bg-primary/10 rounded border border-primary/20 text-sm"
                >
                  <p className="text-foreground">
                    <span className="font-semibold text-blue-400">@{notif.username}</span> mentioned you
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(notif.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};                                                                                

