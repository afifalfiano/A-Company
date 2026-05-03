import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeProjectFiles } from "./file-writer.js";
import fs from "fs/promises";
import path from "path";

const TEST_DIR = "/tmp/file-writer-test";

beforeEach(async () => {
  await fs.mkdir(TEST_DIR, { recursive: true });
});

afterEach(async () => {
  await fs.rm(TEST_DIR, { recursive: true, force: true });
});

describe("writeProjectFiles", () => {
  it("writes files to the correct location", async () => {
    const files = [
      { path: "package.json", content: '{"name":"test","version":"1.0.0"}' },
      { path: "src/index.ts", content: "console.log('hello');" },
    ];
    const result = await writeProjectFiles("proj-1", files, TEST_DIR);
    expect(result.written).toContain("package.json");
    expect(result.written).toContain("src/index.ts");

    const pkgContent = await fs.readFile(path.join(TEST_DIR, "proj-1", "package.json"), "utf-8");
    expect(pkgContent).toBe('{"name":"test","version":"1.0.0"}');

    const srcContent = await fs.readFile(path.join(TEST_DIR, "proj-1", "src/index.ts"), "utf-8");
    expect(srcContent).toBe("console.log('hello');");
  });

  it("returns all written file paths", async () => {
    const files = [
      { path: "a.txt", content: "a" },
      { path: "b.txt", content: "b" },
      { path: "c.txt", content: "c" },
    ];
    const result = await writeProjectFiles("proj-2", files, TEST_DIR);
    expect(result.written).toHaveLength(3);
  });

  it("creates nested directories", async () => {
    const files = [
      { path: "packages/api/src/routes/index.ts", content: "export default () => {};" },
    ];
    await writeProjectFiles("proj-3", files, TEST_DIR);
    const exists = await fs.access(path.join(TEST_DIR, "proj-3", "packages/api/src/routes/index.ts"));
    expect(exists).toBeUndefined();
  });
});
