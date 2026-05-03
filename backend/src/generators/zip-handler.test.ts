import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createZipArchive } from "./zip-handler.js";
import fs from "fs/promises";
import path from "path";

const TEST_DIR = "/tmp/zip-handler-test";
const OUTPUT_DIR = "/tmp/zip-handler-test/output";

beforeEach(async () => {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
});

afterEach(async () => {
  await fs.rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
  await fs.rm(OUTPUT_DIR, { recursive: true, force: true }).catch(() => {});
});

describe("createZipArchive", () => {
  it("creates a zip file at the expected path", async () => {
    const files = [
      { path: "package.json", content: '{"name":"test"}' },
      { path: "src/index.ts", content: "console.log('hello');" },
    ];
    const zipPath = await createZipArchive("proj-1", files, OUTPUT_DIR);
    expect(zipPath).toBe(path.join(OUTPUT_DIR, "proj-1.zip"));

    const stat = await fs.stat(zipPath);
    expect(stat.size).toBeGreaterThan(0);
  });

  it("returns an absolute path", async () => {
    const files = [{ path: "README.md", content: "# Test Project" }];
    const zipPath = await createZipArchive("proj-2", files, OUTPUT_DIR);
    expect(path.isAbsolute(zipPath)).toBe(true);
  });

  it("creates zip with multiple files", async () => {
    const files = [
      { path: "a.txt", content: "content a" },
      { path: "b.txt", content: "content b" },
    ];
    const zipPath = await createZipArchive("proj-3", files, OUTPUT_DIR);
    const stat = await fs.stat(zipPath);
    expect(stat.size).toBeGreaterThan(0);
  });

  it("creates zip with nested file paths", async () => {
    const files = [
      { path: "packages/api/src/index.ts", content: "export default () => {};" },
    ];
    const zipPath = await createZipArchive("proj-4", files, OUTPUT_DIR);
    const stat = await fs.stat(zipPath);
    expect(stat.size).toBeGreaterThan(0);
  });
});
