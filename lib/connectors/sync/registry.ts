import type { SyncProvider } from "./types";
import { sandboxProvider } from "./providers/sandbox";
import { ouraProvider } from "./providers/oura";
import { withingsProvider } from "./providers/withings";
import { dexcomProvider } from "./providers/dexcom";
import { garminProvider } from "./providers/garmin";

// One Map of sync providers (mirrors the file-connector registry pattern).
const PROVIDERS: Record<string, SyncProvider> = {
  [sandboxProvider.slug]: sandboxProvider,
  [ouraProvider.slug]: ouraProvider,
  [withingsProvider.slug]: withingsProvider,
  [dexcomProvider.slug]: dexcomProvider,
  [garminProvider.slug]: garminProvider,
};

export function getSyncProvider(slug: string): SyncProvider | null {
  return PROVIDERS[slug] ?? null;
}

export function listSyncProviders(): SyncProvider[] {
  return Object.values(PROVIDERS);
}
