import {
  ANNOUNCEMENT_MAX_LENGTH,
  CUSTOM_BUTTON_LABEL_MAX_LENGTH,
  JOIN_CODE_LENGTH,
  MAX_CUSTOM_BUTTONS,
  NAME_MAX_LENGTH,
} from "@/lib/config";
import { DomainError } from "./errors";
import type { Template } from "./templates";
import type { ActorKind, RequestStatus, Room, RoomButton } from "./types";

/** No 0/O/1/I/L so codes survive being read aloud or typed on a phone. */
export const JOIN_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateJoinCode(randomInt: (max: number) => number): string {
  let code = "";
  for (let i = 0; i < JOIN_CODE_LENGTH; i++) {
    code += JOIN_CODE_ALPHABET[randomInt(JOIN_CODE_ALPHABET.length)];
  }
  return code;
}

export function normalizeJoinCode(input: string): string {
  return input.replace(/[\s-]/g, "").toUpperCase();
}

export function isExpired(room: Pick<Room, "expiresAt">, now: number): boolean {
  return now >= room.expiresAt;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function validateParticipantInput(
  template: Template,
  input: { name: unknown; role: unknown },
): { name: string; role: string } {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (name.length < 1 || name.length > NAME_MAX_LENGTH) {
    throw new DomainError(
      "invalid_input",
      `이름은 1~${NAME_MAX_LENGTH}자로 입력해 주세요.`,
    );
  }
  const role = typeof input.role === "string" ? input.role : "";
  if (!template.roles.includes(role)) {
    throw new DomainError("invalid_input", "올바른 역할을 선택해 주세요.");
  }
  return { name, role };
}

export interface ResolvedSelections {
  selections: string[];
  item: string;
  qualifiers: string[];
  action: string;
  label: string;
}

/** Turns option ids (one per step) into the structured item / qualifiers / action. */
export function resolveSelections(
  template: Template,
  selections: unknown,
): ResolvedSelections {
  if (
    !Array.isArray(selections) ||
    selections.length !== template.steps.length ||
    !selections.every((s) => typeof s === "string")
  ) {
    throw new DomainError("invalid_input", "선택 항목이 올바르지 않아요.");
  }
  const ids = selections as string[];
  const labels = template.steps.map((step, i) => {
    const option = step.options.find((o) => o.id === ids[i]);
    if (!option) {
      throw new DomainError("invalid_input", "선택 항목이 올바르지 않아요.");
    }
    return option.label;
  });
  return {
    selections: ids,
    item: labels[0],
    qualifiers: labels.slice(1, -1),
    action: labels[labels.length - 1],
    label: labels.join(" · "),
  };
}

/** Free-text request (quick button): no template steps, the text is the whole label. */
export function resolveText(text: unknown): ResolvedSelections {
  const label = typeof text === "string" ? text.trim() : "";
  if (label.length < 1 || label.length > CUSTOM_BUTTON_LABEL_MAX_LENGTH) {
    throw new DomainError(
      "invalid_input",
      `요청 내용은 1~${CUSTOM_BUTTON_LABEL_MAX_LENGTH}자로 입력해 주세요.`,
    );
  }
  return { selections: [], item: label, qualifiers: [], action: "", label };
}

export function validateAnnouncementText(text: unknown): string {
  const value = typeof text === "string" ? text.trim() : "";
  if (value.length < 1 || value.length > ANNOUNCEMENT_MAX_LENGTH) {
    throw new DomainError(
      "invalid_input",
      `공지는 1~${ANNOUNCEMENT_MAX_LENGTH}자로 입력해 주세요.`,
    );
  }
  return value;
}

export function validateButtons(input: unknown): RoomButton[] {
  if (!Array.isArray(input) || input.length > MAX_CUSTOM_BUTTONS) {
    throw new DomainError("invalid_input", `버튼은 최대 ${MAX_CUSTOM_BUTTONS}개까지 만들 수 있어요.`);
  }
  const seen = new Set<string>();
  return input.map((item: unknown) => {
    const { id, label } = (item ?? {}) as { id?: unknown; label?: unknown };
    if (!isUuid(id) || seen.has(id)) {
      throw new DomainError("invalid_input", "버튼 정보가 올바르지 않아요.");
    }
    seen.add(id);
    return { id, label: resolveText(label).label };
  });
}

const TRANSITIONS: Record<ActorKind, Partial<Record<RequestStatus, RequestStatus[]>>> = {
  receiver: {
    received: ["confirmed", "done"],
    confirmed: ["done"],
  },
  participant: {
    received: ["cancelled"],
    confirmed: ["cancelled"],
  },
};

export function canTransition(
  actor: ActorKind,
  from: RequestStatus,
  to: RequestStatus,
): boolean {
  return TRANSITIONS[actor][from]?.includes(to) ?? false;
}

export const REQUEST_STATUSES: RequestStatus[] = [
  "received",
  "confirmed",
  "done",
  "cancelled",
];

export function isRequestStatus(value: unknown): value is RequestStatus {
  return REQUEST_STATUSES.includes(value as RequestStatus);
}

export function isActive(status: RequestStatus): boolean {
  return status === "received" || status === "confirmed";
}

/** Returns 0 when allowed, otherwise the milliseconds to wait. */
export function rateLimitRetryAfter(
  lastCreatedAt: number | undefined,
  now: number,
  intervalMs: number,
): number {
  if (lastCreatedAt === undefined) return 0;
  const wait = lastCreatedAt + intervalMs - now;
  return wait > 0 ? wait : 0;
}
