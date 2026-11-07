import React, { useState, useEffect } from 'react';
import { Clock, Sliders, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface TimeSimulatorBarProps {
  simulatedTime: string | null;
  onSetSimulatedTime: (timeIso: string | null) => void;
}

export const TimeSimulatorBar: React.FC<TimeSimulatorBarProps> = ({
  simulatedTime,
  onSetSimulatedTime,
}) => {
  const [showPresets, setShowPresets] = useState(false);
  const [currentTimeHn, setCurrentTimeHn] = useState('');

  // Live Tegucigalpa clock
  useEffect(() => {
    const updateClock = () => {
      const now = simulatedTime ? new Date(simulatedTime) : new Date();
      // Honduras UTC-6
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const hnDate = new Date(utc - 6 * 3600000);

      const h = hnDate.getHours();
      const m = hnDate.getMinutes();
      const s = hnDate.getSeconds();
      const period = h >= 12 ? 'PM' : 'AM';
      const displayH = h % 12 === 0 ? 12 : h % 12;

      setCurrentTimeHn(
        `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} ${period}`
      );
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [simulatedTime]);

  // Current punctuality rule status
  const getStatusPreview = () => {
    const now = simulatedTime ? new Date(simulatedTime) : new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const hnDate = new Date(utc - 6 * 3600000);
    const totalMinutes = hnDate.getHours() * 60 + hnDate.getMinutes();

    if (totalMinutes <= 7 * 60 + 20) {
      return { text: 'Muy puntual', color: 'emerald', obs: false };
    } else if (totalMinutes <= 7 * 60 + 30) {
      return { text: 'Puntual', color: 'emerald', obs: false };
    } else if (totalMinutes <= 7 * 60 + 35) {
      return { text: 'Pasado de hora', color: 'amber', obs: true };
    } else {
      return { text: 'Demasiado tarde', color: 'red', obs: true };
    }
  };

  const status = getStatusPreview();

  // Create simulated ISO dates for testing
  const setTestTime = (hours: number, minutes: number) => {
    soundManager.vibrate(20);
    const date = new Date();
    // Adjust to today with specific Honduras hour (UTC-6 means UTC is +6)
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    // In UTC, Honduras hour H is H + 6
    const utcHours = hours + 6;
    const testDate = new Date(Date.UTC(year, month, day, utcHours, minutes, 0));
    onSetSimulatedTime(testDate.toISOString());
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-lg flex flex-col gap-2.5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        {/* Clock display */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-sm sm:text-base font-bold text-white tracking-wider">
                {currentTimeHn || '07:00:00 AM'}
              </span>
              <span className="text-[10px] bg-cyan-950 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-800 font-medium">
                Tegucigalpa (UTC-6)
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              Evaluación actual:{' '}
              <span
                className={`font-semibold ${
                  status.color === 'emerald'
                    ? 'text-emerald-400'
                    : status.color === 'amber'
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}
              >
                {status.text} {status.obs ? '(En Observación)' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Simulator toggle button */}
        <div className="flex items-center gap-2">
          {simulatedTime && (
            <button
              onClick={() => onSetSimulatedTime(null)}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-xl border border-slate-700 transition"
            >
              Restablecer a Real
            </button>
          )}

          <button
            onClick={() => setShowPresets(!showPresets)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition ${
              simulatedTime
                ? 'bg-amber-950 border-amber-600 text-amber-300'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{simulatedTime ? 'Simulación Activa' : 'Probar Horarios'}</span>
          </button>
        </div>
      </div>

      {/* Preset simulation buttons drawer */}
      {showPresets && (
        <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-2">
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Simula la hora de llegada para validar las 4 reglas del script de Python:</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => setTestTime(7, 15)}
              className="bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-700/50 rounded-xl p-2 text-left transition"
            >
              <span className="text-xs font-bold text-emerald-300 block">7:15 AM</span>
              <span className="text-[10px] text-emerald-400">Muy puntual (≤ 7:20)</span>
            </button>

            <button
              onClick={() => setTestTime(7, 26)}
              className="bg-blue-950/60 hover:bg-blue-900 border border-blue-700/50 rounded-xl p-2 text-left transition"
            >
              <span className="text-xs font-bold text-blue-300 block">7:26 AM</span>
              <span className="text-[10px] text-blue-400">Puntual (7:21-7:30)</span>
            </button>

            <button
              onClick={() => setTestTime(7, 33)}
              className="bg-amber-950/60 hover:bg-amber-900 border border-amber-700/50 rounded-xl p-2 text-left transition"
            >
              <span className="text-xs font-bold text-amber-300 block">7:33 AM</span>
              <span className="text-[10px] text-amber-400">Pasado de hora (Observación)</span>
            </button>

            <button
              onClick={() => setTestTime(7, 45)}
              className="bg-red-950/60 hover:bg-red-900 border border-red-700/50 rounded-xl p-2 text-left transition"
            >
              <span className="text-xs font-bold text-red-300 block">7:45 AM</span>
              <span className="text-[10px] text-red-400">Demasiado tarde (Observación)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
