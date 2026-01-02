import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Send, Check, CheckCheck, Cloud, Sparkles, LogIn, X, MessageCircle, AtSign, Users } from "lucide-react";
import { toast } from "sonner";
import { CloudAiModal } from "./CloudAiModal";

interface Message {
  id: string;
  username: string;
  message: string;
  created_at: string;
  user_id: string;
  mentioned_users?: string[];
}

interface Notification {
  id: string;
  username: string;
  timestamp: number;
  type: 'join' | 'mention';
  mentionedBy?: string;
  messageId?: string;
}

interface User {
  id: string;
  username: string;
}

interface CloudChatProps {
  userPoints?: number;
}

export const CloudChat = ({ userPoints = 0 }: CloudChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null);
  const [cloudAiOpen, setCloudAiOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const notificationTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  const mentionListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUser();
    fetchMessages();

    const channel = supabase
      .channel("chat-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const message = payload.new as Message;
          setMessages((prev) => [...prev, message]);
          
          // Extract mentioned usernames from message
          const mentionedUsernames = message.message.match(/@(\w+)/g)?.map(m => m.slice(1)) || [];
          
          // Update active users list
          setActiveUsers((prev) => {
            const userExists = prev.find(u => u.id === message.user_id);
            if (!userExists) {
              return [...prev, { id: message.user_id, username: message.username }];
            }
            return prev;
          });
          
          // Check if this is a new user joining (not mentioned users)
          const isNewUser = !messages.some(m => m.user_id === message.user_id) && 
                           message.user_id !== currentUser?.id &&
                           mentionedUsernames.length === 0;
          
          if (isNewUser) {
            // Add notification for new user joining
            const notificationId = `join_${message.user_id}_${Date.now()}`;
            const notification: Notification = {
              id: notificationId,
              username: message.username,
              timestamp: Date.now(),
              type: 'join',
            };
            setNotifications((notifications) => [...notifications, notification]);

            const timer = setTimeout(() => {
              setNotifications((notifications) =>
                notifications.filter((n) => n.id !== notificationId)
              );
              delete notificationTimersRef.current[notificationId];
            }, 7000);

            notificationTimersRef.current[notificationId] = timer;
          }
          
          // Handle mention notifications
          if (mentionedUsernames.length > 0) {
            mentionedUsernames.forEach((mentionedUsername) => {
              const mentionedUser = activeUsers.find(u => u.username === mentionedUsername);
              if (mentionedUser && mentionedUser.id !== currentUser?.id) {
                const notificationId = `mention_${mentionedUser.id}_${message.id}`;
                const notification: Notification = {
                  id: notificationId,
                  username: message.username,
                  timestamp: Date.now(),
                  type: 'mention',
                  mentionedBy: message.username,
                  messageId: message.id,
                };
                setNotifications((notifications) => [...notifications, notification]);

                const timer = setTimeout(() => {
                  setNotifications((notifications) =>
                    notifications.filter((n) => n.id !== notificationId)
                  );
                  delete notificationTimersRef.current[notificationId];
                }, 7000);

                notificationTimersRef.current[notificationId] = timer;
              }
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      Object.values(notificationTimersRef.current).forEach(clearTimeout);
    };
  }, [currentUser?.id, messages, activeUsers]);

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
      .select("*")
      .eq("room", "general")
      .order("created_at", { ascending: true })
      .limit(100);

    if (data) setMessages(data);
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
      setShowMentionList(false);
    }
  };

  const handleInputChange = (value: string) => {
    setNewMessage(value);
    setCursorPosition(value.length);
    
    // Check if user is typing a mention
    const lastAtSymbol = value.lastIndexOf("@");
    if (lastAtSymbol !== -1 && lastAtSymbol === value.length - 1) {
      setMentionSearch("");
      setShowMentionList(true);
    } else if (lastAtSymbol !== -1) {
      const textAfterAt = value.substring(lastAtSymbol + 1);
      if (!textAfterAt.includes(" ")) {
        setMentionSearch(textAfterAt);
        setShowMentionList(true);
      } else {
        setShowMentionList(false);
      }
    } else {
      setShowMentionList(false);
    }
  };

  const selectMention = (username: string) => {
    const lastAtSymbol = newMessage.lastIndexOf("@");
    if (lastAtSymbol !== -1) {
      const beforeMention = newMessage.substring(0, lastAtSymbol);
      const textAfterMention = newMessage.substring(newMessage.length);
      const newMessageText = `${beforeMention}@${username} `;
      setNewMessage(newMessageText);
      setShowMentionList(false);
      inputRef.current?.focus();
    }
  };

  const getFilteredUsers = () => {
    return activeUsers.filter((user) => {
      if (user.id === currentUser?.id) return false;
      if (!mentionSearch) return true;
      return user.username.toLowerCase().includes(mentionSearch.toLowerCase());
    });
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
        
        {/* Group Creation Button */}
        <button
          onClick={() => {
            if (userPoints >= 500) {
              toast.info("👥 Group creation feature coming soon!", { duration: 3000 });
            } else {
              toast.error(
                `🔒 You need 500+ points to create groups. Current: ${userPoints}/500 points`,
                { duration: 4000 }
              );
            }
          }}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            userPoints >= 500
              ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl"
              : "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
          }`}
          title={userPoints >= 500 ? "Create a group" : `Need ${500 - userPoints} more points`}
        >
          <Users className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">Groups</span>
        </button>
        
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          Online
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
                  
                  return (
                    <div
                      key={msg.id}
                      id={`msg_${msg.id}`}
                      className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-1 transition-all duration-300`}
                    >
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
                    </div>
                  );
                })}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input - WhatsApp style */}
      <form onSubmit={sendMessage} className="p-3 bg-card border-t border-border flex items-center gap-2 relative">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setCloudAiOpen(true);
          }}
          className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center hover:bg-blue-500/30 transition-colors shadow-lg border border-blue-400/30 flex-shrink-0"
          title="Open Cloud AI"
        >
          <Sparkles className="w-4 h-4 text-blue-400" />
        </button>
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            value={newMessage}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setShowMentionList(false);
              }
            }}
            placeholder="Type @ to mention someone..."
            className="w-full px-4 py-2.5 bg-background border border-border rounded-full text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
          />
          
          {/* Mention Autocomplete List */}
          {showMentionList && (
            <div
              ref={mentionListRef}
              className="absolute bottom-full left-0 right-0 mb-2 bg-card border border-primary/30 rounded-lg shadow-lg overflow-hidden z-50"
            >
              <div className="max-h-48 overflow-y-auto">
                {getFilteredUsers().length > 0 ? (
                  getFilteredUsers().map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => selectMention(user.username)}
                      className="w-full px-4 py-2 text-left hover:bg-primary/10 transition-colors border-b border-border/50 last:border-b-0 flex items-center gap-2"
                    >
                      <AtSign className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">~{user.username}</span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-center text-xs text-muted-foreground">
                    No users found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <button 
          type="submit" 
          disabled={!newMessage.trim()}
          className="w-10 h-10 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex-shrink-0"
        >
          <Send className="w-4 h-4 text-primary-foreground" />
        </button>
      </form>

      {/* Cloud AI Modal */}
      <CloudAiModal isOpen={cloudAiOpen} onClose={() => setCloudAiOpen(false)} sophistication="very-high" />

      {/* User Join & Mention Notifications */}
      <div className="fixed bottom-20 right-4 z-50 space-y-2 pointer-events-none">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className="animate-in slide-in-from-right-5 fade-in pointer-events-auto"
          >
            {notification.type === 'join' ? (
              // Join notification
              <div className="bg-card/95 border border-primary/30 backdrop-blur-sm rounded-lg p-3 shadow-lg flex items-center gap-2 min-w-max">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <div className="flex items-center gap-2">
                  <LogIn className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium text-foreground">
                    <span className="text-green-400">~{notification.username}</span> joined
                  </span>
                </div>
                <button
                  onClick={() =>
                    setNotifications((notifications) =>
                      notifications.filter((n) => n.id !== notification.id)
                    )
                  }
                  className="ml-2 p-1 hover:bg-primary/10 rounded transition-colors"
                >
                  <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            ) : (
              // Mention notification
              <div className="bg-card/95 border border-blue-400/30 backdrop-blur-sm rounded-lg p-3 shadow-lg flex items-center justify-between gap-3 min-w-max hover:border-blue-400/50 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <AtSign className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-foreground">
                    <span className="text-blue-400">~{notification.mentionedBy}</span> mentioned you
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      // Scroll to message
                      const messageElement = document.getElementById(`msg_${notification.messageId}`);
                      if (messageElement) {
                        messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
                        messageElement.classList.add("ring-2", "ring-blue-400");
                        setTimeout(() => {
                          messageElement.classList.remove("ring-2", "ring-blue-400");
                        }, 3000);
                      }
                      setNotifications((notifications) =>
                        notifications.filter((n) => n.id !== notification.id)
                      );
                    }}
                    className="px-2 py-1 text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded transition-colors border border-blue-400/50"
                  >
                    <MessageCircle className="w-3 h-3 inline mr-1" />
                    See
                  </button>
                  <button
                    onClick={() =>
                      setNotifications((notifications) =>
                        notifications.filter((n) => n.id !== notification.id)
                      )
                    }
                    className="p-1 hover:bg-primary/10 rounded transition-colors"
                  >
                    <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
