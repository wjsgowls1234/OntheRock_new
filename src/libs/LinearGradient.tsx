import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Rect } from 'react-native-svg';

interface LinearGradientProps {
  colors: readonly string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
}

export function LinearGradient({
  colors,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 0 },
  style,
  children,
}: LinearGradientProps) {
  const count = Math.max(colors.length - 1, 1);
  return (
    <View style={[{ overflow: 'hidden' }, style]}>
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgGradient
            id="lg"
            x1={`${start.x * 100}%`}
            y1={`${start.y * 100}%`}
            x2={`${end.x * 100}%`}
            y2={`${end.y * 100}%`}
          >
            {colors.map((color, i) => (
              <Stop key={i} offset={`${(i / count) * 100}%`} stopColor={color} />
            ))}
          </SvgGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#lg)" />
      </Svg>
      {children}
    </View>
  );
}
