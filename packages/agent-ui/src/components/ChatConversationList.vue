<script setup lang="ts">
import type { Conversation } from "../types";

/**
 * Renders a list of saved conversations (e.g. "Recent Conversations") with an
 * active highlight and select/delete actions. Override the `#item` slot for a
 * custom row, or `#empty` for the empty state.
 *
 * ```vue
 * <ChatConversationList
 *   :conversations="conversations"
 *   :active-id="activeId"
 *   deletable
 *   @select="open"
 *   @delete="remove"
 * />
 * ```
 */
withDefaults(
  defineProps<{
    conversations: Conversation[];
    /** Id of the currently open conversation (highlighted). */
    activeId?: string;
    /** Show a delete button on each row. */
    deletable?: boolean;
    /** Optional heading shown above the list. */
    label?: string;
  }>(),
  { deletable: false },
);

const emit = defineEmits<{
  select: [id: string];
  delete: [id: string];
}>();
</script>

<template>
  <nav class="flex flex-col gap-0.5">
    <p
      v-if="label"
      class="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--agent-muted)]"
    >
      {{ label }}
    </p>

    <div
      v-if="conversations.length === 0"
      class="px-2 py-6 text-center text-xs text-[var(--agent-muted)]"
    >
      <slot name="empty">No conversations yet.</slot>
    </div>

    <div
      v-for="conv in conversations"
      :key="conv.id"
      class="group/conv flex items-center gap-1 rounded-lg pr-1 transition-colors"
      :class="
        conv.id === activeId
          ? 'bg-[var(--agent-surface-2)]'
          : 'hover:bg-[var(--agent-surface-2)]/60'
      "
    >
      <button
        type="button"
        class="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left text-sm"
        @click="emit('select', conv.id)"
      >
        <slot name="item" :conversation="conv" :active="conv.id === activeId">
          <svg
            viewBox="0 0 24 24"
            class="size-4 shrink-0 text-[var(--agent-muted)]"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span class="min-w-0 flex-1 truncate">{{ conv.title }}</span>
        </slot>
      </button>

      <button
        v-if="deletable"
        type="button"
        class="flex size-7 shrink-0 items-center justify-center rounded-md text-[var(--agent-muted)] opacity-0 transition-opacity hover:text-red-400 focus:opacity-100 group-hover/conv:opacity-100"
        aria-label="Delete conversation"
        @click.stop="emit('delete', conv.id)"
      >
        <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2">
          <path
            d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>
  </nav>
</template>
