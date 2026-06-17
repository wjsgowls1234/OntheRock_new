import React from 'react';
import { SafeAreaView, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/utils/colors';

interface SafeAreaWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function SafeAreaWrapper({ children, style }: SafeAreaWrapperProps) {
  return (
    <SafeAreaView style={[styles.container, style]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.bg,
  },
});
