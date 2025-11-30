export const GradientBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Base gradient */}
      <div className="absolute inset-0 gradient-bg" />
      
      {/* Cyber grid pattern */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--accent)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--accent)) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
        }}
      />
      
      {/* Animated scanlines */}
      <div 
        className="absolute inset-0 opacity-10 animate-pulse"
        style={{
          backgroundImage: 'linear-gradient(to bottom, transparent 50%, hsl(var(--accent)) 50%)',
          backgroundSize: '100% 4px',
          animationDuration: '3s',
        }}
      />
      
      {/* Neon glow orbs */}
      <div 
        className="absolute top-0 left-0 w-[800px] h-[800px] rounded-full opacity-60 blur-3xl animate-float"
        style={{
          background: 'radial-gradient(circle, hsl(var(--accent)) 0%, transparent 70%)',
          transform: 'translate(-30%, -30%)',
          filter: 'brightness(1.5)',
        }}
      />
      
      <div 
        className="absolute bottom-0 right-0 w-[1000px] h-[1000px] rounded-full opacity-70 blur-3xl animate-float-reverse"
        style={{
          background: 'radial-gradient(circle, hsl(var(--secondary)) 0%, transparent 70%)',
          transform: 'translate(40%, 40%)',
          animationDelay: '5s',
          filter: 'brightness(1.5)',
        }}
      />
      
      <div 
        className="absolute top-1/2 left-1/2 w-[600px] h-[600px] rounded-full opacity-50 blur-3xl animate-float"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)',
          transform: 'translate(-50%, -50%)',
          animationDelay: '10s',
          filter: 'brightness(1.8)',
        }}
      />
      
      <div 
        className="absolute top-1/4 right-1/4 w-[700px] h-[700px] rounded-full opacity-55 blur-3xl animate-float-reverse"
        style={{
          background: 'radial-gradient(circle, hsl(var(--gradient-mid-2)) 0%, transparent 70%)',
          animationDelay: '15s',
          filter: 'brightness(1.6)',
        }}
      />
      
      {/* Bright accent spots */}
      <div 
        className="absolute top-1/3 left-1/3 w-[400px] h-[400px] rounded-full opacity-40 blur-2xl animate-pulse"
        style={{
          background: 'radial-gradient(circle, hsl(var(--accent)) 0%, transparent 60%)',
          animationDuration: '4s',
          filter: 'brightness(2)',
        }}
      />
    </div>
  );
};
