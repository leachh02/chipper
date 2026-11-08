// Lets the sync engine and the pages hear about changes to the database:
// "local" when this device changed something, "remote" when a sync brought
// in another device's changes.
type Source = "local" | "remote";
type Listener = () => void;

const listeners: Record<Source, Set<Listener>> = { local: new Set(), remote: new Set() };

export function notifyChange(source: Source) {
  listeners[source].forEach((listener) => listener());
}

export function onChange(source: Source, listener: Listener) {
  listeners[source].add(listener);
  return () => {
    listeners[source].delete(listener);
  };
}
