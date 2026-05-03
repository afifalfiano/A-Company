import fs from "fs/promises";
import path from "path";
import { validateManifest } from "./security-validator.js";

export async function writeProjectFiles(
  projectId: string,
  files: Array<{ path: string; content: string }>,
  baseDir: string
): Promise<{ written: string[] }> {
  const projectDir = path.join(baseDir, projectId);

  // Validate entire manifest before writing any file
  const validation = validateManifest(files, projectDir);
  if (!validation.valid) {
    throw new Error(`Security validation failed:\n${validation.errors.join("\n")}`);
  }

  // Ensure project directory exists
  await fs.mkdir(projectDir, { recursive: true });

  // Write all files in parallel
  await Promise.all(
    files.map(({ path: filePath, content }) =>
      fs.writeFile(path.join(projectDir, filePath), content, "utf-8")
    )
  );

  return { written: files.map((f) => f.path) };
}