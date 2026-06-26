<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    /** An Error instance or a plain message string. */
    error: Error | string | null;
    /** Show a retry button (emits `retry`). */
    retryable?: boolean;
    /** Show a dismiss button (emits `dismiss`). */
    dismissible?: boolean;
  }>(),
  { retryable: false, dismissible: true },
);

const emit = defineEmits<{
  retry: [];
  dismiss: [];
}>();

const message = computed(() => {
  if (!props.error) return "";
  return typeof props.error === "string" ? props.error : props.error.message;
});
</script>

<template>
  <div
    class="flex shrink-0 items-center gap-2 border-t border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400"
    role="alert"
  >
    <svg viewBox="0 0 24 24" class="size-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16h.01" stroke-linecap="round" stroke-linejoin="round" />
    </svg>

    <span class="flex-1">
      <slot :message="message">{{ message }}</slot>
    </span>

    <button
      v-if="retryable"
      type="button"
      class="rounded-lg px-2 py-0.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200"
      @click="emit('retry')"
    >
      Retry
    </button>
    <button
      v-if="dismissible"
      type="button"
      class="rounded-lg px-2 py-0.5 text-xs text-red-300/80 transition-colors hover:bg-red-500/10 hover:text-red-200"
      aria-label="Dismiss error"
      @click="emit('dismiss')"
    >
      Dismiss
    </button>
  </div>
</template>
