export default function ArteryHeroGraphic({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <svg
        viewBox="0 0 880 520"
        fill="none"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="vesselFill" x1="0" y1="0" x2="880" y2="520" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#8B1A3A" />
            <stop offset="55%" stopColor="#C9425B" />
            <stop offset="100%" stopColor="#F9A8D4" />
          </linearGradient>
          <linearGradient id="plaqueGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
          <radialGradient id="bloodGradient" cx="50%" cy="40%" r="80%">
            <stop offset="0%" stopColor="#FEE2E2" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#7F1D1D" stopOpacity="0.2" />
          </radialGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="880" height="520" rx="48" fill="#111827" />
        <path
          d="M80 120C120 84 243 44 392 80C552 120 568 160 648 204C740 255 740 340 680 390C620 440 540 460 450 468C330 478 140 420 80 320C20 220 40 160 80 120Z"
          fill="url(#bloodGradient)"
          stroke="#FECACA"
          strokeWidth="10"
        />
        <path
          d="M88 138C126 104 242 74 388 104C538 138 564 180 642 226C736 278 736 344 678 388C620 432 538 452 454 462C338 474 142 418 88 326C34 234 42 168 88 138Z"
          fill="url(#vesselFill)"
          opacity="0.96"
        />
        <g filter="url(#glow)">
          {[
            { cx: 180, cy: 220, r: 18 },
            { cx: 260, cy: 170, r: 14 },
            { cx: 340, cy: 240, r: 20 },
            { cx: 420, cy: 190, r: 16 },
            { cx: 500, cy: 285, r: 18 },
            { cx: 590, cy: 235, r: 14 },
            { cx: 660, cy: 320, r: 22 },
            { cx: 520, cy: 360, r: 16 },
            { cx: 220, cy: 330, r: 12 },
            { cx: 130, cy: 280, r: 10 },
          ].map((dot, index) => (
            <circle
              key={index}
              cx={dot.cx}
              cy={dot.cy}
              r={dot.r}
              fill="url(#plaqueGlow)"
              opacity="0.92"
            />
          ))}
        </g>
        <path
          d="M92 162L120 150 148 160 176 148 204 156 232 148 260 162 288 154 316 168 344 158 372 168 400 160 428 174 456 166 484 178 512 170 540 182 568 174 596 188 624 180 652 196 680 188 708 198 736 190"
          stroke="#FDE68A"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.5"
        />
        <path
          d="M140 280C184 250 235 252 300 278C350 298 385 318 454 322C520 326 565 295 602 268"
          stroke="#FECACA"
          strokeWidth="8"
          strokeLinecap="round"
          opacity="0.35"
        />
      </svg>
    </div>
  );
}
