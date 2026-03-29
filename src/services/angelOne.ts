import type { TradeSignal } from "../types";

export interface AngelStatus {
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

export interface AngelOrderResult {
  mode: "preview" | "live";
  action: "SELL CE" | "SELL PE" | "NO TRADE";
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
  brokerResponse?: {
    status?: boolean;
    message?: string;
    data?: {
      orderid?: string;
    };
  };
}

export async function getAngelStatus(): Promise<AngelStatus> {
  const response = await fetch("/api/angelone/status", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Could not load Angel One broker status.");
  }

  return (await response.json()) as AngelStatus;
}

export async function submitAngelAtmSell(params: {
  signal: TradeSignal;
  mode: "preview" | "live";
  totp?: string;
  lots?: number;
}): Promise<AngelOrderResult> {
  const response = await fetch("/api/angelone/order", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || "Angel One order request failed.");
  }

  return payload as AngelOrderResult;
}
