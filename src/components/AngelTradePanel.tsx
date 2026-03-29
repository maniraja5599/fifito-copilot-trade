import { useEffect, useState } from "react";
import type { TradeSignal } from "../types";
import {
  getAngelStatus,
  submitAngelAtmSell,
  type AngelOrderResult,
  type AngelStatus,
} from "../services/angelOne";

interface AngelTradePanelProps {
  signal: TradeSignal;
}

export default function AngelTradePanel({ signal }: AngelTradePanelProps) {
  const [status, setStatus] = useState<AngelStatus | null>(null);
  const [mode, setMode] = useState<"preview" | "live">("preview");
  const [totp, setTotp] = useState("");
  const [lots, setLots] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AngelOrderResult | null>(null);

  useEffect(() => {
    getAngelStatus()
      .then((data) => {
        setStatus(data);
        setMode(data.defaultMode);
        setLots(String(data.lots));
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load broker status.");
      });
  }, []);

  const canTrade = signal.action === "SELL CE" || signal.action === "SELL PE";

  const handleSubmit = async () => {
    if (!canTrade) {
      setError("Angel One execution is only available for SELL CE or SELL PE signals.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const brokerResult = await submitAngelAtmSell({
        signal,
        mode,
        totp: mode === "live" ? totp : undefined,
        lots: Number.parseInt(lots, 10),
      });
      setResult(brokerResult);
      if (mode === "live") {
        setTotp("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Broker request failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-dark-800 rounded-2xl p-5 border border-dark-600 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span className="text-neon-yellow">◆</span> Angel One ATM Sell
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            Uses the AI signal to prepare an ATM NIFTY option sell. Preview is the safe default; live mode needs a fresh TOTP.
          </p>
        </div>
        <div className={`text-[10px] px-3 py-1.5 rounded-lg border ${
          status?.configured
            ? "bg-green-500/10 text-green-400 border-green-500/30"
            : "bg-red-500/10 text-red-300 border-red-500/30"
        }`}>
          {status?.configured ? "Broker Config Found" : "Broker Config Missing"}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-dark-700/50 rounded-xl p-3 border border-dark-600">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Signal</div>
          <div className="text-sm font-semibold text-white">{signal.action}</div>
        </div>
        <div className="bg-dark-700/50 rounded-xl p-3 border border-dark-600">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Mode</div>
          <div className="flex gap-2">
            <button
              onClick={() => setMode("preview")}
              className={`text-xs px-3 py-1.5 rounded-lg border ${
                mode === "preview"
                  ? "bg-neon-blue/20 border-neon-blue/40 text-neon-blue"
                  : "bg-dark-800 border-dark-500 text-slate-400"
              }`}
            >
              Preview
            </button>
            <button
              onClick={() => setMode("live")}
              className={`text-xs px-3 py-1.5 rounded-lg border ${
                mode === "live"
                  ? "bg-red-500/20 border-red-500/40 text-red-300"
                  : "bg-dark-800 border-dark-500 text-slate-400"
              }`}
            >
              Live
            </button>
          </div>
        </div>
        <div className="bg-dark-700/50 rounded-xl p-3 border border-dark-600">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Lots</div>
          <input
            value={lots}
            onChange={(e) => setLots(e.target.value)}
            inputMode="numeric"
            className="w-full bg-dark-800 border border-dark-500 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-blue"
          />
        </div>
        <div className="bg-dark-700/50 rounded-xl p-3 border border-dark-600">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Current TOTP</div>
          {status?.hasTotpSecret ? (
            <div className="text-xs text-green-400 font-semibold py-2">Auto (secret configured)</div>
          ) : (
            <input
              value={totp}
              onChange={(e) => setTotp(e.target.value)}
              placeholder="123456"
              inputMode="numeric"
              className="w-full bg-dark-800 border border-dark-500 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-yellow"
            />
          )}
        </div>
      </div>

      {status && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <InfoPill label="Underlying" value={status.symbolName} />
          <InfoPill label="Product" value={status.productType} />
          <InfoPill label="Order Type" value={status.orderType} />
          <InfoPill label="Variety" value={status.variety} />
          <InfoPill label="Default Lots" value={String(status.lots)} />
          <InfoPill label="Min Confidence" value={`${status.minConfidence}%`} />
        </div>
      )}

      <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
        <p className="text-[11px] leading-relaxed text-yellow-300/80">
          Live mode submits a real sell order through Angel One using the nearest-expiry ATM NIFTY option contract.
          Keep preview mode on until you verify the strike, expiry, quantity, margin, and stop-loss plan.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs text-red-300">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={loading || !canTrade || (mode === "live" && !status?.configured)}
          className={`px-5 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
            mode === "live"
              ? "bg-red-500/15 border-red-500/40 text-red-200 hover:bg-red-500/25"
              : "bg-neon-blue/15 border-neon-blue/40 text-neon-blue hover:bg-neon-blue/25"
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {loading ? "Working..." : mode === "live" ? "Place Live ATM Sell" : "Prepare ATM Sell"}
        </button>
        {!canTrade && (
          <span className="text-xs text-slate-500">No broker order is created when the AI signal is NO TRADE.</span>
        )}
      </div>

      {result && (
        <div className="rounded-2xl border border-dark-600 bg-dark-900/40 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-semibold text-white">
              {result.mode === "live" ? "Angel One order response" : "Prepared Angel One order"}
            </div>
            {result.brokerResponse?.data?.orderid && (
              <div className="text-xs font-mono text-neon-green">
                Order ID: {result.brokerResponse.data.orderid}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <InfoPill label="Spot" value={String(result.spotPrice)} />
            <InfoPill
              label="Spot Source"
              value={result.spotSource === "angelone_live" ? "Angel One Live" : "AI Entry"}
            />
            <InfoPill label="Strike" value={String(result.strike)} />
            <InfoPill label="Expiry" value={result.contract.expiry} />
            <InfoPill label="Symbol" value={result.contract.tradingsymbol} />
            <InfoPill label="Qty" value={String(result.quantity)} />
          </div>
          <pre className="overflow-x-auto rounded-xl bg-black/30 p-3 text-[11px] text-slate-300">
            {JSON.stringify(result.orderPayload, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-dark-700/50 rounded-xl p-3 border border-dark-600">
      <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">{label}</div>
      <div className="text-xs font-semibold text-white break-all">{value}</div>
    </div>
  );
}
