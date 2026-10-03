/**
 * Returns a deep copy with no Vue proxies inside. structuredClone and IndexedDB both
 * throw DataCloneError on reactive objects; JSON is enough for our plain-data models.
 */
export function plainCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
