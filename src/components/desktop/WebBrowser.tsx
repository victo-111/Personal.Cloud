import { useState, useRef, KeyboardEvent } from "react";
import { 
  ArrowLeft, ArrowRight, RotateCw, Home, Search, 
  Shield, Star, Loader2, ExternalLink 
} from "lucide-react";

const defaultBookmarks = [
  { name: "Google", url: "https://www.google.com/webhp?igu=1" },
  { name: "Wikipedia", url: "https://en.m.wikipedia.org/wiki/Main_Page" },
  { name: "GitHub", url: "https://github.com" },
  { name: "Reddit", url: "https://www.reddit.com" },
];

export const WebBrowser = () => {
  const [url, setUrl] = useState("https://www.google.com/webhp?igu=1");
  const [inputUrl, setInputUrl] = useState("https://www.google.com/webhp?igu=1");
  const [isLoading, setIsLoading] = useState(true);
  const [history, setHistory] = useState<string[]>(["https://www.google.com/webhp?igu=1"]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const normalizeUrl = (input: string): string => {
    let normalized = input.trim();
    
    // If it looks like a search query (no dots or spaces with words)
    if (!normalized.includes(".") || normalized.includes(" ")) {
      return `https://www.google.com/search?igu=1&q=${encodeURIComponent(normalized)}`;
    }
    
    // Add https if no protocol
    if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
      normalized = "https://" + normalized;
    }
    
    return normalized;
  };

  const navigate = (newUrl: string) => {
    const normalized = normalizeUrl(newUrl);
    setUrl(normalized);
    setInputUrl(normalized);
    setIsLoading(true);
    
    // Update history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(normalized);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      navigate(inputUrl);
    }
  };

  const goBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setUrl(history[newIndex]);
      setInputUrl(history[newIndex]);
      setIsLoading(true);
    }
  };

  const goForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setUrl(history[newIndex]);
      setInputUrl(history[newIndex]);
      setIsLoading(true);
    }
  };

  const refresh = () => {
    setIsLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = url;
    }
  };

  const goHome = () => {
    navigate("https://www.google.com/webhp?igu=1");
  };

  const openExternal = () => {
    window.open(url, "_blank");
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 bg-card border-b border-border">
        {/* Navigation buttons */}
        <div className="flex items-center gap-1">
          <button 
            onClick={goBack}
            disabled={historyIndex <= 0}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <button 
            onClick={goForward}
            disabled={historyIndex >= history.length - 1}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <button 
            onClick={refresh}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
          >
            <RotateCw className={`w-4 h-4 text-muted-foreground ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button 
            onClick={goHome}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
          >
            <Home className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* URL Bar */}
        <div className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-background rounded-full border border-border focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
          {url.startsWith("https://") ? (
            <Shield className="w-4 h-4 text-green-500 flex-shrink-0" />
          ) : (
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          )}
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search or enter URL..."
            className="flex-1 bg-transparent border-none outline-none text-foreground text-sm placeholder:text-muted-foreground"
          />
          {isLoading && (
            <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button 
            onClick={openExternal}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Bookmarks Bar */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-card/50 border-b border-border overflow-x-auto">
        {defaultBookmarks.map((bookmark) => (
          <button
            key={bookmark.name}
            onClick={() => navigate(bookmark.url)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors whitespace-nowrap"
          >
            <Star className="w-3 h-3" />
            {bookmark.name}
          </button>
        ))}
      </div>

      {/* Browser Content */}
      <div className="flex-1 relative bg-white">
        <iframe
          ref={iframeRef}
          src={url}
          className="w-full h-full border-none"
          onLoad={() => setIsLoading(false)}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
          referrerPolicy="no-referrer"
        />
        
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
