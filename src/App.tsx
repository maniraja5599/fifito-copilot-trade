import { useState, useCallback, useEffect, useRef } from 'react';
import type { ChartImage, TradeSignal } from './types';
import ChartUploader from './components/ChartUploader';
import AnalysisResult from './components/AnalysisResult';
import AnalyzingOverlay from './components/AnalyzingOverlay';
import { analyzeCharts } from './services/analyzeCharts';
import {
  getAngelStatus,
  submitAngelAtmSell,
  type AngelOrderResult,
  type AngelStatus,
} from './services/angelOne';

const DEFAULT_SCREENSHOTS_DIR = 'C:\\Users\\manir\\Pictures\\Screenshots';

function SettingsModal({
  onSaveOpenAi,
  onRemoveOpenAi,
  onClose,
  existingName,
  hasApiKey,
  envKeyLoaded,
  angelStatus,
}: {
  onSaveOpenAi: (key: string, name: string) => void;
  onRemoveOpenAi: () => void;
  onClose: () => void;
  existingName?: string;
  hasApiKey: boolean;
  envKeyLoaded: boolean;
  angelStatus: AngelStatus | null;
}) {
  const [key, setKey] = useState('');
  const [name, setName] = useState(existingName || '');
  const [activeTab, setActiveTab] = useState<'openai' | 'angelone'>('openai');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-dark-800 rounded-2xl p-8 max-w-3xl w-full border border-dark-600 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-dark-700 hover:bg-dark-600 border border-dark-500 hover:border-slate-400 text-slate-400 hover:text-white transition-all duration-200 text-sm"
          title="Close"
        >
          ✕
        </button>

        <div className="mb-6">
          <div className="text-center mb-5">
            <div className="text-4xl mb-3">⚙️</div>
            <h2 className="text-xl font-bold text-white">Settings</h2>
            <p className="text-xs text-slate-400 mt-2">
              Manage your OpenAI key and review Angel One broker status in one place.
            </p>
          </div>

          <div className="flex gap-2 bg-dark-900/60 rounded-xl p-1 border border-dark-600">
            <button
              onClick={() => setActiveTab('openai')}
              className={`flex-1 text-sm rounded-lg px-4 py-2 border transition-colors ${
                activeTab === 'openai'
                  ? 'bg-neon-blue/15 border-neon-blue/40 text-neon-blue'
                  : 'bg-transparent border-transparent text-slate-400 hover:text-white'
              }`}
            >
              OpenAI
            </button>
            <button
              onClick={() => setActiveTab('angelone')}
              className={`flex-1 text-sm rounded-lg px-4 py-2 border transition-colors ${
                activeTab === 'angelone'
                  ? 'bg-neon-yellow/15 border-neon-yellow/40 text-neon-yellow'
                  : 'bg-transparent border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Angel One
            </button>
          </div>
        </div>

        {activeTab === 'openai' ? (
          <div className="space-y-4">
            <div className={`rounded-xl border px-4 py-3 text-xs ${
              hasApiKey
                ? 'border-green-500/20 bg-green-500/5 text-green-300'
                : 'border-yellow-500/20 bg-yellow-500/5 text-yellow-300'
            }`}>
              {hasApiKey
                ? envKeyLoaded
                  ? 'OpenAI key loaded from .env.local — no manual entry needed.'
                  : `OpenAI key saved locally${existingName ? ` as "${existingName}"` : ''}.`
                : 'No OpenAI key saved yet. Add OPENAI_API_KEY to .env.local or paste below.'}
            </div>
            <label className="block text-xs text-slate-400 mb-1">Key Name <span className="text-slate-600">(e.g. "GPT-4o Main")</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="GPT-4o Main"
              className="w-full bg-dark-700 border border-dark-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-neon-purple transition-colors"
            />
            <div>
              <label className="block text-xs text-slate-400 mb-1">API Key</label>
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={hasApiKey ? 'Enter a new key to replace the saved one' : 'sk-...'}
                className="w-full bg-dark-700 border border-dark-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-neon-blue transition-colors font-mono"
              />
              <p className="text-[10px] text-slate-600 mt-2">
                Stored only in this browser. Needed for GPT-4o chart analysis.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => key.trim() && onSaveOpenAi(key.trim(), name.trim() || 'GPT-4o Key')}
                disabled={!key.trim()}
                className="bg-neon-blue/20 border border-neon-blue/50 text-neon-blue font-semibold py-3 px-5 rounded-xl hover:bg-neon-blue/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Save OpenAI Key
              </button>
              {hasApiKey && (
                <button
                  onClick={onRemoveOpenAi}
                  className="bg-red-500/10 border border-red-500/30 text-red-300 font-semibold py-3 px-5 rounded-xl hover:bg-red-500/20 transition-all"
                >
                  Remove Saved Key
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`rounded-xl border px-4 py-3 text-xs ${
              angelStatus?.configured
                ? 'border-green-500/20 bg-green-500/5 text-green-300'
                : 'border-red-500/20 bg-red-500/5 text-red-300'
            }`}>
              {angelStatus?.configured
                ? 'Angel One credentials are available on the local server.'
                : 'Angel One server configuration is incomplete. Add broker values in .env.local and restart the dev server.'}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <StatusTile label="API Key" ok={Boolean(angelStatus?.hasApiKey)} />
              <StatusTile label="Client Code" ok={Boolean(angelStatus?.hasClientCode)} />
              <StatusTile label="Password" ok={Boolean(angelStatus?.hasPassword)} />
              <StatusTile label="TOTP Secret" ok={Boolean(angelStatus?.hasTotpSecret)} />
              <ConfigTile label="Default Mode" value={angelStatus?.defaultMode ?? 'Unknown'} />
              <ConfigTile label="Product Type" value={angelStatus?.productType ?? 'Unknown'} />
              <ConfigTile label="Default Lots" value={String(angelStatus?.lots ?? '-')} />
              <ConfigTile label="Order Type" value={angelStatus?.orderType ?? 'Unknown'} />
              <ConfigTile label="Min Confidence" value={`${angelStatus?.minConfidence ?? '-'}%`} />
            </div>
            <div className="rounded-xl border border-dark-600 bg-dark-900/40 px-4 py-3 text-xs text-slate-400">
              All broker settings are loaded from <span className="text-white font-mono">.env.local</span> on the server.
              Edit that file and restart the dev server to change any value.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Header({
  apiKey,
  apiKeyName,
  angelStatus,
  onOpenSettings,
}: {
  apiKey: string | null;
  apiKeyName: string | null;
  angelStatus: AngelStatus | null;
  onOpenSettings: () => void;
}) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="border-b border-dark-600 bg-dark-900/80 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center text-lg font-bold text-white shadow-lg">
            N
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">FiFTO Copilot Trade</h1>
            <p className="text-[10px] text-slate-500">AI-Powered Options Selling Signals</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-dark-800 px-3 py-1.5 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse"></div>
            <span className="font-mono">{time.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
            <span className="text-slate-600">IST</span>
          </div>
          <div className={`hidden md:flex items-center gap-2 text-[10px] px-3 py-1.5 rounded-lg border ${
            apiKey ? 'bg-green-500/10 text-green-300 border-green-500/20' : 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20'
          }`}>
            <span>{apiKey ? 'OpenAI Ready' : 'OpenAI Missing'}</span>
            {apiKeyName && <span className="text-slate-500">{apiKeyName}</span>}
          </div>
          <div className={`hidden md:flex items-center gap-2 text-[10px] px-3 py-1.5 rounded-lg border ${
            angelStatus?.configured ? 'bg-green-500/10 text-green-300 border-green-500/20' : 'bg-red-500/10 text-red-300 border-red-500/20'
          }`}>
            <span>{angelStatus?.configured ? 'Angel One Ready' : 'Angel One Missing'}</span>
          </div>
          <button
            onClick={onOpenSettings}
            className="text-xs text-slate-300 hover:text-white transition-colors bg-dark-800 border border-dark-600 px-3 py-1.5 rounded-lg"
            title="Open settings"
          >
            Settings
          </button>
        </div>
      </div>
    </header>
  );
}

function StatusTile({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className={`rounded-xl p-3 border ${
      ok ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'
    }`}>
      <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">{label}</div>
      <div className={`text-xs font-semibold ${ok ? 'text-green-300' : 'text-red-300'}`}>
        {ok ? 'Configured' : 'Missing'}
      </div>
    </div>
  );
}

function ConfigTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl p-3 border border-dark-600 bg-dark-700/50">
      <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">{label}</div>
      <div className="text-xs font-semibold text-white break-all">{value}</div>
    </div>
  );
}

function HistoryPanel({ history, onSelect }: { history: { signal: TradeSignal; timestamp: Date }[]; onSelect: (signal: TradeSignal) => void }) {
  if (history.length === 0) return null;

  return (
    <div className="bg-dark-800 rounded-2xl p-5 border border-dark-600">
      <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
        <span className="text-neon-purple">◆</span> Analysis History
      </h3>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {history.map((item, i) => (
          <button
            key={i}
            onClick={() => onSelect(item.signal)}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-dark-700/50 hover:bg-dark-700 transition-colors text-left"
          >
            <span className="text-lg">
              {item.signal.direction === 'BULLISH' ? '🟢' : item.signal.direction === 'BEARISH' ? '🔴' : '🟡'}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white">{item.signal.action}</div>
              <div className="text-[10px] text-slate-500">
                {item.timestamp.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} • {item.signal.confidenceLevel}% confidence
              </div>
            </div>
            <span className="text-xs font-mono text-slate-400">{item.signal.entry}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Toast notification for paste feedback
function PasteToast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div
      className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
      }`}
    >
      <div className="bg-neon-blue/20 border border-neon-blue/50 text-neon-blue text-sm font-semibold px-6 py-3 rounded-xl backdrop-blur-sm shadow-2xl flex items-center gap-2">
        <span className="text-base">📋</span> {message}
      </div>
    </div>
  );
}

