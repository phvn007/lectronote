// ─── Class Registry (localStorage) ──────────────────────────────────────────
// Frontend-side class registry to cache registered classes locally.

export interface ClassEntry {
  backendId: string; // bigint serialized as string
  displayId: string; // 8-char alphanumeric display ID
  name: string;
  year: string;
  createdAt: number; // Date.now()
}

const REGISTRY_KEY = "lectronote_class_registry";

// ─── Encode / Decode ─────────────────────────────────────────────────────────

/**
 * Encodes a bigint backend ID to an 8-character uppercase alphanumeric string.
 * Example: 0n → "00000000", 1n → "00000001"
 */
export function encodeClassId(id: bigint): string {
  return id.toString(36).toUpperCase().padStart(8, "0");
}

/**
 * Decodes an 8-character display ID back to a bigint for backend calls.
 * Throws RangeError if input is invalid base-36.
 */
export function decodeClassId(displayId: string): bigint {
  const parsed = Number.parseInt(displayId, 36);
  if (Number.isNaN(parsed)) {
    throw new RangeError(`Invalid Class ID: "${displayId}"`);
  }
  return BigInt(parsed);
}

// ─── Registry CRUD ───────────────────────────────────────────────────────────

export function getRegistry(): ClassEntry[] {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ClassEntry[];
  } catch {
    return [];
  }
}

function saveRegistry(entries: ClassEntry[]): void {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(entries));
}

export function addToRegistry(entry: ClassEntry): void {
  const registry = getRegistry();
  registry.push(entry);
  saveRegistry(registry);
}

/**
 * Returns true if a class with the same name + year already exists.
 */
export function isDuplicate(name: string, year: string): boolean {
  const registry = getRegistry();
  const normalized = (s: string) => s.trim().toLowerCase();
  return registry.some(
    (e) =>
      normalized(e.name) === normalized(name) &&
      normalized(e.year) === normalized(year),
  );
}

/**
 * Hard-deletes a class entry by display ID — removes it completely from localStorage.
 */
export function hardDeleteClass(displayId: string): void {
  const registry = getRegistry();
  const updated = registry.filter((e) => e.displayId !== displayId);
  saveRegistry(updated);
}

/**
 * Returns all class entries sorted by most recently created.
 */
export function getAllActiveClasses(): ClassEntry[] {
  return getRegistry().sort((a, b) => b.createdAt - a.createdAt);
}
