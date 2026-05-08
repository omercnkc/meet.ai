/**
 * Environment configuration for the MeetAI mobile app.
 * 
 * In a real production build you would use expo-constants or react-native-config
 * to inject these at build time. For development we hardcode defaults here.
 */

import Constants from "expo-constants";

const debuggerHost = Constants.expoConfig?.hostUri;
const localhost = debuggerHost ? debuggerHost.split(":")[0] : "10.0.2.2";

export const ENV = {
  // Firebase
  FIREBASE_API_KEY: "AIzaSyBsz57FBxWuK_3MoJiYn6N4AnXjRfuEJeA",
  FIREBASE_AUTH_DOMAIN: "meet-ai-610c7.firebaseapp.com",
  FIREBASE_PROJECT_ID: "meet-ai-610c7",
  FIREBASE_STORAGE_BUCKET: "meet-ai-610c7.firebasestorage.app",
  FIREBASE_MESSAGING_SENDER_ID: "191430055788",
  FIREBASE_APP_ID: "1:191430055788:web:b918e6d55155abb23b8549",

  // Backend API
  // Uses Expo's debugger host IP dynamically, falls back to Android emulator host
  API_BASE_URL: `http://${localhost}:8000`,

  // LiveKit
  LIVEKIT_URL: "wss://meet-ai-79lby4wd.livekit.cloud",
  LIVEKIT_TOKEN_ENDPOINT: `http://${localhost}:8000/api/livekit/token`,
} as const;
