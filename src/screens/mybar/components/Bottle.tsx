// src/screens/mybar/components/Bottle.tsx
import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { InventoryItem } from '@/types/ingredient';
import { Colors, GradientColors } from '@/utils/colors';
import { ThemedText } from '@/components/common/ThemedText';

interface BottleProps {
  item: InventoryItem;
  onPress: () => void;
}

export default function Bottle({ item, onPress }: BottleProps) {
  const quantityOpacity = {
    full: 1,
    high: 0.85,
    medium: 0.65,
    low: 0.45,
  };

  // Determine bottle color gradient based on spirit type
  const getBottleGradient = () => {
    switch (item.spiritType) {
      case 'whiskey':
        return GradientColors.bottleGlow.whiskey;
      case 'vodka':
        return GradientColors.bottleGlow.vodka;
      case 'rum':
        return GradientColors.bottleGlow.rum;
      default:
        return ['#2a2a3e', '#3a3a4e'] as const;
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.bottleWrapper]}
      activeOpacity={0.7}
    >
      {/* Bottle container */}
      <View style={styles.bottle}>
        {/* Glass gradient */}
        <LinearGradient
          colors={getBottleGradient()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.glassGradient}
        >
          {/* Highlight shine */}
          <View style={styles.shine} />

          {/* Bottle label area */}
          <View style={styles.labelArea}>
            <ThemedText
              variant="caption"
              style={{
                color: Colors.dark.text,
                fontSize: 9,
                fontWeight: '600',
                textAlign: 'center',
              }}
              numberOfLines={2}
            >
              {item.name.split(' ')[0]}
            </ThemedText>
          </View>
        </LinearGradient>

        {/* Bottle cap */}
        <View style={styles.cap} />
      </View>

      {/* Quantity indicator */}
      <View style={styles.quantityIndicator}>
        <View
          style={[
            styles.quantityBar,
            {
              height: `${
                item.quantity === 'full'
                  ? 100
                  : item.quantity === 'high'
                    ? 75
                    : item.quantity === 'medium'
                      ? 50
                      : 25
              }%`,
              opacity: quantityOpacity[item.quantity],
            },
          ]}
        />
      </View>

      {/* Bottle label text */}
      <ThemedText
        variant="caption"
        style={{
          color: Colors.dark.text,
          fontSize: 8,
          marginTop: 8,
          textAlign: 'center',
          opacity: 0.7,
        }}
        numberOfLines={1}
      >
        {item.brand || item.category}
      </ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bottleWrapper: {
    marginHorizontal: 6,
    alignItems: 'center',
  },
  bottle: {
    width: 45,
    height: 140,
    borderRadius: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
    position: 'relative',
  },
  glassGradient: {
    flex: 1,
    paddingVertical: 4,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shine: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '30%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
  },
  labelArea: {
    width: '90%',
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  cap: {
    height: 8,
    width: '70%',
    backgroundColor: '#c0c0c0',
    alignSelf: 'center',
    borderRadius: 1,
    marginTop: -1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
  },
  quantityIndicator: {
    marginTop: 8,
    width: 20,
    height: 3,
    backgroundColor: Colors.dark.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  quantityBar: {
    width: '100%',
    backgroundColor: Colors.accent.neonBlue,
    borderRadius: 2,
  },
});