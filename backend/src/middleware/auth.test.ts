import { describe, it, expect, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { requireApiKey, isValidWsKey } from "./auth.js";

const OLD_KEY = process.env.API_KEY;

function makeApp(key: string | undefined) {
  process.env.API_KEY = key as string;
  const app = express();
  app.get("/test", requireApiKey, (_req, res) => res.json({ ok: true }));
  return app;
}

describe("requireApiKey", () => {
  afterEach(() => {
    if (OLD_KEY === undefined) delete process.env.API_KEY;
    else process.env.API_KEY = OLD_KEY;
  });

  it("passes with correct key in header", async () => {
    const res = await request(makeApp("secret")).get("/test").set("X-API-Key", "secret");
    expect(res.status).toBe(200);
  });

  it("rejects missing key with 401", async () => {
    const res = await request(makeApp("secret")).get("/test");
    expect(res.status).toBe(401);
  });

  it("rejects wrong key with 403", async () => {
    const res = await request(makeApp("secret")).get("/test").set("X-API-Key", "wrong");
    expect(res.status).toBe(403);
  });

  it("passes with no API_KEY set (open mode)", async () => {
    delete process.env.API_KEY;
    const app = express();
    app.get("/test", requireApiKey, (_req, res) => res.json({ ok: true }));
    const res = await request(app).get("/test");
    expect(res.status).toBe(200);
  });
});

describe("isValidWsKey", () => {
  afterEach(() => {
    if (OLD_KEY === undefined) delete process.env.API_KEY;
    else process.env.API_KEY = OLD_KEY;
  });

  it("returns true when no API_KEY set", () => {
    delete process.env.API_KEY;
    expect(isValidWsKey(undefined)).toBe(true);
  });

  it("returns true for correct key", () => {
    process.env.API_KEY = "mykey";
    expect(isValidWsKey("mykey")).toBe(true);
  });

  it("returns false for wrong key", () => {
    process.env.API_KEY = "mykey";
    expect(isValidWsKey("bad")).toBe(false);
  });
});
