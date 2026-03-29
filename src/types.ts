export interface ChartImage {
  file: File;
  preview: string;
  name: string;
}

export interface TradeSignal {
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  action: 'SELL CE' | 'SELL PE' | 'NO TRADE';
  entry: string;
  stopLoss: string;
  target1: string;
  target2: string;
  confidenceLevel: number;
  riskReward: string;
  reasoning: string[];
  vwapAnalysis: string;
  emaAnalysis: string;
  orderFlowAnalysis: string;
  marketStructure: string;
  optionStrategy: string;
  timeframe: string;
  warnings: string[];
}

export interface AnalysisState {
  isAnalyzing: boolean;
  result: TradeSignal | null;
  error: string | null;
  rawResponse: string | null;
}
