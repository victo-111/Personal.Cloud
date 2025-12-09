import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { 
  Folder, FileText, Terminal, Settings, Image, Music, 
  Globe, Calculator, Clock, Wifi, Battery, 
  Volume2, X, Minus, Square, Search, Code, MessageSquare, LogOut
} from "lucide-react";
import { CodeEditor } from "@/components/desktop/CodeEditor";
import { FileManager } from "@/components/desktop/FileManager";
import { MusicPlayer } from "@/components/desktop/MusicPlayer";
import { GroupChat } from "@/components/desktop/GroupChat";
import { PhotoGallery } from "@/components/desktop/PhotoGallery";
import { InteractiveTerminal } from "@/components/desktop/InteractiveTerminal";
import { SettingsPanel } from "@/components/desktop/SettingsPanel";

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

// Wallpaper themes for different users
const wallpaperThemes = [
  { name: "aurora", colors: ["hsl(180, 100%, 30%)", "hsl(280, 100%, 25%)", "hsl(200, 100%, 40%)", "hsl(320, 80%, 30%)"] },
  { name: "sunset", colors: ["hsl(20, 100%, 40%)", "hsl(350, 100%, 35%)", "hsl(280, 80%, 25%)", "hsl(40, 100%, 50%)"] },
  { name: "ocean", colors: ["hsl(200, 100%, 35%)", "hsl(180, 100%, 30%)", "hsl(220, 80%, 25%)", "hsl(160, 100%, 40%)"] },
  { name: "forest", colors: ["hsl(120, 60%, 25%)", "hsl(160, 80%, 30%)", "hsl(80, 70%, 35%)", "hsl(140, 100%, 20%)"] },
  { name: "cosmic", colors: ["hsl(260, 100%, 25%)", "hsl(300, 100%, 30%)", "hsl(220, 80%, 35%)", "hsl(280, 100%, 40%)"] },
  { name: "neon", colors: ["hsl(320, 100%, 45%)", "hsl(180, 100%, 50%)", "hsl(60, 100%, 50%)", "hsl(280, 100%, 50%)"] },
];

// Icon styling for realistic macOS/Windows style icons
const iconStyles: Record<string, { bg: string; iconColor: string; shadow: string }> = {
  files: { bg: "linear-gradient(145deg, #5AC8FA 0%, #007AFF 100%)", iconColor: "text-white", shadow: "0 8px 24px rgba(0, 122, 255, 0.4)" },
  "code-editor": { bg: "linear-gradient(145deg, #5856D6 0%, #AF52DE 100%)", iconColor: "text-white", shadow: "0 8px 24px rgba(88, 86, 214, 0.4)" },
  terminal: { bg: "linear-gradient(145deg, #1C1C1E 0%, #2C2C2E 100%)", iconColor: "text-green-400", shadow: "0 8px 24px rgba(0, 0, 0, 0.5)" },
  browser: { bg: "linear-gradient(145deg, #34AADC 0%, #5856D6 100%)", iconColor: "text-white", shadow: "0 8px 24px rgba(52, 170, 220, 0.4)" },
  notes: { bg: "linear-gradient(145deg, #FFCC00 0%, #FF9500 100%)", iconColor: "text-amber-900", shadow: "0 8px 24px rgba(255, 149, 0, 0.4)" },
  music: { bg: "linear-gradient(145deg, #FF2D55 0%, #FF3B30 100%)", iconColor: "text-white", shadow: "0 8px 24px rgba(255, 45, 85, 0.4)" },
  chat: { bg: "linear-gradient(145deg, #34C759 0%, #30D158 100%)", iconColor: "text-white", shadow: "0 8px 24px rgba(52, 199, 89, 0.4)" },
  calculator: { bg: "linear-gradient(145deg, #48484A 0%, #1C1C1E 100%)", iconColor: "text-orange-400", shadow: "0 8px 24px rgba(0, 0, 0, 0.5)" },
  photos: { bg: "linear-gradient(145deg, #FF9500 0%, #FF2D55 50%, #AF52DE 100%)", iconColor: "text-white", shadow: "0 8px 24px rgba(175, 82, 222, 0.4)" },
  settings: { bg: "linear-gradient(145deg, #8E8E93 0%, #636366 100%)", iconColor: "text-white", shadow: "0 8px 24px rgba(99, 99, 102, 0.4)" },
};

const desktopIcons = [
  { id: "files", name: "Finder", icon: Folder },
  { id: "code-editor", name: "Code", icon: Code },
  { id: "terminal", name: "Terminal", icon: Terminal },
  { id: "browser", name: "Safari", icon: Globe },
  { id: "notes", name: "Notes", icon: FileText },
  { id: "music", name: "Music", icon: Music },
  { id: "photos", name: "Photos", icon: Image },
  { id: "chat", name: "Messages", icon: MessageSquare },
  { id: "calculator", name: "Calculator", icon: Calculator },
  { id: "settings", name: "Settings", icon: Settings },
];

