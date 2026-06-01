import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, spacing, typography, borderRadius } from "../theme";
import { useAuth } from "../hooks/useAuth";
import { askAI, getAIMessages, AiMessage } from "../services/ai";

interface AIQuestionBoxProps {
  meetingId: string;
  hasTranscript?: boolean;
}

type ChatMsg = { id: string; role: "user" | "assistant"; content: string };

function toChat(msgs: AiMessage[]): ChatMsg[] {
  return msgs.flatMap((m) => [
    { id: `${m.id}-q`, role: "user" as const, content: m.question },
    { id: `${m.id}-a`, role: "assistant" as const, content: m.answer },
  ]);
}

const SUGGESTIONS = [
  "What were the main topics discussed?",
  "What action items were identified?",
  "Summarize the key decisions made.",
];

export function AIQuestionBox({ meetingId, hasTranscript = true }: AIQuestionBoxProps) {
  const { colors } = useTheme();
  const { height } = useWindowDimensions();
  const { currentUser } = useAuth();

  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);

  const userName =
    currentUser?.displayName || currentUser?.email?.split("@")[0] || "User";

  useEffect(() => {
    (async () => {
      try {
        const data = await getAIMessages(meetingId);
        setChat(toChat(data));
      } catch (err) {
        console.error("[AIQuestionBox] loadMessages failed", err);
      } finally {
        setFetching(false);
      }
    })();
  }, [meetingId]);

  const handleAsk = async () => {
    const q = question.trim();
    if (!q || loading) return;

    const userMsg: ChatMsg = { id: String(Date.now()), role: "user", content: q };
    setChat((prev) => [...prev, userMsg]);
    setQuestion("");
    setLoading(true);

    try {
      const result = await askAI(meetingId, q, userName);
      const aiMsg: ChatMsg = {
        id: String(Date.now() + 1),
        role: "assistant",
        content: result.answer,
      };
      setChat((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      setChat((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: "assistant",
          content: err.message || "Sorry, I couldn't process that request.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const renderMsg = ({ item }: { item: ChatMsg }) => {
    const isAI = item.role === "assistant";
    return (
      <View
        key={item.id}
        style={[
          styles.bubble,
          isAI ? styles.aiBubble : styles.userBubble,
          { backgroundColor: isAI ? colors.secondary : colors.primary },
        ]}
      >
        <Text style={[styles.bubbleText, { color: isAI ? colors.foreground : colors.primaryForeground }]}>
          {item.content}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { borderColor: colors.border + "66", height: Math.min(420, height * 0.5) }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border + "30" }]}>
        <Ionicons name="sparkles" size={18} color={colors.primary} />
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>AI Assistant</Text>
      </View>

      {/* Messages */}
      {!hasTranscript ? (
        <View style={styles.disabledContainer}>
          <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.mutedForeground} style={{ opacity: 0.5, marginBottom: spacing.md }} />
          <Text style={[styles.disabledTitle, { color: colors.foreground }]}>Transcript Required</Text>
          <Text style={[styles.disabledSubtitle, { color: colors.mutedForeground }]}>
            You need to generate a transcript of the meeting before you can chat with the AI.
          </Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          style={styles.list}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          nestedScrollEnabled={true}
        >
          {chat.length === 0 ? (
            fetching ? (
              <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
            ) : (
              <View style={styles.empty}>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  Ask anything about this meeting's transcript!
                </Text>
                <View style={styles.chips}>
                  {SUGGESTIONS.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.chip, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}
                      onPress={() => setQuestion(s)}
                    >
                      <Text style={[styles.chipText, { color: colors.primary }]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )
          ) : (
            chat.map((item) => renderMsg({ item }))
          )}
        </ScrollView>
      )}

      {/* Thinking indicator */}
      {loading && (
        <View style={styles.thinkingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.thinkingText, { color: colors.mutedForeground }]}>Thinking...</Text>
        </View>
      )}

      {/* Input */}
      <View style={[styles.inputRow, { borderTopColor: colors.border + "40" }]}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, opacity: hasTranscript ? 1 : 0.5 }]}
          placeholder={hasTranscript ? "Ask a question..." : "Generate transcript first..."}
          placeholderTextColor={colors.mutedForeground}
          value={question}
          onChangeText={setQuestion}
          multiline
          editable={hasTranscript && !loading}
          onSubmitEditing={handleAsk}
          returnKeyType="send"
        />
        <TouchableOpacity
          onPress={handleAsk}
          style={[styles.sendBtn, { backgroundColor: colors.primary, opacity: (hasTranscript && question.trim()) ? 1 : 0.4 }]}
          disabled={!hasTranscript || !question.trim() || loading}
        >
          <Ionicons name="send" size={20} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    overflow: "hidden",
    marginVertical: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: { ...typography.label, fontWeight: "600" },
  list: { flex: 1, padding: spacing.md },
  bubble: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    maxWidth: "90%",
  },
  aiBubble:   { alignSelf: "flex-start", borderBottomLeftRadius: 4 },
  userBubble: { alignSelf: "flex-end", borderBottomRightRadius: 4 },
  bubbleText: { ...typography.bodySmall, lineHeight: 18 },
  empty: { alignItems: "center", paddingHorizontal: spacing.md },
  emptyText: { ...typography.bodySmall, textAlign: "center", marginTop: spacing["5xl"], opacity: 0.6 },
  chips: { flexDirection: "column", gap: spacing.sm, marginTop: spacing.lg, width: "100%" },
  chip: { borderWidth: 1, borderRadius: borderRadius.xl, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, alignItems: "center" },
  chipText: { fontSize: 12, fontWeight: "500", textAlign: "center" },
  thinkingRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: spacing.xs },
  thinkingText: { fontSize: 12, fontStyle: "italic" },
  inputRow: { flexDirection: "row", alignItems: "flex-end", padding: spacing.sm, borderTopWidth: 1, gap: spacing.sm },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    fontSize: 14,
  },
  sendBtn: { width: 40, height: 40, borderRadius: borderRadius.lg, alignItems: "center", justifyContent: "center" },
  disabledContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  disabledTitle: {
    ...typography.body,
    fontWeight: "bold",
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  disabledSubtitle: {
    ...typography.caption,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: spacing.md,
  },
});
