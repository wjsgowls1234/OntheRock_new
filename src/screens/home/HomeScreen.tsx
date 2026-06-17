import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/common/ThemedText';
import { Colors } from '@/utils/colors';
import { MOCK_INGREDIENTS } from '@/data/mockIngredients';
import { MOCK_COCKTAILS } from '@/data/mockCocktails';
import { Cocktail } from '@/types/cocktail';

function TodayRecommendCard({ cocktail }: { cocktail: Cocktail }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      style={styles.recCard}
      onPress={() => setExpanded((prev) => !prev)}
      activeOpacity={0.85}
    >
      <ThemedText style={styles.recLabel}>오늘의 추천 칵테일</ThemedText>
      <ThemedText style={styles.recName}>{cocktail.name}</ThemedText>

      {expanded && (
        <View style={styles.recDetail}>
          <View style={styles.recDivider} />

          <ThemedText style={styles.recSectionLabel}>Ingredients</ThemedText>
          {cocktail.ingredients.map((ci, i) => (
            <View key={i} style={styles.recIngredientLine}>
              <ThemedText style={styles.recIngredientName}>
                {ci.ingredient.name}
              </ThemedText>
              <ThemedText style={styles.recIngredientMeasure}>{ci.measure}</ThemedText>
            </View>
          ))}

          <ThemedText style={[styles.recSectionLabel, { marginTop: 16 }]}>
            Flavor Profile
          </ThemedText>
          <View style={styles.recProfileRow}>
            {(Object.entries(cocktail.tasterProfile) as [string, number][]).map(
              ([key, val]) => (
                <View key={key} style={styles.recProfileItem}>
                  <ThemedText style={styles.recProfileValue}>{val}</ThemedText>
                  <ThemedText style={styles.recProfileKey}>
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </ThemedText>
                </View>
              )
            )}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const todayCocktail = MOCK_COCKTAILS[0];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ThemedText style={styles.title}>On The Rock</ThemedText>
          <ThemedText style={styles.subtitle}>
            AI-powered cocktail lifestyle platform
          </ThemedText>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <ThemedText style={styles.statNumber}>{MOCK_INGREDIENTS.length}</ThemedText>
            <ThemedText style={styles.statLabel}>In Bar</ThemedText>
          </View>
          <View style={styles.statCard}>
            <ThemedText style={styles.statNumber}>0</ThemedText>
            <ThemedText style={styles.statLabel}>Saved Mixes</ThemedText>
          </View>
          <View style={styles.statCard}>
            <ThemedText style={styles.statNumber}>82%</ThemedText>
            <ThemedText style={styles.statLabel}>Match Score</ThemedText>
          </View>
        </View>

        {todayCocktail && (
          <View style={styles.section}>
            <TodayRecommendCard cocktail={todayCocktail} />
          </View>
        )}

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>RECENT INGREDIENTS</ThemedText>
          {MOCK_INGREDIENTS.slice(0, 3).map((item) => (
            <View key={item.id} style={styles.ingredientRow}>
              <ThemedText style={styles.ingredientName}>{item.name}</ThemedText>
              <ThemedText style={styles.ingredientCategory}>{item.category}</ThemedText>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  content: { padding: 20, paddingBottom: 40 },

  header: { marginBottom: 32, marginTop: 8 },
  title: { fontSize: 32, fontWeight: '800', color: Colors.dark.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: Colors.dark.text, opacity: 0.55, marginTop: 6 },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  statCard: {
    flex: 1,
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  statNumber: { fontSize: 22, fontWeight: '800', color: Colors.accent.neonBlue },
  statLabel: { fontSize: 11, color: Colors.dark.text, opacity: 0.55, marginTop: 4 },

  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.dark.text,
    opacity: 0.5,
    letterSpacing: 1.2,
    marginBottom: 12,
  },

  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  ingredientName: { fontSize: 15, color: Colors.dark.text, fontWeight: '500' },
  ingredientCategory: {
    fontSize: 12,
    color: Colors.accent.neonBlue,
    textTransform: 'capitalize',
  },

  recCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  recLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.accent.neonBlue,
    letterSpacing: 0.8,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  recName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.dark.text,
    letterSpacing: -0.3,
  },

  recDetail: { marginTop: 4 },
  recDivider: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginVertical: 14,
  },
  recSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.dark.text,
    opacity: 0.45,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  recIngredientLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  recIngredientName: { fontSize: 14, color: Colors.dark.text, fontWeight: '500' },
  recIngredientMeasure: { fontSize: 12, color: Colors.dark.text, opacity: 0.5 },

  recProfileRow: { flexDirection: 'row', justifyContent: 'space-between' },
  recProfileItem: { alignItems: 'center', flex: 1 },
  recProfileValue: { fontSize: 16, fontWeight: '800', color: Colors.accent.neonBlue },
  recProfileKey: { fontSize: 10, color: Colors.dark.text, opacity: 0.45, marginTop: 3 },
});