function ExecutionSetupPanel({
  status,
  mode,
  lots,
  totp,
  autoPlaceLive,
  brokerLoading,
  brokerError,
  onModeChange,
  onLotsChange,
  onTotpChange,
  onAutoPlaceLiveChange,
}: {
  status: AngelStatus | null;
  mode: 'preview' | 'live';
  lots: string;
  totp: string;
  autoPlaceLive: boolean;
  brokerLoading: boolean;
  brokerError: string | null;
  onModeChange: (mode: 'preview' | 'live') => void;
  onLotsChange: (value: string) => void;
  onTotpChange: (value: string) => void;
  onAutoPlaceLiveChange: (value: boolean) => void;
}) {
  return (
    <div className="mb-6 bg-dark-800 rounded-2xl border border-dark-600 p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span className="text-neon-yellow">◆</span> Angel One Execution Setup
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 max-w-2xl">
            When auto-live is on, the app will place the Angel One sell order immediately after a valid AI result.
            Live execution uses Angel One spot data before selecting the ATM option.
          </p>
        </div>
        <div
          className={`text-[10px] px-3 py-1.5 rounded-lg border ${
            status?.configured
              ? 'bg-green-500/10 text-green-400 border-green-500/30'
              : 'bg-red-500/10 text-red-300 border-red-500/30'
          }`}
        >
          {status?.configured ? 'Broker Ready' : 'Broker Config Missing'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-dark-700/50 rounded-xl p-3 border border-dark-600">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Mode</div>
          <div className="flex gap-2">
            <button
              onClick={() => onModeChange('preview')}
              className={`text-xs px-3 py-1.5 rounded-lg border ${
                mode === 'preview'
                  ? 'bg-neon-blue/20 border-neon-blue/40 text-neon-blue'
                  : 'bg-dark-800 border-dark-500 text-slate-400'
              }`}
            >
              Preview
            </button>
            <button
              onClick={() => onModeChange('live')}
              className={`text-xs px-3 py-1.5 rounded-lg border ${
                mode === 'live'
                  ? 'bg-red-500/20 border-red-500/40 text-red-300'
                  : 'bg-dark-800 border-dark-500 text-slate-400'
              }`}
            >
              Live
            </button>
          </div>
        </div>

        <div className="bg-dark-700/50 rounded-xl p-3 border border-dark-600">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Lots</div>
          <input
            value={lots}
            onChange={(e) => onLotsChange(e.target.value)}
            inputMode="numeric"
            className="w-full bg-dark-800 border border-dark-500 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-blue"
          />
        </div>

        {!status?.hasTotpSecret && (
          <div className="bg-dark-700/50 rounded-xl p-3 border border-dark-600">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Current TOTP</div>
            <input
              value={totp}
              onChange={(e) => onTotpChange(e.target.value)}
              placeholder="123456"
              inputMode="numeric"
              className="w-full bg-dark-800 border border-dark-500 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-yellow"
            />
          </div>
        )}

        <label className="bg-dark-700/50 rounded-xl p-3 border border-dark-600 flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={autoPlaceLive}
            onChange={(e) => onAutoPlaceLiveChange(e.target.checked)}
            className="w-4 h-4 accent-red-500"
          />
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Auto Fire</div>
            <div className="text-xs font-semibold text-white">Place live order after analysis</div>
          </div>
        </label>
      </div>

      <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
        <p className="text-[11px] leading-relaxed text-yellow-300/80">
          Auto-fire only works in live mode with a fresh TOTP. If the AI returns NO TRADE or confidence is below your Angel One minimum,
          the analysis will still complete but no live order will be sent.
        </p>
      </div>

      {(brokerError || brokerLoading) && (
        <div className={`rounded-xl px-4 py-3 text-xs border ${
          brokerError
            ? 'border-red-500/20 bg-red-500/5 text-red-300'
            : 'border-neon-blue/20 bg-neon-blue/5 text-neon-blue'
        }`}>
          {brokerLoading ? 'Angel One order is being processed...' : brokerError}
        </div>
      )}
    </div>
  );
}

// Declare File System Access API types
declare global {
  interface Window {
    showDirectoryPicker?: (options?: { mode?: string }) => Promise<FileSystemDirectoryHandle>;
  }
}

export default function App() {
  const [apiKey, setApiKey] = useState<string | null>(() => localStorage.getItem('openai_api_key'));
  const [apiKeyName, setApiKeyName] = useState<string | null>(() => localStorage.getItem('openai_api_key_name'));
  const [envKeyLoaded, setEnvKeyLoaded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [screenshotDirHandle, setScreenshotDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [ssLoading, setSsLoading] = useState(false);
  const [chart15m, setChart15m] = useState<ChartImage | null>(null);
  const [chart5m, setChart5m] = useState<ChartImage | null>(null);
  const [orderFlow, setOrderFlow] = useState<ChartImage | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<TradeSignal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<{ signal: TradeSignal; timestamp: Date }[]>([]);
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [angelStatus, setAngelStatus] = useState<AngelStatus | null>(null);
  const [tradeMode, setTradeMode] = useState<'preview' | 'live'>(() => {
    const saved = localStorage.getItem('angel_trade_mode');
    return saved === 'live' ? 'live' : 'preview';
  });
  const [angelLots, setAngelLots] = useState(() => localStorage.getItem('angel_trade_lots') || '1');
  const [angelTotp, setAngelTotp] = useState('');
  const [autoPlaceLive, setAutoPlaceLive] = useState(() => localStorage.getItem('angel_auto_place_live') === 'true');
  const [brokerLoading, setBrokerLoading] = useState(false);
  const [brokerError, setBrokerError] = useState<string | null>(null);
  const [brokerResult, setBrokerResult] = useState<AngelOrderResult | null>(null);

  // Refs to always get latest state in event listener
  const chart15mRef = useRef(chart15m);
  const chart5mRef = useRef(chart5m);
  const orderFlowRef = useRef(orderFlow);

  useEffect(() => { chart15mRef.current = chart15m; }, [chart15m]);
  useEffect(() => { chart5mRef.current = chart5m; }, [chart5m]);
  useEffect(() => { orderFlowRef.current = orderFlow; }, [orderFlow]);
  useEffect(() => {
    fetch('/api/openai/key', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: { key: string | null }) => {
        if (data.key) {
          setApiKey(data.key);
          setApiKeyName('From .env.local');
          setEnvKeyLoaded(true);
        }
      })
      .catch(() => {/* ignore – dev server may not be running */});
  }, []);

  useEffect(() => {
    getAngelStatus()
      .then((data) => {
        setAngelStatus(data);
        setTradeMode((currentMode) => {
          if (localStorage.getItem('angel_trade_mode')) {
            return currentMode;
          }
          return data.defaultMode;
        });
        setAngelLots((currentLots) => {
          if (localStorage.getItem('angel_trade_lots')) {
            return currentLots;
          }
          return String(data.lots);
        });
      })
      .catch((err) => {
        setBrokerError(err instanceof Error ? err.message : 'Could not load Angel One broker status.');
      });
  }, []);
  useEffect(() => {
    localStorage.setItem('angel_trade_mode', tradeMode);
  }, [tradeMode]);
  useEffect(() => {
    localStorage.setItem('angel_trade_lots', angelLots);
  }, [angelLots]);
  useEffect(() => {
    localStorage.setItem('angel_auto_place_live', String(autoPlaceLive));
  }, [autoPlaceLive]);

  const allChartsUploaded = chart15m && chart5m && orderFlow;

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2500);
  }, []);

  // Helper: create ChartImage from File
  const fileToChartImage = useCallback((file: File): ChartImage => {
    const preview = URL.createObjectURL(file);
    return { file, preview, name: file.name };
  }, []);

  const resetCharts = useCallback(() => {
    setChart15m(null);
    setChart5m(null);
    setOrderFlow(null);
    chart15mRef.current = null;
    chart5mRef.current = null;
    orderFlowRef.current = null;
  }, []);

  // Find next empty slot and fill it
  const fillNextEmptySlot = useCallback((file: File): string | null => {
    const img = fileToChartImage(file);
    if (!chart15mRef.current) {
      setChart15m(img);
      return '15-Min Chart';
    } else if (!chart5mRef.current) {
      setChart5m(img);
      return '5-Min Chart';
    } else if (!orderFlowRef.current) {
      setOrderFlow(img);
      return 'OrderFlow';
    }
    return null;
  }, [fileToChartImage]);

  // Distribute multiple files across empty slots
  const distributeFiles = useCallback((files: File[], startSlot?: 'chart15m' | 'chart5m' | 'orderFlow') => {
    const queue = [...files];
    const slots: { key: 'chart15m' | 'chart5m' | 'orderFlow'; ref: React.MutableRefObject<ChartImage | null>; setter: (img: ChartImage | null) => void; label: string }[] = [
      { key: 'chart15m', ref: chart15mRef, setter: setChart15m, label: '15-Min Chart' },
      { key: 'chart5m', ref: chart5mRef, setter: setChart5m, label: '5-Min Chart' },
      { key: 'orderFlow', ref: orderFlowRef, setter: setOrderFlow, label: 'OrderFlow' },
    ];

    // If startSlot is specified, reorder slots to start from that slot
    if (startSlot) {
      const startIdx = slots.findIndex(s => s.key === startSlot);
      if (startIdx > 0) {
        const reordered = [...slots.slice(startIdx), ...slots.slice(0, startIdx)];
        slots.length = 0;
        slots.push(...reordered);
      }
    }

    const filled: string[] = [];
    for (const slot of slots) {
      if (queue.length === 0) break;
      // For the startSlot, always fill it (replace if already has image)
      if (slot.key === startSlot || !slot.ref.current) {
        const file = queue.shift()!;
        const img = fileToChartImage(file);
        slot.setter(img);
        slot.ref.current = img; // Update ref immediately for subsequent checks
        filled.push(slot.label);
      }
    }

    if (filled.length > 0) {
      showToast(`✅ Uploaded to: ${filled.join(', ')}`);
    }
  }, [fileToChartImage, showToast]);

  // Global Ctrl+V paste handler
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      // Don't intercept if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) imageFiles.push(file);
        }
      }

      if (imageFiles.length === 0) return;
      e.preventDefault();

      if (imageFiles.length === 1) {
        const slotName = fillNextEmptySlot(imageFiles[0]);
        if (slotName) {
          showToast(`📋 Pasted to ${slotName}`);
        } else {
          showToast('⚠️ All slots are full! Remove a chart first.');
        }
      } else {
        distributeFiles(imageFiles);
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [fillNextEmptySlot, distributeFiles, showToast]);

  const handleSaveApiKey = useCallback((key: string, name: string) => {
    localStorage.setItem('openai_api_key', key);
    localStorage.setItem('openai_api_key_name', name);
    setApiKey(key);
    setApiKeyName(name);
  }, []);

  const handleRemoveApiKey = useCallback(() => {
    localStorage.removeItem('openai_api_key');
    localStorage.removeItem('openai_api_key_name');
    setApiKey(null);
    setApiKeyName(null);
  }, []);

  // Load latest N screenshots from a directory handle
  const loadLatestScreenshots = useCallback(async (dirHandle: FileSystemDirectoryHandle) => {
    setSsLoading(true);
    try {
      const imageFiles: { file: File; lastModified: number }[] = [];
      for await (const entry of (dirHandle as any).values()) {
        if (entry.kind === 'file') {
          const file: File = await (entry as FileSystemFileHandle).getFile();
          if (file.type.startsWith('image/')) {
            imageFiles.push({ file, lastModified: file.lastModified });
          }
        }
      }
      // Sort newest first, take latest 3
      imageFiles.sort((a, b) => b.lastModified - a.lastModified);
      const latest = imageFiles.slice(0, 3).map(f => f.file);
      if (latest.length === 0) {
        showToast('⚠️ No images found in folder');
        return;
      }
      // Reset slots then fill
      resetCharts();
      setTimeout(() => {
        distributeFiles(latest);
      }, 50);
    } catch {
      showToast('⚠️ Could not read screenshots folder');
    } finally {
      setSsLoading(false);
    }
  }, [showToast, distributeFiles, resetCharts]);

  const handleLoadLatestFromDefaultFolder = useCallback(async () => {
    setSsLoading(true);
    try {
      const latestResponse = await fetch('/api/screenshots/latest?limit=3', { cache: 'no-store' });
      if (!latestResponse.ok) {
        throw new Error('Could not read latest screenshots');
      }

      const payload = await latestResponse.json() as {
        directory: string;
        files: { name: string; path: string; lastModified: number }[];
      };

      if (!payload.files.length) {
        showToast('⚠️ No screenshots found in default folder');
        return;
      }

      const fetchedFiles = await Promise.all(
        payload.files.map(async (entry) => {
          const fileResponse = await fetch(`/api/screenshots/file?path=${encodeURIComponent(entry.path)}`, { cache: 'no-store' });
          if (!fileResponse.ok) {
            throw new Error(`Could not load ${entry.name}`);
          }

          const blob = await fileResponse.blob();
          return new File([blob], entry.name, {
            type: blob.type || 'image/png',
            lastModified: entry.lastModified,
          });
        }),
      );

      resetCharts();
      setTimeout(() => {
        distributeFiles(fetchedFiles);
      }, 50);
      setScreenshotDirHandle(null);
      setAutoRefresh(false);
      showToast(`✅ Loaded latest ${fetchedFiles.length} screenshots from default folder`);
    } catch (error) {
      showToast(error instanceof Error ? `⚠️ ${error.message}` : '⚠️ Could not load default screenshots');
    } finally {
      setSsLoading(false);
    }
  }, [distributeFiles, resetCharts, showToast]);

  // Pick screenshots folder
  const handlePickScreenshotsFolder = useCallback(async () => {
    if (!window.showDirectoryPicker) {
      showToast('⚠️ Browser does not support folder picker');
      return;
    }
    try {
      const handle = await window.showDirectoryPicker({ mode: 'read' });
      setScreenshotDirHandle(handle);
      await loadLatestScreenshots(handle);
    } catch {
      // User cancelled
    }
  }, [loadLatestScreenshots, showToast]);

  // Reload from remembered folder
  const handleReloadScreenshots = useCallback(async () => {
    if (screenshotDirHandle) {
      await loadLatestScreenshots(screenshotDirHandle);
    }
  }, [screenshotDirHandle, loadLatestScreenshots]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh || !screenshotDirHandle) return;
    const interval = setInterval(() => {
      loadLatestScreenshots(screenshotDirHandle);
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, screenshotDirHandle, loadLatestScreenshots]);

  const handleAnalyze = useCallback(async () => {
    if (!chart15m || !chart5m || !orderFlow) return;
    if (!apiKey) {
      setError('OpenAI API key is missing. Open Settings and add your key to start analysis.');
      setShowSettings(true);
      return;
    }
    if (autoPlaceLive) {
      if (!angelStatus?.configured) {
        setError('Angel One broker config is missing. Add credentials first, then retry auto-live execution.');
        return;
      }
      if (tradeMode !== 'live') {
        setError('Auto fire requires Angel One mode set to Live.');
        return;
      }
      if (!angelTotp.trim() && !angelStatus?.hasTotpSecret) {
        setError('Enter the current Angel One TOTP before running analysis with auto fire enabled.');
        return;
      }
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setBrokerError(null);
    setBrokerResult(null);

    try {
      const signal = await analyzeCharts(apiKey, chart15m, chart5m, orderFlow);
      setResult(signal);
      setHistory((prev) => [{ signal, timestamp: new Date() }, ...prev].slice(0, 10));

      // Send Telegram signal notification (fire-and-forget)
      fetch('/api/telegram/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signal }),
      }).catch(() => {/* ignore */});

      if (autoPlaceLive && (signal.action === 'SELL CE' || signal.action === 'SELL PE')) {
        setBrokerLoading(true);
        try {
          const liveOrder = await submitAngelAtmSell({
            signal,
            mode: 'live',
            totp: angelTotp.trim(),
            lots: Number.parseInt(angelLots, 10),
          });
          setBrokerResult(liveOrder);
          setAngelTotp('');
        } catch (brokerErr) {
          setBrokerError(brokerErr instanceof Error ? brokerErr.message : 'Live broker request failed.');
        } finally {
          setBrokerLoading(false);
        }
      } else if (autoPlaceLive && signal.action === 'NO TRADE') {
        setBrokerError('AI returned NO TRADE, so no Angel One live order was sent.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [apiKey, chart15m, chart5m, orderFlow, autoPlaceLive, angelStatus, tradeMode, angelTotp, angelLots]);

  const handleReset = useCallback(() => {
    resetCharts();
    setResult(null);
    setError(null);
    setBrokerError(null);
    setBrokerResult(null);
  }, [resetCharts]);

  // Multi-file handlers for each uploader
  const handleMultiFiles15m = useCallback((files: File[]) => distributeFiles(files, 'chart15m'), [distributeFiles]);
  const handleMultiFiles5m = useCallback((files: File[]) => distributeFiles(files, 'chart5m'), [distributeFiles]);
  const handleMultiFilesOF = useCallback((files: File[]) => distributeFiles(files, 'orderFlow'), [distributeFiles]);

  // Determine which slot is next for paste highlight
  const nextEmptySlot = !chart15m ? 'chart15m' : !chart5m ? 'chart5m' : !orderFlow ? 'orderFlow' : null;

  return (
    <div className="min-h-screen bg-dark-900">
      {showSettings && (
        <SettingsModal
          onSaveOpenAi={handleSaveApiKey}
          onRemoveOpenAi={handleRemoveApiKey}
          onClose={() => setShowSettings(false)}
          existingName={apiKeyName || ''}
          hasApiKey={Boolean(apiKey)}
          envKeyLoaded={envKeyLoaded}
          angelStatus={angelStatus}
        />
      )}
      <PasteToast message={toastMsg} visible={toastVisible} />
      <Header
        apiKey={apiKey}
        apiKeyName={apiKeyName}
        angelStatus={angelStatus}
        onOpenSettings={() => setShowSettings(true)}
      />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className={`rounded-xl border px-4 py-3 ${
            apiKey ? 'bg-green-500/5 border-green-500/20' : 'bg-yellow-500/5 border-yellow-500/20'
          }`}>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">OpenAI Status</div>
            <div className={`text-xs font-semibold ${apiKey ? 'text-green-300' : 'text-yellow-300'}`}>
              {apiKey ? `Ready${apiKeyName ? ` • ${apiKeyName}` : ''}` : 'Missing API key'}
            </div>
          </div>
          <div className={`rounded-xl border px-4 py-3 ${
            angelStatus?.configured ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'
          }`}>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Angel One Status</div>
            <div className={`text-xs font-semibold ${angelStatus?.configured ? 'text-green-300' : 'text-red-300'}`}>
              {angelStatus?.configured ? 'Broker configured on server' : 'Broker config missing on server'}
            </div>
          </div>
        </div>

        {/* Screenshot Loader */}
        <div className="mb-4 bg-dark-800/60 border border-dark-600 rounded-xl p-3 flex flex-wrap items-center gap-3">
          <span className="text-base">🖼️</span>
          <span className="text-xs text-slate-400 flex-1 min-w-0">
            Load latest 3 screenshots from <span className="text-neon-blue font-mono text-[10px]">{DEFAULT_SCREENSHOTS_DIR}</span>
          </span>
          <button
            onClick={handleLoadLatestFromDefaultFolder}
            disabled={ssLoading}
            className="text-xs bg-neon-purple/10 border border-neon-purple/40 text-neon-purple px-4 py-1.5 rounded-lg hover:bg-neon-purple/20 transition-colors disabled:opacity-50"
            title="Load latest 3 screenshots directly from the default folder"
          >
            {ssLoading ? '⏳ Loading…' : '⚡ Load Recent 3'}
          </button>
          {!screenshotDirHandle ? (
            <button
              onClick={handlePickScreenshotsFolder}
              disabled={ssLoading}
              className="text-xs bg-neon-blue/10 border border-neon-blue/40 text-neon-blue px-4 py-1.5 rounded-lg hover:bg-neon-blue/20 transition-colors disabled:opacity-50"
            >
              📁 Pick Folder
            </button>
          ) : (
            <>
              <button
                onClick={handleReloadScreenshots}
                disabled={ssLoading}
                className="text-xs bg-neon-green/10 border border-neon-green/40 text-neon-green px-4 py-1.5 rounded-lg hover:bg-neon-green/20 transition-colors disabled:opacity-50"
              >
                {ssLoading ? '⏳ Loading…' : '🔄 Reload Latest 3'}
              </button>
              <button
                onClick={() => setAutoRefresh(v => !v)}
                className={`text-xs px-4 py-1.5 rounded-lg border transition-colors ${autoRefresh ? 'bg-neon-purple/20 border-neon-purple/50 text-neon-purple' : 'bg-dark-700 border-dark-500 text-slate-400 hover:text-slate-200'}`}
              >
                {autoRefresh ? '⏸ Auto: ON (5s)' : '▶ Auto: OFF'}
              </button>
              <button
                onClick={() => { setScreenshotDirHandle(null); setAutoRefresh(false); }}
                className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
                title="Change folder"
              >
                📁 Change
              </button>
            </>
          )}
        </div>

        {/* Paste Instruction Banner */}
        {!allChartsUploaded && (
          <div className="mb-4 bg-dark-800/50 border border-dark-600 rounded-xl p-3 flex items-center justify-center gap-3 text-xs text-slate-400">
            <span className="text-base">⌨️</span>
            <span>
              <strong className="text-neon-blue">Ctrl+V</strong> anywhere to auto-paste screenshot to next empty slot •
              <strong className="text-neon-purple"> Click & select multiple</strong> files to fill all slots at once
            </span>
          </div>
        )}

        {/* Status Bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${chart15m ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-dark-800 text-slate-500 border border-dark-600'}`}>
            {chart15m ? '✓' : '○'} 15M Chart
          </div>
          <div className="text-slate-700">→</div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${chart5m ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-dark-800 text-slate-500 border border-dark-600'}`}>
            {chart5m ? '✓' : '○'} 5M Chart
          </div>
          <div className="text-slate-700">→</div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${orderFlow ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-dark-800 text-slate-500 border border-dark-600'}`}>
            {orderFlow ? '✓' : '○'} Order Flow
          </div>
          <div className="text-slate-700">→</div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${result ? 'bg-neon-blue/10 text-neon-blue border border-neon-blue/30' : 'bg-dark-800 text-slate-500 border border-dark-600'}`}>
            {result ? '✓' : '○'} Analysis
          </div>

          <div className="ml-auto flex gap-2">
            {result && (
              <button
                onClick={handleReset}
                className="text-xs text-slate-400 hover:text-white bg-dark-800 border border-dark-600 px-4 py-1.5 rounded-lg transition-colors"
              >
                🔄 New Analysis
              </button>
            )}
          </div>
        </div>

        <ExecutionSetupPanel
          status={angelStatus}
          mode={tradeMode}
          lots={angelLots}
          totp={angelTotp}
          autoPlaceLive={autoPlaceLive}
          brokerLoading={brokerLoading}
          brokerError={brokerError}
          onModeChange={setTradeMode}
          onLotsChange={setAngelLots}
          onTotpChange={setAngelTotp}
          onAutoPlaceLiveChange={setAutoPlaceLive}
        />

        {/* Chart Upload Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <ChartUploader
            label="15-Min Nifty Chart"
            description="VWAP + EMA indicators"
            icon={<span className="text-sm">📊</span>}
            image={chart15m}
            onImageSet={setChart15m}
            onMultipleFiles={handleMultiFiles15m}
            accentColor="bg-neon-blue/20"
            highlight={nextEmptySlot === 'chart15m'}
          />
          <ChartUploader
            label="5-Min Nifty Chart"
            description="VWAP + EMA indicators"
            icon={<span className="text-sm">📈</span>}
            image={chart5m}
            onImageSet={setChart5m}
            onMultipleFiles={handleMultiFiles5m}
            accentColor="bg-neon-purple/20"
            highlight={nextEmptySlot === 'chart5m'}
          />
          <ChartUploader
            label="GoCharting OrderFlow"
            description="5-Min Order Flow data"
            icon={<span className="text-sm">🔄</span>}
            image={orderFlow}
            onImageSet={setOrderFlow}
            onMultipleFiles={handleMultiFilesOF}
            accentColor="bg-neon-yellow/20"
            highlight={nextEmptySlot === 'orderFlow'}
          />
        </div>

        {/* Analyze Button */}
        {!isAnalyzing && !result && (
          <div className="flex justify-center mb-8">
            <button
              onClick={handleAnalyze}
              disabled={!allChartsUploaded || !apiKey || isAnalyzing}
              className={`
                relative px-10 py-4 rounded-2xl font-bold text-base tracking-wide transition-all duration-300
                ${allChartsUploaded && apiKey
                  ? 'bg-gradient-to-r from-neon-blue/20 to-neon-purple/20 border-2 border-neon-blue/50 text-white hover:from-neon-blue/30 hover:to-neon-purple/30 glow-blue hover:scale-105 cursor-pointer'
                  : 'bg-dark-800 border-2 border-dark-600 text-slate-600 cursor-not-allowed'
                }
              `}
            >
              <span className="flex items-center gap-3">
                <span className="text-xl">🧠</span>
                {!allChartsUploaded ? 'Upload All 3 Charts to Continue' : !apiKey ? 'Open Settings to Add OpenAI Key' : 'Analyze Charts & Generate Signal'}
              </span>
            </button>
          </div>
        )}

        {/* Loading State */}
        {isAnalyzing && (
          <div className="mb-8">
            <AnalyzingOverlay />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-8 bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
            <div className="text-3xl mb-3">❌</div>
            <h3 className="text-sm font-bold text-red-400 mb-2">Analysis Failed</h3>
            <p className="text-xs text-red-300/70 max-w-md mx-auto mb-4">{error}</p>
            <button
              onClick={handleAnalyze}
              className="text-xs bg-red-500/20 border border-red-500/30 text-red-400 px-6 py-2 rounded-lg hover:bg-red-500/30 transition-colors"
            >
              Retry Analysis
            </button>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="mb-8">
            <AnalysisResult signal={result} />
          </div>
        )}

        {brokerResult && (
          <div className="mb-8 bg-dark-800 rounded-2xl p-5 border border-dark-600">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="text-neon-green">◆</span> Auto Order Result
              </h3>
              <div className={`text-[10px] px-3 py-1.5 rounded-lg border ${
                brokerResult.mode === 'live'
                  ? 'bg-red-500/10 text-red-300 border-red-500/30'
                  : 'bg-neon-blue/10 text-neon-blue border-neon-blue/30'
              }`}>
                {brokerResult.mode === 'live' ? 'Live Executed' : 'Preview Built'}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div className="bg-dark-700/50 rounded-xl p-3 border border-dark-600">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Spot</div>
                <div className="text-xs font-semibold text-white">{brokerResult.spotPrice}</div>
              </div>
              <div className="bg-dark-700/50 rounded-xl p-3 border border-dark-600">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Spot Source</div>
                <div className="text-xs font-semibold text-white">
                  {brokerResult.spotSource === 'angelone_live' ? 'Angel One Live' : 'AI Entry'}
                </div>
              </div>
              <div className="bg-dark-700/50 rounded-xl p-3 border border-dark-600">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Strike</div>
                <div className="text-xs font-semibold text-white">{brokerResult.strike}</div>
              </div>
              <div className="bg-dark-700/50 rounded-xl p-3 border border-dark-600">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Expiry</div>
                <div className="text-xs font-semibold text-white">{brokerResult.contract.expiry}</div>
              </div>
              <div className="bg-dark-700/50 rounded-xl p-3 border border-dark-600">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Symbol</div>
                <div className="text-xs font-semibold text-white break-all">{brokerResult.contract.tradingsymbol}</div>
              </div>
              <div className="bg-dark-700/50 rounded-xl p-3 border border-dark-600">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Order ID</div>
                <div className="text-xs font-semibold text-white break-all">
                  {brokerResult.brokerResponse?.data?.orderid || 'Pending / Preview'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History */}
        <HistoryPanel history={history} onSelect={(signal) => setResult(signal)} />

        {/* Info Footer */}
        {!result && !isAnalyzing && (
          <div className="mt-8 bg-dark-800/30 rounded-2xl p-6 border border-dark-700/50">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-neon-blue">ℹ️</span> How to Use
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="text-xs font-semibold text-neon-blue">Step 1: Upload Charts</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Take screenshots of your Nifty 15-min chart (with VWAP & EMA), 5-min chart (with VWAP & EMA), and GoCharting OrderFlow 5-min view. 
                  <strong className="text-white"> Ctrl+V</strong> auto-pastes to the next empty slot. <strong className="text-white">Click & select multiple</strong> to fill all at once.
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-semibold text-neon-purple">Step 2: AI Analysis</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  GPT-4o Vision analyzes all 3 charts simultaneously — reading VWAP levels, EMA crossovers, order flow delta, volume profile, and market structure to form a complete picture.
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-semibold text-neon-green">Step 3: Get Signal</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Receive a precise options selling signal (SELL CE or SELL PE) with entry, stop loss, targets, confidence level, risk:reward ratio, and detailed reasoning.
                </p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-yellow-500/5 rounded-xl border border-yellow-500/20">
              <p className="text-[11px] text-yellow-400/80 flex items-start gap-2">
                <span className="text-sm mt-[-1px]">⚠️</span>
                <span>
                  <strong>Disclaimer:</strong> This tool provides AI-assisted analysis for educational purposes. 
                  Always do your own research and risk management. Options trading involves significant risk. 
                  Past patterns do not guarantee future results. Trade at your own risk.
                </span>
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-dark-700/50 mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-2">
          <div className="text-[10px] text-slate-600">
            FiFTO Copilot Trade • AI-Powered Options Selling Signals
          </div>
          <div className="flex items-center gap-3 text-[10px] text-slate-600">
            <span>Powered by GPT-4o Vision</span>
            <span>•</span>
            <span>For educational purposes only</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
