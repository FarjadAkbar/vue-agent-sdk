import { computed, inject, provide, ref, type ComputedRef, type InjectionKey, type Ref } from "vue";
import type { ConnectorApp, ConnectorStatus } from "./types";

/** A custom MCP server the user adds from the "Custom MCP" tab. */
export interface CustomMcp {
  id: string;
  name: string;
  url: string;
}

/**
 * Shared connectors state, created by {@link useConnectors} and consumed by
 * <ChatConnectors>, <ChatConnectorsModal>, and <ChatSuggestion>. Holds the
 * app catalog, connection state, and the modal's open/close state.
 */
export interface ConnectorsStore {
  /** The Composio app catalog shown in the modal. */
  apps: Ref<ConnectorApp[]>;
  /** Connected app ids (Composio + custom MCP). */
  connectedIds: Ref<Set<string>>;
  /** Apps currently mid-connection (shows a spinner / "Connecting…"). */
  connectingIds: Ref<Set<string>>;
  /** Custom MCP servers added by the user. */
  customMcps: Ref<CustomMcp[]>;
  /** Whether the "Custom MCP" tab is enabled. */
  customEnabled: Ref<boolean>;
  /** Modal visibility. */
  isOpen: Ref<boolean>;
  /** Apps that are connected (resolved objects), for chips. */
  connectedApps: ComputedRef<ConnectorApp[]>;

  open: () => void;
  close: () => void;
  isConnected: (appId: string) => boolean;
  status: (appId: string) => ConnectorStatus;
  /** Begin connecting an app. Resolves once "connected" (simulated auth). */
  connect: (appId: string) => Promise<void>;
  disconnect: (appId: string) => void;
  addCustomMcp: (mcp: { name: string; url: string }) => CustomMcp;
}

export const ConnectorsKey: InjectionKey<ConnectorsStore> = Symbol("agent-connectors");

export interface UseConnectorsOptions {
  /** Initial app catalog. */
  apps?: ConnectorApp[];
  /** Initially-connected app ids. */
  connected?: string[];
  /** Enable the custom MCP tab (default true). */
  custom?: boolean;
  /**
   * Hook to perform the real connection (e.g. open Composio OAuth). Resolve to
   * complete the connection, reject to surface an error. When omitted, a short
   * delay simulates the auth handshake (useful for demos).
   */
  onConnect?: (app: ConnectorApp) => Promise<void> | void;
  /** Hook for disconnecting. */
  onDisconnect?: (app: ConnectorApp) => void;
}

/**
 * Create and provide the connectors store. Call once in a parent (e.g. App)
 * so nested <ChatConnectors>, <ChatConnectorsModal>, and <ChatSuggestion>
 * can inject it. Returns the store for direct use.
 */
export function useConnectors(options: UseConnectorsOptions = {}): ConnectorsStore {
  const apps = ref<ConnectorApp[]>(options.apps ?? []);
  const connectedIds = ref<Set<string>>(new Set(options.connected ?? []));
  const connectingIds = ref<Set<string>>(new Set());
  const customMcps = ref<CustomMcp[]>([]);
  const customEnabled = ref(options.custom ?? true);
  const isOpen = ref(false);

  const findApp = (id: string) =>
    apps.value.find((a) => a.id === id) ?? customMcps.value.find((m) => m.id === id);

  const connectedApps = computed<ConnectorApp[]>(() =>
    [...connectedIds.value]
      .map((id) => {
        const app = findApp(id);
        if (!app) return undefined;
        return "url" in app
          ? { id: app.id, name: app.name, kind: "mcp" as const, url: (app as CustomMcp).url }
          : (app as ConnectorApp);
      })
      .filter((a): a is ConnectorApp => Boolean(a)),
  );

  function isConnected(appId: string): boolean {
    return connectedIds.value.has(appId);
  }

  function status(appId: string): ConnectorStatus {
    if (connectedIds.value.has(appId)) return "connected";
    if (connectingIds.value.has(appId)) return "connecting";
    const app = apps.value.find((a) => a.id === appId);
    return app?.requiresAuth ? "needs_auth" : "available";
  }

  async function connect(appId: string): Promise<void> {
    if (connectedIds.value.has(appId) || connectingIds.value.has(appId)) return;
    const app = apps.value.find((a) => a.id === appId);
    connectingIds.value = new Set(connectingIds.value).add(appId);
    try {
      if (options.onConnect && app) {
        await options.onConnect(app);
      } else {
        // Simulate an auth handshake so the modal can show connecting steps.
        await new Promise((r) => setTimeout(r, 900));
      }
      connectedIds.value = new Set(connectedIds.value).add(appId);
    } finally {
      const next = new Set(connectingIds.value);
      next.delete(appId);
      connectingIds.value = next;
    }
  }

  function disconnect(appId: string): void {
    const next = new Set(connectedIds.value);
    next.delete(appId);
    connectedIds.value = next;
    const app = apps.value.find((a) => a.id === appId);
    if (options.onDisconnect && app) options.onDisconnect(app);
  }

  function addCustomMcp(mcp: { name: string; url: string }): CustomMcp {
    const entry: CustomMcp = {
      id: `mcp-${Math.random().toString(36).slice(2)}`,
      name: mcp.name,
      url: mcp.url,
    };
    customMcps.value = [...customMcps.value, entry];
    connectedIds.value = new Set(connectedIds.value).add(entry.id);
    return entry;
  }

  const store: ConnectorsStore = {
    apps,
    connectedIds,
    connectingIds,
    customMcps,
    customEnabled,
    isOpen,
    connectedApps,
    open: () => (isOpen.value = true),
    close: () => (isOpen.value = false),
    isConnected,
    status,
    connect,
    disconnect,
    addCustomMcp,
  };

  provide(ConnectorsKey, store);
  return store;
}

/** Access the connectors store from a descendant of {@link useConnectors}. */
export function injectConnectors(): ConnectorsStore | null {
  return inject(ConnectorsKey, null);
}
