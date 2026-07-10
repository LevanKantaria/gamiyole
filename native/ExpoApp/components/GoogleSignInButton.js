import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';

const GoogleSignInButton = ({ onPress, loading = false, disabled = false, label = 'Continue with Google' }) => {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.button, isDisabled && styles.disabled]}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <Text style={styles.googleG}>G</Text>
          </View>
          <Text style={styles.label}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export const AuthDivider = ({ text = 'or' }) => (
  <View style={dividerStyles.wrap}>
    <View style={dividerStyles.line} />
    <Text style={dividerStyles.text}>{text}</Text>
    <View style={dividerStyles.line} />
  </View>
);

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  disabled: { opacity: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  googleG: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4285F4',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});

const dividerStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  text: {
    marginHorizontal: spacing.md,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'lowercase',
  },
});

export default GoogleSignInButton;
