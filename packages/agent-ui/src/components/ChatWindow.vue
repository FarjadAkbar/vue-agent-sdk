<script setup lang="ts">
/**
 * ChatWindow is a styled layout shell. Compose the conversation by nesting
 * the SDK's building blocks inside it:
 *
 * ```vue
 * <ChatWindow>
 *   <ChatHeader title="Demo Agent" :status="status" />
 *   <ChatMessages :messages="messages" />
 *   <ChatError v-if="error" :error="error" />
 *   <ChatInput v-model="input" :loading="isLoading" @submit="handleSubmit" />
 * </ChatWindow>
 * ```
 *
 * It's a flex column: <ChatMessages> grows to fill the space and scrolls,
 * while the header / error / input sit at fixed height above and below.
 */

defineProps<{
  /**
   * Scope a theme to this widget only (e.g. "dark", "emerald"). Sets a
   * `data-theme` attribute so the CSS variables apply within the window.
   * Omit to inherit the document/ancestor theme.
   */
  theme?: string;
}>();
</script>

<template>
  <div
    class="agent-window flex h-full w-full flex-col overflow-hidden rounded-2xl border border-[var(--agent-border)] bg-[var(--agent-bg)] text-[var(--agent-fg)]"
    :data-theme="theme || undefined"
  >
    <slot />
  </div>
</template>
