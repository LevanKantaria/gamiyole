import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../../theme';

const VARIANTS = {
  info: { bg: colors.primaryLight, color: colors.primary, icon: 'info-outline' },
  success: { bg: colors.successLight, color: colors.success, icon: 'check-circle-outline' },
  warning: { bg: '#fffbeb', color: colors.warning, icon: 'lightbulb-outline' },
};

const InfoBanner = ({ text, variant = 'info', icon }) => {
  const v = VARIANTS[variant] || VARIANTS.info;
  return (
    <View style={[styles.banner, { backgroundColor: v.bg }]}>
      <MaterialIcons name={icon || v.icon} size={20} color={v.color} />
      <Text style={[styles.text, { color: v.color }]}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  text: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '500' },
});

export default InfoBanner;
