// src/screens/mybar/MyBarScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInventoryStore } from '@/stores/inventoryStore';
import { MOCK_INGREDIENTS } from '@/data/mockIngredients';
import SkeuomorphicShelf from './components/SkeuomorphicShelf';
import AddIngredientModal from './components/AddIngredientModal';
import BottleDetailModal from './components/BottleDetailModal';
import { ThemedText } from '@/components/common/ThemedText';
import { GlassButton } from '@/components/common/GlassButton';
import { Colors } from '@/utils/colors';

export default function MyBarScreen() {
  const insets = useSafeAreaInsets();
  const { items, setSelectedItem, selectedItem } = useInventoryStore();
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Initialize with mock data
  useEffect(() => {
    if (items.length === 0) {
      MOCK_INGREDIENTS.forEach((ingredient) => {
        useInventoryStore.setState((state) => ({
          items: [...state.items, ingredient],
        }));
      });
    }
  }, [items.length]);

  // Organize items by shelf
  const shelves = [0, 1, 2, 3].map((shelfNumber) =>
    items.filter((item) => item.shelf === shelfNumber)
  );

  const handleBottlePress = (bottle: any) => {
    setSelectedItem(bottle);
    setDetailModalVisible(true);
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: Colors.dark.bg,
      }}
    >
      <View
        style={{
          paddingTop: 20,
          paddingHorizontal: 16,
          paddingBottom: 12,
        }}
      >
        <ThemedText
          variant="h1"
          style={{
            color: Colors.dark.text,
            fontSize: 28,
            fontWeight: '700',
            marginBottom: 4,
          }}
        >
          My Bar
        </ThemedText>
        <ThemedText
          variant="body"
          style={{
            color: Colors.dark.text,
            opacity: 0.6,
            fontSize: 14,
          }}
        >
          {items.length} ingredients in stock
        </ThemedText>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {shelves.map((shelfItems, shelfIndex) => (
          <SkeuomorphicShelf
            key={`shelf-${shelfIndex}`}
            shelfNumber={shelfIndex}
            items={shelfItems}
            onBottlePress={handleBottlePress}
          />
        ))}
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          bottom: insets.bottom + 20,
          right: 16,
          zIndex: 10,
        }}
      >
        <GlassButton
          title="+ Add Ingredient"
          onPress={() => setAddModalVisible(true)}
          variant="primary"
        />
      </View>

      <AddIngredientModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
      />

      <BottleDetailModal
        visible={detailModalVisible}
        bottle={selectedItem}
        onClose={() => {
          setDetailModalVisible(false);
          setSelectedItem(null);
        }}
      />
    </SafeAreaView>
  );
}