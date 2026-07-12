import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: 'AIzaSyCGf3VaQgcpgxlTeLvWpXJZmCvwqX4FdkU',
  // Use our own domain so the Google sign-in consent screen reads
  // "continue to gamiyole.me" instead of the raw Firebase project id.
  // gamiyole.me is a connected Firebase Hosting domain, so it already serves
  // the /__/auth/handler endpoint the OAuth popup redirects through.
  authDomain: 'gamiyole.me',
  databaseURL: 'https://react-http-7efc4-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'react-http-7efc4',
  storageBucket: 'react-http-7efc4.appspot.com',
  messagingSenderId: '174835682967',
  appId: '1:174835682967:web:a6eddf3eaefd17f22da3d2',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);
// Callable functions live in europe-west1 (same region as the database).
export const functions = getFunctions(app, 'europe-west1');
