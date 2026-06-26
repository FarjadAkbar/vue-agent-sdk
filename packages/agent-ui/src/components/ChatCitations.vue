<script setup lang="ts">
import type { Citation } from "../types";

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

defineProps<{
  citations: Citation[];
}>();
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <span class="text-[11px] font-medium uppercase tracking-wide text-[var(--agent-muted)]">Sources</span>
    <div class="flex flex-wrap gap-1.5">
      <a
        v-for="(cite, i) in citations"
        :key="cite.id ?? i"
        :href="cite.url"
        target="_blank"
        rel="noopener noreferrer"
        :title="cite.snippet ?? cite.title ?? cite.url"
        class="flex items-center gap-1.5 rounded-full border border-[var(--agent-border)] bg-[var(--agent-surface)] px-2.5 py-1 text-xs text-[var(--agent-muted)] transition-colors hover:text-[var(--agent-fg)]"
      >
        <span class="flex size-4 items-center justify-center rounded-full bg-[var(--agent-surface-2)] text-[10px] font-semibold">
          {{ i + 1 }}
        </span>
        <span class="max-w-[14rem] truncate">{{ cite.title ?? hostname(cite.url) }}</span>
      </a>
    </div>
  </div>
</template>
