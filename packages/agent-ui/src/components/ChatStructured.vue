<script setup lang="ts">
import { computed } from "vue";
import type { StructuredField, StructuredFieldType } from "../types";

/**
 * Schema-driven renderer for structured output.
 *
 * Pass the streamed (possibly partial) object as `data` and an array of field
 * descriptors as `schema`; this component renders each field with a sensible
 * layout (titles, summaries, numbered steps, lists, tags, tables). It tolerates
 * missing keys, so it renders progressively as JSON streams in.
 *
 * With no `schema`, it infers fields from the object's keys.
 */
const props = withDefaults(
  defineProps<{
    data: unknown;
    /** Field layout. Omit to infer from the data's keys. */
    schema?: StructuredField[];
    /** True while the JSON is still streaming (renders a soft pulse). */
    streaming?: boolean;
  }>(),
  { schema: undefined, streaming: false },
);

const obj = computed<Record<string, unknown>>(() =>
  props.data && typeof props.data === "object" && !Array.isArray(props.data)
    ? (props.data as Record<string, unknown>)
    : {},
);

function inferType(value: unknown): StructuredFieldType {
  if (Array.isArray(value)) {
    const objectItems = value.filter((v) => v && typeof v === "object" && !Array.isArray(v));
    if (objectItems.length === value.length && value.length > 0) {
      const looksLikeSteps = objectItems.every(
        (v) => "name" in (v as object) || "title" in (v as object) || "step" in (v as object),
      );
      return looksLikeSteps ? "steps" : "table";
    }
    return "list";
  }
  return "text";
}

const fields = computed<StructuredField[]>(() => {
  if (props.schema?.length) return props.schema;
  return Object.keys(obj.value).map((key) => {
    const type: StructuredFieldType =
      key === "title" ? "title" : key === "summary" ? "summary" : inferType(obj.value[key]);
    return { key, type };
  });
});

function valueOf(field: StructuredField): unknown {
  return obj.value[field.key];
}

function hasValue(field: StructuredField): boolean {
  const v = valueOf(field);
  if (v === null || v === undefined || v === "") return false;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

function asArray(field: StructuredField): unknown[] {
  const v = valueOf(field);
  return Array.isArray(v) ? v.filter((x) => x !== null && x !== undefined) : [];
}

function stepName(field: StructuredField, step: unknown): string {
  if (!step || typeof step !== "object") return String(step ?? "");
  const rec = step as Record<string, unknown>;
  return String(rec[field.nameKey ?? "name"] ?? rec.title ?? rec.step ?? "");
}

function stepDetail(field: StructuredField, step: unknown): string {
  if (!step || typeof step !== "object") return "";
  const rec = step as Record<string, unknown>;
  const v = rec[field.detailKey ?? "detail"] ?? rec.description ?? rec.text ?? "";
  return v == null ? "" : String(v);
}

function columnsOf(field: StructuredField): string[] {
  if (field.columns?.length) return field.columns;
  const keys = new Set<string>();
  for (const row of asArray(field) as Record<string, unknown>[]) {
    if (row && typeof row === "object") for (const k of Object.keys(row)) keys.add(k);
  }
  return [...keys];
}

function cell(row: unknown, col: string): string {
  if (!row || typeof row !== "object") return "";
  const v = (row as Record<string, unknown>)[col];
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function leaf(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function humanize(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
</script>

<template>
  <div class="agent-structured" :class="{ 'agent-structured--streaming': streaming }">
    <template v-for="field in fields" :key="field.key">
      <template v-if="hasValue(field)">
        <!-- Title -->
        <h3 v-if="field.type === 'title'" class="agent-structured__title">
          {{ leaf(valueOf(field)) }}
        </h3>

        <!-- Summary -->
        <p v-else-if="field.type === 'summary'" class="agent-structured__summary">
          {{ leaf(valueOf(field)) }}
        </p>

        <!-- Steps -->
        <section v-else-if="field.type === 'steps'" class="agent-structured__section">
          <p v-if="field.label" class="agent-structured__label">{{ field.label }}</p>
          <ol class="agent-structured__steps">
            <li v-for="(step, i) in asArray(field)" :key="i" class="agent-structured__step">
              <span class="agent-structured__num">{{ i + 1 }}</span>
              <div class="agent-structured__step-body">
                <p class="agent-structured__step-name">{{ stepName(field, step) }}</p>
                <p v-if="stepDetail(field, step)" class="agent-structured__step-detail">
                  {{ stepDetail(field, step) }}
                </p>
              </div>
            </li>
          </ol>
        </section>

        <!-- List -->
        <section v-else-if="field.type === 'list'" class="agent-structured__section">
          <p v-if="field.label" class="agent-structured__label">{{ field.label }}</p>
          <ul class="agent-structured__list">
            <li v-for="(item, i) in asArray(field)" :key="i">{{ leaf(item) }}</li>
          </ul>
        </section>

        <!-- Tags -->
        <section v-else-if="field.type === 'tags'" class="agent-structured__section">
          <p v-if="field.label" class="agent-structured__label">{{ field.label }}</p>
          <div class="agent-structured__tags">
            <span v-for="(tag, i) in asArray(field)" :key="i" class="agent-structured__tag">
              {{ leaf(tag) }}
            </span>
          </div>
        </section>

        <!-- Table -->
        <section v-else-if="field.type === 'table'" class="agent-structured__section">
          <p v-if="field.label" class="agent-structured__label">{{ field.label }}</p>
          <div class="agent-structured__table-wrap">
            <table class="agent-structured__table">
              <thead>
                <tr>
                  <th v-for="col in columnsOf(field)" :key="col">{{ humanize(col) }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, i) in asArray(field)" :key="i">
                  <td v-for="col in columnsOf(field)" :key="col">{{ cell(row, col) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Text (default) -->
        <div v-else class="agent-structured__text">
          <span class="agent-structured__key">{{ field.label ?? humanize(field.key) }}</span>
          <span class="agent-structured__val">{{ leaf(valueOf(field)) }}</span>
        </div>
      </template>
    </template>
  </div>
</template>
