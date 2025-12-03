import { GradientBackground } from "@/components/GradientBackground";
import { WelcomeCard } from "@/components/WelcomeCard";
import { Features } from "@/components/Features";
import { Navbar } from "@/components/Navbar";
import { AboutSection } from "@/components/AboutSection";
import { ContactSection } from "@/components/ContactSection";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="relative min-h-screen scroll-smooth">
      <GradientBackground />
      <Navbar />
      
      {/* Hero Section */}
      <section id="hero" className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4 pt-24">
        <WelcomeCard />
      </section>
      
      {/* Features Section */}
      <Features />
      
      {/* About Section */}
      <AboutSection />
      
      {/* Contact Section */}
      <ContactSection />
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Index;
