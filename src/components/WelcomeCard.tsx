import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Cloud, Sparkles } from "lucide-react";

export const WelcomeCard = () => {
  return (
    <Card className="w-full max-w-md p-8 shadow-2xl backdrop-blur-sm bg-card/95 animate-fade-in-up border border-primary/30">
      <div className="flex flex-col items-center space-y-6">
        {/* Logo/Icon */}
        <div className="relative">
          <div className="absolute inset-0 bg-primary/30 blur-2xl rounded-full animate-neon-pulse" />
          <div className="relative w-20 h-20 bg-primary/20 border-2 border-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/50">
            <Cloud className="w-10 h-10 text-primary drop-shadow-[0_0_10px_hsl(var(--primary))]" />
          </div>
        </div>
        
        {/* Welcome Text with Glitch Effect */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground tracking-tight animate-glitch-text" 
              style={{ 
                textShadow: "0 0 10px hsl(var(--primary)), 0 0 20px hsl(var(--primary)), 0 0 30px hsl(var(--primary))"
              }}>
            Welcome to CloudSpace
          </h1>
          <p className="text-muted-foreground text-sm" 
             style={{ 
               textShadow: "0 0 5px hsl(var(--accent))"
             }}>
            Your personal cloud environment
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col w-full space-y-3 pt-2">
          <Button 
            size="lg" 
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/50 hover:shadow-primary/70 transition-all duration-300 hover:scale-[1.02] border border-primary"
            style={{ 
              textShadow: "0 0 5px rgba(255,255,255,0.5)"
            }}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Get Started
          </Button>
          
          <Button 
            size="lg" 
            variant="outline" 
            className="w-full border-2 border-primary/50 hover:bg-primary/10 hover:border-primary transition-all duration-300 text-foreground shadow-lg shadow-primary/20"
            style={{ 
              textShadow: "0 0 5px hsl(var(--primary))"
            }}
          >
            Learn More
          </Button>
        </div>
        
        {/* Footer Text */}
        <p className="text-xs text-muted-foreground text-center pt-2"
           style={{ 
             textShadow: "0 0 3px hsl(var(--accent))"
           }}>
          Experience the future of cloud computing
        </p>
      </div>
    </Card>
  );
};