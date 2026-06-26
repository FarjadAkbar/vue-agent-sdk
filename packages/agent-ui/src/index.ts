import "./styles/theme.css";

export { default as ChatWindow } from "./components/ChatWindow.vue";
export { default as ChatHeader } from "./components/ChatHeader.vue";
export { default as ChatMessages } from "./components/ChatMessages.vue";
export { default as ChatMessage } from "./components/ChatMessage.vue";
export { default as ChatInput } from "./components/ChatInput.vue";
export { default as ChatError } from "./components/ChatError.vue";
// Backwards-compatible alias for the old name.
export { default as ChatComposer } from "./components/ChatInput.vue";

// Rich-content building blocks (also used internally by <ChatMessage>).
export { default as MarkdownContent } from "./components/MarkdownContent.vue";
export { default as ChatReasoning } from "./components/ChatReasoning.vue";
export { default as ChatToolCall } from "./components/ChatToolCall.vue";
export { default as ChatAttachments } from "./components/ChatAttachments.vue";
export { default as ChatCitations } from "./components/ChatCitations.vue";

export { renderMarkdown } from "./markdown";

export { useChat } from "./composables/useChat";
export type { UseChatOptions, UseChatReturn, ChatStatus } from "./composables/useChat";
export { useLenis } from "./composables/useLenis";
export type { UseLenisOptions } from "./composables/useLenis";
export { useTheme } from "./composables/useTheme";
export type {
  UseThemeOptions,
  UseThemeReturn,
  ThemeName,
  ThemeSetting,
} from "./composables/useTheme";

export type {
  Message,
  ChatRole,
  ChatTransport,
  ChatTransportOptions,
  MessageStatus,
  Attachment,
  ToolCall,
  ToolCallStatus,
  Citation,
} from "./types";
