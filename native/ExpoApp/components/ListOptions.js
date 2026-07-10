import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocale } from '../context/LocaleContext';
import { CITIES } from '../constants/cities';
import CityPickerModal from './CityPickerModal';
import { colors, spacing, radius } from '../theme';

// City field: tapping opens a searchable bottom-sheet picker (CityPickerModal).
// `exclude` hides the city already picked on the other end of the route.
// zIndex is accepted for backwards compatibility but no longer needed.
const ListOptions = ({ value, onValueChange, placeholder = 'Select a city', exclude }) => {
  const { isGeorgian } = useLocale();
  const [open, setOpen] = useState(false);

  const selected = CITIES.find((c) => c.value === value);
  const label = selected ? (isGeorgian ? selected.ge : selected.value) : null;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={[styles.triggerText, !label && styles.placeholder]} numberOfLines={1}>
          {label || placeholder}
        </Text>
        {label ? (
          <TouchableOpacity onPress={() => onValueChange('')} hitSlop={10}>
            <MaterialIcons name="close" size={18} color={colors.textFaint} />
          </TouchableOpacity>
        ) : (
          <MaterialIcons name="expand-more" size={22} color={colors.textFaint} />
        )}
      </TouchableOpacity>

      <CityPickerModal
        visible={open}
        value={value}
        exclude={exclude}
        onSelect={onValueChange}
        onClose={() => setOpen(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 16,
    gap: spacing.sm,
  },
  triggerText: {
    flex: 1,
    fontSize: 16,
    color: '#22223b',
  },
  placeholder: {
    color: '#9ca3af',
  },
});

export default ListOptions;
