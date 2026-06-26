<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    placeholder?: string;
    /** Greys out the textarea (the field still accepts Stop clicks). */
    disabled?: boolean;
    /**
     * When true, the send button turns into a Stop button that emits `stop`.
     * Typically bound to `useChat().isLoading`.
     */
    loading?: boolean;
    /** Show a "Regenerate" action above the field (emits `regenerate`). */
    canRegenerate?: boolean;
  }>(),
  {
    placeholder: "Send a message...",
    disabled: false,
    loading: false,
    canRegenerate: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
  submit: [];
  stop: [];
  regenerate: [];
}>();

const textarea = ref<HTMLTextAreaElement | null>(null);

const canSend = computed(() => props.modelValue.trim().length > 0 && !props.disabled);

function onInput(event: Event) {
  emit("update:modelValue", (event.target as HTMLTextAreaElement).value);
}

function submit() {
  if (!canSend.value) return;
  emit("submit");
}

function onKeydown(event: KeyboardEvent) {
  // Enter sends, Shift+Enter inserts a newline.
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    if (props.loading) return;
    submit();
  }
}

// Auto-grow the textarea up to a max height.
watch(
  () => props.modelValue,
  async () => {
    await nextTick();
    const el = textarea.value;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  },
);
</script>

<template>
  <div class="flex shrink-0 flex-col gap-2 border-t border-[var(--agent-border)] p-3">
    <!-- Regenerate action -->
    <div v-if="canRegenerate && !loading" class="flex justify-center">
      <button
        type="button"
        class="flex items-center gap-1.5 rounded-full border border-[var(--agent-border)] bg-[var(--agent-surface)] px-3 py-1 text-xs text-[var(--agent-muted)] transition-colors hover:text-[var(--agent-fg)]"
        @click="emit('regenerate')"
      >
        <svg viewBox="0 0 24 24" class="size-3.5" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M3 3v5h5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        Regenerate
      </button>
    </div>

    <form
      class="flex items-end gap-2 rounded-2xl border border-[var(--agent-border)] bg-[var(--agent-surface)] p-2 shadow-sm focus-within:ring-2 focus-within:ring-[var(--agent-primary)]/40"
      @submit.prevent="submit"
    >
      <textarea
        ref="textarea"
        rows="1"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled && !loading"
        class="max-h-40 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-[var(--agent-fg)] placeholder:text-[var(--agent-muted)] focus:outline-none"
        @input="onInput"
        @keydown="onKeydown"
      />

      <!-- Stop button while generating -->
      <button
        v-if="loading"
        type="button"
        class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--agent-surface-2)] text-[var(--agent-fg)] transition-colors hover:opacity-80"
        aria-label="Stop generating"
        @click="emit('stop')"
      >
        <span class="size-3 rounded-[3px] bg-current" />
      </button>

      <!-- Send button otherwise -->
      <button
        v-else
        type="submit"
        :disabled="!canSend"
        class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--agent-primary)] text-[var(--agent-primary-fg)] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Send message"
      >
        <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </form>
  </div>
</template>
