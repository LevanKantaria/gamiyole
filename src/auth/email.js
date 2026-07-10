import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "../firebase";
import { getProfile, createInitialProfile, isProfileComplete } from "../services/profile";

// Maps Firebase auth error codes to i18n keys handled by the auth pages.
export const authErrorKey = (error) => {
  switch (error?.code) {
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "errInvalidCredentials";
    case "auth/email-already-in-use":
      return "errEmailInUse";
    case "auth/weak-password":
      return "errWeakPassword";
    case "auth/invalid-email":
    case "auth/missing-email":
      return "errInvalidEmail";
    default:
      return "errGeneric";
  }
};

export const emailSignIn = async (email, password) => {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  const profile = await getProfile(user.uid);
  return { user, needsProfile: !isProfileComplete(profile) };
};

export const emailSignUp = async (email, password) => {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await createInitialProfile(user.uid, { email: user.email });
  return { user, needsProfile: true };
};

export const logOut = () => signOut(auth);
