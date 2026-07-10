import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme';

const Loading = ({ text }) => (
  <View style={styles.container}>
    <ActivityIndicator size="large" color={colors.primary} />
    {text ? <Text style={styles.text}>{text}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  text: { marginTop: spacing.md, fontSize: 15, color: colors.textMuted },
});

export default Loading;
