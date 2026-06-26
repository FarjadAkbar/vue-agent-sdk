<script setup lang="ts">
import { ref } from "vue";
import MarkdownContent from "./MarkdownContent.vue";

withDefaults(
  defineProps<{
    reasoning: string;
    /** Streaming reasoning starts open; finished reasoning starts collapsed. */
    streaming?: boolean;
  }>(),
  { streaming: false },
);

const open = ref(false);
</script>

<template>
  <div class="rounded-xl border border-[var(--agent-border)] bg-[var(--agent-surface)]/60 text-[var(--agent-fg)]">
    <button
      type="button"
      class="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-[var(--agent-muted)] transition-colors hover:text-[var(--agent-fg)]"
      :aria-expanded="open || streaming"
      @click="open = !open"
    >
      <svg viewBox="0 0 24 24" class="size-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 3a4 4 0 0 0-4 4c0 1.5.8 2.5 1.5 3.3.5.6.5 1.2.5 1.7M12 3a4 4 0 0 1 4 4c0 1.5-.8 2.5-1.5 3.3-.5.6-.5 1.2-.5 1.7M9.5 12h5M10 15h4M10.5 18h3" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span>{{ streaming ? "Thinking…" : "Reasoning" }}</span>
      <svg
        viewBox="0 0 24 24"
        class="ml-auto size-3.5 shrink-0 transition-transform"
        :class="{ 'rotate-180': open || streaming }"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="m6 9 6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <div v-if="open || streaming" class="border-t border-[var(--agent-border)] px-3 py-2 text-sm text-[var(--agent-muted)]">
      <MarkdownContent :content="reasoning" />
    </div>
  </div>
</template>
