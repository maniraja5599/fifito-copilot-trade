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
