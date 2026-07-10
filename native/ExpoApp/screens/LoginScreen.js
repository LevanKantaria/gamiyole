import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
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

const LoginScreen = ({ navigation }) => {
  const { t } = useLocale();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const friendlyError = (code) => {
    switch (code) {
      case 'auth/invalid-email':
        return t('auth.authInvalidEmail');
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return t('auth.authWrongPassword');
      case 'auth/too-many-requests':
        return t('auth.authTooMany');
      default:
        return t('auth.authSignInFail');
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

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('auth.missingInfo'), t('auth.fillEmailAndPassword'));
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (error) {
      Alert.alert(t('auth.signInFailed'), friendlyError(error.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll keyboardAvoiding flush contentStyle={styles.screen}>
      <ScreenHeader icon="directions-car" title={t('auth.appTitle')} subtitle={t('auth.appSubtitle')} />
      <View style={styles.formWrap}>
        <Card style={styles.formCard}>
          <LanguageToggle />
          <Text style={styles.formTitle}>{t('auth.welcomeBack')}</Text>
          <Text style={styles.formSubtitle}>{t('auth.signInSubtitle')}</Text>

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
            placeholder={t('auth.passwordPlaceholder')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            textContentType="password"
            autoComplete="password"
          />

          <Button title={t('auth.signIn')} onPress={handleLogin} loading={loading} />

          <AuthDivider text={t('auth.or')} />
          <GoogleSignInButton
            onPress={handleGooglePress}
            loading={googleLoading}
            disabled={!googleReady || loading}
            label={t('auth.continueGoogle')}
          />
          <AppleSignInButton onPress={handleApplePress} style={styles.appleButton} />

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.noAccount')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.link}>{t('auth.signUp')}</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  screen: { flexGrow: 1 },
  formWrap: { padding: spacing.lg, paddingTop: spacing.sm, flex: 1 },
  formCard: { marginTop: -spacing.md, gap: spacing.md },
  formTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
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

export default LoginScreen;
