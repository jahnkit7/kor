// Flag pour activer/désactiver facilement le debug (exporté pour toggle externe)
export const ENABLE_ENFORCEMENT_DEBUG = true;

// Anti-spam: 1 log max par action/source/reason par seconde
const lastLogTimes = new Map<string, number>();
const DEBOUNCE_MS = 1000;

type EnforcementAction = "addClient" | "addSale" | "voiceMultiSale";

interface EnforcementPayload {
  action: EnforcementAction;
  source: string;
  reason: string;
  currentCount?: number;
  maxAllowed?: number;
  attemptedCount?: number;
}

export function debugEnforcement(payload: EnforcementPayload): void {
  if (!import.meta.env.DEV) return;
  if (!ENABLE_ENFORCEMENT_DEBUG) return;
  
  const key = `${payload.action}:${payload.source}:${payload.reason}`;
  const now = Date.now();
  const lastLog = lastLogTimes.get(key) || 0;
  if (now - lastLog < DEBOUNCE_MS) return;
  lastLogTimes.set(key, now);
  
  console.debug("[ENFORCEMENT] blocked", payload);
}
