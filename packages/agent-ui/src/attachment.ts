import type { InjectionKey, Ref } from "vue";
import type { Attachment } from "./types";

/**
 * Shared context provided by <ChatInput> and consumed by <ChatAttachment>.
 * Lets a nested attachment trigger register/clear files on its parent input
 * without prop drilling.
 */
export interface ChatInputAttachmentApi {
  /** Currently staged attachments (rendered as previews by <ChatInput>). */
  attachments: Ref<Attachment[]>;
  /** Append validated attachments. */
  add: (items: Attachment[]) => void;
  /** Remove a staged attachment by id. */
  remove: (id: string) => void;
  /** Drop all staged attachments (called after submit). */
  clear: () => void;
}

export const ChatInputAttachmentKey: InjectionKey<ChatInputAttachmentApi> =
  Symbol("agent-chat-input-attachments");

/**
 * Parse a human size into bytes. Accepts a number (bytes) or a string like
 * "1mb", "500kb", "2.5 MB", "1024". Returns `undefined` when unparseable.
 */
export function parseSize(size: string | number | undefined | null): number | undefined {
  if (size == null) return undefined;
  if (typeof size === "number") return Number.isFinite(size) ? size : undefined;
  const match = /^([\d.]+)\s*(b|kb|mb|gb)?$/i.exec(size.trim());
  if (!match) return undefined;
  const value = parseFloat(match[1]);
  if (!Number.isFinite(value)) return undefined;
  const unit = (match[2] ?? "b").toLowerCase();
  const mult = unit === "gb" ? 1e9 : unit === "mb" ? 1e6 : unit === "kb" ? 1e3 : 1;
  return value * mult;
}

/**
 * Check a file against an `allowed` list. Entries may be extensions
 * (".png"), wildcard mime types ("image/*"), or exact mime types
 * ("application/pdf"). An empty/undefined list allows everything.
 */
export function isAllowed(file: File, allowed?: string[]): boolean {
  if (!allowed || allowed.length === 0) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return allowed.some((rule) => {
    const r = rule.trim().toLowerCase();
    if (!r) return false;
    if (r.startsWith(".")) return name.endsWith(r);
    if (r.endsWith("/*")) return type.startsWith(r.slice(0, -1));
    return type === r;
  });
}

/** Read a File into a data URL (so it can preview + persist on the message). */
export function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/** Format a byte count as a short human-readable string (e.g. "1.4 MB"). */
export function formatBytes(bytes?: number): string {
  if (bytes == null || !Number.isFinite(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`;
}

/** Reason a file was rejected during validation. */
export type AttachmentRejectReason = "type" | "size";

export interface AttachmentRejection {
  file: File;
  reason: AttachmentRejectReason;
}
