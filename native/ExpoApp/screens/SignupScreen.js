import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { createInitialProfile } from '../services/profile';
import { isGoogleAuthConfigured } from '../config/googleAuth';
import { useGoogleSignIn } from '../hooks/useGoogleSignIn';
import Screen from '../components/ui/Screen';
import ScreenHeader from '../components/ui/ScreenHeader';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import GoogleSignInButton, { AuthDivider } from '../components/GoogleSignInButton';
import AppleSignInButton from '../components/AppleSignInButton';
import { signInWithApple, appleAuthErrorMessage } from '../auth/appleSignIn';
import LanguageToggle from '../components/LanguageToggle';
import { useLocale } from '../context/LocaleContext';
import { colors, spacing } from '../theme';

const SignupScreen = ({ navigation }) => {
  const { t } = useLocale();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const friendlyError = (code) => {
    switch (code) {
      case 'auth/email-already-in-use':
        return t('auth.authEmailInUse');
      case 'auth/invalid-email':
        return t('auth.validEmail');
      case 'auth/weak-password':
        return t('auth.authWeak');
      default:
        return t('auth.authSignUpFail');
    }
  };

  const handleGoogleError = useCallback(
    (message) => {
      Alert.alert(t('auth.googleFailed'), message);
    },
    [t]
  );

  const { signIn: signInWithGoogle, loading: googleLoading, ready: googleReady } = useGoogleSignIn({
    onError: handleGoogleError,
  });

  const handleGooglePress = () => {
    if (!isGoogleAuthConfigured()) {
      Alert.alert(t('auth.googleSetup'), t('auth.googleSetupMsg'));
      return;
    }
    signInWithGoogle();
  };

  const handleApplePress = async () => {
    try {
      await signInWithApple();
    } catch (error) {
      const message = appleAuthErrorMessage(error);
      if (message) Alert.alert(t('auth.appleFailed'), message);
    }
  };

  const validate = () => {
    if (!email || !password || !confirm) {
      Alert.alert(t('auth.missingInfo'), t('auth.fillAllFields'));
      return false;
    }
    if (password.length < 6) {
      Alert.alert(t('auth.weakPassword'), t('auth.passwordMin6'));
      return false;
    }
    if (password !== confirm) {
      Alert.alert(t('auth.mismatch'), t('auth.passwordsMismatch'));
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert(t('auth.invalidEmail'), t('auth.validEmail'));
      return false;
    }
    return true;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await createInitialProfile(cred.user.uid, { email: email.trim() });
      navigation.navigate('CompleteProfile');
    } catch (error) {
      Alert.alert(t('auth.signUpFailed'), friendlyError(error.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll keyboardAvoiding flush contentStyle={styles.screen}>
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()} hitSlop={12}>
        <MaterialIcons name="arrow-back" size={24} color={colors.white} />
      </TouchableOpacity>

      <ScreenHeader icon="person-add" title={t('auth.joinTitle')} subtitle={t('auth.joinSubtitle')} />

      <View style={styles.formWrap}>
        <Card>
          <LanguageToggle />
          <Input
            label={t('auth.email')}
            icon="email"
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
            autoComplete="email"
          />
          <Input
            label={t('auth.password')}
            icon="lock"
            placeholder={t('auth.passwordNewPlaceholder')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            textContentType={Platform.OS === 'ios' ? 'oneTimeCode' : 'none'}
            autoComplete="off"
            importantForAutofill="no"
          />
          <Input
            label={t('auth.confirmPassword')}
            icon="lock"
            placeholder={t('auth.confirmPlaceholder')}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            autoCapitalize="none"
            textContentType={Platform.OS === 'ios' ? 'oneTimeCode' : 'none'}
            autoComplete="off"
            importantForAutofill="no"
          />

          <Button title={t('auth.createAccount')} onPress={handleSignup} loading={loading} />

          <AuthDivider text={t('auth.or')} />
          <GoogleSignInButton
            onPress={handleGooglePress}
            loading={googleLoading}
            disabled={!googleReady || loading}
            label={t('auth.continueGoogle')}
          />
          <AppleSignInButton onPress={handleApplePress} style={styles.appleButton} />

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.hasAccount')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.link}>{t('auth.signIn')}</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  screen: { flexGrow: 1 },
  back: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    zIndex: 20,
    padding: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  formWrap: { padding: spacing.lg, paddingTop: spacing.sm },
  appleButton: { marginTop: spacing.sm },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: { color: colors.textMuted, fontSize: 14 },
  link: { color: colors.primary, fontSize: 14, fontWeight: '700' },
});

export default SignupScreen;
