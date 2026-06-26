import { onBeforeUnmount, onMounted, ref, watch, type Ref } from "vue";

/** Built-in themes; any string also works if you define the CSS vars yourself. */
export type ThemeName = "light" | "dark" | "emerald" | "rose" | (string & {});

/** A theme selection, where "system" follows the OS preference. */
export type ThemeSetting = ThemeName | "system";

export interface UseThemeOptions {
  /** Initial theme. Defaults to "system". */
  default?: ThemeSetting;
  /** localStorage key for persistence. Pass `null` to disable persistence. */
  storageKey?: string | null;
  /** Element to apply the theme attribute/class to. Defaults to <html>. */
  target?: () => HTMLElement | null;
  /** Attribute used to set the theme. Defaults to "data-theme". */
  attribute?: string;
}

export interface UseThemeReturn {
  /** The chosen setting (may be "system"). */
  theme: Ref<ThemeSetting>;
  /** The concrete theme actually applied (never "system"). */
  resolvedTheme: Ref<ThemeName>;
  setTheme: (value: ThemeSetting) => void;
  /** Toggle between light and dark (based on what's currently resolved). */
  toggle: () => void;
}

const DEFAULT_KEY = "agent-theme";

/**
 * Applies a theme to the document (or a target element) by setting a
 * `data-theme` attribute, with optional persistence and `"system"` support.
 *
 * For widget-scoped theming, pass `theme` to <ChatWindow> instead.
 */
export function useTheme(options: UseThemeOptions = {}): UseThemeReturn {
  const attribute = options.attribute ?? "data-theme";
  const storageKey = options.storageKey === undefined ? DEFAULT_KEY : options.storageKey;
  const getTarget = options.target ?? (() => (typeof document !== "undefined" ? document.documentElement : null));

  const stored =
    storageKey && typeof localStorage !== "undefined"
      ? (localStorage.getItem(storageKey) as ThemeSetting | null)
      : null;

  const theme = ref<ThemeSetting>(stored ?? options.default ?? "system");
  const resolvedTheme = ref<ThemeName>("light");

  let mql: MediaQueryList | null = null;

  function systemTheme(): ThemeName {
    if (typeof window === "undefined" || !window.matchMedia) return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function apply() {
    const resolved = theme.value === "system" ? systemTheme() : theme.value;
    resolvedTheme.value = resolved;
    const el = getTarget();
    if (el) {
      el.setAttribute(attribute, resolved);
      // Keep the `.dark` class in sync for Tailwind's dark: variant.
      el.classList.toggle("dark", resolved === "dark");
    }
  }

  function setTheme(value: ThemeSetting) {
    theme.value = value;
  }

  function toggle() {
    setTheme(resolvedTheme.value === "dark" ? "light" : "dark");
  }

  const onSystemChange = () => {
    if (theme.value === "system") apply();
  };

  watch(theme, (value) => {
    if (storageKey && typeof localStorage !== "undefined") {
      localStorage.setItem(storageKey, value);
    }
    apply();
  });

  onMounted(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      mql = window.matchMedia("(prefers-color-scheme: dark)");
      mql.addEventListener("change", onSystemChange);
    }
    apply();
  });

  onBeforeUnmount(() => {
    mql?.removeEventListener("change", onSystemChange);
  });

  return { theme, resolvedTheme, setTheme, toggle };
}
