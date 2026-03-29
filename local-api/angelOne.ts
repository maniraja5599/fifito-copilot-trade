import path from "path";
import { createHmac } from "crypto";
import { sendTelegramMessage, formatOrderMessage, getTelegramStatus } from "./telegram";

const ANGEL_API_ROOT = "https://apiconnect.angelone.in";
const SCRIP_MASTER_URL =
  "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json";

type TradeAction = "SELL CE" | "SELL PE" | "NO TRADE";

export interface BrokerSignal {
  action: TradeAction;
  entry: string;
  confidenceLevel: number;
}

interface ScripMasterRecord {
  token: string;
  symbol: string;
  name: string;
  expiry: string;
  strike: string;
  lotsize: string;
  instrumenttype: string;
  exch_seg: string;
  tick_size: string;
}

interface AngelEnvConfig {
  apiKey: string;
  clientCode: string;
  password: string;
  totpSecret: string;
  defaultMode: "preview" | "live";
  productType: string;
  orderType: string;
  variety: string;
  duration: string;
  lots: number;
  strikeStep: number;
  minConfidence: number;
  symbolName: string;
  spotExchange: string;
  spotTradingSymbol: string;
  spotSymbolToken: string;
}

export interface AngelStatusPayload {
  configured: boolean;
  hasApiKey: boolean;
  hasClientCode: boolean;
  hasPassword: boolean;
  hasTotpSecret: boolean;
  defaultMode: "preview" | "live";
  productType: string;
  orderType: string;
  variety: string;
  duration: string;
  lots: number;
  strikeStep: number;
  minConfidence: number;
  symbolName: string;
  requiresTotpPerOrder: boolean;
}

export interface AngelOrderPreview {
  mode: "preview" | "live";
  action: TradeAction;
  spotPrice: number;
  spotSource: "ai_entry" | "angelone_live";
  strike: number;
  lots: number;
  quantity: number;
  contract: {
    tradingsymbol: string;
    symboltoken: string;
    expiry: string;
    lotsize: number;
    exchange: string;
  };
  orderPayload: Record<string, string>;
  brokerResponse?: unknown;
}

let scripCache:
  | {
      expiresAt: number;
      data: ScripMasterRecord[];
    }
  | null = null;

function readEnv(): AngelEnvConfig {
  return {
    apiKey: process.env.ANGELONE_API_KEY?.trim() ?? "",
    clientCode: process.env.ANGELONE_CLIENT_CODE?.trim() ?? "",
    password: process.env.ANGELONE_PASSWORD?.trim() ?? "",
    totpSecret: process.env.ANGELONE_TOTP_SECRET?.trim() ?? "",
    defaultMode: process.env.ANGELONE_DEFAULT_MODE === "live" ? "live" : "preview",
    productType: process.env.ANGELONE_PRODUCT_TYPE?.trim() || "INTRADAY",
    orderType: process.env.ANGELONE_ORDER_TYPE?.trim() || "MARKET",
    variety: process.env.ANGELONE_ORDER_VARIETY?.trim() || "NORMAL",
    duration: process.env.ANGELONE_ORDER_DURATION?.trim() || "DAY",
    lots: toPositiveInt(process.env.ANGELONE_LOTS, 1),
    strikeStep: toPositiveInt(process.env.ANGELONE_STRIKE_STEP, 50),
    minConfidence: toPositiveInt(process.env.ANGELONE_MIN_CONFIDENCE, 60),
    symbolName: process.env.ANGELONE_SYMBOL_NAME?.trim() || "NIFTY",
    spotExchange: process.env.ANGELONE_SPOT_EXCHANGE?.trim() || "NSE",
    spotTradingSymbol: process.env.ANGELONE_SPOT_TRADING_SYMBOL?.trim() || "Nifty 50",
    spotSymbolToken: process.env.ANGELONE_SPOT_SYMBOL_TOKEN?.trim() || "99926000",
  };
}

function toPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getAngelStatusPayload(): AngelStatusPayload {
  const env = readEnv();
  return {
    configured: Boolean(env.apiKey && env.clientCode && env.password),
    hasApiKey: Boolean(env.apiKey),
    hasClientCode: Boolean(env.clientCode),
    hasPassword: Boolean(env.password),
    hasTotpSecret: Boolean(env.totpSecret),
    defaultMode: env.defaultMode,
    productType: env.productType,
    orderType: env.orderType,
    variety: env.variety,
    duration: env.duration,
    lots: env.lots,
    strikeStep: env.strikeStep,
    minConfidence: env.minConfidence,
    symbolName: env.symbolName,
    requiresTotpPerOrder: true,
  };
}

function base32Decode(input: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = input.toUpperCase().replace(/=+$/, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const idx = alphabet.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function generateTotp(secret: string): string {
  const key = base32Decode(secret);
  const counter = Math.floor(Date.now() / 1000 / 30);
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3];
  return String(code % 1_000_000).padStart(6, "0");
}

export async function prepareOrPlaceAngelOrder(params: {
  signal: BrokerSignal;
  mode?: "preview" | "live";
  totp?: string;
  lots?: number;
}): Promise<AngelOrderPreview> {
  const env = readEnv();
  const mode = params.mode ?? env.defaultMode;

  if (params.signal.action === "NO TRADE") {
    throw new Error("Broker order blocked because the AI result is NO TRADE.");
  }

  if (mode === "live" && (!env.apiKey || !env.clientCode || !env.password)) {
    throw new Error("Angel One live mode is not configured. Add your broker settings in .env.local first.");
  }

  if (mode === "live" && params.signal.confidenceLevel < env.minConfidence) {
    throw new Error(
      `Live order blocked because confidence ${params.signal.confidenceLevel}% is below the minimum ${env.minConfidence}%.`,
    );
  }

  const lots = params.lots && params.lots > 0 ? params.lots : env.lots;
  let jwtToken: string | undefined;
  let spotPrice = parseSpotFromText(params.signal.entry);
  let spotSource: "ai_entry" | "angelone_live" = "ai_entry";

  if (mode === "live") {
    const totp = params.totp?.trim() || (env.totpSecret ? generateTotp(env.totpSecret) : "");
    if (!totp) {
      throw new Error("Live order requires a TOTP code. Add ANGELONE_TOTP_SECRET to .env.local or enter the code manually.");
    }

    const session = await angelRequest("/rest/auth/angelbroking/user/v1/loginByPassword", env.apiKey, {
      clientcode: env.clientCode,
      password: env.password,
      totp,
    });

    jwtToken = session?.data?.jwtToken;
    if (!jwtToken) {
      throw new Error(session?.message || "Angel One login failed. Check API key, client code, password, and TOTP.");
    }

    spotPrice = await getAngelLiveSpotPrice(env, jwtToken);
    spotSource = "angelone_live";
  }

  const strike = roundToNearestStep(spotPrice, env.strikeStep);
  const optionType = params.signal.action === "SELL CE" ? "CE" : "PE";
  const contract = await findAtmContract({
    symbolName: env.symbolName,
    strike,
    optionType,
  });
  const quantity = lots * Number.parseInt(contract.lotsize, 10);

  const orderPayload = {
    variety: env.variety,
    tradingsymbol: contract.symbol,
    symboltoken: contract.token,
    transactiontype: "SELL",
    exchange: contract.exch_seg,
    ordertype: env.orderType,
    producttype: env.productType,
    duration: env.duration,
    price: env.orderType === "MARKET" ? "0" : "0",
    squareoff: "0",
    stoploss: "0",
    quantity: String(quantity),
  };

  const preview: AngelOrderPreview = {
    mode,
    action: params.signal.action,
    spotPrice,
    spotSource,
    strike,
    lots,
    quantity,
    contract: {
      tradingsymbol: contract.symbol,
      symboltoken: contract.token,
      expiry: contract.expiry,
      lotsize: Number.parseInt(contract.lotsize, 10),
      exchange: contract.exch_seg,
    },
    orderPayload,
  };

  if (mode !== "live") {
    return preview;
  }

  if (!jwtToken) {
    throw new Error("Angel One session could not be established for live order placement.");
  }

  const brokerResponse = await angelRequest(
    "/rest/secure/angelbroking/order/v1/placeOrder",
    env.apiKey,
    orderPayload,
    jwtToken,
  );

  const result = { ...preview, brokerResponse };

  const tg = getTelegramStatus();
  if (tg.configured && tg.notifyOrder) {
    await sendTelegramMessage(formatOrderMessage({
      mode,
      action: params.signal.action,
      symbol: contract.symbol,
      strike,
      expiry: contract.expiry,
      quantity,
      lots,
      spotPrice,
      orderId: (brokerResponse as { data?: { orderid?: string } })?.data?.orderid,
    }));
  }

  return result;
}

async function getAngelLiveSpotPrice(env: AngelEnvConfig, jwtToken: string): Promise<number> {
  const payload = await angelRequest(
    "/rest/secure/angelbroking/order/v1/getLtpData",
    env.apiKey,
    {
      exchange: env.spotExchange,
      tradingsymbol: env.spotTradingSymbol,
      symboltoken: env.spotSymbolToken,
    },
    jwtToken,
  );

  const ltp = Number(payload?.data?.ltp);
  if (!Number.isFinite(ltp) || ltp <= 0) {
    throw new Error("Angel One live spot quote is unavailable, so the live order was not placed.");
  }

  return ltp;
}

async function angelRequest(
  route: string,
  apiKey: string,
  body: Record<string, string>,
  jwtToken?: string,
) {
  const response = await fetch(`${ANGEL_API_ROOT}${route}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-UserType": "USER",
      "X-SourceID": "WEB",
      "X-PrivateKey": apiKey,
      ...(jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.status === false) {
    throw new Error(payload?.message || `Angel One API error ${response.status}`);
  }

  return payload;
}

function parseSpotFromText(value: string): number {
  const match = value.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  if (!match) {
    throw new Error(`Could not parse a spot price from "${value}".`);
  }

  const parsed = Number.parseFloat(match[1]);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid spot price "${value}".`);
  }

  return parsed;
}

