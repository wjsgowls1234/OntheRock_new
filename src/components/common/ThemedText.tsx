import React from 'react';
import { Text, TextProps } from 'react-native';
import { Colors } from '@/utils/colors';

interface ThemedTextProps extends TextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'subtitle' | 'body' | 'caption';
}

export function ThemedText({
  variant = 'body',
  style,
  ...props
}: ThemedTextProps) {
  return <Text {...props} style={[{ color: Colors.dark.text }, style]} />;
}