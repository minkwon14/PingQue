import {
  ANNOUNCEMENT_MAX_LENGTH,
  MAX_ANNOUNCEMENT_PRESETS,
  MAX_ROLES,
  ROLE_MAX_LENGTH,
} from "@/lib/config";
import { readStored, writeStored } from "./storage";

/** Last announcement presets the host saved; preloaded into the next room they create. */
export const HOST_PRESETS_KEY = "pingque:host-announcement-presets";
/** Roles are template-specific, so the host's last role list is remembered per template. */
export const hostRolesKey = (templateId: string) => `pingque:host-roles:${templateId}`;

/** `undefined` when nothing valid was saved (so the room's defaults apply); `[]` is a deliberate empty list. */
export function parseTextList(
  raw: string | null | undefined,
  max: number,
  maxLength: number,
): string[] | undefined {
  if (!raw) return undefined;
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return undefined;
    return value
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0 && v.length <= maxLength)
      .slice(0, max);
  } catch {
    return undefined;
  }
}

export const loadHostPresets = () =>
  parseTextList(readStored(HOST_PRESETS_KEY), MAX_ANNOUNCEMENT_PRESETS, ANNOUNCEMENT_MAX_LENGTH);

export const saveHostPresets = (presets: string[]) =>
  writeStored(HOST_PRESETS_KEY, JSON.stringify(presets));

export const loadHostRoles = (templateId: string) =>
  parseTextList(readStored(hostRolesKey(templateId)), MAX_ROLES, ROLE_MAX_LENGTH);

export const saveHostRoles = (templateId: string, roles: string[]) =>
  writeStored(hostRolesKey(templateId), JSON.stringify(roles));