const Desktop = () => {
  const [windows, setWindows] = useState<Window[]>([]);
  const [activeWindow, setActiveWindow] = useState<string | null>(null);
  const [time, setTime] = useState(new Date());
  const [user, setUser] = useState<any>(null);
  const [wallpaper, setWallpaper] = useState(wallpaperThemes[0]);
  const navigate = useNavigate();

  // Set random wallpaper based on user ID for consistency
  useEffect(() => {
    if (user?.id) {
      const hash = user.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
      const themeIndex = hash % wallpaperThemes.length;
      setWallpaper(wallpaperThemes[themeIndex]);
    }
  }, [user?.id]);

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
      case "photos":
        return <PhotoGallery />;
      case "terminal":
        return <InteractiveTerminal username={user?.email?.split("@")[0] || "user"} />;
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
      case "settings":
        return (
          <SettingsPanel 
            wallpaperThemes={wallpaperThemes}
            currentWallpaper={wallpaper}
            onWallpaperChange={setWallpaper}
          />
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
    <div className="h-screen w-screen overflow-hidden relative">
      {/* Live Animated Wallpaper */}
      <div 
        className="absolute inset-0 transition-all duration-1000"
        style={{
          background: `
            radial-gradient(ellipse at 20% 20%, ${wallpaper.colors[0]} 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, ${wallpaper.colors[1]} 0%, transparent 50%),
            radial-gradient(ellipse at 40% 80%, ${wallpaper.colors[2]} 0%, transparent 50%),
            radial-gradient(ellipse at 90% 70%, ${wallpaper.colors[3]} 0%, transparent 40%),
            linear-gradient(180deg, hsl(250, 50%, 8%) 0%, hsl(260, 40%, 3%) 100%)
          `,
        }}
      />
      
      {/* Animated Flowing Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-40"
          style={{ 
            background: `radial-gradient(circle, ${wallpaper.colors[0]}, transparent 70%)`,
            top: "5%", 
            left: "-5%",
            animation: "float 15s ease-in-out infinite"
          }}
        />
        <div 
          className="absolute w-[500px] h-[500px] rounded-full blur-[100px] opacity-35"
          style={{ 
            background: `radial-gradient(circle, ${wallpaper.colors[1]}, transparent 70%)`,
            top: "50%", 
            right: "-5%",
            animation: "float-reverse 18s ease-in-out infinite"
          }}
        />
        <div 
          className="absolute w-[400px] h-[400px] rounded-full blur-[80px] opacity-30"
          style={{ 
            background: `radial-gradient(circle, ${wallpaper.colors[2]}, transparent 70%)`,
            bottom: "10%", 
            left: "30%",
            animation: "float 20s ease-in-out infinite 2s"
          }}
        />
        <div 
          className="absolute w-[300px] h-[300px] rounded-full blur-[60px] opacity-25"
          style={{ 
            background: `radial-gradient(circle, ${wallpaper.colors[3]}, transparent 70%)`,
            top: "30%", 
            left: "60%",
            animation: "float-reverse 12s ease-in-out infinite 1s"
          }}
        />
      </div>

      {/* Subtle noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Desktop Icons - Realistic macOS/iOS style */}
      <div className="absolute top-6 left-6 grid grid-cols-1 gap-4 z-10">
        {desktopIcons.map(({ id, name, icon: Icon }) => {
          const style = iconStyles[id] || { bg: "linear-gradient(145deg, #5856D6, #AF52DE)", iconColor: "text-white", shadow: "0 8px 24px rgba(88, 86, 214, 0.4)" };
          return (
            <button
              key={id}
              onClick={() => openWindow(id, name, <Icon className="w-4 h-4" />)}
              className="group flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-white/10 transition-all duration-200"
            >
              <div 
                className="w-16 h-16 rounded-[18px] flex items-center justify-center group-hover:scale-105 transition-all duration-300 relative overflow-hidden"
                style={{ 
                  background: style.bg,
                  boxShadow: `${style.shadow}, inset 0 1px 0 rgba(255, 255, 255, 0.25), inset 0 -1px 0 rgba(0, 0, 0, 0.1)`
                }}
              >
                {/* Glossy highlight overlay */}
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: "linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 50%)",
                    borderRadius: "inherit"
                  }}
                />
                <Icon className={`w-8 h-8 ${style.iconColor} drop-shadow-md relative z-10`} strokeWidth={1.5} />
              </div>
              <span 
                className="text-[11px] text-white font-medium px-1.5 py-0.5 rounded-md max-w-[70px] truncate"
                style={{ 
                  textShadow: "0 1px 3px rgba(0, 0, 0, 0.8), 0 0 8px rgba(0, 0, 0, 0.5)"
                }}
              >
                {name}
              </span>
            </button>
          );
        })}
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
