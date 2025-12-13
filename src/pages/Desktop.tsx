import { useState, useEffect, useRef } from "react";
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
import { Calculator as CalculatorApp } from "@/components/desktop/Calculator";

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

interface IconPosition {
  id: string;
  x: number;
  y: number;
}

// Wallpaper themes for different users
const wallpaperThemes = [
  { name: "aurora", colors: ["hsl(180, 100%, 30%)", "hsl(280, 100%, 25%)", "hsl(200, 100%, 40%)", "hsl(320, 80%, 30%)"] },
  { name: "sunset", colors: ["hsl(20, 100%, 40%)", "hsl(350, 100%, 35%)", "hsl(280, 80%, 25%)", "hsl(40, 100%, 50%)"] },
  { name: "ocean", colors: ["hsl(200, 100%, 35%)", "hsl(180, 100%, 30%)", "hsl(220, 80%, 25%)", "hsl(160, 100%, 40%)"] },
  { name: "forest", colors: ["hsl(120, 60%, 25%)", "hsl(160, 80%, 30%)", "hsl(80, 70%, 35%)", "hsl(140, 100%, 20%)"] },
  { name: "cosmic", colors: ["hsl(260, 100%, 25%)", "hsl(300, 100%, 30%)", "hsl(220, 80%, 35%)", "hsl(280, 100%, 40%)"] },
  { name: "neon", colors: ["hsl(320, 100%, 45%)", "hsl(180, 100%, 50%)", "hsl(60, 100%, 50%)", "hsl(280, 100%, 50%)"] },
  { name: "midnight", colors: ["hsl(220, 80%, 15%)", "hsl(240, 70%, 20%)", "hsl(200, 60%, 25%)", "hsl(260, 50%, 18%)"] },
  { name: "cherry", colors: ["hsl(340, 90%, 40%)", "hsl(350, 100%, 35%)", "hsl(320, 80%, 30%)", "hsl(0, 100%, 45%)"] },
  { name: "arctic", colors: ["hsl(190, 80%, 60%)", "hsl(200, 70%, 50%)", "hsl(210, 90%, 70%)", "hsl(180, 60%, 55%)"] },
  { name: "ember", colors: ["hsl(30, 100%, 45%)", "hsl(15, 100%, 40%)", "hsl(45, 100%, 50%)", "hsl(0, 90%, 35%)"] },
  { name: "lavender", colors: ["hsl(270, 60%, 50%)", "hsl(280, 70%, 45%)", "hsl(260, 50%, 55%)", "hsl(290, 80%, 40%)"] },
  { name: "matrix", colors: ["hsl(120, 100%, 25%)", "hsl(130, 80%, 20%)", "hsl(110, 90%, 30%)", "hsl(140, 70%, 15%)"] },
];

