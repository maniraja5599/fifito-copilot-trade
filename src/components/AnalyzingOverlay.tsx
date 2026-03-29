const steps = [
  { icon: '📊', text: 'Reading 15M chart structure...' },
  { icon: '📈', text: 'Analyzing 5M price action...' },
  { icon: '🔄', text: 'Processing Order Flow data...' },
  { icon: '📐', text: 'Calculating VWAP & EMA levels...' },
  { icon: '🧠', text: 'AI computing trade signal...' },
  { icon: '🎯', text: 'Generating entry, SL & targets...' },
];

import { useState, useEffect } from 'react';

export default function AnalyzingOverlay() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-dark-800 rounded-2xl p-8 border border-neon-blue/30 glow-blue">
      <div className="flex flex-col items-center">
        {/* Spinner */}
        <div className="relative w-24 h-24 mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-dark-600"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-neon-blue animate-spin"></div>
          <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-neon-purple animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl">🧠</span>
          </div>
        </div>

        <h3 className="text-lg font-bold text-white mb-1">Analyzing Charts</h3>
        <p className="text-xs text-slate-400 mb-6">GPT-4 Vision is processing your charts...</p>

        {/* Steps */}
        <div className="w-full max-w-sm space-y-2">
          {steps.map((step, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-500 ${
                i === activeStep
                  ? 'bg-neon-blue/10 border border-neon-blue/30'
                  : i < activeStep
                  ? 'opacity-50'
                  : 'opacity-20'
              }`}
            >
              <span className="text-sm">{step.icon}</span>
              <span className="text-xs text-slate-300">{step.text}</span>
              {i === activeStep && (
                <div className="ml-auto flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-neon-blue animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-neon-blue animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-neon-blue animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              )}
              {i < activeStep && (
                <span className="ml-auto text-neon-green text-xs">✓</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
