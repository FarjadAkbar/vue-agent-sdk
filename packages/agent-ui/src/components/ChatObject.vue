<script setup lang="ts">
import { computed } from "vue";

/**
 * Zero-config renderer for structured output (`message.data`).
 *
 * - Arrays of flat objects render as a table.
 * - Other arrays render as a list of values.
 * - Objects render as a key/value grid (recursing into nested values).
 * - Primitives render inline.
 *
 * Recurses by referencing itself, so `name` must be set for self-lookup.
 */
defineOptions({ name: "ChatObject" });

const props = withDefaults(
  defineProps<{
    data: unknown;
    /** Nesting depth (used internally to limit padding growth). */
    level?: number;
  }>(),
  { level: 0 },
);

type Kind = "empty" | "primitive" | "array" | "table" | "object";

const kind = computed<Kind>(() => {
  const d = props.data;
  if (d === null || d === undefined) return "empty";
  if (Array.isArray(d)) {
    const isFlatObjectList =
      d.length > 0 &&
      d.every((it) => it !== null && typeof it === "object" && !Array.isArray(it));
    return isFlatObjectList ? "table" : "array";
  }
  if (typeof d === "object") return "object";
  return "primitive";
});

const asArray = computed(() => props.data as unknown[]);
const asObject = computed(() => props.data as Record<string, unknown>);

const entries = computed(() =>
  kind.value === "object" ? Object.entries(asObject.value) : [],
);

const columns = computed(() => {
  if (kind.value !== "table") return [];
  const keys = new Set<string>();
  for (const row of asArray.value as Record<string, unknown>[]) {
    for (const k of Object.keys(row)) keys.add(k);
  }
  return [...keys];
});

function isLeaf(value: unknown): boolean {
  return value === null || value === undefined || typeof value !== "object";
}

function leafText(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function cellText(row: Record<string, unknown>, key: string): string {
  const v = row[key];
  if (isLeaf(v)) return leafText(v);
  return JSON.stringify(v);
}

function humanize(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
</script>

<template>
  <!-- Primitive -->
  <span v-if="kind === 'primitive'" class="agent-object-leaf">{{ leafText(data) }}</span>

  <!-- Empty -->
  <span v-else-if="kind === 'empty'" class="agent-object-empty">—</span>

  <!-- Array of objects → table -->
  <div v-else-if="kind === 'table'" class="agent-object-table-wrap">
    <table class="agent-object-table">
      <thead>
        <tr>
          <th v-for="col in columns" :key="col">{{ humanize(col) }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in (asArray as Record<string, unknown>[])" :key="i">
          <td v-for="col in columns" :key="col">{{ cellText(row, col) }}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Plain array → list -->
  <ul v-else-if="kind === 'array'" class="agent-object-list">
    <li v-for="(item, i) in asArray" :key="i">
      <span v-if="isLeaf(item)" class="agent-object-leaf">{{ leafText(item) }}</span>
      <ChatObject v-else :data="item" :level="level + 1" />
    </li>
  </ul>

  <!-- Object → key/value grid -->
  <dl v-else class="agent-object-grid">
    <div v-for="[key, value] in entries" :key="key" class="agent-object-row">
      <dt class="agent-object-key">{{ humanize(key) }}</dt>
      <dd class="agent-object-value">
        <span v-if="isLeaf(value)" class="agent-object-leaf">{{ leafText(value) }}</span>
        <ChatObject v-else :data="value" :level="level + 1" />
      </dd>
    </div>
  </dl>
</template>
