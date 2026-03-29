import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import { Buffer } from "buffer";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import {
  getAngelStatusPayload,
  prepareOrPlaceAngelOrder,
} from "./local-api/angelOne";
import {
  getTelegramStatus,
  sendTelegramMessage,
  formatSignalMessage,
} from "./local-api/telegram";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const screenshotsDir = "C:\\Users\\manir\\Pictures\\Screenshots";

function localScreenshotsPlugin() {
  return {
    name: "local-screenshots-api",
    configureServer(server: import("vite").ViteDevServer) {
      server.middlewares.use("/api/screenshots/latest", async (req, res) => {
        try {
          const url = new URL(req.url ?? "/", "http://localhost");
          const limitParam = Number.parseInt(url.searchParams.get("limit") ?? "3", 10);
          const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 10) : 3;

          const dirEntries = await fs.readdir(screenshotsDir, { withFileTypes: true });
          const imageCandidates = await Promise.all(
            dirEntries
              .filter((entry) => entry.isFile())
              .map(async (entry) => {
                const fullPath = path.join(screenshotsDir, entry.name);
                const stats = await fs.stat(fullPath);
                return {
                  name: entry.name,
                  path: fullPath,
                  lastModified: stats.mtimeMs,
                };
              }),
          );

          const latestImages = imageCandidates
            .filter((file) => /\.(png|jpe?g|webp|bmp|gif)$/i.test(file.name))
            .sort((a, b) => b.lastModified - a.lastModified)
            .slice(0, limit);

          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ directory: screenshotsDir, files: latestImages }));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error: error instanceof Error ? error.message : "Could not load screenshots",
            }),
          );
        }
      });

      server.middlewares.use("/api/screenshots/file", async (req, res) => {
        try {
          const url = new URL(req.url ?? "/", "http://localhost");
          const requestedPath = url.searchParams.get("path");

          if (!requestedPath) {
            res.statusCode = 400;
            res.end("Missing path");
            return;
          }

          const normalizedBase = path.resolve(screenshotsDir);
          const normalizedTarget = path.resolve(requestedPath);

          if (!normalizedTarget.startsWith(normalizedBase)) {
            res.statusCode = 403;
            res.end("Forbidden");
            return;
          }

          const fileBuffer = await fs.readFile(normalizedTarget);
          const ext = path.extname(normalizedTarget).toLowerCase();
          const contentType =
            ext === ".png"
              ? "image/png"
              : ext === ".jpg" || ext === ".jpeg"
                ? "image/jpeg"
                : ext === ".webp"
                  ? "image/webp"
                  : ext === ".gif"
                    ? "image/gif"
                    : ext === ".bmp"
                      ? "image/bmp"
                      : "application/octet-stream";

          res.setHeader("Content-Type", contentType);
          res.setHeader("Cache-Control", "no-store");
          res.end(fileBuffer);
        } catch {
          res.statusCode = 404;
          res.end("Not found");
        }
      });

      server.middlewares.use("/api/openai/key", (_req, res) => {
        const key = process.env.OPENAI_API_KEY?.trim() ?? "";
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ key: key || null }));
      });

      server.middlewares.use("/api/angelone/test-login", async (_req, res) => {
        try {
          const apiKey = process.env.ANGELONE_API_KEY?.trim() ?? "";
          const clientCode = process.env.ANGELONE_CLIENT_CODE?.trim() ?? "";
          const password = process.env.ANGELONE_PASSWORD?.trim() ?? "";
          const totpSecret = process.env.ANGELONE_TOTP_SECRET?.trim() ?? "";

          // Generate TOTP inline for debug
          const { createHmac } = await import("crypto");
          function base32Decode(input: string): Buffer {
            const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
            const clean = input.toUpperCase().replace(/=+$/, "");
            let bits = 0, value = 0;
            const bytes: number[] = [];
            for (const c of clean) {
              const i = alpha.indexOf(c);
              if (i === -1) continue;
              value = (value << 5) | i; bits += 5;
              if (bits >= 8) { bytes.push((value >>> (bits - 8)) & 0xff); bits -= 8; }
            }
            return Buffer.from(bytes);
          }
          const key = base32Decode(totpSecret);
          const counter = Math.floor(Date.now() / 1000 / 30);
          const buf = Buffer.alloc(8);
          buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
          buf.writeUInt32BE(counter >>> 0, 4);
          const hmac = createHmac("sha1", key).update(buf).digest();
          const offset = hmac[hmac.length - 1] & 0x0f;
          const code = ((hmac[offset] & 0x7f) << 24) | (hmac[offset+1] << 16) | (hmac[offset+2] << 8) | hmac[offset+3];
          const totp = String(code % 1_000_000).padStart(6, "0");

          const raw = await fetch("https://apiconnect.angelone.in/rest/auth/angelbroking/user/v1/loginByPassword", {
            method: "POST",
            headers: {
              Accept: "application/json", "Content-Type": "application/json",
              "X-UserType": "USER", "X-SourceID": "WEB", "X-PrivateKey": apiKey,
            },
            body: JSON.stringify({ clientcode: clientCode, password, totp }),
          });
          const rawText = await raw.text().catch(() => "");
          let payload: unknown = null;
          try { payload = JSON.parse(rawText); } catch { payload = rawText; }
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ httpStatus: raw.status, totp, payload, headers: Object.fromEntries(raw.headers.entries()) }));
        } catch (err) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
        }
      });

      server.middlewares.use("/api/telegram/status", (_req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(getTelegramStatus()));
      });

      server.middlewares.use("/api/telegram/notify", async (req, res) => {
        try {
          if (req.method !== "POST") { res.statusCode = 405; res.end("Method not allowed"); return; }
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") as {
            signal?: {
              action: string; direction: string; entry: string; stopLoss: string;
              target1: string; target2: string; confidenceLevel: number; riskReward: string;
            };
          };
          const tg = getTelegramStatus();
          if (tg.configured && tg.notifySignal && body.signal) {
            await sendTelegramMessage(formatSignalMessage(body.signal));
          }
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ sent: tg.configured && tg.notifySignal }));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Telegram notify failed" }));
        }
      });

      server.middlewares.use("/api/angelone/status", async (_req, res) => {
        try {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(getAngelStatusPayload()));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error: error instanceof Error ? error.message : "Could not load broker status",
            }),
          );
        }
      });

      server.middlewares.use("/api/angelone/order", async (req, res) => {
        try {
          if (req.method !== "POST") {
            res.statusCode = 405;
            res.end("Method not allowed");
            return;
          }

          const chunks: Buffer[] = [];
          for await (const chunk of req) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          const bodyText = Buffer.concat(chunks).toString("utf8");
          const body = JSON.parse(bodyText || "{}") as {
            signal?: { action: "SELL CE" | "SELL PE" | "NO TRADE"; entry: string; confidenceLevel: number };
            mode?: "preview" | "live";
            totp?: string;
            lots?: number;
          };

          if (!body.signal) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Missing signal payload" }));
            return;
          }

          const result = await prepareOrPlaceAngelOrder({
            signal: body.signal,
            mode: body.mode,
            totp: body.totp,
            lots: body.lots,
          });

          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(result));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error: error instanceof Error ? error.message : "Could not prepare Angel One order",
            }),
          );
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load ALL .env.local vars (no prefix filter) into process.env so server
  // middleware code (angelOne.ts, telegram.ts) can read them via process.env.
  const env = loadEnv(mode, process.cwd(), "");
  Object.assign(process.env, env);

  return {
    plugins: [react(), tailwindcss(), localScreenshotsPlugin(), viteSingleFile()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
  };
});
