import { httpsCallable } from 'firebase/functions';
import { signOut } from 'firebase/auth';
import { functions, auth } from '../firebase';

// Permanently erase the signed-in user's data and auth account. The heavy
// lifting runs server-side (functions/index.js → deleteAccount) with admin
// privileges, so there's no "recent login" requirement and rules can't block
// it. We then sign out locally to clear the now-invalid session.
export async function deleteAccount() {
  const call = httpsCallable(functions, 'deleteAccount');
  await call();
  try {
    await signOut(auth);
  } catch {
    // Session token is already invalid after deletion — nothing to clean up.
  }
}
