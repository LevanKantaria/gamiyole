import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../firebase';
import { getProfile, createInitialProfile } from '../services/profile';

export const googleAuthErrorMessage = (error) => {
  const code = error?.code;
  switch (code) {
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email using a different sign-in method.';
    case 'auth/invalid-credential':
      return 'Google sign-in failed. Check your OAuth client IDs in config/googleAuth.js.';
    case 'auth/operation-not-allowed':
      return 'Google sign-in is not enabled in Firebase Console.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    default:
      return 'Google sign-in failed. Please try again.';
  }
};

/**
 * Exchange a Google ID token for a Firebase session and ensure an RTDB profile exists.
 */
export async function signInWithGoogleIdToken(idToken) {
  const credential = GoogleAuthProvider.credential(idToken);
  const { user } = await signInWithCredential(auth, credential);

  const profile = await getProfile(user.uid);
  if (!profile) {
    await createInitialProfile(user.uid, {
      email: user.email || '',
      name: user.displayName || '',
    });
  }

  return user;
}
