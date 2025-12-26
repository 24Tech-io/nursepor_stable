import Image from 'next/image';

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
      {/* Red Spotlight Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(227,28,37,0.1),_transparent_60%)]" />
      
      {/* Logo with Heartbeat Animation */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="animate-heartbeat">
          <Image 
            src="/logo.png" 
            alt="Nurse Pro Academy" 
            width={120} 
            height={120}
            loading="lazy"
            fetchPriority="low"
            unoptimized
            className="drop-shadow-[0_0_30px_rgba(227,28,37,0.5)]"
          />
        </div>
        
        {/* Pulsing Ring */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-32 h-32 rounded-full border-2 border-nurse-red-500/30 animate-ping" />
        </div>
        
        {/* Loading Text */}
        <div className="mt-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">
            Nurse Pro <span className="text-nurse-red-500">Academy</span>
          </h2>
          <p className="text-nurse-silver-400 text-sm">Loading your experience...</p>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-6 w-48 h-1 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-nurse-red-600 to-red-500 rounded-full animate-pulse" 
               style={{ width: '60%' }} />
        </div>
      </div>
    </div>
  );
}










