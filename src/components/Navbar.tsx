import { useState } from "react";
import { Menu, X, Zap, Home, Info, Mail, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { name: "Home", icon: Home, href: "#hero" },
  { name: "Features", icon: Layers, href: "#features" },
  { name: "About", icon: Info, href: "#about" },
  { name: "Contact", icon: Mail, href: "#contact" },
];

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const targetId = href.replace("#", "");
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setIsOpen(false);
  };

  const scrollToFeatures = () => {
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/30 border-b border-primary/30">
      {/* Scanline effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent animate-glitch-scan" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a
            href="#"
            className="flex items-center gap-2 group"
          >
            <div className="relative">
              <Zap
                className="w-8 h-8 text-primary animate-neon-pulse"
                style={{
                  filter: "drop-shadow(0 0 10px hsl(var(--primary))) drop-shadow(0 0 20px hsl(var(--primary)))",
                }}
              />
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            </div>
            <span
              className="text-xl font-bold text-foreground tracking-wider animate-glitch-text"
              style={{
                textShadow: `
                  0 0 10px hsl(var(--primary)),
                  0 0 20px hsl(var(--primary)),
                  0 0 40px hsl(var(--primary) / 0.5)
                `,
              }}
            >
              CLOUD<span className="text-primary">SPACE</span>
            </span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            {navItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className="relative group px-4 py-2 rounded-lg transition-all duration-300 hover:bg-primary/10 border border-transparent hover:border-primary/50 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <item.icon
                    className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors"
                    style={{
                      filter: "drop-shadow(0 0 4px hsl(var(--primary) / 0.5))",
                    }}
                  />
                  <span
                    className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors tracking-wide"
                    style={{
                      textShadow: "0 0 10px hsl(var(--primary) / 0.3)",
                    }}
                  >
                    {item.name}
                  </span>
                </div>
                {/* Glow underline on hover */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent group-hover:w-full transition-all duration-300" />
              </a>
            ))}

            {/* CTA Button */}
            <Button
              onClick={scrollToFeatures}
              className="ml-4 relative overflow-hidden bg-primary/20 border border-primary/50 text-primary-foreground hover:bg-primary/30 hover:border-primary transition-all duration-300"
              style={{
                boxShadow: `
                  0 0 20px hsl(var(--primary) / 0.3),
                  inset 0 0 20px hsl(var(--primary) / 0.1)
                `,
              }}
            >
              <span className="relative z-10 font-semibold tracking-wider">GET STARTED</span>
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/30 to-primary/0 animate-neon-pulse" />
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg border border-primary/30 bg-background/50 hover:bg-primary/10 hover:border-primary/50 transition-all"
            style={{
              boxShadow: "0 0 10px hsl(var(--primary) / 0.2)",
            }}
          >
            {isOpen ? (
              <X className="w-6 h-6 text-primary" />
            ) : (
              <Menu className="w-6 h-6 text-primary" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div
        className={`md:hidden transition-all duration-300 overflow-hidden ${
          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-4 py-4 space-y-2 bg-background/50 backdrop-blur-xl border-t border-primary/20">
          {navItems.map((item, index) => (
            <a
              key={item.name}
              href={item.href}
              onClick={(e) => handleNavClick(e, item.href)}
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-card/30 border border-primary/20 hover:border-primary/50 hover:bg-primary/10 transition-all cursor-pointer"
              style={{
                animationDelay: `${index * 100}ms`,
                boxShadow: "0 0 10px hsl(var(--primary) / 0.1)",
              }}
            >
              <item.icon
                className="w-5 h-5 text-primary"
                style={{
                  filter: "drop-shadow(0 0 4px hsl(var(--primary)))",
                }}
              />
              <span
                className="font-medium text-foreground tracking-wide"
                style={{
                  textShadow: "0 0 10px hsl(var(--primary) / 0.3)",
                }}
              >
                {item.name}
              </span>
            </a>
          ))}

          <Button
            onClick={scrollToFeatures}
            className="w-full mt-4 bg-primary/20 border border-primary/50 text-primary-foreground hover:bg-primary/30"
            style={{
              boxShadow: "0 0 20px hsl(var(--primary) / 0.3)",
            }}
          >
            <span className="font-semibold tracking-wider">GET STARTED</span>
          </Button>
        </div>
      </div>
    </nav>
  );
};
