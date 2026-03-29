const TELEGRAM_API = "https://api.telegram.org";

interface TelegramConfig {
  botToken: string;
  chatId: string;
  notifySignal: boolean;
  notifyOrder: boolean;
}

function readTelegramEnv(): TelegramConfig {
  return {
    botToken: process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "",
    chatId: process.env.TELEGRAM_CHAT_ID?.trim() ?? "",
    notifySignal: process.env.TELEGRAM_NOTIFY_SIGNAL !== "false",
    notifyOrder: process.env.TELEGRAM_NOTIFY_ORDER !== "false",
  };
}

export function isTelegramConfigured(): boolean {
  const cfg = readTelegramEnv();
  return Boolean(cfg.botToken && cfg.chatId);
}

export function getTelegramStatus() {
  const cfg = readTelegramEnv();
  return {
    configured: Boolean(cfg.botToken && cfg.chatId),
    notifySignal: cfg.notifySignal,
    notifyOrder: cfg.notifyOrder,
  };
}

export async function sendTelegramMessage(text: string): Promise<void> {
  const cfg = readTelegramEnv();
  if (!cfg.botToken || !cfg.chatId) return;

  await fetch(`${TELEGRAM_API}/bot${cfg.botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: cfg.chatId,
      text,
      parse_mode: "HTML",
    }),
  }).catch(() => {/* silently ignore – notification failure must not block order flow */});
}

export function formatSignalMessage(params: {
  action: string;
  direction: string;
  entry: string;
  stopLoss: string;
  target1: string;
  target2: string;
  confidenceLevel: number;
  riskReward: string;
}): string {
  const emoji = params.action === "SELL CE" ? "🔴" : params.action === "SELL PE" ? "🟢" : "⚪";
  const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  return [
    `${emoji} <b>AI Signal — ${params.action}</b>`,
    `📅 ${now} IST`,
    ``,
    `<b>Direction:</b> ${params.direction}`,
    `<b>Entry:</b> ${params.entry}`,
    `<b>Stop Loss:</b> ${params.stopLoss}`,
    `<b>Target 1:</b> ${params.target1}`,
    `<b>Target 2:</b> ${params.target2}`,
    `<b>Confidence:</b> ${params.confidenceLevel}%`,
    `<b>Risk:Reward:</b> ${params.riskReward}`,
  ].join("\n");
}

export function formatOrderMessage(params: {
  mode: string;
  action: string;
  symbol: string;
  strike: number;
  expiry: string;
  quantity: number;
  lots: number;
  spotPrice: number;
  orderId?: string;
}): string {
  const emoji = params.mode === "live" ? "✅" : "👁️";
  const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const modeLabel = params.mode === "live" ? "LIVE ORDER PLACED" : "ORDER PREVIEW";
  return [
    `${emoji} <b>${modeLabel} — ${params.action}</b>`,
    `📅 ${now} IST`,
    ``,
    `<b>Symbol:</b> ${params.symbol}`,
    `<b>Strike:</b> ${params.strike}`,
    `<b>Expiry:</b> ${params.expiry}`,
    `<b>Qty:</b> ${params.quantity} (${params.lots} lot${params.lots > 1 ? "s" : ""})`,
    `<b>Spot:</b> ${params.spotPrice}`,
    ...(params.orderId ? [`<b>Order ID:</b> <code>${params.orderId}</code>`] : []),
  ].join("\n");
}
