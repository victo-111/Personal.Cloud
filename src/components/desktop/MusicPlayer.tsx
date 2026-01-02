import { useState, useRef, useEffect } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, Upload, Trash2, Loader2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Track {
  id: string | number;
  title: string;
  artist: string;
  duration: number;
  url?: string;
  isUploaded?: boolean;
}

const demoTracks: Track[] = [
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
  const [tracks, setTracks] = useState<Track[]>(demoTracks);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animationRef = useRef<number>();
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    let rafId: number | undefined;
    const loop = () => {
      // Simulate audio visualization
      setAnalyzerData((prev) => prev.map(() => Math.random() * 100));

      setProgress((prev) => {
        const newProgress = prev + 0.5;
        if (newProgress >= 100) {
          nextTrack();
          return 0;
        }
        return newProgress;
      });

      rafId = requestAnimationFrame(loop);
      animationRef.current = rafId;
    };

    if (isPlaying) {
      rafId = requestAnimationFrame(loop);
      animationRef.current = rafId;
    } else {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying]);

  const togglePlay = () => setIsPlaying(!isPlaying);

  const nextTrack = () => {
    setCurrentTrack((prev) => (prev + 1) % tracks.length);
    setProgress(0);
  };

  const prevTrack = () => {
    setCurrentTrack((prev) => (prev - 1 + tracks.length) % tracks.length);
    setProgress(0);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("audio/")) {
      toast.error("Please select an audio file");
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File size must be less than 50MB");
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to upload music");
        setUploading(false);
        return;
      }

      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${user.id}/music/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("user-music")
        .upload(filePath, file);

      if (uploadError) {
        toast.error("Failed to upload music file");
        setUploading(false);
        return;
      }

      // Get public URL
      const { data: publicData } = supabase.storage
        .from("user-music")
        .getPublicUrl(filePath);

      // Get audio duration
      const audio = new Audio(publicData.publicUrl);
      audio.onloadedmetadata = () => {
        const newTrack: Track = {
          id: `uploaded_${Date.now()}`,
          title: file.name.replace(/\.[^.]+$/, ""),
          artist: "Your Upload",
          duration: Math.floor(audio.duration),
          url: publicData.publicUrl,
          isUploaded: true,
        };

        setTracks([...tracks, newTrack]);
        toast.success("Music uploaded successfully!");
        setUploading(false);

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      };

      audio.onerror = () => {
        toast.error("Could not read audio file duration");
        setUploading(false);
      };
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload music");
      setUploading(false);
    }
  };

  const deleteTrack = (id: string | number) => {
    const newTracks = tracks.filter(t => t.id !== id);
    setTracks(newTracks);
    
    if (currentTrack >= newTracks.length) {
      setCurrentTrack(Math.max(0, newTracks.length - 1));
    }
    
    toast.success("Track removed from playlist");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const track = tracks[currentTrack];
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
      <div className="border-t border-border flex flex-col">
        {/* Upload Button */}
        <div className="px-4 py-3 border-b border-border">
          <button
            onClick={handleUploadClick}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload Music
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Tracks List */}
        <div className="max-h-32 overflow-auto">
          {tracks.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No tracks. Upload music to get started!
            </div>
          ) : (
            tracks.map((t, i) => (
              <button
                key={t.id}
                onClick={() => { setCurrentTrack(i); setProgress(0); }}
                className={`w-full px-4 py-2 flex items-center justify-between hover:bg-primary/10 transition-colors group ${
                  i === currentTrack ? "bg-primary/20" : ""
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                  <div className="text-left flex-1">
                    <p className="text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.artist}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{formatTime(t.duration)}</span>
                  {t.isUploaded && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTrack(t.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/20 rounded transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
