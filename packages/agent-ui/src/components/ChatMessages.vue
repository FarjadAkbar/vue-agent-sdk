<script setup lang="ts">
import { computed, nextTick, ref, watch, type ComponentPublicInstance } from "vue";
import { useVirtualizer } from "@tanstack/vue-virtual";
import type { ChatRole, Message } from "../types";
import { useLenis } from "../composables/useLenis";
import ChatMessage from "./ChatMessage.vue";

const props = withDefaults(
  defineProps<{
    messages: Message[];
    /** Keep the view pinned to the newest message. */
    autoScroll?: boolean;
    /** Disable Lenis smooth scrolling. */
    disableSmooth?: boolean;
    /** Group consecutive messages from the same author (hide repeat avatars). */
    group?: boolean;
    /** Minutes gap that breaks a group even for the same author. */
    groupGapMinutes?: number;
    /** Render assistant/system content as markdown. */
    markdown?: boolean;
    /** Avatar image URLs by role. Falls back to initials when omitted. */
    avatars?: Partial<Record<ChatRole, string>>;
    /**
     * Virtualize the list for long conversations (renders only visible rows).
     * Uses native scrolling (Lenis is disabled in this mode).
     */
    virtualized?: boolean;
    /** Estimated row height (px) used by the virtualizer before measuring. */
    estimateSize?: number;
  }>(),
  {
    autoScroll: true,
    disableSmooth: false,
    group: true,
    groupGapMinutes: 5,
    markdown: true,
    virtualized: false,
    estimateSize: 96,
  },
);

const wrapper = ref<HTMLElement | null>(null);
const content = ref<HTMLElement | null>(null);

// Lenis is only used in the non-virtualized path.
const { scrollToBottom } = useLenis(wrapper, content, {
  disabled: props.disableSmooth || props.virtualized,
});

function timeOf(m: Message): number {
  const t = m.createdAt;
  if (t instanceof Date) return t.getTime();
  if (typeof t === "number") return t;
  return 0;
}

interface Row {
  message: Message;
  /** First message of a same-author group → render the avatar. */
  showAvatar: boolean;
  /** Extra top spacing because this row starts a new group. */
  groupStart: boolean;
}

// Precompute grouping metadata once per messages change.
const rows = computed<Row[]>(() => {
  const list = props.messages;
  const gapMs = props.groupGapMinutes * 60_000;
  return list.map((message, i) => {
    if (!props.group) return { message, showAvatar: true, groupStart: true };
    const prev = list[i - 1];
    const sameAuthor = prev?.role === message.role;
    const withinGap = prev ? timeOf(message) - timeOf(prev) <= gapMs : false;
    const grouped = sameAuthor && (withinGap || timeOf(message) === 0 || timeOf(prev) === 0);
    return { message, showAvatar: !grouped, groupStart: !grouped };
  });
});

function avatarFor(role: ChatRole): string | undefined {
  return props.avatars?.[role];
}

function rowSpacingClass(row: Row, index: number): string {
  if (index === 0) return "";
  return row.groupStart ? "pt-3" : "pt-0.5";
}

// --- Virtualization ---------------------------------------------------------
const virtualizerOptions = computed(() => ({
  count: rows.value.length,
  getScrollElement: () => wrapper.value,
  estimateSize: () => props.estimateSize,
  overscan: 8,
  getItemKey: (index: number) => rows.value[index]?.message.id ?? index,
}));

const rowVirtualizer = useVirtualizer(virtualizerOptions);
const virtualRows = computed(() => rowVirtualizer.value.getVirtualItems());
const totalSize = computed(() => rowVirtualizer.value.getTotalSize());

function measureElement(el: Element | ComponentPublicInstance | null) {
  if (el && el instanceof Element) rowVirtualizer.value.measureElement(el);
}

// Scroll on new messages and while the last message streams in.
watch(
  () => [rows.value.length, props.messages.at(-1)?.content] as const,
  async () => {
    if (!props.autoScroll) return;
    await nextTick();
    if (props.virtualized) {
      if (rows.value.length > 0) {
        rowVirtualizer.value.scrollToIndex(rows.value.length - 1, { align: "end" });
      }
    } else {
      scrollToBottom();
    }
  },
);
</script>

<template>
  <!-- Virtualized list: native scroll, absolutely-positioned measured rows. -->
  <div v-if="virtualized" ref="wrapper" class="agent-scroll relative h-full min-h-0 flex-1 overflow-y-auto">
    <div
      v-if="rows.length === 0"
      class="flex h-full flex-col items-center justify-center gap-2 px-4 py-16 text-center text-[var(--agent-muted)]"
    >
      <slot name="empty">
        <p class="text-sm">No messages yet. Say hello to get started.</p>
      </slot>
    </div>

    <div v-else class="relative mx-auto w-full max-w-2xl px-4" :style="{ height: `${totalSize}px` }">
      <div
        v-for="vRow in virtualRows"
        :key="String(vRow.key)"
        :ref="measureElement"
        :data-index="vRow.index"
        class="absolute left-0 w-full px-4"
        :style="{ transform: `translateY(${vRow.start}px)` }"
      >
        <div :class="rowSpacingClass(rows[vRow.index], vRow.index)">
          <ChatMessage
            :message="rows[vRow.index].message"
            :markdown="markdown"
            :avatar="avatarFor(rows[vRow.index].message.role)"
            :show-avatar="rows[vRow.index].showAvatar"
          >
            <template v-if="$slots.avatar" #avatar="slotProps">
              <slot name="avatar" v-bind="slotProps" />
            </template>
            <template v-if="$slots.message" #default="slotProps">
              <slot name="message" v-bind="slotProps" />
            </template>
          </ChatMessage>
        </div>
      </div>
    </div>
  </div>

  <!-- Standard list: Lenis smooth scroll. -->
  <div v-else ref="wrapper" class="agent-scroll relative h-full min-h-0 flex-1 overflow-y-auto">
    <div ref="content" class="mx-auto flex w-full max-w-2xl flex-col px-4 py-6">
      <slot name="header" />

      <div
        v-if="rows.length === 0"
        class="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center text-[var(--agent-muted)]"
      >
        <slot name="empty">
          <p class="text-sm">No messages yet. Say hello to get started.</p>
        </slot>
      </div>

      <div v-for="(row, index) in rows" :key="row.message.id" :class="rowSpacingClass(row, index)">
        <ChatMessage
          :message="row.message"
          :markdown="markdown"
          :avatar="avatarFor(row.message.role)"
          :show-avatar="row.showAvatar"
        >
          <template v-if="$slots.avatar" #avatar="slotProps">
            <slot name="avatar" v-bind="slotProps" />
          </template>
          <template v-if="$slots.message" #default="slotProps">
            <slot name="message" v-bind="slotProps" />
          </template>
        </ChatMessage>
      </div>

      <slot name="footer" />
    </div>
  </div>
</template>
