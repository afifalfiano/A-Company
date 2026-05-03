import archiver from "archiver";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import path from "path";
import fs from "fs/promises";

export async function createZipArchive(
  projectId: string,
  files: Array<{ path: string; content: string }>,
  outputDir: string
): Promise<string> {
  const zipPath = path.join(outputDir, `${projectId}.zip`);

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  const output = createWriteStream(zipPath);
  const archive = archiver("zip", { zlib: { level: 9 } });

  // Collect archive finish event
  const finishPromise = new Promise<void>((resolve, reject) => {
    archive.on("finish", () => resolve());
    archive.on("error", (err: Error) => reject(err));
  });

  archive.pipe(output);

  // Add all files to archive
  for (const { path: filePath, content } of files) {
    archive.append(content, { name: filePath });
  }

  archive.finalize();
  await finishPromise;

  return zipPath;
}