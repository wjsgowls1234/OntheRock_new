import React from 'react';
import { View } from 'react-native';
import Svg, { Polygon, Line, Text as SvgText, Circle } from 'react-native-svg';
import { TasteProfile } from '@/types/taste';
import { Colors } from '@/utils/colors';

interface FlavorRadarProps {
  profile: TasteProfile;
  size?: number;
}

const ATTRIBUTES: (keyof TasteProfile)[] = ['sweetness', 'sourness', 'bitterness', 'body', 'aroma'];
const LABELS = ['Sweet', 'Sour', 'Bitter', 'Body', 'Aroma'];
const MAX_VAL = 100;

function getCoords(value: number, index: number, radius: number, center: number) {
  const angle = (Math.PI * 2 * index) / ATTRIBUTES.length - Math.PI / 2;
  const r = (value / MAX_VAL) * radius;
  return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
}

export function FlavorRadar({ profile, size = 220 }: FlavorRadarProps) {
  const center = size / 2;
  const radius = center - 32;

  const polygonPoints = ATTRIBUTES.map((attr, i) => {
    const { x, y } = getCoords(profile[attr], i, radius, center);
    return `${x},${y}`;
  }).join(' ');

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        {[25, 50, 75, 100].map((level) => (
          <Polygon
            key={level}
            points={ATTRIBUTES.map((_, i) => {
              const { x, y } = getCoords(level, i, radius, center);
              return `${x},${y}`;
            }).join(' ')}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
            fill="none"
          />
        ))}
        {ATTRIBUTES.map((_, i) => {
          const { x, y } = getCoords(MAX_VAL, i, radius, center);
          return (
            <Line key={i} x1={center} y1={center} x2={x} y2={y} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          );
        })}
        {ATTRIBUTES.map((_, i) => {
          const { x, y } = getCoords(MAX_VAL + 18, i, radius, center);
          return (
            <SvgText key={`lbl-${i}`} x={x} y={y} fill={Colors.dark.text} fontSize="11" textAnchor="middle" alignmentBaseline="middle" opacity={0.6}>
              {LABELS[i]}
            </SvgText>
          );
        })}
        <Polygon
          points={polygonPoints}
          fill={`${Colors.accent.neonBlue}30`}
          stroke={Colors.accent.neonBlue}
          strokeWidth="2"
        />
        {ATTRIBUTES.map((attr, i) => {
          const { x, y } = getCoords(profile[attr], i, radius, center);
          return <Circle key={`pt-${i}`} cx={x} cy={y} r="4" fill={Colors.dark.text} />;
        })}
      </Svg>
    </View>
  );
}
