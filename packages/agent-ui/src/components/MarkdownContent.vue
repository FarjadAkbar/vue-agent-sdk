<script setup lang="ts">
import { computed, ref } from "vue";
import { renderMarkdown } from "../markdown";
// Bundled stylesheets for code highlighting + math.
import "highlight.js/styles/github-dark.css";
import "katex/dist/katex.min.css";

const props = defineProps<{
  content: string;
}>();

const html = computed(() => renderMarkdown(props.content));
const root = ref<HTMLElement | null>(null);

// Event delegation: a single handler powers every "Copy" button, even as new
// code blocks stream in.
function onClick(event: MouseEvent) {
  const target = event.target as HTMLElement;
  const button = target.closest<HTMLButtonElement>(".agent-code__copy");
  if (!button) return;

  const code = button.closest(".agent-code")?.querySelector("pre code")?.textContent ?? "";
  if (!code || !navigator.clipboard) return;

  navigator.clipboard.writeText(code).then(() => {
    const original = button.textContent;
    button.textContent = "Copied!";
    button.classList.add("is-copied");
    window.setTimeout(() => {
      button.textContent = original;
      button.classList.remove("is-copied");
    }, 1500);
  });
}
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -- markdown-it output is escaped (html:false) -->
  <div ref="root" class="agent-markdown" @click="onClick" v-html="html" />
</template>
