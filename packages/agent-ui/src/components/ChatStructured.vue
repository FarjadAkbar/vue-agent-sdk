<script setup lang="ts">
import { computed, reactive } from "vue";
import type { StructuredField, StructuredFieldType, Suggestion } from "../types";
import MarkdownContent from "./MarkdownContent.vue";
import ChatSuggestion from "./ChatSuggestion.vue";

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

/** Fields that currently have renderable values (recomputed when `data` streams in). */
const visibleFields = computed(() => fields.value.filter((f) => hasValue(f)));

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

// --- Accordion timeline (thinking / reasoning / looking steps) ------------

/** True once a `markdown` (final response) field has content. */
const responseReady = computed(() =>
  fields.value.some((f) => f.type === "markdown" && hasValue(f)),
);

/** Accordion (timeline) fields that currently have a value, in order. */
const stepFields = computed(() => visibleFields.value.filter((f) => f.type === "accordion"));

/** Last present step — its connector line is omitted and it can show a spinner. */
function isLastStep(field: StructuredField): boolean {
  const arr = stepFields.value;
  return arr.length > 0 && arr[arr.length - 1].key === field.key;
}

/** "done" (check) | "active" (spinner) | "idle" (themed icon). */
function stepState(field: StructuredField): "done" | "active" | "idle" {
  if (responseReady.value) return "done";
  // Earlier steps are done once a later step has streamed in.
  if (!isLastStep(field)) return "done";
  return props.streaming ? "active" : "idle";
}

// Per-field manual open/close overrides (key -> open?).
const overrides = reactive<Record<string, boolean>>({});

function isOpen(field: StructuredField): boolean {
  if (field.key in overrides) return overrides[field.key];
  if (field.defaultOpen != null) return field.defaultOpen;
  // Auto: expanded while still working, collapsed once the response is in.
  return !responseReady.value;
}

function toggle(field: StructuredField): void {
  overrides[field.key] = !isOpen(field);
}

/** Accordion content can be a string, an array of lines, or `{ text|detail }`. */
function accordionText(field: StructuredField): string {
  const v = valueOf(field);
  if (Array.isArray(v)) return v.map((x) => leaf(x)).join("\n");
  if (v && typeof v === "object") {
    const rec = v as Record<string, unknown>;
    return leaf(rec.text ?? rec.detail ?? rec.summary ?? "");
  }
  return leaf(v);
}

/**
 * Optional tool/skill pill for a step (image2-style "Loading skill …"). Read
 * from `{ tool: { label, code } }` (or a plain `{ tool: "label" }`) on the value.
 */
function accordionTool(field: StructuredField): { label: string; code?: string } | null {
  const v = valueOf(field);
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const t = (v as Record<string, unknown>).tool;
  if (!t) return null;
  if (typeof t === "string") return { label: t };
  if (typeof t === "object") {
    const rec = t as Record<string, unknown>;
    return {
      label: String(rec.label ?? rec.name ?? ""),
      code: rec.code != null ? String(rec.code) : undefined,
    };
  }
  return null;
}

function asSuggestions(field: StructuredField): Suggestion[] {
  return asArray(field).filter(
    (x): x is Suggestion => Boolean(x) && typeof x === "object" && "name" in (x as object),
  );
}
</script>

<template>
  <div class="agent-structured" :class="{ 'agent-structured--streaming': streaming }">
    <template v-for="field in visibleFields" :key="field.key">
        <!-- Title -->
        <h3 v-if="field.type === 'title'" class="agent-structured__title">
          {{ leaf(valueOf(field)) }}
        </h3>

        <!-- Summary -->
        <p v-else-if="field.type === 'summary'" class="agent-structured__summary">
          {{ leaf(valueOf(field)) }}
        </p>

        <!-- Accordion timeline step (thinking / reasoning / looking) -->
        <section
          v-else-if="field.type === 'accordion'"
          class="agent-step"
          :class="{ 'agent-step--open': isOpen(field), 'agent-step--last': isLastStep(field) }"
        >
          <span class="agent-step__node" :class="`agent-step__node--${stepState(field)}`">
            <!-- Active: spinner -->
            <svg
              v-if="stepState(field) === 'active'"
              class="agent-step__spin"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <path d="M21 12a9 9 0 1 1-6.22-8.56" stroke-linecap="round" />
            </svg>
            <!-- Done: check -->
            <svg
              v-else-if="stepState(field) === 'done'"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
            >
              <path d="M20 6 9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <!-- Idle: themed glyph -->
            <template v-else>
              <svg v-if="field.icon === 'reasoning'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V18h6v-1.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <svg v-else-if="field.icon === 'looking' || field.icon === 'search'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" stroke-linecap="round" />
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 3a6 6 0 0 0-3.6 10.8c.4.3.6.7.6 1.2v.5a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-.5c0-.5.2-.9.6-1.2A6 6 0 0 0 12 3zM9 21h6" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </template>
          </span>

          <button type="button" class="agent-step__head" @click="toggle(field)">
            <span class="agent-step__title">{{ field.label ?? humanize(field.key) }}</span>
            <svg class="agent-step__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="m6 9 6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>

          <div v-show="isOpen(field)" class="agent-step__body">
            <div v-if="accordionTool(field)" class="agent-step__tool">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <span class="agent-step__tool-label">{{ accordionTool(field)!.label }}</span>
              <code v-if="accordionTool(field)!.code" class="agent-step__tool-code">{{ accordionTool(field)!.code }}</code>
            </div>
            <p v-if="accordionText(field)" class="agent-step__detail">{{ accordionText(field) }}</p>
          </div>
        </section>

        <!-- Suggestions (connector / MCP cards) -->
        <section v-else-if="field.type === 'suggestions'" class="agent-structured__section">
          <p v-if="field.label" class="agent-structured__label">{{ field.label }}</p>
          <div class="agent-suggestions">
            <ChatSuggestion
              v-for="(s, i) in asSuggestions(field)"
              :key="s.id ?? i"
              :suggestion="s"
            />
          </div>
        </section>

        <!-- Markdown (final response) -->
        <MarkdownContent
          v-else-if="field.type === 'markdown'"
          :content="leaf(valueOf(field))"
          class="agent-structured__response"
        />

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
  </div>
</template>
