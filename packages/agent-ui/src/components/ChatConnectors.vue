<script setup lang="ts">
import { computed, onMounted } from "vue";
import { injectConnectors } from "../connectors";

/**
 * A connectors trigger meant to be nested inside <ChatInput>. Shows the
 * already-connected apps as small icons and opens <ChatConnectorsModal> on
 * click:
 *
 * ```vue
 * <ChatInput v-model="input" @submit="onSubmit">
 *   <ChatAttachment :allowed="['.png']" max-size="1mb" />
 *   <ChatConnectors :connected="['gmail', 'instagram']" />
 * </ChatInput>
 * ```
 *
 * Requires `useConnectors()` to be called in a parent so a store is provided.
 */
const props = withDefaults(
  defineProps<{
    /** App ids to mark connected on mount (e.g. ["gmail", "instagram"]). */
    connected?: string[];
    /** Max number of connected icons to show before "+N". */
    max?: number;
    disabled?: boolean;
  }>(),
  { max: 3, disabled: false },
);

const store = injectConnectors();

onMounted(() => {
  if (!store || !props.connected) return;
  const next = new Set(store.connectedIds.value);
  for (const id of props.connected) next.add(id);
  store.connectedIds.value = next;
});

const connected = computed(() => store?.connectedApps.value ?? []);
const shown = computed(() => connected.value.slice(0, props.max));
const overflow = computed(() => Math.max(0, connected.value.length - props.max));

function open() {
  if (props.disabled) return;
  store?.open();
}
</script>

<template>
  <button
    type="button"
    class="flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-[var(--agent-border)] px-2.5 text-[var(--agent-muted)] transition-colors hover:bg-[var(--agent-surface-2)] hover:text-[var(--agent-fg)] disabled:cursor-not-allowed disabled:opacity-40"
    :disabled="disabled"
    aria-label="Manage connectors"
    @click="open"
  >
    <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2">
      <path
        d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>

    <span v-if="connected.length" class="flex items-center -space-x-1.5">
      <span
        v-for="app in shown"
        :key="app.id"
        class="flex size-5 items-center justify-center overflow-hidden rounded-full border border-[var(--agent-surface)] bg-[var(--agent-surface-2)] text-[9px] font-semibold text-[var(--agent-fg)]"
        :title="app.name"
      >
        <img v-if="app.icon" :src="app.icon" :alt="app.name" class="size-full object-cover" />
        <template v-else>{{ app.name.charAt(0).toUpperCase() }}</template>
      </span>
      <span
        v-if="overflow"
        class="flex size-5 items-center justify-center rounded-full border border-[var(--agent-surface)] bg-[var(--agent-surface-2)] text-[9px] font-semibold text-[var(--agent-muted)]"
        >+{{ overflow }}</span
      >
    </span>
  </button>
</template>
