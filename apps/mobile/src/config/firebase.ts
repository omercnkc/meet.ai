/**
 * Firebase configuration for React Native.
 * 
 * Mirrors the web app's firebase/config.ts but uses the
 * platform-agnostic Firebase JS SDK (v9+ modular API).
 */

import { initializeApp, getApps } from "firebase/app";
// @ts-ignore -- getReactNativePersistence is available in firebase/auth for React Native
import { initializeAuth, getAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ENV } from "./env";

const firebaseConfig = {
  apiKey: ENV.FIREBASE_API_KEY,
  authDomain: ENV.FIREBASE_AUTH_DOMAIN,
  projectId: ENV.FIREBASE_PROJECT_ID,
  storageBucket: ENV.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: ENV.FIREBASE_MESSAGING_SENDER_ID,
  appId: ENV.FIREBASE_APP_ID,
};

// Guard against double-initialization during hot reload
const isNewApp = getApps().length === 0;
const app = isNewApp ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = isNewApp
  ? initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
  : getAuth(app);

export const db = getFirestore(app);

export default app;
