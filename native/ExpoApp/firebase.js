import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyCGf3VaQgcpgxlTeLvWpXJZmCvwqX4FdkU',
  authDomain: 'react-http-7efc4.firebaseapp.com',
  databaseURL: 'https://react-http-7efc4-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'react-http-7efc4',
  storageBucket: 'react-http-7efc4.appspot.com',
  messagingSenderId: '174835682967',
  appId: '1:174835682967:web:a6eddf3eaefd17f22da3d2',
};

// Reuse the existing app on fast refresh instead of re-initializing.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// initializeAuth must only run once per app instance. On fast refresh the auth
// instance already exists, so fall back to getAuth.
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

const db = getDatabase(app);
const storage = getStorage(app);

export { app, auth, db, storage };
