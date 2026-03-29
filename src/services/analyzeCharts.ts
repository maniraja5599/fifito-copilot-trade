import type { ChartImage, TradeSignal } from '../types';

const SYSTEM_PROMPT = `You are an expert Nifty 50 intraday trader specializing in OPTIONS SELLING strategies. You analyze charts with extreme precision and provide actionable trade signals.

You will receive 3 chart images:
1. **15-Minute Nifty Chart** — with VWAP and EMA indicators for higher timeframe bias
2. **5-Minute Nifty Chart** — with VWAP and EMA indicators for precise entry
3. **GoCharting Order Flow 5M Data** — for volume analysis, delta, POC, and order flow insights

Your analysis framework:
- **VWAP Analysis**: Is price above/below VWAP? VWAP slope? Price acceptance/rejection around VWAP?
- **EMA Analysis**: EMA crossovers? Price position relative to key EMAs (9, 20, 50)? EMA fan/convergence?
- **Order Flow**: Delta positive/negative? Volume profile showing buying/selling pressure? POC level? Imbalances?
- **Market Structure**: Higher highs/lows or lower highs/lows? Key support/resistance levels? Trend or range?
- **Candle Patterns**: Any reversal or continuation patterns?

For OPTIONS SELLING:
- SELL CE (Call) when bearish bias — price below VWAP, EMAs bearish, negative delta
- SELL PE (Put) when bullish bias — price above VWAP, EMAs bullish, positive delta
- NO TRADE when uncertain or conflicting signals

You MUST respond in EXACT JSON format (no markdown, no code blocks, just raw JSON):
{
  "direction": "BULLISH" | "BEARISH" | "NEUTRAL",
  "action": "SELL CE" | "SELL PE" | "NO TRADE",
  "entry": "exact Nifty spot level for entry",
  "stopLoss": "exact stop loss level",
  "target1": "first target level",
  "target2": "second target level",
  "confidenceLevel": 0-100,
  "riskReward": "ratio like 1:2",
  "reasoning": ["reason1", "reason2", "reason3", "reason4", "reason5"],
  "vwapAnalysis": "detailed VWAP analysis",
  "emaAnalysis": "detailed EMA analysis",
  "orderFlowAnalysis": "detailed order flow analysis from GoCharting data",
  "marketStructure": "market structure analysis",
  "optionStrategy": "specific option selling strategy recommendation",
  "timeframe": "recommended holding timeframe",
  "warnings": ["risk1", "risk2"]
}

Be specific with price levels you can read from the charts. If you cannot read exact levels, provide your best estimate based on the chart patterns.
Give confidence level honestly — never above 85% unless all 3 charts strongly align.`;

async function imageToBase64(image: ChartImage): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(image.file);
  });
}

export async function analyzeCharts(
  apiKey: string,
  chart15m: ChartImage,
  chart5m: ChartImage,
  orderFlow: ChartImage
): Promise<TradeSignal> {
  const [img15m, img5m, imgOrderFlow] = await Promise.all([
    imageToBase64(chart15m),
    imageToBase64(chart5m),
    imageToBase64(orderFlow),
  ]);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze these 3 Nifty charts and provide a precise options selling signal. Image 1 is the 15-minute chart with VWAP & EMA. Image 2 is the 5-minute chart with VWAP & EMA. Image 3 is the GoCharting OrderFlow 5-minute data. Give me your best trade recommendation.',
            },
            {
              type: 'image_url',
              image_url: {
                url: img15m,
                detail: 'high',
              },
            },
            {
              type: 'image_url',
              image_url: {
                url: img5m,
                detail: 'high',
              },
            },
            {
              type: 'image_url',
              image_url: {
                url: imgOrderFlow,
                detail: 'high',
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    if (response.status === 401) {
      throw new Error('Invalid API key. Please check your OpenAI API key.');
    }
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please wait a moment and try again.');
    }
    if (response.status === 400) {
      throw new Error('Bad request. Make sure your API key has access to GPT-4o with vision.');
    }
    throw new Error(errorData?.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No response received from AI');
  }

  // Parse JSON from response (handle potential markdown code blocks)
  let jsonStr = content.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
  }

  try {
    const parsed = JSON.parse(jsonStr);
    return parsed as TradeSignal;
  } catch {
    throw new Error('Failed to parse AI response. Raw: ' + content.substring(0, 200));
  }
}
