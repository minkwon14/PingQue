/** Free-tier room lifetime. Paid tiers will override this per room. */
export const ROOM_TTL_MINUTES = 60;

export const ROOM_TTL_MS = ROOM_TTL_MINUTES * 60 * 1000;

/** Free-tier participant cap (data model allows up to 20). */
export const MAX_PARTICIPANTS = 10;

/** Minimum gap between two new requests from the same device. */
export const REQUEST_RATE_LIMIT_MS = 1000;

/** How long a participant can undo a request they just sent (client-side UX). */
export const UNDO_WINDOW_MS = 5000;

/** Legacy 6-character codes keep resolving; new rooms get this length. */
export const JOIN_CODE_LENGTH = 8;

/** Join attempts (room lookup + join) allowed per client IP per window. */
export const JOIN_ATTEMPT_LIMIT = 30;

export const JOIN_ATTEMPT_WINDOW_MS = 60 * 1000;

export const NAME_MAX_LENGTH = 20;

/** A participant counts as connected if its device fetched room state within this window (poll is 5s). */
export const PRESENCE_TTL_MS = 15_000;

/** Shared (host-edited) quick buttons per room, and personal buttons per device. */
export const MAX_CUSTOM_BUTTONS = 8;

export const CUSTOM_BUTTON_LABEL_MAX_LENGTH = 20;

/** Host announcement shown to everyone in the room. */
export const ANNOUNCEMENT_MAX_LENGTH = 60;

/** The latest announcement stays active; this many (including it) are kept as history. */
export const ANNOUNCEMENT_HISTORY_SIZE = 20;

/** Minimum gap between two announcements from the host. */
export const ANNOUNCEMENT_RATE_LIMIT_MS = 2000;

/** Initial one-tap announcement phrases; the host can then edit the room's own list. */
export const ANNOUNCEMENT_PRESETS = ["30초 남았어요", "다음 준비", "쉬는 시간"];

export const MAX_ANNOUNCEMENT_PRESETS = 10;

/** Role choices offered on join (initially the template's roles; host-editable). Joining also accepts custom text. */
export const MAX_ROLES = 10;

export const ROLE_MAX_LENGTH = 20;
