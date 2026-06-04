import React from "react"

export function FloorplanWatermark() {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 400 400" 
      className="absolute bottom-0 left-0 w-[400px] h-[400px] pointer-events-none z-0"
      style={{ opacity: 0.08 }} // Very subtle opacity 8%
    >
      <defs>
        {/* Diagonal fade gradient */}
        <linearGradient id="watermark-fade" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#383E42" stopOpacity="1" />
          <stop offset="25%" stopColor="#383E42" stopOpacity="0.8" />
          <stop offset="60%" stopColor="#383E42" stopOpacity="0" />
        </linearGradient>
        {/* Triangular clipping path to keep it in the bottom left */}
        <clipPath id="watermark-triangle">
          <polygon points="0,400 400,400 0,0" />
        </clipPath>
      </defs>
      
      <g clipPath="url(#watermark-triangle)" stroke="url(#watermark-fade)" fill="none">
        
        {/* Structural Walls */}
        <path d="M 20,400 L 20,20 L 380,20" strokeWidth="3" />
        <path d="M 20,180 L 160,180 L 160,20" strokeWidth="2" />
        <path d="M 160,100 L 250,100" strokeWidth="2" />
        <path d="M 20,280 L 120,280 L 120,400" strokeWidth="2" />
        
        {/* Glass Partitions (Double lines) */}
        <path d="M 160,180 L 280,180" strokeWidth="0.5" strokeDasharray="4,2" />
        <path d="M 160,184 L 280,184" strokeWidth="0.5" strokeDasharray="4,2" />

        {/* --- Meeting Room (Top Right) --- */}
        <rect x="190" y="40" width="140" height="40" rx="4" strokeWidth="1" />
        {/* Chairs around meeting table */}
        <circle cx="210" cy="30" r="6" strokeWidth="0.8" />
        <circle cx="240" cy="30" r="6" strokeWidth="0.8" />
        <circle cx="270" cy="30" r="6" strokeWidth="0.8" />
        <circle cx="300" cy="30" r="6" strokeWidth="0.8" />
        <circle cx="210" cy="90" r="6" strokeWidth="0.8" />
        <circle cx="240" cy="90" r="6" strokeWidth="0.8" />
        <circle cx="270" cy="90" r="6" strokeWidth="0.8" />
        <circle cx="300" cy="90" r="6" strokeWidth="0.8" />
        <circle cx="175" cy="60" r="6" strokeWidth="0.8" />
        <circle cx="345" cy="60" r="6" strokeWidth="0.8" />

        {/* --- Executive Office (Top Left) --- */}
        {/* L-Shape Desk */}
        <path d="M 40,40 L 120,40 L 120,70 L 70,70 L 70,120 L 40,120 Z" strokeWidth="1" />
        <circle cx="85" cy="85" r="7" strokeWidth="0.8" />
        {/* Storage unit */}
        <rect x="40" y="140" width="80" height="20" strokeWidth="1" />
        
        {/* --- Workstation Cluster (Center) --- */}
        {/* 6-Person Bench Desk */}
        <rect x="180" y="220" width="150" height="80" strokeWidth="1" />
        <line x1="180" y1="260" x2="330" y2="260" strokeWidth="1" />
        <line x1="230" y1="220" x2="230" y2="300" strokeWidth="1" />
        <line x1="280" y1="220" x2="280" y2="300" strokeWidth="1" />
        {/* Desk Chairs */}
        <path d="M 195,205 A 10,10 0 0,0 215,205 Z" strokeWidth="0.8" />
        <path d="M 245,205 A 10,10 0 0,0 265,205 Z" strokeWidth="0.8" />
        <path d="M 295,205 A 10,10 0 0,0 315,205 Z" strokeWidth="0.8" />
        <path d="M 195,315 A 10,10 0 0,1 215,315 Z" strokeWidth="0.8" />
        <path d="M 245,315 A 10,10 0 0,1 265,315 Z" strokeWidth="0.8" />
        <path d="M 295,315 A 10,10 0 0,1 315,315 Z" strokeWidth="0.8" />
        
        {/* --- Reception / Lounge (Bottom Left) --- */}
        <path d="M 40,300 C 60,300 80,320 80,340 C 80,360 60,380 40,380 Z" strokeWidth="1" />
        {/* Sofas */}
        <rect x="140" y="320" width="60" height="20" rx="3" strokeWidth="1" />
        <rect x="140" y="360" width="60" height="20" rx="3" strokeWidth="1" />
        <circle cx="110" cy="350" r="15" strokeWidth="1" />

        {/* --- Plants & Decor --- */}
        <circle cx="360" cy="360" r="12" strokeWidth="0.5" strokeDasharray="2,2" />
        <circle cx="360" cy="360" r="8" strokeWidth="0.5" />
        <circle cx="140" cy="40" r="12" strokeWidth="0.5" strokeDasharray="2,2" />
        <circle cx="140" cy="40" r="8" strokeWidth="0.5" />

        {/* --- Subtle BOSQ hidden "B" in the circulation path floor tile design --- */}
        <path d="M 200,120 L 220,120 A 10,10 0 0,1 220,140 L 200,140 Z" strokeWidth="0.3" strokeDasharray="1,2" />
        <path d="M 200,140 L 225,140 A 12,12 0 0,1 225,164 L 200,164 Z" strokeWidth="0.3" strokeDasharray="1,2" />

      </g>
    </svg>
  )
}
