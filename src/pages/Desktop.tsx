import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { 
  Folder, FileText, Terminal, Settings, Image, Music, 
  Globe, Calculator, Calendar, Clock, Wifi, Battery, 
  Volume2, X, Minus, Square, Search, Code, MessageSquare, LogOut
} from "lucide-react";
import { CodeEditor } from "@/components/desktop/CodeEditor";
import { FileManager } from "@/components/desktop/FileManager";
import { MusicPlayer } from "@/components/desktop/MusicPlayer";
import { GroupChat } from "@/components/desktop/GroupChat";

interface Window {
  id: string;
  title: string;
  icon: React.ReactNode;
  isMinimized: boolean;
  isMaximized: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  content: React.ReactNode;
}

const desktopIcons = [
  { id: "files", name: "Files", icon: Folder },
  { id: "code-editor", name: "Code Editor", icon: Code },
  { id: "terminal", name: "Terminal", icon: Terminal },
  { id: "browser", name: "Browser", icon: Globe },
  { id: "notes", name: "Notes", icon: FileText },
  { id: "music", name: "Music", icon: Music },
  { id: "chat", name: "Chat", icon: MessageSquare },
  { id: "calculator", name: "Calculator", icon: Calculator },
  { id: "settings", name: "Settings", icon: Settings },
];

