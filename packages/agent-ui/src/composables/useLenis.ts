import { onBeforeUnmount, onMounted, ref, type Ref } from "vue";
import Lenis from "lenis";

export interface UseLenisOptions {
  /** Lenis easing duration in seconds. */
  duration?: number;
  /** Disable smooth scrolling (falls back to native). */
  disabled?: boolean;
}

/**
 * Attaches a Lenis smooth-scroll instance to a scrollable wrapper element.
 *
 * Returns the Lenis instance plus a `scrollToBottom` helper that the chat
 * message list uses to keep new messages in view.
 */
export function useLenis(
  wrapper: Ref<HTMLElement | null>,
  content: Ref<HTMLElement | null>,
  options: UseLenisOptions = {},
) {
  const lenis = ref<Lenis | null>(null);
  let frame = 0;

  onMounted(() => {
    if (options.disabled || !wrapper.value || !content.value) return;

    const instance = new Lenis({
      wrapper: wrapper.value,
      content: content.value,
      duration: options.duration ?? 0.9,
      smoothWheel: true,
    });

    const raf = (time: number) => {
      instance.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    lenis.value = instance;
  });

  onBeforeUnmount(() => {
    cancelAnimationFrame(frame);
    lenis.value?.destroy();
    lenis.value = null;
  });

  /** Smoothly scroll the wrapper to the very bottom. */
  function scrollToBottom(opts: { immediate?: boolean } = {}) {
    const el = wrapper.value;
    if (!el) return;
    const target = el.scrollHeight;

    if (lenis.value) {
      lenis.value.scrollTo(target, { immediate: opts.immediate });
    } else {
      el.scrollTo({ top: target, behavior: opts.immediate ? "auto" : "smooth" });
    }
  }

  return { lenis, scrollToBottom };
}
