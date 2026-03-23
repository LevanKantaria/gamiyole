import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey:
    process.env.REACT_APP_FIREBASE_API_KEY ||
    "AIzaSyCGf3VaQgcpgxlTeLvWpXJZmCvwqX4FdkU",
  authDomain:
    process.env.REACT_APP_FIREBASE_AUTH_DOMAIN ||
    "react-http-7efc4.firebaseapp.com",
  databaseURL:
    process.env.REACT_APP_FIREBASE_DATABASE_URL ||
    "https://react-http-7efc4-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "react-http-7efc4",
  storageBucket:
    process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "react-http-7efc4.appspot.com",
  messagingSenderId:
    process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "174835682967",
  appId:
    process.env.REACT_APP_FIREBASE_APP_ID ||
    "1:174835682967:web:a6eddf3eaefd17f22da3d2",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const storage = getStorage(app);
export default app;
