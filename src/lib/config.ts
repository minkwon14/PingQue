/** Free-tier room lifetime. Paid tiers will override this per room. */
export const ROOM_TTL_MINUTES = 30;

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
