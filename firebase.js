// firebase.js
import { initializeApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDYV52xJRMj5y_Nmfmr1OxSKU6uMhJv__g",
  authDomain: "cyc2-f3f90.firebaseapp.com",
  projectId: "cyc2-f3f90",
  storageBucket: "cyc2-f3f90.firebasestorage.app",
  messagingSenderId: "494235918813",
  appId: "1:494235918813:web:987923971e8f839f929634",
  measurementId: "G-49YXWWN1HD",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase Auth with AsyncStorage persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

const db = getFirestore(app);

export { auth, db };
