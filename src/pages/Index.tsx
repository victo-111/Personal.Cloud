import { GradientBackground } from "@/components/GradientBackground";
import { WelcomeCard } from "@/components/WelcomeCard";

const Index = () => {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-4">
      <GradientBackground />
      <div className="relative z-10">
        <WelcomeCard />
      </div>
    </div>
  );
};

export default Index;
