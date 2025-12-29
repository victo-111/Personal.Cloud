import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Send, Check, CheckCheck, Cloud, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";

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
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null);
  const [typingUsers, setTypingUsers] = useState<Array<{ id: string; username: string }>>([]);
  const [onlineUsers, setOnlineUsers] = useState<Array<{ user_id: string }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
          setMessages((prev) => [...prev, payload.new as Message]);
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
        const users = Object.values(newState).map((p: [{ user_id: string }]) => p[0]);
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: currentUser?.id });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUser({ id: user.id, email: user.email || "Anonymous" });
    }
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*, profiles(avatar_url)")
      .eq("room", "general")
      .order("created_at", { ascending: true })
      .limit(100);

    if (data) setMessages(data as Message[]);
  };

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
    <div className="h-full flex flex-col" style={{ 
      background: "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--card)) 100%)" 
    }}>
      {/* Header - WhatsApp style */}
      <div className="flex items-center gap-3 p-3 bg-card border-b border-border">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center shadow-lg">
          <Cloud className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">Cloud Chat</h3>
          <p className="text-xs text-muted-foreground">CloudSpace Community</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          {onlineUsers.length} Online
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
      </div>

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
            className="w-full px-4 py-2.5 bg-background border border-border rounded-full text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
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
