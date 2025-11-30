export const GradientBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Base gradient */}
      <div className="absolute inset-0 gradient-bg" />
      
      {/* Animated organic shapes */}
      <div 
        className="absolute top-0 left-0 w-[800px] h-[800px] rounded-full opacity-40 blur-3xl animate-float"
        style={{
          background: 'radial-gradient(circle, hsl(var(--gradient-mid-1)) 0%, transparent 70%)',
          transform: 'translate(-30%, -30%)',
        }}
      />
      
      <div 
        className="absolute bottom-0 right-0 w-[1000px] h-[1000px] rounded-full opacity-50 blur-3xl animate-float-reverse"
        style={{
          background: 'radial-gradient(circle, hsl(var(--gradient-mid-2)) 0%, transparent 70%)',
          transform: 'translate(40%, 40%)',
          animationDelay: '5s',
        }}
      />
      
      <div 
        className="absolute top-1/2 left-1/2 w-[600px] h-[600px] rounded-full opacity-30 blur-3xl animate-float"
        style={{
          background: 'radial-gradient(circle, hsl(var(--gradient-end)) 0%, transparent 70%)',
          transform: 'translate(-50%, -50%)',
          animationDelay: '10s',
        }}
      />
      
      <div 
        className="absolute top-1/4 right-1/4 w-[700px] h-[700px] rounded-full opacity-35 blur-3xl animate-float-reverse"
        style={{
          background: 'radial-gradient(circle, hsl(var(--secondary)) 0%, transparent 70%)',
          animationDelay: '15s',
        }}
      />
    </div>
  );
};
