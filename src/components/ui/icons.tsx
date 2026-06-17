import React from 'react';
import { View, Text } from 'react-native';

interface IconProps {
  name: 'home' | 'bar' | 'mix' | 'archive' | 'close' | 'add';
  color?: string;
  size?: number;
}

const ICON_CHARS: Record<IconProps['name'], string> = {
  home: '⌂',
  bar: '🍶',
  mix: '⚗',
  archive: '📁',
  close: '✕',
  add: '+',
};

export function Icon({ name, color = '#fff', size = 20 }: IconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color, fontSize: size * 0.8, lineHeight: size }}>{ICON_CHARS[name]}</Text>
    </View>
  );
}
