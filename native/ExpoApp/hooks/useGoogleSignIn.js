import { useEffect, useRef, useState } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import { GOOGLE_AUTH_CONFIG } from '../config/googleAuth';
import { googleAuthErrorMessage, signInWithGoogleIdToken } from '../auth/googleSignIn';

const APP_SCHEME = 'com.gamiyole.app';

export function useGoogleSignIn({ onError } = {}) {
  const [loading, setLoading] = useState(false);
  const handledResponse = useRef(null);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(
    {
      webClientId: GOOGLE_AUTH_CONFIG.webClientId,
      iosClientId: GOOGLE_AUTH_CONFIG.iosClientId,
      androidClientId: GOOGLE_AUTH_CONFIG.androidClientId,
      selectAccount: true,
    },
    { scheme: APP_SCHEME }
  );

  useEffect(() => {
    if (!response || response.type === 'dismiss' || response.type === 'cancel') return;
    if (handledResponse.current === response) return;
    handledResponse.current = response;

    if (response.type === 'error') {
      onError?.('Google sign-in failed. Please try again.');
      return;
    }

    if (response.type !== 'success') return;

    const idToken =
      response.params?.id_token ||
      response.authentication?.idToken;

    if (!idToken) {
      onError?.('No Google ID token received. Try again or check OAuth client setup.');
      return;
    }

    setLoading(true);
    signInWithGoogleIdToken(idToken)
      .catch((error) => onError?.(googleAuthErrorMessage(error)))
      .finally(() => setLoading(false));
  }, [response, onError]);

  const signIn = async () => {
    if (!request) {
      onError?.('Google sign-in is still loading. Try again in a moment.');
      return;
    }
    try {
      await promptAsync();
    } catch {
      onError?.('Could not open Google sign-in.');
    }
  };

  return {
    signIn,
    loading,
    ready: !!request,
  };
}
