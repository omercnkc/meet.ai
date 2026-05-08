/**
 * App.tsx — Entry point for the MeetAI mobile app.
 */

import React from "react";
import { View, ActivityIndicator } from "react-native";
import { ThemeProvider } from "./src/theme";
import { AuthProvider, useAuth } from "./src/hooks/useAuth";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { initI18n } from "./src/utils/i18n";
import "./src/utils/debug"; // Attach debug script to global

function AppContent() {
  const { loading, currentUser } = useAuth();
  const [isI18nReady, setIsI18nReady] = React.useState(false);

  React.useEffect(() => {
    console.log("[AppContent] Mounted, waiting for auth...");
    initI18n().then(() => setIsI18nReady(true));
  }, []);

  React.useEffect(() => {
    if (!loading) {
      console.log(`[AppContent] Auth resolved. User: ${currentUser ? currentUser.uid : 'none'}`);
    }
  }, [loading, currentUser]);

  if (loading || !isI18nReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return <AppNavigator isAuthenticated={!!currentUser} />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
