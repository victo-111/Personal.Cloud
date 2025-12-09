import { Check } from "lucide-react";

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
  return (
    <div className="h-full bg-background p-6 overflow-auto">
      <h2 className="text-xl font-semibold text-foreground mb-6">Settings</h2>
      
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Wallpaper
          </h3>
          
          <div className="grid grid-cols-3 gap-4">
            {wallpaperThemes.map((theme) => {
              const isSelected = currentWallpaper.name === theme.name;
              return (
                <button
                  key={theme.name}
                  onClick={() => onWallpaperChange(theme)}
                  className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all hover:scale-105 ${
                    isSelected 
                      ? "border-primary ring-2 ring-primary/50" 
                      : "border-border hover:border-primary/50"
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
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-5 h-5 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                  
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                    <span className="text-xs text-white font-medium capitalize">
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
