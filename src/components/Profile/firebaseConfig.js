import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

const app = initializeApp  ({
    apiKey: "AIzaSyCGf3VaQgcpgxlTeLvWpXJZmCvwqX4FdkU",
    authDomain: "react-http-7efc4.firebaseapp.com",
    databaseURL: "https://react-http-7efc4-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "react-http-7efc4",
    storageBucket: "react-http-7efc4.appspot.com",
    messagingSenderId: "174835682967",
    appId: "1:174835682967:web:a6eddf3eaefd17f22da3d2"
  });


 const storage = getStorage(app);
 export default storage;