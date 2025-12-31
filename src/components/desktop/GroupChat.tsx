import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Send, Check, CheckCheck, Cloud, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ProfileModal } from "@/components/desktop/ProfileModal";
import { ActivityHistory } from "@/components/desktop/ActivityHistory";
import { AnonAiModal } from "@/components/desktop/AnonAiModal";
import CloudAiModal from "@/components/desktop/CloudAiModal";

interface Message {
  id: string;
  username: string;
  message: string;
  created_at: string;
  user_id: string;
  profiles: {
    avatar_url: string | null;
  } | null;
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
  const [anonAiOpen, setAnonAiOpen] = useState(false);
  const [cloudAiOpen, setCloudAiOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
        points: (profileSafe && typeof profileSafe.points === "number") ? profileSafe.points : (parsed?.points || 0),
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
      const mapped: Message[] = data.map((d) => {
        const profilesObj = d?.profiles && typeof d.profiles === 'object' ? d.profiles as { avatar_url?: string | null } : null;
        return {
          id: d.id,
          username: d.username,
          message: d.message,
          created_at: d.created_at,
          user_id: d.user_id,
          profiles: profilesObj && typeof profilesObj.avatar_url === 'string' ? { avatar_url: profilesObj.avatar_url } : null,
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
          const n = payload.new;
          const profileObj = n?.profiles && typeof n.profiles === 'object' ? n.profiles as { avatar_url?: string | null } : null;
          const safeMsg: Message = {
            id: n.id,
            username: n.username,
            message: n.message,
            created_at: n.created_at,
            user_id: n.user_id,
            profiles: profileObj && typeof profileObj.avatar_url === 'string' ? { avatar_url: profileObj.avatar_url } : null,
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

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    const { error } = await supabase.from("chat_messages").insert({
      user_id: currentUser.id,
      username: currentUser.email.split("@")[0],
      message: newMessage.trim(),
      room: "general",
    });

    if (!error) {
      setNewMessage("");
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
        // Best-effort activity logging: the typed Supabase client may not include this table.
        // Use a runtime cast to avoid TypeScript errors when 'user_activity' is not present in the generated types.
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
            <button onClick={() => setCloudAiOpen(true)} className="text-xs px-2 py-1 rounded bg-card/80 border border-border text-muted-foreground">Cloud AI</button>
            {(!currentUser || !currentUser.isAdmin) && (
              <button onClick={() => setAdminLoginOpen(true)} className="text-xs px-2 py-1 rounded bg-card/80 border border-border text-muted-foreground">Admin Login</button>
            )}
            {currentUser && currentUser.isAdmin && (
                <>
                  <span className="px-2 py-1 rounded text-[12px] font-semibold bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.45)]">ADMIN</span>
                  <button onClick={() => setAnonAiOpen(true)} className="text-xs px-2 py-1 ml-2 rounded bg-card/80 border border-border text-muted-foreground">Anon AI</button>
                </>
            )}
          </div>
        </div>
      </div>

      {/* Chat Pattern Background */}
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
                        <p className="text-sm leading-relaxed break-words">{msg.message}</p>
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

        {/* Profile modal */}
        {profileOpen && (
          <ProfileModal
            isOpen={profileOpen}
            onClose={() => setProfileOpen(false)}
            points={currentUser?.points}
            activity={currentUser ? messages.filter(m => m.user_id === currentUser.id).slice(-5).map(m => `${new Date(m.created_at).toLocaleString()}: ${m.message}`) : []}
          />
        )}

        {/* Cloud Ai modal (available to all) */}
        <CloudAiModal isOpen={cloudAiOpen} onClose={() => setCloudAiOpen(false)} sophistication="very-high" />

        {/* Anon Ai modal (admin only) */}
        <AnonAiModal isOpen={anonAiOpen} onClose={() => setAnonAiOpen(false)} sophistication="very-high" />

        {/* Activity history modal */}
        <ActivityHistory isOpen={profileOpen && !!currentUser} onClose={() => setProfileOpen(false)} userId={currentUser?.id} />
      </div>

      {/* Floating Cloud AI button (bottom-right) */}
      <motion.button
        onClick={() => setCloudAiOpen(true)}
        initial={{ y: 0 }}
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute right-6 bottom-24 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-xl border border-border text-white neon-flash"
        aria-label="Open Cloud AI"
        title="Open Cloud AI"
      >
        <Cloud className="w-6 h-6 text-primary-foreground" />
      </motion.button>

      {/* Input - WhatsApp style */}
      <form onSubmit={sendMessage} className="p-3 bg-card border-t border-border flex items-center gap-2">
        <div className="flex-1 relative">
            <input
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            placeholder="Type a message..."
              className="w-full px-4 py-2.5 bg-background border border-border rounded-full text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground neon-item"
          />
        </div>
        <button 
          type="submit" 
          disabled={!newMessage.trim()}
          className="w-10 h-10 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          <Send className="w-4 h-4 text-primary-foreground" />
        </button>
      </form>
    </div>
  );
};                                                                                

