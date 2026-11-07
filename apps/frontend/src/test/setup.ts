import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, vi } from "vitest";

// Each test gets an empty database, and fresh modules so the cached
// connection in db/index.ts points at it
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  vi.resetModules();
});
