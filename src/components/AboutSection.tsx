import { Card } from "@/components/ui/card";
import { Users, Award, Clock, TrendingUp } from "lucide-react";

const stats = [
  { icon: Users, value: "10M+", label: "Active Users" },
  { icon: Award, value: "99.9%", label: "Uptime" },
  { icon: Clock, value: "24/7", label: "Support" },
  { icon: TrendingUp, value: "150+", label: "Countries" },
];

export const AboutSection = () => {
  return (
    <section id="about" className="relative z-10 py-24 px-4 scroll-mt-20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 
            className="text-4xl md:text-5xl font-bold text-foreground mb-6 animate-glitch-text"
            style={{ 
              textShadow: "0 0 10px hsl(var(--primary)), 0 0 20px hsl(var(--primary))"
            }}
          >
            About CloudSpace
          </h2>
          <p 
            className="text-lg text-muted-foreground max-w-3xl mx-auto"
            style={{ textShadow: "0 0 5px hsl(var(--accent))" }}
          >
            We're building the future of cloud computing. A platform where your data is secure, 
            accessible, and always under your control.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card 
                key={index}
                className="p-6 bg-card/80 backdrop-blur-sm border border-primary/30 hover:border-primary/60 transition-all duration-300 hover:scale-105 text-center group"
              >
                <Icon 
                  className="w-8 h-8 mx-auto mb-3 text-primary"
                  style={{ filter: "drop-shadow(0 0 8px hsl(var(--primary)))" }}
                />
                <div 
                  className="text-3xl font-bold text-foreground mb-1"
                  style={{ textShadow: "0 0 10px hsl(var(--primary))" }}
                >
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </Card>
            );
          })}
        </div>

        {/* Mission Card */}
        <Card className="p-8 md:p-12 bg-card/80 backdrop-blur-sm border border-primary/30">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 
                className="text-2xl font-bold text-foreground mb-4"
                style={{ textShadow: "0 0 8px hsl(var(--primary))" }}
              >
                Our Mission
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                CloudSpace was founded with a simple mission: to give everyone access to powerful 
                cloud computing without compromising on privacy or security.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                We believe your data should belong to you. That's why we've built a platform with 
                end-to-end encryption, zero-knowledge architecture, and complete transparency.
              </p>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 blur-3xl rounded-full" />
              <div className="relative grid grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div 
                    key={i}
                    className="h-24 rounded-lg bg-primary/10 border border-primary/30 animate-neon-pulse"
                    style={{ animationDelay: `${i * 0.5}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
};
