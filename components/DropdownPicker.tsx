
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Modal, FlatList, Platform, useWindowDimensions } from 'react-native';
import { colors, BREAKPOINTS, responsiveStyles } from '@/styles/commonStyles';
import { IconSymbol } from './IconSymbol';

interface DropdownPickerProps {
  label: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  searchable?: boolean;
}

export default function DropdownPicker({
  label,
  value,
  options,
  onSelect,
  placeholder = 'Select an option',
  required = false,
  searchable = false,
}: DropdownPickerProps) {
  const { width } = useWindowDimensions();
  const isLarge = width >= BREAKPOINTS.lg;
  
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOptions = searchable
    ? options.filter(opt => opt.toLowerCase().includes(searchQuery.toLowerCase()))
    : options;

  const handleSelect = (option: string) => {
    console.log('Selected option:', option);
    onSelect(option);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleOpenModal = () => {
    setIsOpen(true);
    setSearchQuery('');
  };

  return (
    <View style={[styles.container, responsiveStyles.inputWrapper(isLarge)]}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      
      <Pressable
        style={[styles.selector, responsiveStyles.input(isLarge)]}
        onPress={handleOpenModal}
      >
        <Text style={[styles.selectorText, !value && styles.placeholder]}>
          {value || placeholder}
        </Text>
        <IconSymbol
          name="chevron.down"
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
           onPress={(e) => {
             // Only close if click is on the overlay background, not on content
             if (e.target === e.currentTarget) {
               setIsOpen(false);
             }
           }}
         >
          <View style={styles.modalContent}>
             <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>{label}</Text>
               <Pressable onPress={() => setIsOpen(false)}>
                 <IconSymbol name="xmark" size={24} color={colors.text} />
               </Pressable>
             </View>

             {searchable && (
               <View style={styles.searchContainer} onStartShouldSetResponder={() => true}>
                 <TextInput
                   style={styles.searchInput}
                   placeholder="Search..."
                   placeholderTextColor={colors.textSecondary}
                   value={searchQuery}
                   onChangeText={setSearchQuery}
                   autoCapitalize="none"
                   autoCorrect={false}
                   onTouchStart={(e) => e.stopPropagation()}
                 />
               </View>
             )}
             
             <FlatList
               style={styles.optionsList}
               data={filteredOptions}
               keyExtractor={(item, index) => `${item}-${index}`}
               keyboardShouldPersistTaps="handled"
               renderItem={({ item: option }) => (
                <Pressable
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
              )}
            />
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
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 20,
    height: '50%',
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
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
    flex: 1,
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
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    color: colors.text,
  },
});
