import type { Request, Response, NextFunction } from "express";

export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const envKey = process.env.API_KEY;
  if (!envKey) {
    next();
    return;
  }
  const provided = req.headers["x-api-key"];
  if (!provided) {
    res.status(401).json({ error: "Missing X-API-Key header" });
    return;
  }
  if (provided !== envKey) {
    res.status(403).json({ error: "Invalid API key" });
    return;
  }
  next();
}

export function isValidWsKey(key: string | undefined): boolean {
  const envKey = process.env.API_KEY;
  if (!envKey) return true;
  return key === envKey;
}
