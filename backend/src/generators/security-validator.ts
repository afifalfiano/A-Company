import path from "path";

const ALLOWED_EXTENSIONS = new Set([
  ".ts", ".tsx", ".json", ".js", ".jsx", ".md", ".yml", ".yaml",
  ".env", ".css", ".html", ".txt", ".gitignore", ".dockerignore",
]);

const BLOCKED_EXTENSIONS = new Set([
  ".sh", ".exe", ".dll", ".so", ".dylib", ".bat", ".cmd", ".ps1",
]);

const MAX_FILE_SIZE = 1024 * 1024; // 1MB
const MAX_TOTAL_FILES = 500;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateFilePath(filePath: string, baseDir: string): ValidationResult {
  const errors: string[] = [];

  // Disallow absolute paths
  if (path.isAbsolute(filePath)) {
    return { valid: false, errors: [`Absolute paths not allowed: ${filePath}`] };
  }

  // Disallow hidden files (except allowlist)
  const basename = path.basename(filePath);
  const allowHidden = new Set([".gitignore", ".env.example", ".dockerignore", ".env"]);
  if (basename.startsWith(".") && !allowHidden.has(basename)) {
    return { valid: false, errors: [`Hidden files not allowed: ${filePath}`] };
  }

  // Check extension (skip for hidden allowlist files with no or non-standard ext)
  const ext = path.extname(filePath).toLowerCase();
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return { valid: false, errors: [`Blocked extension: ${ext}`] };
  }
  if (!allowHidden.has(basename) && ext && !ALLOWED_EXTENSIONS.has(ext)) {
    return { valid: false, errors: [`Extension not allowed: ${ext}`] };
  }

  // Path traversal check
  const resolved = path.resolve(baseDir, filePath);
  const baseResolved = path.resolve(baseDir);
  if (!resolved.startsWith(baseResolved + path.sep)) {
    return { valid: false, errors: [`Path traversal detected: ${filePath}`] };
  }

  return { valid: true, errors: [] };
}

export function validateFileContent(
  filePath: string,
  content: string
): ValidationResult {
  const errors: string[] = [];

  if (content.length > MAX_FILE_SIZE) {
    return {
      valid: false,
      errors: [`File too large (>1MB): ${filePath} (${content.length} bytes)`],
    };
  }

  // Basic suspicious pattern detection
  const suspicious = [
    { pattern: /<script[^>]*>/i, name: "script tag" },
    { pattern: /javascript:/i, name: "javascript: protocol" },
    { pattern: /data:text\/html/i, name: "data:text/html" },
  ];

  for (const { pattern, name } of suspicious) {
    if (pattern.test(content)) {
      errors.push(`Suspicious content (${name}) in: ${filePath}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateManifest(
  files: Array<{ path: string; content: string }>,
  baseDir: string
): ValidationResult {
  const allErrors: string[] = [];

  if (files.length > MAX_TOTAL_FILES) {
    return {
      valid: false,
      errors: [`Too many files: ${files.length} (max ${MAX_TOTAL_FILES})`],
    };
  }

  for (const { path: filePath, content } of files) {
    const pathResult = validateFilePath(filePath, baseDir);
    if (!pathResult.valid) {
      allErrors.push(...pathResult.errors);
      continue;
    }

    const contentResult = validateFileContent(filePath, content);
    if (!contentResult.valid) {
      allErrors.push(...contentResult.errors);
    }
  }

  return { valid: allErrors.length === 0, errors: allErrors };
}