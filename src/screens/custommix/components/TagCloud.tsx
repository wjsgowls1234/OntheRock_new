import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/common/ThemedText';
import { Colors } from '@/utils/colors';

interface TagCloudProps {
  tags: string[];
}

export function TagCloud({ tags }: TagCloudProps) {
  return (
    <View style={styles.container}>
      {tags.map((tag, i) => (
        <View key={i} style={styles.tag}>
          <ThemedText style={styles.tagText}>{tag}</ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 16 },
  tag: {
    backgroundColor: `${Colors.accent.amberGold}18`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${Colors.accent.amberGold}40`,
  },
  tagText: { color: Colors.accent.amberGold, fontSize: 13, fontWeight: '600' },
});
