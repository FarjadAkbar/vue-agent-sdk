<script setup lang="ts">
import { computed, inject, ref } from "vue";
import {
  ChatInputAttachmentKey,
  isAllowed,
  parseSize,
  readAsDataURL,
  type AttachmentRejection,
} from "../attachment";
import type { Attachment } from "../types";

/**
 * An attach-files trigger meant to be nested inside <ChatInput>:
 *
 * ```vue
 * <ChatInput v-model="input" @submit="onSubmit">
 *   <ChatAttachment :allowed="['.png', '.jpg', 'image/*']" max-size="1mb" />
 * </ChatInput>
 * ```
 *
 * It validates selected files against `allowed` + `maxSize`, then stages them
 * on the parent <ChatInput> (which renders previews and includes them on
 * submit). Provide a default slot to customise the button content.
 */
const props = withDefaults(
  defineProps<{
    /** Allowed types: extensions (".png"), wildcards ("image/*"), or exact mimes. */
    allowed?: string[];
    /** Max size per file: bytes (number) or a string like "1mb" / "500kb". */
    maxSize?: string | number;
    /** Allow selecting multiple files at once. */
    multiple?: boolean;
    /** Disable the trigger. */
    disabled?: boolean;
  }>(),
  { multiple: true, disabled: false },
);

const emit = defineEmits<{
  /** Emitted for each file that fails type/size validation. */
  reject: [rejection: AttachmentRejection];
  /** Emitted with the files that passed validation. */
  accept: [items: Attachment[]];
}>();

const api = inject(ChatInputAttachmentKey, null);
const fileInput = ref<HTMLInputElement | null>(null);

const acceptAttr = computed(() =>
  props.allowed && props.allowed.length ? props.allowed.join(",") : undefined,
);

function openPicker() {
  if (props.disabled) return;
  fileInput.value?.click();
}

async function onChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const files = Array.from(target.files ?? []);
  const maxBytes = parseSize(props.maxSize);
  const accepted: Attachment[] = [];

  for (const file of files) {
    if (!isAllowed(file, props.allowed)) {
      emit("reject", { file, reason: "type" });
      continue;
    }
    if (maxBytes != null && file.size > maxBytes) {
      emit("reject", { file, reason: "size" });
      continue;
    }
    const url = await readAsDataURL(file);
    accepted.push({
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: file.type.startsWith("image/") ? "image" : "file",
      url,
      name: file.name,
      mimeType: file.type,
      size: file.size,
    });
  }

  if (accepted.length) {
    api?.add(accepted);
    emit("accept", accepted);
  }
  // Reset so selecting the same file again re-triggers change.
  target.value = "";
}
</script>

<template>
  <button
    type="button"
    class="flex size-9 shrink-0 items-center justify-center rounded-xl text-[var(--agent-muted)] transition-colors hover:bg-[var(--agent-surface-2)] hover:text-[var(--agent-fg)] disabled:cursor-not-allowed disabled:opacity-40"
    :disabled="disabled"
    aria-label="Attach files"
    @click="openPicker"
  >
    <slot>
      <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2">
        <path
          d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3 3 0 0 1 4.24 4.24l-9.2 9.19a1 1 0 0 1-1.41-1.41l8.49-8.49"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </slot>
    <input
      ref="fileInput"
      type="file"
      class="hidden"
      :accept="acceptAttr"
      :multiple="multiple"
      @change="onChange"
    />
  </button>
</template>
