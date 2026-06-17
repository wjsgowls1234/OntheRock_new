import React from 'react';
import {
  Modal,
  View,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InventoryItem } from '@/types/ingredient';
import { ThemedText } from '@/components/common/ThemedText';
import { Colors } from '@/utils/colors';

interface BottleDetailModalProps {
  visible: boolean;
  bottle: InventoryItem | null;
  onClose: () => void;
}

export default function BottleDetailModal({
  visible,
  bottle,
  onClose,
}: BottleDetailModalProps) {
  const insets = useSafeAreaInsets();

  if (!bottle) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop — tap to dismiss */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        {/* Bottom sheet panel */}
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          {/* Drag handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <ThemedText style={styles.headerTitle}>Ingredient Details</ThemedText>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <ThemedText style={styles.doneBtn}>Done</ThemedText>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Name */}
            <ThemedText style={styles.bottleName}>{bottle.name}</ThemedText>

            {/* Category & Brand */}
            <View style={styles.tagRow}>
              <View style={styles.tag}>
                <ThemedText style={styles.tagTextBlue}>
                  {bottle.category.toUpperCase()}
                </ThemedText>
              </View>
              {bottle.brand && (
                <View style={styles.tag}>
                  <ThemedText style={styles.tagTextGold}>{bottle.brand}</ThemedText>
                </View>
              )}
            </View>

            {/* ABV */}
            {bottle.abv !== undefined && (
              <View style={styles.row}>
                <ThemedText style={styles.rowLabel}>Alcohol Content</ThemedText>
                <ThemedText style={styles.rowValue}>{bottle.abv}% ABV</ThemedText>
              </View>
            )}

            {/* Quantity */}
            <View style={styles.row}>
              <ThemedText style={styles.rowLabel}>Current Quantity</ThemedText>
              <ThemedText style={[styles.rowValue, { textTransform: 'capitalize' }]}>
                {bottle.quantity}
              </ThemedText>
            </View>

            {/* Last Used */}
            {bottle.lastUsed && (
              <View style={styles.row}>
                <ThemedText style={styles.rowLabel}>Last Used</ThemedText>
                <ThemedText style={styles.rowValueSmall}>
                  {new Date(bottle.lastUsed).toLocaleDateString()}
                </ThemedText>
              </View>
            )}

            {/* Notes */}
            {bottle.notes && (
              <View style={styles.row}>
                <ThemedText style={styles.rowLabel}>Notes</ThemedText>
                <ThemedText style={[styles.rowValueSmall, { lineHeight: 20 }]}>
                  {bottle.notes}
                </ThemedText>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  sheet: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '75%',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.dark.border,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  doneBtn: {
    color: Colors.accent.neonBlue,
    fontSize: 16,
    fontWeight: '600',
  },
  bottleName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 10,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  tag: {
    backgroundColor: Colors.dark.bg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  tagTextBlue: {
    color: Colors.accent.neonBlue,
    fontSize: 12,
    fontWeight: '600',
  },
  tagTextGold: {
    color: Colors.accent.amberGold,
    fontSize: 12,
    fontWeight: '600',
  },
  row: {
    marginBottom: 18,
  },
  rowLabel: {
    fontSize: 11,
    color: Colors.dark.text,
    opacity: 0.5,
    marginBottom: 4,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  rowValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  rowValueSmall: {
    fontSize: 14,
    color: Colors.dark.text,
  },
});