const Desktop = () => {
  const [windows, setWindows] = useState<Window[]>([]);
  const [activeWindow, setActiveWindow] = useState<string | null>(null);
  const [time, setTime] = useState(new Date());
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const openWindow = (id: string, title: string, icon: React.ReactNode) => {
    const existingWindow = windows.find(w => w.id === id);
    if (existingWindow) {
      setActiveWindow(id);
      if (existingWindow.isMinimized) {
        setWindows(windows.map(w => w.id === id ? { ...w, isMinimized: false } : w));
      }
      return;
    }

    const newWindow: Window = {
      id,
      title,
      icon,
      isMinimized: false,
      isMaximized: false,
      position: { x: 100 + windows.length * 30, y: 100 + windows.length * 30 },
      size: { width: 700, height: 500 },
      content: getWindowContent(id),
    };

    setWindows([...windows, newWindow]);
    setActiveWindow(id);
  };

  const closeWindow = (id: string) => {
    setWindows(windows.filter(w => w.id !== id));
    if (activeWindow === id) setActiveWindow(null);
  };

  const minimizeWindow = (id: string) => {
    setWindows(windows.map(w => w.id === id ? { ...w, isMinimized: true } : w));
  };

  const maximizeWindow = (id: string) => {
    setWindows(windows.map(w => w.id === id ? { ...w, isMaximized: !w.isMaximized } : w));
  };

  const getWindowContent = (id: string) => {
    switch (id) {
      case "code-editor":
        return <CodeEditor />;
      case "files":
        return <FileManager />;
      case "music":
        return <MusicPlayer />;
      case "chat":
        return <GroupChat />;
      case "terminal":
        return (
          <div className="h-full bg-black/90 p-4 font-mono text-sm text-primary">
            <p className="text-accent">CloudSpace Terminal v1.0.0</p>
            <p className="text-muted-foreground">Type 'help' for available commands</p>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-primary">user@cloudspace:~$</span>
              <span className="animate-pulse">▊</span>
            </div>
          </div>
        );
      case "browser":
        return (
          <div className="h-full flex flex-col bg-background">
            <div className="flex items-center gap-2 p-2 bg-card border-b border-border">
              <div className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-background rounded-lg border border-border">
                <Search className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground text-sm">Search or enter URL...</span>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground">Welcome to CloudSpace Browser</p>
            </div>
          </div>
        );
      case "notes":
        return (
          <div className="h-full bg-background p-4">
            <textarea 
              className="w-full h-full bg-transparent border-none outline-none resize-none text-foreground placeholder:text-muted-foreground"
              placeholder="Start typing your notes..."
            />
          </div>
        );
      case "calculator":
        return (
          <div className="h-full bg-background p-4 flex flex-col gap-2">
            <div className="bg-card p-4 rounded-lg text-right text-2xl font-mono text-foreground">0</div>
            <div className="grid grid-cols-4 gap-2 flex-1">
              {["C", "±", "%", "÷", "7", "8", "9", "×", "4", "5", "6", "-", "1", "2", "3", "+", "0", ".", "="].map(btn => (
                <button 
                  key={btn} 
                  className={`rounded-lg font-medium transition-all hover:bg-primary/20 ${
                    ["÷", "×", "-", "+", "="].includes(btn) ? "bg-primary text-primary-foreground" : "bg-card text-foreground"
                  }`}
                >
                  {btn}
                </button>
              ))}
            </div>
          </div>
        );
      default:
        return (
          <div className="h-full flex items-center justify-center bg-background">
            <p className="text-muted-foreground">Coming soon...</p>
          </div>
        );
    }
  };

  if (!user) return null;

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-background via-card to-background">
      {/* Grid Background */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--primary) / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.3) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />

      {/* Desktop Icons */}
      <div className="absolute top-4 left-4 grid grid-cols-1 gap-4 z-10">
        {desktopIcons.map(({ id, name, icon: Icon }) => (
          <button
            key={id}
            onClick={() => openWindow(id, name, <Icon className="w-4 h-4" />)}
            className="group flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-primary/10 transition-all"
          >
            <div 
              className="w-12 h-12 rounded-lg bg-card/80 border border-primary/30 flex items-center justify-center group-hover:border-primary group-hover:shadow-lg group-hover:shadow-primary/30 transition-all"
              style={{ boxShadow: "0 0 10px hsl(var(--primary) / 0.2)" }}
            >
              <Icon className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xs text-foreground font-medium" style={{ textShadow: "0 0 10px hsl(var(--background))" }}>
              {name}
            </span>
          </button>
        ))}
      </div>

      {/* Windows */}
      {windows.map(window => (
        !window.isMinimized && (
          <div
            key={window.id}
            onClick={() => setActiveWindow(window.id)}
            className={`absolute rounded-lg overflow-hidden border transition-all ${
              activeWindow === window.id ? "border-primary/50 shadow-2xl shadow-primary/20 z-50" : "border-border/50 shadow-xl z-40"
            }`}
            style={{
              left: window.isMaximized ? 0 : window.position.x,
              top: window.isMaximized ? 0 : window.position.y,
              width: window.isMaximized ? "100%" : window.size.width,
              height: window.isMaximized ? "calc(100% - 48px)" : window.size.height,
            }}
          >
            <div className="h-10 bg-card/95 backdrop-blur-xl border-b border-border flex items-center justify-between px-3">
              <div className="flex items-center gap-2">
                <span className="text-primary">{window.icon}</span>
                <span className="text-sm font-medium text-foreground">{window.title}</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => { e.stopPropagation(); minimizeWindow(window.id); }} className="w-6 h-6 rounded flex items-center justify-center hover:bg-muted transition-colors">
                  <Minus className="w-3 h-3 text-muted-foreground" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); maximizeWindow(window.id); }} className="w-6 h-6 rounded flex items-center justify-center hover:bg-muted transition-colors">
                  <Square className="w-3 h-3 text-muted-foreground" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); closeWindow(window.id); }} className="w-6 h-6 rounded flex items-center justify-center hover:bg-destructive/20 transition-colors">
                  <X className="w-3 h-3 text-destructive" />
                </button>
              </div>
            </div>
            <div className="h-[calc(100%-40px)] overflow-auto">{window.content}</div>
          </div>
        )
      ))}

      {/* Taskbar */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-card/80 backdrop-blur-xl border-t border-primary/30 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2">
          <button 
            className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/50 flex items-center justify-center hover:bg-primary/30 transition-all"
            style={{ boxShadow: "0 0 15px hsl(var(--primary) / 0.3)" }}
          >
            <div className="w-5 h-5 border-2 border-primary rounded-sm" />
          </button>
          <button onClick={handleLogout} className="w-10 h-10 rounded-lg bg-card/50 border border-border/50 flex items-center justify-center hover:bg-destructive/20 transition-all">
            <LogOut className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center gap-2">
          {windows.map(window => (
            <button
              key={window.id}
              onClick={() => {
                if (window.isMinimized) {
                  setWindows(windows.map(w => w.id === window.id ? { ...w, isMinimized: false } : w));
                }
                setActiveWindow(window.id);
              }}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                activeWindow === window.id && !window.isMinimized ? "bg-primary/20 border border-primary/50" : "bg-card/50 border border-border/50 hover:bg-card"
              }`}
            >
              <span className="text-primary">{window.icon}</span>
              <span className="text-sm text-foreground">{window.title}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Wifi className="w-4 h-4 text-muted-foreground" />
          <Volume2 className="w-4 h-4 text-muted-foreground" />
          <Battery className="w-4 h-4 text-muted-foreground" />
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Clock className="w-4 h-4 text-primary" />
            <span>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Desktop;
