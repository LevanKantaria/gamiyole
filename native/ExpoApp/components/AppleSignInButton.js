import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';

// Apple's own button is REQUIRED for Sign in with Apple (Human Interface
// Guidelines). Only renders on iOS 13+ where the API is available; returns null
// elsewhere so Android/older iOS just don't see it. The button auto-localizes.
const AppleSignInButton = ({ onPress, style }) => {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (Platform.OS !== 'ios') return undefined;
    AppleAuthentication.isAvailableAsync()
      .then((ok) => mounted && setAvailable(ok))
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  if (Platform.OS !== 'ios' || !available) return null;

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={12}
      style={[styles.button, style]}
      onPress={onPress}
    />
  );
};

const styles = StyleSheet.create({
  button: { width: '100%', height: 48 },
});

export default AppleSignInButton;
