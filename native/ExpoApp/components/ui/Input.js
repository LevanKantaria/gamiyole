import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme';

const Input = ({
  label,
  icon,
  secureTextEntry,
  style,
  containerStyle,
  multiline,
  autoCorrect,
  spellCheck,
  ...props
}) => {
  const [hidden, setHidden] = useState(!!secureTextEntry);
  const isSecure = !!secureTextEntry;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.field, multiline && styles.multilineField]}>
        {icon ? (
          <MaterialIcons name={icon} size={20} color={colors.textMuted} style={styles.icon} />
        ) : null}
        <TextInput
          style={[
            styles.input,
            isSecure && styles.inputSecure,
            multiline && styles.multilineInput,
            style,
          ]}
          placeholderTextColor={colors.textFaint}
          secureTextEntry={isSecure && hidden}
          multiline={multiline}
          autoCorrect={isSecure ? false : autoCorrect}
          spellCheck={isSecure ? false : spellCheck}
          {...props}
        />
        {isSecure ? (
          <TouchableOpacity
            onPress={() => setHidden((h) => !h)}
            hitSlop={10}
            style={styles.eyeButton}
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          >
            <MaterialIcons
              name={hidden ? 'visibility-off' : 'visibility'}
              size={20}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { width: '100%', marginBottom: spacing.lg },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
  },
  multilineField: {
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
  },
  icon: { marginRight: spacing.md },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: spacing.md,
    minHeight: 24,
  },
  inputSecure: {
    paddingRight: spacing.sm,
  },
  eyeButton: {
    paddingLeft: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});

export default Input;
