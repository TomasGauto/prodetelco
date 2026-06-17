import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD38FhhESQw0X-8INZ7AGsqjOROlRF5Azg",
  authDomain: "prodetelco.firebaseapp.com",
  projectId: "prodetelco",
  storageBucket: "prodetelco.firebasestorage.app",
  messagingSenderId: "409928441490",
  appId: "1:409928441490:web:b9154006e25ef7544e504b",
  measurementId: "G-HDTFX927L5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
export default app;