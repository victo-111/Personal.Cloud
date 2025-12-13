import { useState, useEffect, useRef } from "react";
import { Check, User, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WallpaperTheme {
  name: string;
  colors: string[];
}

interface SettingsPanelProps {
  wallpaperThemes: WallpaperTheme[];
  currentWallpaper: WallpaperTheme;
  onWallpaperChange: (theme: WallpaperTheme) => void;
}

export const SettingsPanel = ({ 
  wallpaperThemes, 
  currentWallpaper, 
  onWallpaperChange 
}: SettingsPanelProps) => {
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setUsername(data.username || "");
      setAvatarUrl(data.avatar_url);
    }
  };

  const updateProfile = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ username, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    setLoading(false);
    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated!");
    }
  };

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setUploading(false);
      return;
    }

    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("user-photos")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setUploading(false);
      toast.error("Failed to upload avatar");
      return;
    }

    const { data: publicData } = supabase.storage
      .from("user-photos")
      .getPublicUrl(filePath);

    const avatarUrlWithTimestamp = `${publicData.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrlWithTimestamp, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    setUploading(false);
    if (updateError) {
      toast.error("Failed to update avatar");
    } else {
      setAvatarUrl(avatarUrlWithTimestamp);
      toast.success("Avatar updated!");
    }
  };

  return (
    <div className="h-full bg-background p-6 overflow-auto">
      <h2 className="text-xl font-semibold text-foreground mb-6">Settings</h2>
      
      <div className="space-y-6">
        {/* Profile Section */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Profile
          </h3>
          
          <div className="bg-card rounded-lg p-4 space-y-4">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div 
                className="relative w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-muted-foreground" />
                )}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploading ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5 text-white" />
                  )}
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Profile Picture</p>
                <p className="text-xs text-muted-foreground">Click to upload (max 2MB)</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={uploadAvatar}
                className="hidden"
              />
            </div>

            {/* Username */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Username</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  onClick={updateProfile}
                  disabled={loading}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Wallpaper Section */}
        <div className="border-t border-border pt-6">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Wallpaper
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Choose a live animated wallpaper theme</p>
          
          <div className="grid grid-cols-4 gap-3">
            {wallpaperThemes.map((theme) => {
              const isSelected = currentWallpaper.name === theme.name;
              return (
                <button
                  key={theme.name}
                  onClick={() => onWallpaperChange(theme)}
                  className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                    isSelected 
                      ? "border-primary ring-2 ring-primary/50 scale-105" 
                      : "border-border/50 hover:border-primary/50"
                  }`}
                >
                  <div 
                    className="absolute inset-0"
                    style={{
                      background: `
                        radial-gradient(ellipse at 20% 20%, ${theme.colors[0]} 0%, transparent 50%),
                        radial-gradient(ellipse at 80% 20%, ${theme.colors[1]} 0%, transparent 50%),
                        radial-gradient(ellipse at 40% 80%, ${theme.colors[2]} 0%, transparent 50%),
                        radial-gradient(ellipse at 90% 70%, ${theme.colors[3]} 0%, transparent 40%),
                        linear-gradient(180deg, hsl(250, 50%, 8%) 0%, hsl(260, 40%, 3%) 100%)
                      `,
                    }}
                  />
                  
                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                  
                  <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent">
                    <span className="text-[10px] text-white font-medium capitalize">
                      {theme.name}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-border pt-6">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
            About
          </h3>
          <div className="bg-card rounded-lg p-4 space-y-2">
            <p className="text-sm text-foreground">CloudSpace Desktop v1.0.0</p>
            <p className="text-xs text-muted-foreground">Your virtual desktop in the cloud</p>
          </div>
        </div>
      </div>
    </div>
  );
};
