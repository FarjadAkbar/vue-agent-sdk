import { inject, type InjectionKey, type Ref } from "vue";

/**
 * Shared sidebar state provided by <ChatLayout> and consumed by
 * <ChatSidebar> / <ChatSidebarToggle>, so a toggle anywhere in the tree can
 * open/close the sidebar without prop drilling.
 */
export interface ChatLayoutApi {
  /** Whether the sidebar is currently open/expanded. */
  sidebarOpen: Ref<boolean>;
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
}

export const ChatLayoutKey: InjectionKey<ChatLayoutApi> = Symbol("agent-chat-layout");

/**
 * Access the surrounding <ChatLayout> context. Returns `null` when used
 * outside a layout (so components degrade gracefully).
 */
export function useChatLayout(): ChatLayoutApi | null {
  return inject(ChatLayoutKey, null);
}
