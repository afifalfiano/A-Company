import { describe, it, expect } from "vitest";
import { validateFilePath, validateFileContent, validateManifest } from "./security-validator.js";

describe("validateFilePath", () => {
  const baseDir = "/project";

  it("accepts relative paths under baseDir", () => {
    expect(validateFilePath("src/index.ts", baseDir).valid).toBe(true);
    expect(validateFilePath("packages/api/src/routes/index.ts", baseDir).valid).toBe(true);
    expect(validateFilePath(".gitignore", baseDir).valid).toBe(true);
    expect(validateFilePath(".env.example", baseDir).valid).toBe(true);
    expect(validateFilePath(".dockerignore", baseDir).valid).toBe(true);
  });

  it("rejects absolute paths", () => {
    expect(validateFilePath("/etc/passwd", baseDir).valid).toBe(false);
    expect(validateFilePath("/project/src/index.ts", baseDir).valid).toBe(false);
  });

  it("rejects path traversal attempts", () => {
    expect(validateFilePath("../etc/passwd", baseDir).valid).toBe(false);
    expect(validateFilePath("src/../../../etc/passwd", baseDir).valid).toBe(false);
    expect(validateFilePath("src/../..", baseDir).valid).toBe(false);
    expect(validateFilePath("foo/../../bar", baseDir).valid).toBe(false);
  });

  it("rejects hidden files except allowlist", () => {
    expect(validateFilePath(".secret", baseDir).valid).toBe(false);
    expect(validateFilePath(".npmrc", baseDir).valid).toBe(false);
    expect(validateFilePath(".htaccess", baseDir).valid).toBe(false);
  });

  it("rejects blocked extensions", () => {
    expect(validateFilePath("script.sh", baseDir).valid).toBe(false);
    expect(validateFilePath("malware.exe", baseDir).valid).toBe(false);
    expect(validateFilePath("lib.so", baseDir).valid).toBe(false);
    expect(validateFilePath("lib.dll", baseDir).valid).toBe(false);
  });

  it("accepts allowed extensions", () => {
    expect(validateFilePath("src/index.ts", baseDir).valid).toBe(true);
    expect(validateFilePath("src/App.tsx", baseDir).valid).toBe(true);
    expect(validateFilePath("package.json", baseDir).valid).toBe(true);
    expect(validateFilePath("config.yaml", baseDir).valid).toBe(true);
    expect(validateFilePath("Dockerfile", baseDir).valid).toBe(true);
    expect(validateFilePath(".env", baseDir).valid).toBe(true);
    expect(validateFilePath("README.md", baseDir).valid).toBe(true);
    expect(validateFilePath("readme.txt", baseDir).valid).toBe(true);
  });

  it("rejects paths that resolve outside baseDir", () => {
    expect(validateFilePath("foo/../../../bar", baseDir).valid).toBe(false);
  });
});

describe("validateFileContent", () => {
  it("accepts valid content under 1MB", () => {
    const content = "// TypeScript code\nconst x = 1;";
    expect(validateFileContent("src/index.ts", content).valid).toBe(true);
  });

  it("rejects content over 1MB", () => {
    const content = "x".repeat(1024 * 1024 + 1);
    expect(validateFileContent("src/index.ts", content).valid).toBe(false);
  });

  it("rejects content with suspicious script tags", () => {
    expect(validateFileContent("index.html", "<script>alert(1)</script>").valid).toBe(false);
    expect(validateFileContent("index.html", "<script src='evil.js'>").valid).toBe(false);
  });

  it("rejects content with javascript: protocol", () => {
    expect(validateFileContent("index.html", "<a href='javascript:alert(1)'>").valid).toBe(false);
  });

  it("rejects content with data:text/html", () => {
    expect(validateFileContent("index.html", "<a href='data:text/html,<script>").valid).toBe(false);
  });

  it("accepts legitimate code with < and > characters", () => {
    const content = "const html = '<div>Hello</div>'; const fn = (x: number) => x > 0;";
    expect(validateFileContent("src/app.ts", content).valid).toBe(true);
    expect(validateFileContent("src/index.html", "<div>Test</div>").valid).toBe(true);
  });
});

describe("validateManifest", () => {
  const baseDir = "/project";

  it("returns valid=true for clean manifest", () => {
    const files = [
      { path: "package.json", content: "{}" },
      { path: "src/index.ts", content: "console.log('hello');" },
    ];
    const result = validateManifest(files, baseDir);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("collects multiple errors", () => {
    const files = [
      { path: "../etc/passwd", content: "malicious" },
      { path: "script.sh", content: "echo hi" },
      { path: "valid.ts", content: "const x = 1;" },
    ];
    const result = validateManifest(files, baseDir);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  it("returns valid=false if any file fails content check", () => {
    const files = [
      { path: "src/index.ts", content: "console.log('hi');" },
      { path: "big.ts", content: "x".repeat(1024 * 1024 + 1) },
    ];
    const result = validateManifest(files, baseDir);
    expect(result.valid).toBe(false);
  });
});
