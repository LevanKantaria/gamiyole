import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocale } from '../context/LocaleContext';
import { LANGUAGES } from '../i18n/translations';
import { colors, spacing, radius } from '../theme';

const LanguageToggle = () => {
  const { lang, setLang, t } = useLocale();

  return (
    <View style={styles.row}>
      {[LANGUAGES.GE, LANGUAGES.EN].map((code) => {
        const active = lang === code;
        const label = code === LANGUAGES.GE ? t('profile.langGE') : t('profile.langEN');
        return (
          <TouchableOpacity
            key={code}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => setLang(code)}
            activeOpacity={0.85}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: { fontSize: 15, fontWeight: '600', color: colors.text },
  chipTextActive: { color: colors.white },
});

export default LanguageToggle;
