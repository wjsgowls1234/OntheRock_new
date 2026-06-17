// src/utils/colors.ts
export const Colors = {
    // Base palette
    dark: {
      bg: '#0a0e27',        // Deep midnight blue
      surface: '#1a1f3a',   // Elevated surface
      border: '#2d3555',    // Subtle borders
      text: '#e8e9f3',      // Off-white text
    },
    accent: {
      neonBlue: '#00d9ff',
      neonPurple: '#bd00ff',
      amberGold: '#ffa500',
    },
    semantic: {
      success: '#4ade80',
      error: '#ff6b6b',
      warning: '#fbbf24',
    },
  } as const;
  
  export const GradientColors = {
    shelf: ['#0f1428', '#151d3a', '#0f1428'],
    bottleGlow: {
      whiskey: ['#8b4513', '#d4a574'],
      vodka: ['#3a5f8f', '#87ceeb'],
      rum: ['#4a2511', '#a0522d'],
    },
  } as const;