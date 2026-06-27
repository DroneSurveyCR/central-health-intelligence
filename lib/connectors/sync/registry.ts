import type { SyncProvider } from "./types";
import { sandboxProvider } from "./providers/sandbox";
import { ouraProvider } from "./providers/oura";

// One Map of sync providers (mirrors the file-connector registry pattern).
const PROVIDERS: Record<string, SyncProvider> = {
  [sandboxProvider.slug]: sandboxProvider,
  [ouraProvider.slug]: ouraProvider,
};

export function getSyncProvider(slug: string): SyncProvider | null {
  return PROVIDERS[slug] ?? null;
}

export function listSyncProviders(): SyncProvider[] {
  return Object.values(PROVIDERS);
}
