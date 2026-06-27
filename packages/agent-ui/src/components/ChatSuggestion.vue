<script setup lang="ts">
import { computed } from "vue";
import type { Suggestion } from "../types";
import { injectConnectors } from "../connectors";

/**
 * A connector/MCP suggestion card (as emitted in structured output). Resolves
 * its live connection state from the connectors store and offers an action
 * (Log in / Connect / Manage). Connecting opens <ChatConnectorsModal>.
 */
const props = defineProps<{ suggestion: Suggestion }>();

const store = injectConnectors();

const appId = computed(() => props.suggestion.app ?? props.suggestion.id);

const liveStatus = computed(() => {
  if (store) return store.status(appId.value);
  return props.suggestion.status ?? "needs_auth";
});

const connected = computed(() => liveStatus.value === "connected");
const connecting = computed(() => liveStatus.value === "connecting");

const initial = computed(() => props.suggestion.name.charAt(0).toUpperCase());

const actionLabel = computed(() => {
  if (connected.value) return "Manage";
  if (connecting.value) return "Connecting…";
  return props.suggestion.actionLabel ?? "Log in";
});

const subtitle = computed(() => {
  if (connected.value) return "Connected";
  return props.suggestion.description ?? "Please login to use this connector";
});

function onAction() {
  if (!store) return;
  // Open the modal so the user can complete the (OAuth) connection flow.
  store.open();
}
</script>

<template>
  <div
    class="flex items-center gap-3 rounded-xl border border-[var(--agent-border)] bg-[var(--agent-bg)] px-3 py-2.5"
  >
    <img
      v-if="suggestion.icon"
      :src="suggestion.icon"
      :alt="suggestion.name"
      class="size-9 shrink-0 rounded-lg object-cover"
    />
    <span
      v-else
      class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--agent-surface-2)] text-sm font-semibold text-[var(--agent-fg)]"
    >
      {{ initial }}
    </span>

    <div class="min-w-0 flex-1">
      <p class="truncate text-sm font-semibold text-[var(--agent-fg)]">
        {{ suggestion.name }}
        <span
          v-if="suggestion.kind === 'mcp'"
          class="ml-1 rounded bg-[var(--agent-surface-2)] px-1 py-0.5 text-[10px] font-medium uppercase text-[var(--agent-muted)]"
          >MCP</span
        >
      </p>
      <p class="truncate text-xs text-[var(--agent-muted)]">{{ subtitle }}</p>
    </div>

    <button
      type="button"
      class="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
      :class="
        connected
          ? 'bg-[var(--agent-surface-2)] text-[var(--agent-fg)] hover:opacity-80'
          : 'bg-[var(--agent-fg)] text-[var(--agent-bg)] hover:opacity-90'
      "
      :disabled="connecting"
      @click="onAction"
    >
      <svg
        v-if="connecting"
        viewBox="0 0 24 24"
        class="size-3.5 animate-spin"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
      >
        <path d="M21 12a9 9 0 1 1-6.22-8.56" stroke-linecap="round" />
      </svg>
      <svg
        v-else-if="connected"
        viewBox="0 0 24 24"
        class="size-3.5"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
      >
        <path d="M20 6 9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      {{ actionLabel }}
    </button>
  </div>
</template>
