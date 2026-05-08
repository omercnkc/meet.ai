/**
 * AIQuestionBox — Interactive Q&A interface for meetings.
 * Only answers based on the transcript as per requirements.
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, spacing, typography, borderRadius } from "../theme";
import { askAI, getAIMessages, AIMessage } from "../services/ai";

interface AIQuestionBoxProps {
  meetingId: string;
}

export function AIQuestionBox({ meetingId }: AIQuestionBoxProps) {
  const { colors } = useTheme();
  const { height } = useWindowDimensions();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadMessages();
  }, [meetingId]);

  const loadMessages = async () => {
    try {
      const data = await getAIMessages(meetingId);
      setMessages(data);
    } catch (err) {
      console.error("Failed to load AI messages", err);
    } finally {
      setFetching(false);
    }
  };

  const handleAsk = async () => {
    if (!question.trim() || loading) return;

    const userMsg: AIMessage = {
      id: Date.now().toString(),
      meeting_id: meetingId,
      role: "user",
      content: question.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");
    setLoading(true);

    try {
      const { response } = await askAI(meetingId, userMsg.content);
      const aiMsg: AIMessage = {
        id: (Date.now() + 1).toString(),
        meeting_id: meetingId,
        role: "assistant",
        content: response,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errMsg: AIMessage = {
        id: (Date.now() + 1).toString(),
        meeting_id: meetingId,
        role: "assistant",
        content: err.message || "Sorry, I couldn't process that request.",
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: AIMessage }) => {
    const isAssistant = item.role === "assistant";
    return (
      <View
        style={[
          styles.messageBubble,
          isAssistant ? styles.assistantBubble : styles.userBubble,
          { backgroundColor: isAssistant ? colors.secondary : colors.primary },
        ]}
      >
        <Text
          style={[
            styles.messageText,
            { color: isAssistant ? colors.foreground : colors.primaryForeground },
          ]}
        >
          {item.content}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { borderColor: colors.border + "66", height: Math.min(400, height * 0.5) }]}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={18} color={colors.primary} />
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>AI Assistant</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item, i) => item.id || String(i)}
        style={styles.messageList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          fetching ? (
            <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
          ) : (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Ask anything about this meeting's transcript!
            </Text>
          )
        }
      />

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Thinking...</Text>
        </View>
      )}

      <View style={[styles.inputRow, { borderTopColor: colors.border + "40" }]}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
              color: colors.foreground,
            },
          ]}
          placeholder="Ask a question..."
          placeholderTextColor={colors.mutedForeground}
          value={question}
          onChangeText={setQuestion}
          multiline
          editable={!loading}
        />
        <TouchableOpacity
          onPress={handleAsk}
          style={[
            styles.sendBtn,
            { backgroundColor: colors.primary, opacity: question.trim() ? 1 : 0.6 },
          ]}
          disabled={!question.trim()}
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
    borderBottomColor: "#00000010",
  },
  headerTitle: {
    ...typography.label,
    fontWeight: "600",
  },
  messageList: {
    flex: 1,
    padding: spacing.md,
  },
  messageBubble: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    maxWidth: "90%",
  },
  assistantBubble: {
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  messageText: {
    ...typography.bodySmall,
    lineHeight: 18,
  },
  emptyText: {
    ...typography.bodySmall,
    textAlign: "center",
    marginTop: spacing["5xl"],
    opacity: 0.6,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  loadingText: {
    fontSize: 12,
    fontStyle: "italic",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: spacing.sm,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
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
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
});
