<script setup lang="ts">
import { onMounted, provide, ref } from "vue";
import { ChatLayoutKey } from "../layout";

/**
 * App-shell layout: a flex row holding a <ChatSidebar> and the main content
 * (e.g. <ChatWindow>). It owns the sidebar's open/closed state and shares it
 * via provide/inject so <ChatSidebarToggle> can control it from anywhere.
 *
 * ```vue
 * <ChatLayout>
 *   <ChatSidebar>…</ChatSidebar>
 *   <ChatWindow>…</ChatWindow>
 * </ChatLayout>
 * ```
 */
const props = withDefaults(
  defineProps<{
    /**
     * Initial sidebar state. When omitted, opens on desktop (>= 768px) and
     * stays closed on small screens.
     */
    defaultOpen?: boolean;
  }>(),
  { defaultOpen: undefined },
);

const sidebarOpen = ref(props.defaultOpen ?? true);

const toggleSidebar = () => (sidebarOpen.value = !sidebarOpen.value);
const openSidebar = () => (sidebarOpen.value = true);
const closeSidebar = () => (sidebarOpen.value = false);

provide(ChatLayoutKey, { sidebarOpen, toggleSidebar, openSidebar, closeSidebar });

onMounted(() => {
  // Auto-collapse on small screens unless the caller forced a state.
  if (props.defaultOpen === undefined && typeof window !== "undefined") {
    sidebarOpen.value = window.innerWidth >= 768;
  }
});
</script>

<template>
  <div
    class="agent-layout relative flex h-full w-full overflow-hidden bg-[var(--agent-bg)] text-[var(--agent-fg)]"
  >
    <slot />
  </div>
</template>
