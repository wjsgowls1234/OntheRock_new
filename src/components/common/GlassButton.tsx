import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Text,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/utils/colors';

interface GlassButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  style?: ViewStyle;
}

export function GlassButton({
  title,
  onPress,
  variant = 'primary',
  style,
}: GlassButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.button, style]}
    >
      {isPrimary ? (
        <LinearGradient
          colors={[Colors.accent.neonBlue, Colors.accent.neonPurple]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          <Text style={styles.text}>{title}</Text>
        </LinearGradient>
      ) : (
        <Text style={[styles.text, { color: Colors.accent.neonBlue }]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    overflow: 'hidden',
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: Colors.dark.bg,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});