import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { OAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../firebase';
import { getProfile, createInitialProfile } from '../services/profile';

// Random URL-safe nonce. Apple embeds its SHA-256 in the identity token; we send
// the RAW value to Firebase, which re-hashes and compares — this defeats replay.
function randomNonce(length = 32) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._';
  const bytes = Crypto.getRandomBytes(length);
  return Array.from(bytes)
    .map((b) => charset[b % charset.length])
    .join('');
}

// Returns null for a user-cancelled sheet (don't show an error for that).
export const appleAuthErrorMessage = (error) => {
  if (error?.code === 'ERR_REQUEST_CANCELED') return null;
  switch (error?.code) {
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email using a different sign-in method.';
    case 'auth/operation-not-allowed':
      return 'Apple sign-in is not enabled in Firebase Console.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    default:
      return 'Apple sign-in failed. Please try again.';
  }
};

// Run the native Apple sheet, exchange the identity token for a Firebase
// session, and ensure an RTDB profile exists.
export async function signInWithApple() {
  const rawNonce = randomNonce();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce
  );

  const appleCredential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  const { identityToken, fullName, email } = appleCredential;
  if (!identityToken) throw new Error('No Apple identity token received.');

  const provider = new OAuthProvider('apple.com');
  const firebaseCred = provider.credential({ idToken: identityToken, rawNonce });
  const { user } = await signInWithCredential(auth, firebaseCred);

  // Apple only returns name/email on the FIRST authorization, so capture them now.
  const appleName = [fullName?.givenName, fullName?.familyName].filter(Boolean).join(' ');

  const profile = await getProfile(user.uid);
  if (!profile) {
    await createInitialProfile(user.uid, {
      email: user.email || email || '',
      name: user.displayName || appleName || '',
    });
  }

  return user;
}
