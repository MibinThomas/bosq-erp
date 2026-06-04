import React from "react"
import { Svg, Defs, LinearGradient, Stop, ClipPath, Polygon, G, Path, Rect, Circle, Line } from "@react-pdf/renderer"

export const FloorplanWatermarkPdf = () => (
  <Svg
    viewBox="0 0 400 400"
    style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      width: 250,
      height: 250,
      opacity: 0.08,
      zIndex: -1,
    }}
  >
    <Defs>
      <LinearGradient id="watermark-fade" x1="0" y1="1" x2="1" y2="0">
        <Stop offset="0" stopColor="#383E42" stopOpacity={1} />
        <Stop offset="0.25" stopColor="#383E42" stopOpacity={0.8} />
        <Stop offset="0.6" stopColor="#383E42" stopOpacity={0} />
      </LinearGradient>
      <ClipPath id="watermark-triangle">
        <Polygon points="0,400 400,400 0,0" />
      </ClipPath>
    </Defs>
    
    <G clipPath="url(#watermark-triangle)" stroke="url(#watermark-fade)" fill="none">
      <Path d="M 20,400 L 20,20 L 380,20" strokeWidth={3} />
      <Path d="M 20,180 L 160,180 L 160,20" strokeWidth={2} />
      <Path d="M 160,100 L 250,100" strokeWidth={2} />
      <Path d="M 20,280 L 120,280 L 120,400" strokeWidth={2} />
      
      <Path d="M 160,180 L 280,180" strokeWidth={0.5} strokeDasharray="4,2" />
      <Path d="M 160,184 L 280,184" strokeWidth={0.5} strokeDasharray="4,2" />

      <Rect x="190" y="40" width="140" height="40" rx={4} strokeWidth={1} />
      <Circle cx="210" cy="30" r="6" strokeWidth={0.8} />
      <Circle cx="240" cy="30" r="6" strokeWidth={0.8} />
      <Circle cx="270" cy="30" r="6" strokeWidth={0.8} />
      <Circle cx="300" cy="30" r="6" strokeWidth={0.8} />
      <Circle cx="210" cy="90" r="6" strokeWidth={0.8} />
      <Circle cx="240" cy="90" r="6" strokeWidth={0.8} />
      <Circle cx="270" cy="90" r="6" strokeWidth={0.8} />
      <Circle cx="300" cy="90" r="6" strokeWidth={0.8} />
      <Circle cx="175" cy="60" r="6" strokeWidth={0.8} />
      <Circle cx="345" cy="60" r="6" strokeWidth={0.8} />

      <Path d="M 40,40 L 120,40 L 120,70 L 70,70 L 70,120 L 40,120 Z" strokeWidth={1} />
      <Circle cx="85" cy="85" r="7" strokeWidth={0.8} />
      <Rect x="40" y="140" width="80" height="20" strokeWidth={1} />
      
      <Rect x="180" y="220" width="150" height="80" strokeWidth={1} />
      <Line x1="180" y1="260" x2="330" y2="260" strokeWidth={1} />
      <Line x1="230" y1="220" x2="230" y2="300" strokeWidth={1} />
      <Line x1="280" y1="220" x2="280" y2="300" strokeWidth={1} />
      
      <Path d="M 195,205 A 10,10 0 0,0 215,205 Z" strokeWidth={0.8} />
      <Path d="M 245,205 A 10,10 0 0,0 265,205 Z" strokeWidth={0.8} />
      <Path d="M 295,205 A 10,10 0 0,0 315,205 Z" strokeWidth={0.8} />
      <Path d="M 195,315 A 10,10 0 0,1 215,315 Z" strokeWidth={0.8} />
      <Path d="M 245,315 A 10,10 0 0,1 265,315 Z" strokeWidth={0.8} />
      <Path d="M 295,315 A 10,10 0 0,1 315,315 Z" strokeWidth={0.8} />
      
      <Path d="M 40,300 C 60,300 80,320 80,340 C 80,360 60,380 40,380 Z" strokeWidth={1} />
      <Rect x="140" y="320" width="60" height="20" rx={3} strokeWidth={1} />
      <Rect x="140" y="360" width="60" height="20" rx={3} strokeWidth={1} />
      <Circle cx="110" cy="350" r="15" strokeWidth={1} />

      <Circle cx="360" cy="360" r="12" strokeWidth={0.5} strokeDasharray="2,2" />
      <Circle cx="360" cy="360" r="8" strokeWidth={0.5} />
      <Circle cx="140" cy="40" r="12" strokeWidth={0.5} strokeDasharray="2,2" />
      <Circle cx="140" cy="40" r="8" strokeWidth={0.5} />

      <Path d="M 200,120 L 220,120 A 10,10 0 0,1 220,140 L 200,140 Z" strokeWidth={0.3} strokeDasharray="1,2" />
      <Path d="M 200,140 L 225,140 A 12,12 0 0,1 225,164 L 200,164 Z" strokeWidth={0.3} strokeDasharray="1,2" />

    </G>
  </Svg>
)
