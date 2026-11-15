import { MemoryRoomStore } from "./memory";
import { SupabaseRoomStore } from "./supabase";
import type { RoomStore } from "./types";

export type StoreKind = "memory" | "supabase";

export function resolveStoreKind(env: NodeJS.ProcessEnv): StoreKind {
  const forced = env.PINGQUE_STORE;
  if (forced === "memory" || forced === "supabase") return forced;
  return env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY ? "supabase" : "memory";
}

function createStore(env: NodeJS.ProcessEnv): RoomStore {
  if (resolveStoreKind(env) === "supabase") {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        "PINGQUE_STORE=supabase requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
      );
    }
    return SupabaseRoomStore.fromEnv({
      url: env.SUPABASE_URL,
      serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    });
  }
  return new MemoryRoomStore();
}

const globalForStore = globalThis as unknown as { __pingqueStore?: RoomStore };

/** Singleton so every route handler (and dev-server reload) shares one store. */
export function getStore(): RoomStore {
  globalForStore.__pingqueStore ??= createStore(process.env);
  return globalForStore.__pingqueStore;
}
