import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/common/ThemedText';
import { Colors } from '@/utils/colors';
import { useArchiveStore } from '@/stores/archiveStore';

export default function ArchiveScreen() {
  const { entries } = useArchiveStore();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <ThemedText style={styles.title}>Archive</ThemedText>
        <ThemedText style={styles.subtitle}>{entries.length} saved entries</ThemedText>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {entries.length === 0 ? (
          <View style={styles.empty}>
            <ThemedText style={styles.emptyTitle}>No entries yet</ThemedText>
            <ThemedText style={styles.emptyBody}>
              Mix ingredients in Custom Mix and save your recipes here.
            </ThemedText>
          </View>
        ) : (
          entries.map((entry) => (
            <View key={entry.id} style={styles.card}>
              <ThemedText style={styles.cardName}>{entry.name}</ThemedText>
              <ThemedText style={styles.cardRating}>{'★'.repeat(entry.rating)}</ThemedText>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  headerBar: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.dark.text },
  subtitle: { fontSize: 14, color: Colors.dark.text, opacity: 0.5, marginTop: 4 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  empty: { marginTop: 60, alignItems: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.dark.text, marginBottom: 10 },
  emptyBody: { fontSize: 14, color: Colors.dark.text, opacity: 0.5, textAlign: 'center', lineHeight: 20 },
  card: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardName: { fontSize: 15, fontWeight: '600', color: Colors.dark.text },
  cardRating: { fontSize: 14, color: Colors.accent.amberGold },
});
