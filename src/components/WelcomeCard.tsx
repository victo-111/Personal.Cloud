import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Cloud, Sparkles } from "lucide-react";

export const WelcomeCard = () => {
  return (
    <Card className="w-full max-w-md p-8 shadow-2xl backdrop-blur-sm bg-card/95 animate-fade-in-up border-0">
      <div className="flex flex-col items-center space-y-6">
        {/* Logo/Icon */}
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
          <div className="relative w-20 h-20 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
            <Cloud className="w-10 h-10 text-primary-foreground" />
          </div>
        </div>
        
        {/* Welcome Text */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-card-foreground tracking-tight">
            Welcome to CloudSpace
          </h1>
          <p className="text-muted-foreground text-sm">
            Your personal cloud environment
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col w-full space-y-3 pt-2">
          <Button 
            size="lg" 
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Get Started
          </Button>
          
          <Button 
            size="lg" 
            variant="outline"
            className="w-full border-2 hover:bg-muted/50 transition-all duration-300"
          >
            Learn More
          </Button>
        </div>
        
        {/* Footer Text */}
        <p className="text-xs text-muted-foreground text-center pt-2">
          Experience the future of cloud computing
        </p>
      </div>
    </Card>
  );
};
