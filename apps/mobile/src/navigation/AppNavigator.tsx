/**
 * AppNavigator — Root navigation structure.
 * Uses @react-navigation/native-stack for screen transitions.
 */

import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "../theme";

// Screens (To be implemented)
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import DashboardScreen from "../screens/DashboardScreen";
import ActiveMeetingScreen from "../screens/ActiveMeetingScreen";
import MeetingSummaryScreen from "../screens/MeetingSummaryScreen";

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Dashboard: undefined;
  ActiveMeeting: { meetingId: string };
  MeetingSummary: { meetingId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { colors } = useTheme();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: "slide_from_right",
        }}
      >
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="ActiveMeeting" component={ActiveMeetingScreen} />
            <Stack.Screen
              name="MeetingSummary"
              component={MeetingSummaryScreen}
              options={{
                headerShown: true,
                headerTitle: "Meeting Summary",
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.foreground,
                headerShadowVisible: false,
              }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
