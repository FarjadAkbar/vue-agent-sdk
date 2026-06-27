<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import type { ConnectorApp } from "../types";
import { injectConnectors } from "../connectors";

/**
 * A modal for browsing and connecting Composio apps (and adding custom MCP
 * servers). Coordinates with <ChatConnectors> / <ChatSuggestion> via the
 * connectors store (call `useConnectors()` in a parent):
 *
 * ```vue
 * <ChatConnectorsModal :apps="composioApps" :custom="true" />
 * ```
 */
const props = withDefaults(
  defineProps<{
    /** App catalog to display (synced into the store). */
    apps?: ConnectorApp[];
    /** Enable the "Custom MCP" tab (default true). */
    custom?: boolean;
  }>(),
  { custom: true },
);

const store = injectConnectors();

onMounted(() => {
  if (!store) return;
  if (props.apps) store.apps.value = props.apps;
  store.customEnabled.value = props.custom;
});
watch(
  () => props.apps,
  (apps) => {
    if (store && apps) store.apps.value = apps;
  },
);

type Tab = "apps" | "custom";
const tab = ref<Tab>("apps");
const query = ref("");

const mcpName = ref("");
const mcpUrl = ref("");

const apps = computed(() => store?.apps.value ?? []);
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return apps.value;
  return apps.value.filter(
    (a) => a.name.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q),
  );
});

function statusOf(app: ConnectorApp) {
  return store?.status(app.id) ?? "available";
}

function toggle(app: ConnectorApp) {
  if (!store) return;
  if (store.isConnected(app.id)) store.disconnect(app.id);
  else void store.connect(app.id);
}

function addMcp() {
  if (!store || !mcpName.value.trim() || !mcpUrl.value.trim()) return;
  store.addCustomMcp({ name: mcpName.value.trim(), url: mcpUrl.value.trim() });
  mcpName.value = "";
  mcpUrl.value = "";
  tab.value = "apps";
}
</script>

