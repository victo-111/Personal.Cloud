import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Send, Mail, MapPin, Phone } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export const ContactSection = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      return toast({ title: 'Missing fields', description: 'Please fill in all fields.' });
    }
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Failed to send message');
      }

      setName('');
      setEmail('');
      setMessage('');
      toast({ title: 'Message sent!', description: "We'll get back to you as soon as possible!." });
    } catch (err: any) {
      console.error('Contact send failed', err);
      toast({ title: 'Send failed', description: err?.message || 'Could not send message' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="relative z-10 py-24 px-4 scroll-mt-20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 
            className="text-4xl md:text-5xl font-bold text-foreground mb-6 animate-glitch-text"
            style={{ 
              textShadow: "0 0 10px hsl(var(--primary)), 0 0 20px hsl(var(--primary))"
            }}
          >
            Get In Touch
          </h2>
          <p 
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
            style={{ textShadow: "0 0 5px hsl(var(--accent))" }}
          >
            Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Contact Form */}
          <Card className="p-8 bg-card/80 backdrop-blur-sm border border-primary/30">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Name</label>
                <Input 
                  placeholder="Your name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-background/50 border-primary/30 focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email</label>
                <Input 
                  type="email" 
                  placeholder="your@email.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-background/50 border-primary/30 focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Message</label>
                <Textarea 
                  placeholder="Your message..." 
                  rows={7}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="bg-background/50 border-primary/30 focus:border-primary resize-none"
                />
              </div>
              <Button 
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/50"
                style={{ boxShadow: "0 0 20px hsl(var(--primary) / 0.4)" }}
              >
                {isSubmitting ? (
                  "Sending..."
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </form>
          </Card>

          {/* Contact Info */}
          <div className="space-y-6">
            {[
              { icon: Mail, title: "Email", content: "bobclein1@gmail.com" },
              { icon: Phone, title: "Phone", content: "+221 76 388 5505 " },
              { icon: MapPin, title: "Location", content: "Senegal - Dakar" },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <Card 
                  key={index}
                  className="p-6 bg-card/80 backdrop-blur-sm border border-primary/30 hover:border-primary/60 transition-all duration-300 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full animate-neon-pulse" />
                      <div className="relative w-12 h-12 bg-primary/20 border border-primary/50 rounded-lg flex items-center justify-center">
                        <Icon 
                          className="w-6 h-6 text-primary"
                          style={{ filter: "drop-shadow(0 0 6px hsl(var(--primary)))" }}
                        />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{item.title}</h4>
                      <p className="text-muted-foreground">{item.content}</p>
                    </div>
                  </div>
                </Card>
              );
            })}

            {/* Map placeholder */}
            <Card className="p-4 bg-card/80 backdrop-blur-sm border border-primary/30 h-48 flex items-center justify-center">
              <div className="text-center">
                <MapPin 
                  className="w-12 h-12 mx-auto mb-2 text-primary/50"
                  style={{ filter: "drop-shadow(0 0 10px hsl(var(--primary)))" }}
                />
                <p className="text-muted-foreground text-sm">Interactive map coming soon!!</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};
