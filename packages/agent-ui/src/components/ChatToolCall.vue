<script setup lang="ts">
import { computed, ref } from "vue";
import type { ToolCall } from "../types";

const props = defineProps<{
  call: ToolCall;
}>();

const open = ref(false);

function format(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

const argsText = computed(() => format(props.call.args));
const resultText = computed(() => format(props.call.result));

const statusClass = computed(() => {
  switch (props.call.status) {
    case "success":
      return "bg-emerald-500/15 text-emerald-400";
    case "error":
      return "bg-red-500/15 text-red-400";
    case "running":
    case "pending":
      return "bg-amber-500/15 text-amber-400";
    default:
      return "bg-[var(--agent-surface-2)] text-[var(--agent-muted)]";
  }
});
</script>

<template>
  <div class="rounded-xl border border-[var(--agent-border)] bg-[var(--agent-surface)]/60">
    <button
      type="button"
      class="flex w-full items-center gap-2 px-3 py-2 text-left text-xs"
      :aria-expanded="open"
      @click="open = !open"
    >
      <svg viewBox="0 0 24 24" class="size-3.5 shrink-0 text-[var(--agent-muted)]" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4l-6 6 2 2 6-6a4 4 0 0 0 5.4-5.4l-2.3 2.3-2-2 2.3-2.3Z" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span class="font-medium text-[var(--agent-fg)]">{{ call.name }}</span>
      <span v-if="call.status" class="rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize" :class="statusClass">
        {{ call.status }}
      </span>
      <svg
        viewBox="0 0 24 24"
        class="ml-auto size-3.5 shrink-0 text-[var(--agent-muted)] transition-transform"
        :class="{ 'rotate-180': open }"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="m6 9 6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <div v-if="open" class="space-y-2 border-t border-[var(--agent-border)] px-3 py-2 text-xs">
      <div v-if="argsText">
        <div class="mb-1 font-medium text-[var(--agent-muted)]">Arguments</div>
        <pre class="agent-tool-pre">{{ argsText }}</pre>
      </div>
      <div v-if="resultText">
        <div class="mb-1 font-medium text-[var(--agent-muted)]">Result</div>
        <pre class="agent-tool-pre">{{ resultText }}</pre>
      </div>
    </div>
  </div>
</template>
