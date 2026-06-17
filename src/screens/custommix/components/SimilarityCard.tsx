import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/common/ThemedText';
import { Colors } from '@/utils/colors';

interface SimilarityCardProps {
  score: number;
  targetName: string;
  description: string;
}

export function SimilarityCard({ score, targetName, description }: SimilarityCardProps) {
  return (
    <View style={styles.card}>
      <ThemedText style={styles.label}>TASTE MATCH</ThemedText>
      <View style={styles.row}>
        <ThemedText style={styles.score}>{score}%</ThemedText>
        <View style={styles.descContainer}>
          <ThemedText style={styles.targetName}>{targetName}</ThemedText>
          <ThemedText style={styles.description}>{description}</ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: Colors.dark.bg,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent.neonPurple,
    marginTop: 20,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.dark.text,
    opacity: 0.5,
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  score: { fontSize: 36, fontWeight: '900', color: Colors.dark.text },
  descContainer: { flex: 1 },
  targetName: { fontSize: 14, fontWeight: '700', color: Colors.accent.neonBlue, marginBottom: 2 },
  description: { fontSize: 13, color: Colors.dark.text, opacity: 0.65, lineHeight: 18 },
});
