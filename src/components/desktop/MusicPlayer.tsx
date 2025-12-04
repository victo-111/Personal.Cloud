import { useState, useRef, useEffect } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";

const demoTracks = [
  { id: 1, title: "Neon Dreams", artist: "Cyber Wave", duration: 180 },
  { id: 2, title: "Digital Rain", artist: "Matrix Sound", duration: 210 },
  { id: 3, title: "Electric Soul", artist: "Synth Master", duration: 195 },
  { id: 4, title: "Future Bass", artist: "Cloud Runner", duration: 165 },
];

export const MusicPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState([75]);
  const [analyzerData, setAnalyzerData] = useState<number[]>(new Array(32).fill(0));
  const animationRef = useRef<number>();

  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  const animate = () => {
    // Simulate audio visualization
    const newData = analyzerData.map(() => Math.random() * 100);
    setAnalyzerData(newData);
    
    setProgress((prev) => {
      const newProgress = prev + 0.5;
      if (newProgress >= 100) {
        nextTrack();
        return 0;
      }
      return newProgress;
    });

    animationRef.current = requestAnimationFrame(animate);
  };

  const togglePlay = () => setIsPlaying(!isPlaying);

  const nextTrack = () => {
    setCurrentTrack((prev) => (prev + 1) % demoTracks.length);
    setProgress(0);
  };

  const prevTrack = () => {
    setCurrentTrack((prev) => (prev - 1 + demoTracks.length) % demoTracks.length);
    setProgress(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const track = demoTracks[currentTrack];
  const currentTime = Math.floor((progress / 100) * track.duration);

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-background to-card">
      {/* Visualizer */}
      <div className="flex-1 flex items-end justify-center gap-1 p-4 overflow-hidden">
        {analyzerData.map((value, i) => (
          <div
            key={i}
            className="w-2 bg-gradient-to-t from-primary to-accent rounded-t transition-all duration-75"
            style={{
              height: `${isPlaying ? value : 10}%`,
              opacity: isPlaying ? 0.8 : 0.3,
              boxShadow: isPlaying ? `0 0 10px hsl(var(--primary))` : "none",
            }}
          />
        ))}
      </div>

      {/* Track info */}
      <div className="text-center py-4">
        <h2 
          className="text-xl font-bold text-foreground"
          style={{ textShadow: "0 0 10px hsl(var(--primary))" }}
        >
          {track.title}
        </h2>
        <p className="text-muted-foreground">{track.artist}</p>
      </div>

      {/* Progress bar */}
      <div className="px-6 pb-2">
        <Slider
          value={[progress]}
          max={100}
          step={0.1}
          onValueChange={([val]) => setProgress(val)}
          className="cursor-pointer"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(track.duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 py-4">
        <button
          onClick={prevTrack}
          className="w-10 h-10 rounded-full bg-card hover:bg-primary/20 flex items-center justify-center transition-colors"
        >
          <SkipBack className="w-5 h-5 text-foreground" />
        </button>
        <button
          onClick={togglePlay}
          className="w-14 h-14 rounded-full bg-primary hover:bg-primary/80 flex items-center justify-center transition-all shadow-lg shadow-primary/50"
          style={{ boxShadow: "0 0 20px hsl(var(--primary) / 0.5)" }}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 text-primary-foreground" />
          ) : (
            <Play className="w-6 h-6 text-primary-foreground ml-1" />
          )}
        </button>
        <button
          onClick={nextTrack}
          className="w-10 h-10 rounded-full bg-card hover:bg-primary/20 flex items-center justify-center transition-colors"
        >
          <SkipForward className="w-5 h-5 text-foreground" />
        </button>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-2 px-6 pb-4">
        <Volume2 className="w-4 h-4 text-muted-foreground" />
        <Slider
          value={volume}
          max={100}
          onValueChange={setVolume}
          className="flex-1"
        />
      </div>

      {/* Playlist */}
      <div className="border-t border-border max-h-32 overflow-auto">
        {demoTracks.map((t, i) => (
          <button
            key={t.id}
            onClick={() => { setCurrentTrack(i); setProgress(0); }}
            className={`w-full px-4 py-2 flex items-center justify-between hover:bg-primary/10 transition-colors ${
              i === currentTrack ? "bg-primary/20" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
              <div className="text-left">
                <p className="text-sm font-medium">{t.title}</p>
                <p className="text-xs text-muted-foreground">{t.artist}</p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">{formatTime(t.duration)}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
