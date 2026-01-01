import { useState, useEffect, useRef } from "react";
import { X, User, Upload, Loader2, Mail, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  points?: number;
  activity?: string[];
}

export const ProfileModal = ({ isOpen, onClose, points = 100, activity = [] }: ProfileModalProps) => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [createdAt, setCreatedAt] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Admin login UI in Profile modal (convenience)
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [adminUserInput, setAdminUserInput] = useState("");
  const [adminPassInput, setAdminPassInput] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchProfile();
    }
  }, [isOpen]);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setEmail(user.email || "");
    setCreatedAt(user.created_at || "");

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

  const handleAdminLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    // Client-side admin check (insecure, demo only)
    if (adminUserInput === "Anon111" && adminPassInput === "VIC123##") {
      setAdminLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAdminLoading(false);
        return toast.error('Not logged in');
      }

      // upsert admin flag (use onConflict instead of unsupported 'returning' option)
      const { error } = await supabase.from('profiles').upsert({ user_id: user.id, is_admin: true }, { onConflict: 'user_id' });
      setAdminLoading(false);
      if (error) {
        toast.error('Failed to set admin');
      } else {
        try {
          const stored = localStorage.getItem(`pc:user:${user.id}`);
          const p = stored ? JSON.parse(stored) as { points?: number; isAdmin?: boolean } : { points: 100 };
          p.isAdmin = true;
          localStorage.setItem(`pc:user:${user.id}`, JSON.stringify(p));
        } catch (err: unknown) { console.debug('ProfileModal: failed to persist admin flag locally', err); }
        toast.success('Admin login successful');
        setAdminLoginOpen(false);
      }
    } else {
      toast.error('Admin login failed');
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative h-24 bg-gradient-to-br from-primary via-primary/80 to-primary/50">
          <button 
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Avatar */}
        <div className="flex justify-center -mt-12">
          <div 
            className="relative w-24 h-24 rounded-full bg-muted border-4 border-card flex items-center justify-center overflow-hidden cursor-pointer group shadow-xl"
            onClick={() => fileInputRef.current?.click()}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-muted-foreground" />
            )}
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {uploading ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <Upload className="w-6 h-6 text-white" />
              )}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={uploadAvatar}
            className="hidden"
          />
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Points & Activity */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Points</label>
            <div className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground text-sm">{points}</div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Recent Activity</label>
            <div className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground text-sm max-h-36 overflow-auto">
              {activity.length === 0 ? (
                <div className="text-muted-foreground text-sm">No recent activity</div>
              ) : (
                <ul className="list-disc list-inside space-y-1">
                  {activity.map((a, i) => (
                    <li key={i} className="text-sm text-foreground">{a}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          {/* Username */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Email (read-only) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              Email
            </label>
            <input
              type="email"
              value={email}
              readOnly
              className="w-full px-4 py-2.5 bg-muted border border-border rounded-lg text-muted-foreground text-sm cursor-not-allowed"
            />
          </div>

          {/* Member since */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Member since {new Date(createdAt).toLocaleDateString([], { month: "long", year: "numeric" })}</span>
          </div>

          {/* Save Button */}
          <button
            onClick={updateProfile}
            disabled={loading}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Save Changes"
            )}
          </button>
          <div className="flex flex-col gap-2 mt-2">
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) return toast.error('Not logged in');
                  // Reset points on the profile to default (100)
                  const { error } = await supabase.from('profiles').update({ points: 100 }).eq('user_id', user.id);
                  if (error) return toast.error('Failed to reset points');
                  try { const stored = localStorage.getItem(`pc:user:${user.id}`); if (stored) { const p = JSON.parse(stored) as { points?: number; isAdmin?: boolean }; p.points = 100; localStorage.setItem(`pc:user:${user.id}`, JSON.stringify(p)); } } catch(e) { console.debug('ProfileModal: failed to update localStorage after reset', e); }
                  toast.success('Points reset to 100');
                }}
                className="flex-1 py-2 bg-black/80 text-white rounded-lg text-sm font-medium neon-flash"
              >
                Reset Points
              </button>
              <button
                onClick={async () => {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) return toast.error('Not logged in');
                  const { error } = await supabase.from('profiles').update({ is_admin: false }).eq('user_id', user.id);
                  if (error) return toast.error('Failed to revoke admin');
                  try {
                    const stored = localStorage.getItem(`pc:user:${user.id}`);
                    if (stored) {
                      const p = JSON.parse(stored) as { points?: number; isAdmin?: boolean };
                      p.isAdmin = false;
                      localStorage.setItem(`pc:user:${user.id}`, JSON.stringify(p));
                    }
                  } catch (err: unknown) {
                    console.debug('ProfileModal: failed to update localStorage after revoke', err);
                  }
                  toast.success('Admin revoked');
                }}
                className="flex-1 py-2 bg-black/80 text-white rounded-lg text-sm font-medium neon-flash"
              >
                Revoke Admin
              </button>
            </div>

            {!adminLoginOpen ? (
              <button
                onClick={() => setAdminLoginOpen(true)}
                className="w-full py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
              >
                Admin Login
              </button>
            ) : (
              <form onSubmit={handleAdminLogin} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    value={adminUserInput}
                    onChange={(e) => setAdminUserInput(e.target.value)}
                    placeholder="username"
                    className="flex-1 px-3 py-2 bg-background border border-border rounded text-sm"
                  />
                  <input
                    value={adminPassInput}
                    onChange={(e) => setAdminPassInput(e.target.value)}
                    placeholder="password"
                    type="password"
                    className="flex-1 px-3 py-2 bg-background border border-border rounded text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={adminLoading} className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
                    {adminLoading ? 'Logging in...' : 'Login'}
                  </button>
                  <button type="button" onClick={() => { setAdminLoginOpen(false); setAdminUserInput(''); setAdminPassInput(''); }} className="flex-1 py-2 bg-muted text-white rounded-lg text-sm font-medium">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
