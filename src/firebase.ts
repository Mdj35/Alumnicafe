import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Placeholder Firebase configuration
// REPLACE THIS WITH YOUR ACTUAL FIREBASE CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyC6bMGfXgvqqRZN_wGZ9WsyQiJnvv2j2ok",
  authDomain: "alumni-cafe.firebaseapp.com",
  projectId: "alumni-cafe",
  storageBucket: "alumni-cafe.firebasestorage.app",
  messagingSenderId: "812265677398",
  appId: "1:812265677398:web:db60a922fe3f2961bc91f7",
  measurementId: "G-7TH56JRQP4"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
