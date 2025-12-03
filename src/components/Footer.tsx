import { Zap, Github, Twitter, Linkedin } from "lucide-react";

const footerLinks = {
  Product: ["Features", "Pricing", "Security", "Enterprise"],
  Company: ["About", "Blog", "Careers", "Press"],
  Resources: ["Documentation", "API", "Community", "Support"],
  Legal: ["Privacy", "Terms", "Cookies", "Licenses"],
};

const socialLinks = [
  { icon: Github, href: "#" },
  { icon: Twitter, href: "#" },
  { icon: Linkedin, href: "#" },
];

export const Footer = () => {
  return (
    <footer className="relative z-10 border-t border-primary/30 bg-background/50 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <a href="#" className="flex items-center gap-2 mb-4">
              <Zap 
                className="w-6 h-6 text-primary"
                style={{ filter: "drop-shadow(0 0 8px hsl(var(--primary)))" }}
              />
              <span 
                className="font-bold text-lg text-foreground"
                style={{ textShadow: "0 0 10px hsl(var(--primary))" }}
              >
                CLOUD<span className="text-primary">SPACE</span>
              </span>
            </a>
            <p className="text-sm text-muted-foreground mb-4">
              The future of cloud computing is here.
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social, index) => {
                const Icon = social.icon;
                return (
                  <a
                    key={index}
                    href={social.href}
                    className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center hover:bg-primary/20 hover:border-primary/50 transition-all"
                  >
                    <Icon className="w-4 h-4 text-primary" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 
                className="font-semibold text-foreground mb-4"
                style={{ textShadow: "0 0 5px hsl(var(--primary) / 0.5)" }}
              >
                {title}
              </h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-primary/20 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2024 CloudSpace. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground/70">
            Built with 💜 for the future
          </p>
        </div>
      </div>
    </footer>
  );
};
