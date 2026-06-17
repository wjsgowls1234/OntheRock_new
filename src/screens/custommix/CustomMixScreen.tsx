import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/common/ThemedText';
import { FlavorRadar } from './components/FlavorRadar';
import { SimilarityCard } from './components/SimilarityCard';
import { TagCloud } from './components/TagCloud';
import { Colors } from '@/utils/colors';
import { MIX_INGREDIENTS, predictFlavorProfile, calculateSimilarity, generateTags } from '@/utils/ai-simulation';
import { MOCK_TASTE_PROFILES } from '@/data/mockTasteProfiles';

const MAX_SELECTION = 4;

export default function CustomMixScreen() {
  const [selected, setSelected] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof predictFlavorProfile> | null>(null);

  const toggle = (id: string) => {
    setResult(null);
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((i) => i !== id)
        : prev.length < MAX_SELECTION
          ? [...prev, id]
          : prev
    );
  };

  const handleAnalyze = () => {
    if (selected.length === 0) return;
    setAnalyzing(true);
    setResult(null);
    setTimeout(() => {
      setResult(predictFlavorProfile(selected));
      setAnalyzing(false);
    }, 1200);
  };

  const referenceProfile = MOCK_TASTE_PROFILES.smokyMargarita;
  const similarity = result ? calculateSimilarity(result, referenceProfile) : 0;
  const tags = result ? generateTags(result) : [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>Custom Mix</ThemedText>
          <ThemedText style={styles.subtitle}>재료를 선택하면 AI가 맛을 예측합니다.</ThemedText>
        </View>

        <ThemedText style={styles.sectionLabel}>재료 선택 (최대 {MAX_SELECTION}개)</ThemedText>
        <View style={styles.chips}>
          {MIX_INGREDIENTS.map((ing) => {
            const isSelected = selected.includes(ing.id);
            return (
              <TouchableOpacity
                key={ing.id}
                onPress={() => toggle(ing.id)}
                style={[styles.chip, isSelected && styles.chipSelected]}
              >
                <ThemedText style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {ing.name}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.analyzeBtn, selected.length === 0 && { opacity: 0.4 }]}
          onPress={handleAnalyze}
          disabled={selected.length === 0 || analyzing}
        >
          <ThemedText style={styles.analyzeBtnText}>
            {analyzing ? 'AI 분석 중...' : 'AI 맛 예측하기'}
          </ThemedText>
        </TouchableOpacity>

        {result && (
          <View style={styles.resultCard}>
            <View style={styles.aiBadge}>
              <ThemedText style={styles.aiBadgeText}>✦ AI PREDICTION</ThemedText>
            </View>
            <FlavorRadar profile={result} />
            <TagCloud tags={tags} />
            <SimilarityCard
              score={similarity}
              targetName="Smoky Margarita"
              description="지난 즐겨찾기와 유사한 풍미입니다."
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  content: { padding: 20, paddingBottom: 60 },
  header: { marginBottom: 28, marginTop: 4 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.dark.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: Colors.dark.text, opacity: 0.55, marginTop: 6 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.dark.text, opacity: 0.5,
    letterSpacing: 1.2, marginBottom: 12,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  chip: {
    backgroundColor: Colors.dark.surface, paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 20, borderWidth: 1, borderColor: Colors.dark.border,
  },
  chipSelected: {
    backgroundColor: `${Colors.accent.neonBlue}18`,
    borderColor: Colors.accent.neonBlue,
  },
  chipText: { color: Colors.dark.text, opacity: 0.7, fontSize: 14, fontWeight: '500' },
  chipTextSelected: { color: Colors.accent.neonBlue, opacity: 1, fontWeight: '700' },
  analyzeBtn: {
    backgroundColor: Colors.dark.surface, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.accent.neonPurple,
  },
  analyzeBtnText: { color: Colors.dark.text, fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  resultCard: {
    marginTop: 36, backgroundColor: Colors.dark.surface, borderRadius: 20, padding: 20,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.dark.border,
  },
  aiBadge: {
    backgroundColor: `${Colors.accent.neonBlue}15`, paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: `${Colors.accent.neonBlue}40`,
  },
  aiBadgeText: { color: Colors.accent.neonBlue, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
});