<template>
  <Teleport to="body">
    <Transition name="agent-modal">
      <div
        v-if="store?.isOpen.value"
        class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm sm:p-8"
        @click.self="store.close()"
      >
        <div
          class="agent-scope mt-8 w-full max-w-2xl rounded-2xl border border-[var(--agent-border)] bg-[var(--agent-bg)] shadow-2xl"
        >
          <!-- Header -->
          <div class="flex items-center justify-between px-5 pt-5">
            <h2 class="text-lg font-semibold text-[var(--agent-fg)]">Connectors</h2>
            <button
              type="button"
              class="flex size-8 items-center justify-center rounded-lg text-[var(--agent-muted)] transition-colors hover:bg-[var(--agent-surface-2)] hover:text-[var(--agent-fg)]"
              aria-label="Close"
              @click="store.close()"
            >
              <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6 6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </div>

          <!-- Search -->
          <div class="px-5 pt-4">
            <div
              class="flex items-center gap-2 rounded-xl border border-[var(--agent-border)] bg-[var(--agent-surface)] px-3 py-2.5"
            >
              <svg
                viewBox="0 0 24 24"
                class="size-4 text-[var(--agent-muted)]"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" stroke-linecap="round" />
              </svg>
              <input
                v-model="query"
                type="text"
                placeholder="Search connectors"
                class="flex-1 bg-transparent text-sm text-[var(--agent-fg)] placeholder:text-[var(--agent-muted)] focus:outline-none"
              />
            </div>
          </div>

          <!-- Tabs -->
          <div class="flex items-center gap-1 px-5 pt-4">
            <button
              type="button"
              class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
              :class="
                tab === 'apps'
                  ? 'bg-[var(--agent-surface-2)] text-[var(--agent-fg)]'
                  : 'text-[var(--agent-muted)] hover:text-[var(--agent-fg)]'
              "
              @click="tab = 'apps'"
            >
              Apps
            </button>
            <button
              v-if="store.customEnabled.value"
              type="button"
              class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
              :class="
                tab === 'custom'
                  ? 'bg-[var(--agent-surface-2)] text-[var(--agent-fg)]'
                  : 'text-[var(--agent-muted)] hover:text-[var(--agent-fg)]'
              "
              @click="tab = 'custom'"
            >
              Custom MCP
            </button>
          </div>

          <!-- Apps grid -->
          <div v-if="tab === 'apps'" class="max-h-[55vh] overflow-y-auto p-5">
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div
                v-for="app in filtered"
                :key="app.id"
                class="flex items-start gap-3 rounded-xl border border-[var(--agent-border)] bg-[var(--agent-surface)] p-3"
              >
                <img
                  v-if="app.icon"
                  :src="app.icon"
                  :alt="app.name"
                  class="size-9 shrink-0 rounded-lg object-cover"
                />
                <span
                  v-else
                  class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--agent-surface-2)] text-sm font-semibold text-[var(--agent-fg)]"
                  >{{ app.name.charAt(0).toUpperCase() }}</span
                >
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold text-[var(--agent-fg)]">{{ app.name }}</p>
                  <p v-if="app.description" class="mt-0.5 text-xs text-[var(--agent-muted)]">
                    {{ app.description }}
                  </p>
                </div>
                <button
                  type="button"
                  class="flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors"
                  :class="
                    statusOf(app) === 'connected'
                      ? 'text-[var(--agent-primary)]'
                      : 'text-[var(--agent-muted)] hover:bg-[var(--agent-surface-2)] hover:text-[var(--agent-fg)]'
                  "
                  :aria-label="statusOf(app) === 'connected' ? 'Disconnect' : 'Connect'"
                  @click="toggle(app)"
                >
                  <svg
                    v-if="statusOf(app) === 'connecting'"
                    viewBox="0 0 24 24"
                    class="size-4 animate-spin"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <path d="M21 12a9 9 0 1 1-6.22-8.56" stroke-linecap="round" />
                  </svg>
                  <svg
                    v-else-if="statusOf(app) === 'connected'"
                    viewBox="0 0 24 24"
                    class="size-4"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <path d="M20 6 9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                  <svg
                    v-else
                    viewBox="0 0 24 24"
                    class="size-4"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <path d="M12 5v14M5 12h14" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
            <p v-if="!filtered.length" class="py-8 text-center text-sm text-[var(--agent-muted)]">
              No connectors match "{{ query }}".
            </p>
          </div>

          <!-- Custom MCP -->
          <div v-else class="max-h-[55vh] overflow-y-auto p-5">
            <div class="flex flex-col gap-3">
              <p class="text-sm text-[var(--agent-muted)]">
                Connect a custom MCP server by URL. It becomes available to the agent immediately.
              </p>
              <label class="flex flex-col gap-1">
                <span class="text-xs font-medium text-[var(--agent-fg)]">Name</span>
                <input
                  v-model="mcpName"
                  type="text"
                  placeholder="My MCP server"
                  class="rounded-xl border border-[var(--agent-border)] bg-[var(--agent-surface)] px-3 py-2 text-sm text-[var(--agent-fg)] placeholder:text-[var(--agent-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--agent-primary)]/40"
                />
              </label>
              <label class="flex flex-col gap-1">
                <span class="text-xs font-medium text-[var(--agent-fg)]">Server URL</span>
                <input
                  v-model="mcpUrl"
                  type="text"
                  placeholder="https://example.com/mcp"
                  class="rounded-xl border border-[var(--agent-border)] bg-[var(--agent-surface)] px-3 py-2 text-sm text-[var(--agent-fg)] placeholder:text-[var(--agent-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--agent-primary)]/40"
                />
              </label>
              <button
                type="button"
                class="self-start rounded-xl bg-[var(--agent-primary)] px-4 py-2 text-sm font-medium text-[var(--agent-primary-fg)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                :disabled="!mcpName.trim() || !mcpUrl.trim()"
                @click="addMcp"
              >
                Add MCP server
              </button>

              <div v-if="store.customMcps.value.length" class="mt-2 flex flex-col gap-2">
                <p class="text-xs font-medium text-[var(--agent-muted)]">Your MCP servers</p>
                <div
                  v-for="mcp in store.customMcps.value"
                  :key="mcp.id"
                  class="flex items-center gap-3 rounded-xl border border-[var(--agent-border)] bg-[var(--agent-surface)] p-3"
                >
                  <span
                    class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--agent-surface-2)] text-xs font-semibold text-[var(--agent-fg)]"
                    >MCP</span
                  >
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-semibold text-[var(--agent-fg)]">{{ mcp.name }}</p>
                    <p class="truncate text-xs text-[var(--agent-muted)]">{{ mcp.url }}</p>
                  </div>
                  <svg
                    viewBox="0 0 24 24"
                    class="size-4 text-[var(--agent-primary)]"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <path d="M20 6 9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.agent-modal-enter-active,
.agent-modal-leave-active {
  transition: opacity 0.2s ease;
}
.agent-modal-enter-from,
.agent-modal-leave-to {
  opacity: 0;
}
</style>
