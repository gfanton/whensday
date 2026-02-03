import { describe, it, expect } from "vitest";
import { hashOwnerKey, hashOwnerKeySync, verifyOwnerKey } from "./crypto";

describe("crypto utilities", () => {
  const testKey = "550e8400-e29b-41d4-a716-446655440000";

  describe("hashOwnerKey (async)", () => {
    it("returns a 64-character hex string", async () => {
      const hash = await hashOwnerKey(testKey);
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("produces consistent hashes", async () => {
      const hash1 = await hashOwnerKey(testKey);
      const hash2 = await hashOwnerKey(testKey);
      expect(hash1).toBe(hash2);
    });

    it("produces different hashes for different inputs", async () => {
      const hash1 = await hashOwnerKey(testKey);
      const hash2 = await hashOwnerKey("different-key");
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("hashOwnerKeySync", () => {
    it("returns a 64-character hex string", () => {
      const hash = hashOwnerKeySync(testKey);
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("matches async hash", async () => {
      const asyncHash = await hashOwnerKey(testKey);
      const syncHash = hashOwnerKeySync(testKey);
      expect(syncHash).toBe(asyncHash);
    });

    it("produces consistent hashes", () => {
      const hash1 = hashOwnerKeySync(testKey);
      const hash2 = hashOwnerKeySync(testKey);
      expect(hash1).toBe(hash2);
    });
  });

  describe("verifyOwnerKey", () => {
    it("returns true for matching key", () => {
      const hash = hashOwnerKeySync(testKey);
      expect(verifyOwnerKey(testKey, hash)).toBe(true);
    });

    it("returns false for non-matching key", () => {
      const hash = hashOwnerKeySync(testKey);
      expect(verifyOwnerKey("wrong-key", hash)).toBe(false);
    });

    it("returns false for empty key", () => {
      const hash = hashOwnerKeySync(testKey);
      expect(verifyOwnerKey("", hash)).toBe(false);
    });

    it("handles similar but different keys", () => {
      const hash = hashOwnerKeySync(testKey);
      const similarKey = testKey.slice(0, -1) + "1";
      expect(verifyOwnerKey(similarKey, hash)).toBe(false);
    });
  });
});
