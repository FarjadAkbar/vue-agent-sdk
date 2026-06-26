<script setup lang="ts">
import { computed } from "vue";
import type { ChatStatus } from "../composables/useChat";

const props = withDefaults(
  defineProps<{
    title?: string;
    /** Drives the status dot colour + label. Pass `useChat().status`. */
    status?: ChatStatus;
    /** Show the "· Ready / Generating…" text next to the title. */
    showStatusText?: boolean;
  }>(),
  { title: "AI Assistant", status: "idle", showStatusText: true },
);

const dotClass = computed(() => {
  switch (props.status) {
    case "error":
      return "bg-red-400 shadow-[0_0_0_3px] shadow-red-400/20";
    case "submitting":
    case "streaming":
      return "bg-amber-400 shadow-[0_0_0_3px] shadow-amber-400/20";
    default:
      return "bg-emerald-400 shadow-[0_0_0_3px] shadow-emerald-400/20";
  }
});

const statusText = computed(() => {
  switch (props.status) {
    case "submitting":
      return "Connecting…";
    case "streaming":
      return "Generating…";
    case "error":
      return "Error";
    default:
      return "Ready";
  }
});
</script>

<template>
  <header class="flex shrink-0 items-center gap-3 border-b border-[var(--agent-border)] px-5 py-3.5">
    <slot name="leading" />

    <slot name="status">
      <span class="flex size-2.5 rounded-full" :class="dotClass" />
    </slot>

    <h2 class="text-sm font-semibold">
      <slot name="title">{{ title }}</slot>
    </h2>

    <span v-if="showStatusText" class="text-xs text-[var(--agent-muted)]">· {{ statusText }}</span>

    <div v-if="$slots.actions" class="ml-auto flex flex-wrap items-center justify-end gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>
