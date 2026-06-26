<script setup lang="ts">
import { computed } from "vue";
import { useChatLayout } from "../layout";

/**
 * A collapsible sidebar panel for the app shell. On desktop it sits in-flow
 * and collapses to zero width when closed; on mobile it becomes an overlay
 * drawer with a backdrop. Use the slots to compose its contents:
 *
 * ```vue
 * <ChatSidebar>
 *   <template #header><button>New chat</button></template>
 *   <ChatConversationList :conversations="…" />
 *   <template #footer>…</template>
 * </ChatSidebar>
 * ```
 */
withDefaults(
  defineProps<{
    /** Width when expanded (any CSS length). */
    width?: string;
  }>(),
  { width: "17rem" },
);

const layout = useChatLayout();
// Default to open when used without a <ChatLayout> wrapper.
const open = computed(() => layout?.sidebarOpen.value ?? true);
function close() {
  layout?.closeSidebar();
}
</script>

<template>
  <!-- Mobile backdrop -->
  <div
    v-if="open"
    class="fixed inset-0 z-20 bg-black/50 md:hidden"
    aria-hidden="true"
    @click="close"
  />

  <aside
    class="agent-sidebar z-30 flex h-full shrink-0 flex-col overflow-hidden border-r border-[var(--agent-border)] bg-[var(--agent-surface)] text-[var(--agent-fg)] transition-[width,transform] duration-200 ease-out max-md:fixed max-md:inset-y-0 max-md:left-0"
    :class="open ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:border-r-0'"
    :style="open ? { width } : undefined"
  >
    <!-- Fixed-width inner wrapper so content doesn't reflow while collapsing. -->
    <div class="flex h-full flex-col" :style="{ width }">
      <div v-if="$slots.header" class="shrink-0 border-b border-[var(--agent-border)] p-3">
        <slot name="header" />
      </div>

      <div class="agent-scroll min-h-0 flex-1 overflow-y-auto p-2">
        <slot />
      </div>

      <div v-if="$slots.footer" class="shrink-0 border-t border-[var(--agent-border)] p-3">
        <slot name="footer" />
      </div>
    </div>
  </aside>
</template>
