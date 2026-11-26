import { CUSTOM_BUTTON_LABEL_MAX_LENGTH, MAX_CUSTOM_BUTTONS } from "@/lib/config";
import type { RoomButton } from "@/lib/domain/types";
import { readStored, writeStored } from "./storage";

/** Last button set the host saved; preloaded into the next room they create. */
export const HOST_BUTTONS_KEY = "pingque:host-buttons";
/** This device's own buttons, shown only on this device. */
export const PERSONAL_BUTTONS_KEY = "pingque:personal-buttons";

export function parseButtons(raw: string | null | undefined): RoomButton[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (b): b is RoomButton =>
          !!b &&
          typeof b.id === "string" &&
          typeof b.label === "string" &&
          b.label.trim().length > 0 &&
          b.label.length <= CUSTOM_BUTTON_LABEL_MAX_LENGTH,
      )
      .slice(0, MAX_CUSTOM_BUTTONS);
  } catch {
    return [];
  }
}

export const loadHostButtons = () => parseButtons(readStored(HOST_BUTTONS_KEY));

export const saveHostButtons = (buttons: RoomButton[]) =>
  writeStored(HOST_BUTTONS_KEY, JSON.stringify(buttons));

export const savePersonalButtons = (buttons: RoomButton[]) =>
  writeStored(PERSONAL_BUTTONS_KEY, JSON.stringify(buttons));
