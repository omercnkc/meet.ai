/**
 * LoginScreen — Firebase email/password sign in.
 */

import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, spacing, typography, borderRadius } from "../theme";
import { useAuth } from "../hooks/useAuth";
import { AppButton } from "../components/AppButton";
import { AppInput } from "../components/AppInput";
import { ScreenContainer } from "../components/ScreenContainer";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) return;
    setError(null);
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer scrollable padded={false}>
      <View style={styles.contentWrapper}>
        <View style={styles.content}>
          <View style={styles.brand}>
          <View style={[styles.logo, { backgroundColor: colors.primary }]}>
            <Ionicons name="sparkles" size={24} color={colors.primaryForeground} />
          </View>
          <Text style={[styles.brandText, { color: colors.foreground }]}>Meet.ai</Text>
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>Welcome back</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Sign in to your account to continue
        </Text>

        {error && (
          <View style={[styles.errorBox, { backgroundColor: colors.destructive + "1A", borderColor: colors.destructive + "33" }]}>
            <Text style={[styles.errorText, { color: colors.destructiveForeground }]}>{error}</Text>
          </View>
        )}

        <View style={styles.form}>
          <AppInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            icon={<Ionicons name="mail-outline" size={18} color={colors.mutedForeground} />}
          />

          <AppInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            icon={<Ionicons name="lock-closed-outline" size={18} color={colors.mutedForeground} />}
          />

          <View style={styles.actions}>
            <AppButton
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              fullWidth
              style={{ marginBottom: spacing.md }}
            />

            <AppButton
              title="Create Account"
              variant="outline"
              onPress={() => navigation.navigate("Register")}
              fullWidth
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            By continuing, you agree to our Terms of Service
          </Text>
        </View>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentWrapper: {
    flex: 1,
    alignItems: "center",
    width: "100%",
  },
  content: { 
    width: "100%",
    maxWidth: 480,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing["4xl"],
    paddingBottom: spacing["3xl"],
  },
  brand: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing["3xl"] },
  logo: { width: 44, height: 44, borderRadius: borderRadius.xl, alignItems: "center", justifyContent: "center" },
  brandText: { ...typography.h2, fontWeight: "700" },
  title: { ...typography.h1, marginBottom: spacing.xs, flexWrap: "wrap" },
  subtitle: { ...typography.body, marginBottom: spacing["2xl"], flexWrap: "wrap" },
  errorBox: { padding: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1, marginBottom: spacing.lg },
  errorText: { ...typography.bodySmall },
  form: {
    width: "100%",
  },
  actions: {
    marginTop: spacing.lg,
  },
  footer: {
    marginTop: spacing["5xl"],
    alignItems: "center",
  },
  footerText: {
    ...typography.caption,
    textAlign: "center",
  },
});
