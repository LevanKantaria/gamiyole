import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../firebase";
import {
  getProfile,
  createInitialProfile,
  isProfileComplete,
} from "../services/profile";

// Sign in with Google via Firebase Auth (web only).
// Creates a basic profile in RTDB for new users, same shape as the Expo app.
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  const { user } = await signInWithPopup(auth, provider);
  const profile = await getProfile(user.uid);

  if (!profile) {
    await createInitialProfile(user.uid, {
      email: user.email,
      name: user.displayName || "",
    });
  }

  return { user, needsProfile: !isProfileComplete(profile) };
}
