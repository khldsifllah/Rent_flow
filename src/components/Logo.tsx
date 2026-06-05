export default function Logo({ className = '', width = 200, height = 200 }: { className?: string, width?: number | string, height?: number | string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 200 200" 
      width={width} 
      height={height} 
      className={className}
    >
      <defs>
        <linearGradient id="mainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id="accentGrad" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#818CF8" />
        </linearGradient>
        <linearGradient id="takaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#34D399" />
        </linearGradient>
        <filter id="softShadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodOpacity="0.2" floodColor="#000000" />
        </filter>
        <filter id="bgBlur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="15" />
        </filter>
      </defs>

      {/* Main Base Shape */}
      <rect width="200" height="200" rx="52" fill="url(#mainGrad)" />
      
      {/* Ethereal Glow */}
      <circle cx="100" cy="100" r="75" fill="url(#accentGrad)" opacity="0.3" filter="url(#bgBlur)" />

      {/* Buildings Group */}
      <g transform="translate(10, 8)" filter="url(#softShadow)">
        {/* Left Building (Smaller) */}
        <rect x="42" y="80" width="44" height="75" rx="10" fill="white" opacity="0.95" />
        
        {/* Left Windows */}
        <rect x="54" y="96" width="18" height="15" rx="4" fill="url(#mainGrad)" opacity="0.65" />
        <rect x="54" y="122" width="18" height="15" rx="4" fill="url(#mainGrad)" opacity="0.65" />
        
        {/* Right Building (Taller) */}
        <rect x="94" y="45" width="56" height="110" rx="12" fill="white" />
        
        {/* Right Windows */}
        <rect x="112" y="64" width="20" height="16" rx="5" fill="url(#mainGrad)" opacity="0.8" />
        <rect x="112" y="92" width="20" height="16" rx="5" fill="url(#mainGrad)" opacity="0.8" />
        
        {/* Right Door */}
        <path d="M112 155 V 128 C 112 121, 117 116, 122 116 H 122 C 127 116, 132 121, 132 128 V 155 Z" fill="url(#mainGrad)" opacity="0.9" />
      </g>

      {/* Rent Flow Abstract Element */}
      <path d="M40 170 C 80 145, 120 195, 160 170" stroke="url(#accentGrad)" strokeWidth="12" strokeLinecap="round" fill="none" filter="url(#softShadow)" />

      {/* Currency / Taka Badge */}
      <circle cx="160" cy="45" r="28" fill="white" filter="url(#softShadow)" />
      <circle cx="160" cy="45" r="24" fill="url(#takaGrad)" />
      <text x="160.5" y="56" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" fontSize="28" fontWeight="800" fill="white" textAnchor="middle">৳</text>
    </svg>
  );
}
