import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD6LyoG8UhLN9ovjc0WGVWIPNHZkYEkFcg",
  // Use your Vercel domain for proper redirect handling in WebView apps
  authDomain: "learn-bot.vercel.app",
  projectId: "n8n360-8ba3b",
  storageBucket: "n8n360-8ba3b.firebasestorage.app",
  messagingSenderId: "407502960706",
  appId: "1:407502960706:web:c0e8094d7ebec73c6cd5db",
  measurementId: "G-7ZXGRBSL1C"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
