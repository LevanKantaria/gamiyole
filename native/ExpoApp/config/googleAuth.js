import { Platform } from 'react-native';

/**
 * Google OAuth client IDs for Firebase Google sign-in (mobile).
 *
 * iosClientId + iosUrlScheme are from GoogleService-Info.plist in this folder.
 *
 * Still needed for Android:
 * - Add Android app in Firebase (package com.gamiyole.app + SHA-1)
 * - Download google-services.json → androidClientId from oauth_client (type 3)
 *
 * webClientId: Firebase Console → Authentication → Sign-in method → Google → Web SDK configuration
 *
 * Requires a development build: npx expo run:ios / run:android (not Expo Go).
 */
export const GOOGLE_AUTH_CONFIG = {
  webClientId: 'REPLACE_WITH_WEB_CLIENT_ID.apps.googleusercontent.com',
  iosClientId: '174835682967-6h1tbidgnslihsup0iursje1fftdeoak.apps.googleusercontent.com',
  androidClientId: 'REPLACE_WITH_ANDROID_CLIENT_ID.apps.googleusercontent.com',
  iosUrlScheme: 'com.googleusercontent.apps.174835682967-6h1tbidgnslihsup0iursje1fftdeoak',
};

export const isGoogleAuthConfigured = () => {
  const { webClientId, iosClientId, androidClientId } = GOOGLE_AUTH_CONFIG;
  const valid = (id) => id && !id.startsWith('REPLACE_WITH');

  if (Platform.OS === 'ios') return valid(iosClientId);
  if (Platform.OS === 'android') return valid(androidClientId) && valid(webClientId);
  return valid(webClientId);
};
