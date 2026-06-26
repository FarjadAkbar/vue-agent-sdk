<script setup lang="ts">
import { computed } from "vue";
import type { Message } from "../types";
import MarkdownContent from "./MarkdownContent.vue";
import ChatReasoning from "./ChatReasoning.vue";
import ChatToolCall from "./ChatToolCall.vue";
import ChatAttachments from "./ChatAttachments.vue";
import ChatCitations from "./ChatCitations.vue";

const props = withDefaults(
  defineProps<{
    message: Message;
    /** Render assistant/system content as markdown (user stays plain text). */
    markdown?: boolean;
    /** Avatar image URL for this message's role. Falls back to initials. */
    avatar?: string;
    /**
     * Whether to render the avatar. When false (e.g. a grouped follow-up
     * message), a spacer keeps the bubble aligned.
     */
    showAvatar?: boolean;
  }>(),
  { markdown: true, showAvatar: true },
);

const isUser = computed(() => props.message.role === "user");

const isStreaming = computed(
  () => props.message.status === "streaming" || props.message.pending === true,
);

const hasToolCalls = computed(() => (props.message.toolCalls?.length ?? 0) > 0);
const hasAttachments = computed(() => (props.message.attachments?.length ?? 0) > 0);
const hasCitations = computed(() => (props.message.citations?.length ?? 0) > 0);

// Show the typing dots only before anything (reasoning / tools / text) arrives.
const showTyping = computed(
  () =>
    isStreaming.value &&
    !props.message.content &&
    !props.message.reasoning &&
    !hasToolCalls.value,
);

// Render markdown for assistant/system; keep user input verbatim.
const useMarkdown = computed(() => props.markdown && props.message.role !== "user");

const initials = computed(() => {
  if (props.message.role === "user") return "You";
  if (props.message.role === "assistant") return "AI";
  return "Sys";
});

const statusLabel = computed(() => {
  switch (props.message.status) {
    case "sending":
      return "Sending…";
    case "sent":
      return isUser.value ? "Sent" : null;
    case "stopped":
      return "Stopped";
    case "error":
      return props.message.error ?? "Failed to send";
    default:
      return null;
  }
});

const isError = computed(() => props.message.status === "error");
</script>

<template>
  <div class="flex w-full gap-3 px-1 py-1" :class="isUser ? 'flex-row-reverse' : 'flex-row'">
    <!-- Avatar (or spacer to keep grouped messages aligned) -->
    <template v-if="showAvatar">
      <slot name="avatar" :message="message" :avatar="avatar">
        <img
          v-if="avatar"
          :src="avatar"
          :alt="`${message.role} avatar`"
          class="size-8 shrink-0 select-none rounded-full object-cover"
        />
        <div
          v-else
          class="flex size-8 shrink-0 select-none items-center justify-center rounded-full text-[11px] font-semibold"
          :class="
            isUser
              ? 'bg-[var(--agent-primary)] text-[var(--agent-primary-fg)]'
              : 'bg-[var(--agent-surface-2)] text-[var(--agent-fg)]'
          "
        >
          {{ initials }}
        </div>
      </slot>
    </template>
    <div v-else class="size-8 shrink-0" aria-hidden="true" />

    <!-- Bubble + meta -->
    <div class="flex min-w-0 max-w-[85%] flex-col gap-1" :class="isUser ? 'items-end' : 'items-start'">
      <div
        class="group relative min-w-0 rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm transition-colors"
        :class="[
          isUser
            ? 'rounded-tr-sm bg-[var(--agent-primary)] text-[var(--agent-primary-fg)]'
            : 'rounded-tl-sm bg-[var(--agent-surface)] text-[var(--agent-fg)] ring-1 ring-[var(--agent-border)]',
          isError && !isUser ? 'ring-red-500/40' : '',
        ]"
      >
        <slot :message="message">
          <!-- Typing indicator -->
          <span v-if="showTyping" class="flex items-center gap-1 py-1" aria-label="Assistant is typing">
            <span class="agent-typing-dot" />
            <span class="agent-typing-dot" style="animation-delay: 0.15s" />
            <span class="agent-typing-dot" style="animation-delay: 0.3s" />
          </span>

          <template v-else>
            <div class="flex flex-col gap-2">
              <!-- Reasoning / thinking -->
              <ChatReasoning
                v-if="message.reasoning"
                :reasoning="message.reasoning"
                :streaming="isStreaming && !message.content"
              />

              <!-- Tool calls -->
              <ChatToolCall
                v-for="call in message.toolCalls"
                :key="call.id"
                :call="call"
              />

              <!-- Content -->
              <MarkdownContent v-if="message.content && useMarkdown" :content="message.content" />
              <p v-else-if="message.content" class="whitespace-pre-wrap break-words">{{ message.content }}</p>

              <!-- Attachments -->
              <ChatAttachments v-if="hasAttachments" :attachments="message.attachments!" />

              <!-- Citations -->
              <ChatCitations v-if="hasCitations" :citations="message.citations!" />
            </div>
          </template>
        </slot>
      </div>

      <!-- Status meta -->
      <div
        v-if="statusLabel"
        class="flex items-center gap-1 px-1 text-[11px]"
        :class="isError ? 'text-red-400' : 'text-[var(--agent-muted)]'"
      >
        <svg
          v-if="message.status === 'sent' && isUser"
          viewBox="0 0 24 24"
          class="size-3"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path d="M20 6 9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <svg
          v-else-if="message.status === 'error'"
          viewBox="0 0 24 24"
          class="size-3"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path d="M12 8v5M12 16h.01" stroke-linecap="round" stroke-linejoin="round" />
          <circle cx="12" cy="12" r="9" />
        </svg>
        <span>{{ statusLabel }}</span>
      </div>
    </div>
  </div>
</template>
