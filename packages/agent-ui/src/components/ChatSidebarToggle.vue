<script setup lang="ts">
import { useChatLayout } from "../layout";

/**
 * A button that toggles the surrounding <ChatLayout>'s sidebar. Drop it in a
 * <ChatHeader>'s #leading slot (or anywhere inside the layout). Override the
 * default slot to customise the icon.
 */
const layout = useChatLayout();
</script>

<template>
  <button
    type="button"
    class="flex size-8 shrink-0 items-center justify-center rounded-lg text-[var(--agent-muted)] transition-colors hover:bg-[var(--agent-surface-2)] hover:text-[var(--agent-fg)]"
    aria-label="Toggle sidebar"
    :aria-expanded="layout?.sidebarOpen.value ?? true"
    @click="layout?.toggleSidebar()"
  >
    <slot>
      <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M9 4v16" stroke-linecap="round" />
      </svg>
    </slot>
  </button>
</template>
