import { Database, Shield, Zap, Globe } from "lucide-react";
import { Card } from "@/components/ui/card";

const features = [
  {
    icon: Database,
    title: "Secure Storage",
    description: "Store your files safely with enterprise-grade encryption and instant access from anywhere",
    delay: "0s"
  },
  {
    icon: Shield,
    title: "Privacy First",
    description: "Your data stays private with end-to-end encryption and zero-knowledge architecture",
    delay: "0.2s"
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Experience blazing-fast performance with our globally distributed infrastructure",
    delay: "0.4s"
  },
  {
    icon: Globe,
    title: "Access Anywhere",
    description: "Work seamlessly across all your devices with automatic sync and offline support",
    delay: "0.6s"
  }
];

export const Features = () => {
  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-16">
      <div className="text-center mb-12 animate-fade-in-up">
        <h2 className="text-4xl font-bold text-foreground mb-4 animate-glitch-text"
            style={{ 
              textShadow: "0 0 10px hsl(var(--primary)), 0 0 20px hsl(var(--primary))"
            }}>
          Everything You Need
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto"
           style={{ 
             textShadow: "0 0 5px hsl(var(--accent))"
           }}>
          Powerful features designed to make your cloud experience seamless and secure
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <Card
              key={index}
              className="p-6 bg-card/95 backdrop-blur-sm border border-primary/30 hover:border-primary/60 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-primary/30 animate-fade-in-up group"
              style={{ animationDelay: feature.delay }}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full group-hover:bg-primary/40 transition-all duration-300 animate-neon-pulse" />
                  <div className="relative w-16 h-16 bg-primary/10 border-2 border-primary/50 rounded-xl flex items-center justify-center group-hover:bg-primary/20 group-hover:border-primary transition-all duration-300">
                    <Icon className="w-8 h-8 text-primary drop-shadow-[0_0_10px_hsl(var(--primary))]" />
                  </div>
                </div>
                
                <h3 className="text-xl font-semibold text-foreground"
                    style={{ 
                      textShadow: "0 0 5px hsl(var(--primary))"
                    }}>
                  {feature.title}
                </h3>
                
                <p className="text-sm text-muted-foreground leading-relaxed"
                   style={{ 
                     textShadow: "0 0 3px hsl(var(--accent))"
                   }}>
                  {feature.description}
                </p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