function roundToNearestStep(price: number, step: number): number {
  return Math.round(price / step) * step;
}

async function getScripMaster(): Promise<ScripMasterRecord[]> {
  if (scripCache && scripCache.expiresAt > Date.now()) {
    return scripCache.data;
  }

  const response = await fetch(SCRIP_MASTER_URL);
  if (!response.ok) {
    throw new Error(`Could not load Angel One instrument master (${response.status}).`);
  }

  const data = (await response.json()) as ScripMasterRecord[];
  scripCache = {
    expiresAt: Date.now() + 10 * 60 * 1000,
    data,
  };
  return data;
}

async function findAtmContract(params: {
  symbolName: string;
  strike: number;
  optionType: "CE" | "PE";
}): Promise<ScripMasterRecord> {
  const allContracts = await getScripMaster();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const candidates = allContracts
    .filter((item) => item.name === params.symbolName)
    .filter((item) => item.exch_seg === "NFO")
    .filter((item) => item.instrumenttype === "OPTIDX")
    .filter((item) => item.symbol.endsWith(params.optionType))
    .map((item) => ({
      ...item,
      expiryDate: parseAngelExpiry(item.expiry),
      strikePrice: Number.parseFloat(item.strike) / 100,
    }))
    .filter((item) => item.expiryDate.getTime() >= today.getTime())
    .filter((item) => item.strikePrice === params.strike)
    .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());

  if (!candidates.length) {
    throw new Error(
      `No ${params.symbolName} ${params.strike}${params.optionType} contract was found in Angel One's instrument master.`,
    );
  }

  return candidates[0];
}

function parseAngelExpiry(value: string): Date {
  const match = value.match(/^(\d{2})([A-Z]{3})(\d{4})$/);
  if (!match) {
    throw new Error(`Unsupported expiry format "${value}".`);
  }

  const monthMap: Record<string, number> = {
    JAN: 0,
    FEB: 1,
    MAR: 2,
    APR: 3,
    MAY: 4,
    JUN: 5,
    JUL: 6,
    AUG: 7,
    SEP: 8,
    OCT: 9,
    NOV: 10,
    DEC: 11,
  };

  const day = Number.parseInt(match[1], 10);
  const month = monthMap[match[2]];
  const year = Number.parseInt(match[3], 10);
  return new Date(year, month, day);
}

export function resolveEnvExamplePath(): string {
  return path.resolve(process.cwd(), ".env.example");
}
