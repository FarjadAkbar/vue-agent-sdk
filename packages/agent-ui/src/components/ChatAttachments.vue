<script setup lang="ts">
import type { Attachment } from "../types";

defineProps<{
  attachments: Attachment[];
}>();

function humanSize(bytes?: number): string {
  if (!bytes && bytes !== 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return `${size.toFixed(size < 10 && unit > 0 ? 1 : 0)} ${units[unit]}`;
}
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <template v-for="(att, i) in attachments" :key="att.id ?? i">
      <!-- Image attachment -->
      <a
        v-if="att.type === 'image'"
        :href="att.url"
        target="_blank"
        rel="noopener noreferrer"
        class="block overflow-hidden rounded-xl border border-[var(--agent-border)]"
      >
        <img :src="att.url" :alt="att.name ?? 'attachment'" class="max-h-48 w-auto object-cover" />
      </a>

      <!-- File chip -->
      <a
        v-else
        :href="att.url"
        target="_blank"
        rel="noopener noreferrer"
        class="flex items-center gap-2 rounded-xl border border-[var(--agent-border)] bg-[var(--agent-surface)] px-3 py-2 text-xs transition-colors hover:bg-[var(--agent-surface-2)]"
      >
        <svg viewBox="0 0 24 24" class="size-5 shrink-0 text-[var(--agent-muted)]" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 3v4a1 1 0 0 0 1 1h4" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span class="flex flex-col">
          <span class="font-medium text-[var(--agent-fg)]">{{ att.name ?? "file" }}</span>
          <span v-if="att.size" class="text-[var(--agent-muted)]">{{ humanSize(att.size) }}</span>
        </span>
      </a>
    </template>
  </div>
</template>
