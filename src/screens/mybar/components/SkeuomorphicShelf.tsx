// src/screens/mybar/components/SkeuomorphicShelf.tsx
import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { InventoryItem } from '@/types/ingredient';
import Bottle from './Bottle';
import { Colors, GradientColors } from '@/utils/colors';
import { ThemedText } from '@/components/common/ThemedText';

interface SkeuomorphicShelfProps {
  shelfNumber: number;
  items: InventoryItem[];
  onBottlePress: (item: InventoryItem) => void;
}

const SHELF_LABELS = ['Top Shelf', 'Premium', 'Liqueurs & Bitters', 'Mixers'];

export default function SkeuomorphicShelf({
  shelfNumber,
  items,
  onBottlePress,
}: SkeuomorphicShelfProps) {
  return (
    <View style={styles.shelfContainer}>
      <ThemedText
        variant="subtitle"
        style={{
          color: Colors.accent.neonBlue,
          fontSize: 13,
          fontWeight: '600',
          letterSpacing: 0.5,
          marginBottom: 12,
          marginLeft: 8,
        }}
      >
        {SHELF_LABELS[shelfNumber]}
      </ThemedText>

      <View style={styles.shelfWrapper}>
        {/* Shelf wood background with gradient */}
        <LinearGradient
          colors={GradientColors.shelf}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.shelfBackground}
        >
          {/* Wood texture lines */}
          <View style={styles.woodTexture} />
        </LinearGradient>

        {/* Bottles container with horizontal scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.bottlesContainer}
          scrollEventThrottle={16}
        >
          {items.length > 0 ? (
            items.map((item, index) => (
              <Bottle
                key={`${item.id}-${index}`}
                item={item}
                onPress={() => onBottlePress(item)}
              />
            ))
          ) : (
            <View style={styles.emptyShelf}>
              <ThemedText
                variant="body"
                style={{
                  color: Colors.dark.text,
                  opacity: 0.4,
                  fontSize: 12,
                }}
              >
                Empty shelf
              </ThemedText>
            </View>
          )}
        </ScrollView>

        {/* Front edge shadow */}
        <View style={styles.shelfEdge} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shelfContainer: {
    marginBottom: 32,
  },
  shelfWrapper: {
    position: 'relative',
    height: 220,
    backgroundColor: Colors.dark.bg,
    borderRadius: 8,
    overflow: 'hidden',
  },
  shelfBackground: {
    ...StyleSheet.absoluteFillObject,
    height: 180,
    bottom: 0,
  },
  woodTexture: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.3,
  },
  bottlesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    minWidth: '100%',
  },
  emptyShelf: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  shelfEdge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Colors.dark.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
});