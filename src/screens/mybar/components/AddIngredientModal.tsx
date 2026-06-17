// src/screens/mybar/components/AddIngredientModal.tsx
import React, { useState } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  StyleSheet,
} from 'react-native';
import { useInventoryStore } from '@/stores/inventoryStore';
import { ThemedText } from '@/components/common/ThemedText';
import { GlassButton } from '@/components/common/GlassButton';
import { Colors } from '@/utils/colors';
import { IngredientCategory, InventoryItem } from '@/types/ingredient';
import { v4 as uuidv4 } from 'uuid';

interface AddIngredientModalProps {
  visible: boolean;
  onClose: () => void;
}

const CATEGORIES: IngredientCategory[] = [
  'spirit',
  'mixer',
  'liqueur',
  'bitters',
  'traditional',
  'other',
];


export default function AddIngredientModal({
  visible,
  onClose,
}: AddIngredientModalProps) {
  const { addIngredient } = useInventoryStore();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<IngredientCategory>('spirit');
  const [brand, setBrand] = useState('');
  const [abv, setAbv] = useState('40');
  const [quantity, setQuantity] = useState<'full' | 'high' | 'medium' | 'low'>(
    'high'
  );

  const handleAdd = () => {
    if (!name.trim()) return;

    const newIngredient: InventoryItem = {
      id: uuidv4(),
      name,
      category,
      brand: brand || undefined,
      abv: abv ? parseInt(abv) : undefined,
      imageUrl: `https://via.placeholder.com/60x200?text=${encodeURIComponent(name)}`,
      quantity,
      shelf: 0,
      position: 0,
      addedDate: Date.now(),
    };

    addIngredient(newIngredient);
    setName('');
    setBrand('');
    setAbv('40');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: Colors.dark.bg,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomColor: Colors.dark.border,
            borderBottomWidth: 1,
          }}
        >
          <ThemedText
            variant="h2"
            style={{
              color: Colors.dark.text,
              fontSize: 20,
              fontWeight: '700',
            }}
          >
            Add Ingredient
          </ThemedText>
          <TouchableOpacity onPress={onClose}>
            <ThemedText
              style={{
                color: Colors.dark.text,
                opacity: 0.6,
                fontSize: 14,
              }}
            >
              Cancel
            </ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingVertical: 20,
            paddingBottom: 100,
          }}
        >
          {/* Name Input */}
          <View style={{ marginBottom: 20 }}>
            <ThemedText
              style={{
                color: Colors.dark.text,
                fontSize: 12,
                fontWeight: '600',
                marginBottom: 8,
              }}
            >
              Ingredient Name
            </ThemedText>
            <TextInput
              placeholder="e.g., Jameson Irish Whiskey"
              placeholderTextColor={Colors.dark.text}
              value={name}
              onChangeText={setName}
              style={[styles.input, { color: Colors.dark.text }]}
            />
          </View>

          {/* Category */}
          <View style={{ marginBottom: 20 }}>
            <ThemedText
              style={{
                color: Colors.dark.text,
                fontSize: 12,
                fontWeight: '600',
                marginBottom: 8,
              }}
            >
              Category
            </ThemedText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[
                    styles.chipButton,
                    {
                      backgroundColor:
                        category === cat
                          ? Colors.accent.neonBlue
                          : Colors.dark.surface,
                    },
                  ]}
                >
                  <ThemedText
                    style={{
                      color:
                        category === cat
                          ? Colors.dark.bg
                          : Colors.dark.text,
                      fontSize: 12,
                      fontWeight: '600',
                      textTransform: 'capitalize',
                    }}
                  >
                    {cat}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Brand */}
          <View style={{ marginBottom: 20 }}>
            <ThemedText
              style={{
                color: Colors.dark.text,
                fontSize: 12,
                fontWeight: '600',
                marginBottom: 8,
              }}
            >
              Brand (Optional)
            </ThemedText>
            <TextInput
              placeholder="e.g., Jameson"
              placeholderTextColor={Colors.dark.text}
              value={brand}
              onChangeText={setBrand}
              style={[styles.input, { color: Colors.dark.text }]}
            />
          </View>

          {/* ABV */}
          <View style={{ marginBottom: 20 }}>
            <ThemedText
              style={{
                color: Colors.dark.text,
                fontSize: 12,
                fontWeight: '600',
                marginBottom: 8,
              }}
            >
              ABV (%) - Optional
            </ThemedText>
            <TextInput
              placeholder="40"
              placeholderTextColor={Colors.dark.text}
              value={abv}
              onChangeText={setAbv}
              keyboardType="decimal-pad"
              style={[styles.input, { color: Colors.dark.text }]}
            />
          </View>

          {/* Quantity */}
          <View style={{ marginBottom: 40 }}>
            <ThemedText
              style={{
                color: Colors.dark.text,
                fontSize: 12,
                fontWeight: '600',
                marginBottom: 8,
              }}
            >
              Quantity
            </ThemedText>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['full', 'high', 'medium', 'low'] as const).map((q) => (
                <TouchableOpacity
                  key={q}
                  onPress={() => setQuantity(q)}
                  style={[
                    styles.chipButton,
                    {
                      backgroundColor:
                        quantity === q
                          ? Colors.accent.neonBlue
                          : Colors.dark.surface,
                    },
                  ]}
                >
                  <ThemedText
                    style={{
                      color:
                        quantity === q ? Colors.dark.bg : Colors.dark.text,
                      fontSize: 12,
                      fontWeight: '600',
                      textTransform: 'capitalize',
                    }}
                  >
                    {q}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            paddingHorizontal: 16,
            paddingVertical: 20,
            backgroundColor: Colors.dark.surface,
            borderTopColor: Colors.dark.border,
            borderTopWidth: 1,
          }}
        >
          <GlassButton
            title="Add to Bar"
            onPress={handleAdd}
            variant="primary"
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderColor: Colors.dark.border,
    borderWidth: 1,
  },
  chipButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderColor: Colors.dark.border,
    borderWidth: 1,
  },
});