// Icon styling for realistic macOS/Windows style icons with 3D effects
const iconStyles: Record<string, { bg: string; iconColor: string; shadow: string; innerGlow: string }> = {
  files: { 
    bg: "linear-gradient(145deg, #64D2FF 0%, #0A84FF 50%, #0066CC 100%)", 
    iconColor: "text-white", 
    shadow: "0 8px 24px rgba(10, 132, 255, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3)",
    innerGlow: "inset 0 2px 4px rgba(255, 255, 255, 0.4), inset 0 -2px 4px rgba(0, 0, 0, 0.2)"
  },
  "code-editor": { 
    bg: "linear-gradient(145deg, #BF5AF2 0%, #5E5CE6 50%, #3634A3 100%)", 
    iconColor: "text-white", 
    shadow: "0 8px 24px rgba(94, 92, 230, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3)",
    innerGlow: "inset 0 2px 4px rgba(255, 255, 255, 0.4), inset 0 -2px 4px rgba(0, 0, 0, 0.2)"
  },
  terminal: { 
    bg: "linear-gradient(145deg, #3A3A3C 0%, #1C1C1E 50%, #000000 100%)", 
    iconColor: "text-green-400", 
    shadow: "0 8px 24px rgba(0, 0, 0, 0.6), 0 2px 8px rgba(0, 0, 0, 0.4)",
    innerGlow: "inset 0 2px 4px rgba(255, 255, 255, 0.15), inset 0 -2px 4px rgba(0, 0, 0, 0.3)"
  },
  browser: { 
    bg: "linear-gradient(145deg, #5AC8FA 0%, #007AFF 50%, #0055D4 100%)", 
    iconColor: "text-white", 
    shadow: "0 8px 24px rgba(0, 122, 255, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3)",
    innerGlow: "inset 0 2px 4px rgba(255, 255, 255, 0.4), inset 0 -2px 4px rgba(0, 0, 0, 0.2)"
  },
  notes: { 
    bg: "linear-gradient(145deg, #FFD60A 0%, #FF9F0A 50%, #CC7A00 100%)", 
    iconColor: "text-amber-900", 
    shadow: "0 8px 24px rgba(255, 159, 10, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3)",
    innerGlow: "inset 0 2px 4px rgba(255, 255, 255, 0.5), inset 0 -2px 4px rgba(0, 0, 0, 0.15)"
  },
  music: { 
    bg: "linear-gradient(145deg, #FF375F 0%, #FF2D55 50%, #D70015 100%)", 
    iconColor: "text-white", 
    shadow: "0 8px 24px rgba(255, 45, 85, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3)",
    innerGlow: "inset 0 2px 4px rgba(255, 255, 255, 0.4), inset 0 -2px 4px rgba(0, 0, 0, 0.2)"
  },
  chat: { 
    bg: "linear-gradient(145deg, #30D158 0%, #34C759 50%, #248A3D 100%)", 
    iconColor: "text-white", 
    shadow: "0 8px 24px rgba(52, 199, 89, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3)",
    innerGlow: "inset 0 2px 4px rgba(255, 255, 255, 0.4), inset 0 -2px 4px rgba(0, 0, 0, 0.2)"
  },
  calculator: { 
    bg: "linear-gradient(145deg, #636366 0%, #48484A 50%, #1C1C1E 100%)", 
    iconColor: "text-orange-400", 
    shadow: "0 8px 24px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.4)",
    innerGlow: "inset 0 2px 4px rgba(255, 255, 255, 0.2), inset 0 -2px 4px rgba(0, 0, 0, 0.3)"
  },
  photos: { 
    bg: "linear-gradient(145deg, #FF9F0A 0%, #FF375F 35%, #BF5AF2 70%, #5E5CE6 100%)", 
    iconColor: "text-white", 
    shadow: "0 8px 24px rgba(191, 90, 242, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3)",
    innerGlow: "inset 0 2px 4px rgba(255, 255, 255, 0.4), inset 0 -2px 4px rgba(0, 0, 0, 0.2)"
  },
  settings: { 
    bg: "linear-gradient(145deg, #AEAEB2 0%, #8E8E93 50%, #636366 100%)", 
    iconColor: "text-white", 
    shadow: "0 8px 24px rgba(142, 142, 147, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3)",
    innerGlow: "inset 0 2px 4px rgba(255, 255, 255, 0.4), inset 0 -2px 4px rgba(0, 0, 0, 0.2)"
  },
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
  
  // Dragging state for windows
  const [draggingWindow, setDraggingWindow] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Icon positions and dragging
  const [iconPositions, setIconPositions] = useState<IconPosition[]>(() => 
    desktopIcons.map((icon, index) => ({
      id: icon.id,
      x: 24,
      y: 24 + index * 80,
    }))
  );
  const [draggingIcon, setDraggingIcon] = useState<string | null>(null);
  const [iconDragOffset, setIconDragOffset] = useState({ x: 0, y: 0 });
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

  // Window dragging handlers
  const handleWindowMouseDown = (e: React.MouseEvent, windowId: string, windowPos: { x: number; y: number }) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setDraggingWindow(windowId);
    setDragOffset({ x: e.clientX - windowPos.x, y: e.clientY - windowPos.y });
    setActiveWindow(windowId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingWindow) {
      const newX = Math.max(0, e.clientX - dragOffset.x);
      const newY = Math.max(0, e.clientY - dragOffset.y);
      setWindows(prev => prev.map(w => 
        w.id === draggingWindow ? { ...w, position: { x: newX, y: newY } } : w
      ));
    }
    if (draggingIcon) {
      const newX = Math.max(0, e.clientX - iconDragOffset.x);
      const newY = Math.max(0, Math.min(window.innerHeight - 100, e.clientY - iconDragOffset.y));
      setIconPositions(prev => prev.map(icon => 
        icon.id === draggingIcon ? { ...icon, x: newX, y: newY } : icon
      ));
    }
  };

  const handleMouseUp = () => {
    setDraggingWindow(null);
    setDraggingIcon(null);
  };

  // Icon dragging handlers
  const handleIconMouseDown = (e: React.MouseEvent, iconId: string) => {
    const pos = iconPositions.find(p => p.id === iconId);
    if (pos) {
      setDraggingIcon(iconId);
      setIconDragOffset({ x: e.clientX - pos.x, y: e.clientY - pos.y });
    }
  };

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
        return <CalculatorApp />;
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
    <div 
      className="h-screen w-screen overflow-hidden relative select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
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

      {/* Desktop Icons - Realistic 3D style */}
      {desktopIcons.map(({ id, name, icon: Icon }) => {
        const style = iconStyles[id] || { 
          bg: "linear-gradient(145deg, #5856D6, #AF52DE)", 
          iconColor: "text-white", 
          shadow: "0 4px 12px rgba(88, 86, 214, 0.4)",
          innerGlow: "inset 0 2px 4px rgba(255, 255, 255, 0.4), inset 0 -2px 4px rgba(0, 0, 0, 0.2)"
        };
        const pos = iconPositions.find(p => p.id === id) || { x: 24, y: 24 };
        return (
          <div
            key={id}
            className={`absolute z-10 ${draggingIcon === id ? 'cursor-grabbing scale-110' : 'cursor-grab'} transition-transform duration-150`}
            style={{ left: pos.x, top: pos.y }}
            onMouseDown={(e) => handleIconMouseDown(e, id)}
            onDoubleClick={() => openWindow(id, name, <Icon className="w-3 h-3" />)}
          >
            <div className="group flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/10 transition-all duration-200">
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 group-active:scale-95 transition-all duration-200 relative overflow-hidden"
                style={{ 
                  background: style.bg,
                  boxShadow: `${style.shadow}, ${style.innerGlow}`
                }}
              >
                {/* Top highlight */}
                <div 
                  className="absolute inset-x-0 top-0 h-1/2 pointer-events-none"
                  style={{
                    background: "linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.1) 40%, transparent 100%)",
                    borderRadius: "inherit"
                  }}
                />
                {/* Bottom shadow */}
                <div 
                  className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none"
                  style={{
                    background: "linear-gradient(0deg, rgba(0,0,0,0.2) 0%, transparent 100%)",
                    borderRadius: "inherit"
                  }}
                />
                <Icon className={`w-7 h-7 ${style.iconColor} drop-shadow-lg relative z-10`} strokeWidth={1.5} />
              </div>
              <span 
                className="text-[11px] text-white font-medium px-1.5 py-0.5 rounded-md max-w-[70px] truncate text-center backdrop-blur-sm"
                style={{ 
                  textShadow: "0 1px 4px rgba(0, 0, 0, 0.9), 0 0 12px rgba(0, 0, 0, 0.6)",
                  background: "rgba(0, 0, 0, 0.2)"
                }}
              >
                {name}
              </span>
            </div>
          </div>
        );
      })}

      {/* Windows */}
      {windows.map(win => (
        !win.isMinimized && (
          <div
            key={win.id}
            onClick={() => setActiveWindow(win.id)}
            className={`absolute rounded-lg overflow-hidden border transition-shadow ${
              activeWindow === win.id ? "border-primary/50 shadow-2xl shadow-primary/20 z-50" : "border-border/50 shadow-xl z-40"
            } ${draggingWindow === win.id ? 'cursor-grabbing' : ''}`}
            style={{
              left: win.isMaximized ? 0 : win.position.x,
              top: win.isMaximized ? 0 : win.position.y,
              width: win.isMaximized ? "100%" : win.size.width,
              height: win.isMaximized ? "calc(100% - 48px)" : win.size.height,
            }}
          >
            <div 
              className={`h-10 bg-card/95 backdrop-blur-xl border-b border-border flex items-center justify-between px-3 ${
                !win.isMaximized ? 'cursor-grab active:cursor-grabbing' : ''
              }`}
              onMouseDown={(e) => !win.isMaximized && handleWindowMouseDown(e, win.id, win.position)}
            >
              <div className="flex items-center gap-2 pointer-events-none">
                <span className="text-primary">{win.icon}</span>
                <span className="text-sm font-medium text-foreground">{win.title}</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => { e.stopPropagation(); minimizeWindow(win.id); }} className="w-6 h-6 rounded flex items-center justify-center hover:bg-muted transition-colors pointer-events-auto">
                  <Minus className="w-3 h-3 text-muted-foreground" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); maximizeWindow(win.id); }} className="w-6 h-6 rounded flex items-center justify-center hover:bg-muted transition-colors pointer-events-auto">
                  <Square className="w-3 h-3 text-muted-foreground" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); closeWindow(win.id); }} className="w-6 h-6 rounded flex items-center justify-center hover:bg-destructive/20 transition-colors pointer-events-auto">
                  <X className="w-3 h-3 text-destructive" />
                </button>
              </div>
            </div>
            <div className="h-[calc(100%-40px)] overflow-auto">{win.content}</div>
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
