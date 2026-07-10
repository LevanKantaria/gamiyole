import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocale } from '../context/LocaleContext';
import { CITIES } from '../constants/cities';
import { colors, spacing, radius } from '../theme';

const norm = (s) => (s || '').toLowerCase().trim();

// Bottom-sheet city picker with type-to-filter search — matches Georgian and
// English names regardless of the UI language or keyboard, same as the web
// app's CityCombobox.
const CityPickerModal = ({ visible, value, exclude, onSelect, onClose }) => {
  const { t, isGeorgian } = useLocale();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (visible) setQuery('');
  }, [visible]);

  const options = CITIES.filter((c) => c.value !== exclude).filter((c) => {
    const q = norm(query);
    return !q || norm(c.value).includes(q) || norm(c.ge).includes(q);
  });

  const pick = (cityValue) => {
    onSelect(cityValue);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.avoider}
        >
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.searchRow}>
              <MaterialIcons name="search" size={20} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder={t('common.searchCity')}
                placeholderTextColor={colors.textFaint}
                autoFocus
                autoCorrect={false}
                autoCapitalize="none"
              />
              {query ? (
                <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
                  <MaterialIcons name="close" size={18} color={colors.textFaint} />
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {options.length === 0 ? (
                <Text style={styles.empty}>{t('common.noCityMatch')}</Text>
              ) : null}
              {options.map((c) => {
                const selected = c.value === value;
                return (
                  <TouchableOpacity
                    key={c.value}
                    style={[styles.option, selected && styles.optionSelected]}
                    onPress={() => pick(c.value)}
                  >
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                      {isGeorgian ? c.ge : c.value}
                    </Text>
                    <View style={styles.optionRight}>
                      <Text style={styles.altName}>{isGeorgian ? c.value : c.ge}</Text>
                      {selected ? (
                        <MaterialIcons name="check" size={18} color={colors.primary} />
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  avoider: { justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 48,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  list: { maxHeight: 340 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  optionSelected: { backgroundColor: colors.primaryLight },
  optionText: { fontSize: 16, fontWeight: '600', color: colors.text },
  optionTextSelected: { color: colors.primary },
  optionRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  altName: { fontSize: 12.5, color: colors.textFaint },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 14,
    paddingVertical: spacing.xl,
  },
});

export default CityPickerModal;
