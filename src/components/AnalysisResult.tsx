import type { TradeSignal } from '../types';
import AngelTradePanel from './AngelTradePanel';

interface AnalysisResultProps {
  signal: TradeSignal;
}

function ConfidenceMeter({ level }: { level: number }) {
  const getColor = () => {
    if (level >= 80) return { bar: 'bg-neon-green', text: 'text-neon-green', glow: 'glow-green' };
    if (level >= 60) return { bar: 'bg-neon-yellow', text: 'text-neon-yellow', glow: '' };
    if (level >= 40) return { bar: 'bg-orange-400', text: 'text-orange-400', glow: '' };
    return { bar: 'bg-neon-red', text: 'text-neon-red', glow: 'glow-red' };
  };
  const color = getColor();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 uppercase tracking-wider">Confidence</span>
        <span className={`text-2xl font-mono font-bold ${color.text}`}>{level}%</span>
      </div>
      <div className="w-full h-3 bg-dark-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color.bar} transition-all duration-1000 ease-out`}
          style={{ width: `${level}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-600">
        <span>Low Risk</span>
        <span>High Confidence</span>
      </div>
    </div>
  );
}

function SignalBadge({ action, direction }: { action: string; direction: string }) {
  const isBullish = direction === 'BULLISH';
  const isBearish = direction === 'BEARISH';
  const isNeutral = direction === 'NEUTRAL';

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`
        relative px-8 py-4 rounded-2xl font-bold text-xl tracking-wider border-2
        ${isBullish ? 'bg-green-500/10 border-green-500/50 text-neon-green glow-green' : ''}
        ${isBearish ? 'bg-red-500/10 border-red-500/50 text-neon-red glow-red' : ''}
        ${isNeutral ? 'bg-yellow-500/10 border-yellow-500/50 text-neon-yellow' : ''}
      `}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">
            {isBullish ? '🟢' : isBearish ? '🔴' : '🟡'}
          </span>
          <div>
            <div className="text-sm uppercase tracking-widest opacity-70">{direction}</div>
            <div className="text-2xl font-mono">{action}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PriceCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`bg-dark-800 rounded-xl p-4 border border-dark-600`}>
      <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">{label}</div>
      <div className={`text-lg font-mono font-bold ${color}`}>{value}</div>
    </div>
  );
}

function AnalysisSection({ title, icon, content, color }: { title: string; icon: string; content: string; color: string }) {
  return (
    <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-600/50">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <h4 className={`text-sm font-semibold ${color}`}>{title}</h4>
      </div>
      <p className="text-xs text-slate-300 leading-relaxed">{content}</p>
    </div>
  );
}

export default function AnalysisResult({ signal }: AnalysisResultProps) {
  return (
    <div className="space-y-6">
      {/* Signal Header */}
      <div className="bg-dark-800 rounded-2xl p-6 border border-dark-600">
        <div className="flex flex-col lg:flex-row items-center gap-6">
          <SignalBadge action={signal.action} direction={signal.direction} />
          <div className="flex-1 w-full">
            <ConfidenceMeter level={signal.confidenceLevel} />
          </div>
        </div>
      </div>

      {/* Price Levels */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <PriceCard label="📍 Entry" value={signal.entry} color="text-neon-blue" />
        <PriceCard label="🛑 Stop Loss" value={signal.stopLoss} color="text-neon-red" />
        <PriceCard label="🎯 Target 1" value={signal.target1} color="text-neon-green" />
        <PriceCard label="🎯 Target 2" value={signal.target2} color="text-neon-green" />
      </div>

      {/* Risk Reward & Strategy */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-dark-800 rounded-xl p-4 border border-dark-600">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Risk:Reward</div>
          <div className="text-lg font-mono font-bold text-neon-purple">{signal.riskReward}</div>
        </div>
        <div className="bg-dark-800 rounded-xl p-4 border border-dark-600">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Strategy</div>
          <div className="text-sm font-semibold text-white">{signal.optionStrategy}</div>
        </div>
        <div className="bg-dark-800 rounded-xl p-4 border border-dark-600">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Timeframe</div>
          <div className="text-sm font-semibold text-white">{signal.timeframe}</div>
        </div>
      </div>

      {/* Detailed Analysis */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <span className="text-neon-blue">◆</span> Detailed Analysis
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <AnalysisSection
            title="VWAP Analysis"
            icon="📈"
            content={signal.vwapAnalysis}
            color="text-neon-blue"
          />
          <AnalysisSection
            title="EMA Analysis"
            icon="📊"
            content={signal.emaAnalysis}
            color="text-neon-purple"
          />
          <AnalysisSection
            title="Order Flow"
            icon="🔄"
            content={signal.orderFlowAnalysis}
            color="text-neon-yellow"
          />
          <AnalysisSection
            title="Market Structure"
            icon="🏗️"
            content={signal.marketStructure}
            color="text-neon-green"
          />
        </div>
      </div>

      {/* Reasoning */}
      <div className="bg-dark-800 rounded-2xl p-5 border border-dark-600">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="text-neon-green">◆</span> Trade Reasoning
        </h3>
        <ul className="space-y-2">
          {signal.reasoning.map((reason, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
              <span className="text-neon-green mt-0.5">✓</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Warnings */}
      {signal.warnings.length > 0 && (
        <div className="bg-red-500/5 rounded-2xl p-5 border border-red-500/20">
          <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span>⚠️</span> Warnings & Risks
          </h3>
          <ul className="space-y-2">
            {signal.warnings.map((warning, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-red-300/80">
                <span className="text-red-400 mt-0.5">!</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <AngelTradePanel signal={signal} />
    </div>
  );
}
