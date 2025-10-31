
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView, Platform } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from './IconSymbol';

interface DropdownPickerProps {
  label: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

export default function DropdownPicker({
  label,
  value,
  options,
  onSelect,
  placeholder = 'Select an option',
  required = false,
}: DropdownPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (option: string) => {
    console.log('Selected option:', option);
    onSelect(option);
    setIsOpen(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      
      <Pressable
        style={styles.selector}
        onPress={() => setIsOpen(true)}
      >
        <Text style={[styles.selectorText, !value && styles.placeholder]}>
          {value || placeholder}
        </Text>
        <IconSymbol
          name="chevron-down"
          size={20}
          color={colors.textSecondary}
        />
      </Pressable>

      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsOpen(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <Pressable onPress={() => setIsOpen(false)}>
                <IconSymbol name="close" size={24} color={colors.text} />
              </Pressable>
            </View>
            
            <ScrollView style={styles.optionsList}>
              {options.map((option, index) => (
                <Pressable
                  key={index}
                  style={[
                    styles.option,
                    value === option && styles.optionSelected,
                  ]}
                  onPress={() => handleSelect(option)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      value === option && styles.optionTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                  {value === option && (
                    <IconSymbol
                      name="checkmark"
                      size={20}
                      color={colors.primary}
                    />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  required: {
    color: colors.error,
  },
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  selectorText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  placeholder: {
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  optionsList: {
    maxHeight: 400,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionSelected: {
    backgroundColor: colors.background,
  },
  optionText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  optionTextSelected: {
    fontWeight: '600',
    color: colors.primary,
  },
});
