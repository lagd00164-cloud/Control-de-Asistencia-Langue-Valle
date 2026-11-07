import React, { useState } from 'react';
import { Delete, CheckCircle2, AlertTriangle, AlertCircle, Clock, ShieldCheck, UserCheck, Sparkles } from 'lucide-react';
import { formatHonduranDni, cleanDni, getDniDepartment } from '../utils/hondurasDni';
import { soundManager } from '../utils/audio';
import { Employee, CheckInResponse } from '../types';

interface KeypadCheckInProps {
  employees: Employee[];
  onCheckIn: (dni: string) => Promise<CheckInResponse | null>;
  lastResult: CheckInResponse | null;
  isLoading: boolean;
  onSelectEmployeeFor3D?: (emp: Employee) => void;
}

export const KeypadCheckIn: React.FC<KeypadCheckInProps> = ({
  employees,
  onCheckIn,
  lastResult,
  isLoading,
  onSelectEmployeeFor3D,
}) => {
  const [dniInput, setDniInput] = useState('');

  const currentCleanDni = cleanDni(dniInput);
  const isValidLength = currentCleanDni.length === 13;
  const departmentName = getDniDepartment(currentCleanDni);
  const matchedEmployee = isValidLength ? employees.find(e => e.dni === currentCleanDni) : null;

  const handleKeyPress = (char: string) => {
    if (dniInput.replace(/\D/g, '').length >= 13) return;
    soundManager.playKeypadClick();
    setDniInput(prev => cleanDni(prev + char));
  };

  const handleBackspace = () => {
    soundManager.playKeypadClick();
    setDniInput(prev => cleanDni(prev).slice(0, -1));
  };

  const handleClear = () => {
    soundManager.playKeypadClick();
    setDniInput('');
  };

  const handleSubmit = async (overrideDni?: string) => {
    const target = overrideDni || currentCleanDni;
    if (target.length !== 13) {
      soundManager.playWarningSound();
      return;
    }
    await onCheckIn(target);
    setDniInput('');
  };

  const handleQuickEmployee = (emp: Employee) => {
    soundManager.playKeypadClick();
    setDniInput(emp.dni);
    if (onSelectEmployeeFor3D) {
      onSelectEmployeeFor3D(emp);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Display Card for DNI */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
          <span className="flex items-center gap-1 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            DNI Honduras (13 Dígitos)
          </span>
          <span className="font-mono text-cyan-300">
            {currentCleanDni.length} / 13 dígitos
          </span>
        </div>

        {/* Formatted DNI Readout */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="font-mono text-xl sm:text-2xl font-bold tracking-wider text-white">
            {currentCleanDni.length === 0 ? (
              <span className="text-slate-600 font-normal text-lg sm:text-xl">
                0801-XXXX-XXXXX
              </span>
            ) : (
              formatHonduranDni(currentCleanDni)
            )}
          </div>
          {currentCleanDni.length > 0 && (
            <button
              onClick={handleClear}
              className="text-xs text-slate-400 hover:text-white bg-slate-800 px-2 py-1 rounded-md transition"
            >
              Borrar
            </button>
          )}
        </div>

        {/* Department / Municipality Tag if valid beginning */}
        {departmentName && currentCleanDni.length >= 2 && (
          <div className="mt-2 text-xs text-cyan-300 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>
              {currentCleanDni.length >= 4 ? 'Municipio y Departamento: ' : 'Departamento: '}
              <strong className="text-white">{departmentName}</strong>
            </span>
          </div>
        )}

        {/* Immediate Employee Recognition Card when 13 digits entered */}
        {isValidLength && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-800">
            {matchedEmployee ? (
              <div className="flex items-center gap-2.5 p-2 bg-cyan-950/40 border border-cyan-700/50 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-cyan-900 border border-cyan-600 flex items-center justify-center text-cyan-200 font-bold text-xs shrink-0 overflow-hidden">
                  {matchedEmployee.photo_url ? (
                    <img
                      src={matchedEmployee.photo_url}
                      alt={matchedEmployee.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{matchedEmployee.full_name[0]}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">{matchedEmployee.full_name}</span>
                  </div>
                  <div className="text-[11px] text-cyan-300 truncate">
                    {matchedEmployee.position}
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-800 shrink-0">
                  Enrolado
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2 bg-amber-950/40 border border-amber-700/40 rounded-xl text-xs text-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Colaborador no encontrado en la base de datos de enrolados.</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Result Card Banner if check-in occurred */}
      {lastResult && (
        <div
          className={`rounded-2xl p-4 border shadow-xl transition-all ${
            lastResult.status === 'success'
              ? lastResult.in_observation
                ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
              : 'bg-red-950/40 border-red-500/50 text-red-200'
          }`}
        >
          <div className="flex items-start gap-3">
            {lastResult.status === 'success' ? (
              lastResult.in_observation ? (
                <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
              )
            ) : (
              <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
            )}

            <div className="flex-1">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <span className="font-bold text-sm sm:text-base text-white">
                  {lastResult.full_name || 'Registro de Asistencia'}
                </span>
                {lastResult.punctuality && (
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                      lastResult.in_observation
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {lastResult.punctuality}
                  </span>
                )}
              </div>

              <p className="text-xs mt-1 text-slate-300 leading-relaxed">
                {lastResult.message}
              </p>

              {lastResult.in_observation && (
                <div className="mt-2 text-xs bg-amber-900/60 text-amber-200 px-2.5 py-1.5 rounded-lg border border-amber-600/40 font-medium flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>
                    <strong>Observación activa:</strong> Llegada fuera de hora reglamentaria. Se registra en bitácora oficial.
                  </span>
                </div>
              )}

              {lastResult.timestamp && (
                <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-cyan-400" />
                  <span>Hora oficial Tegucigalpa: {lastResult.timestamp}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Select Employee Chips (Ideal for Touch Devices like Samsung S23 Ultra) */}
      {employees.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-slate-400 font-medium px-1 flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
            Selección Rápida de Colaboradores:
          </span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {employees.map((emp, idx) => (
              <button
                key={`${emp.dni}_${idx}`}
                onClick={() => handleQuickEmployee(emp)}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 rounded-xl px-3 py-2 text-left shrink-0 transition"
              >
                <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-300 font-bold text-xs flex items-center justify-center">
                  {emp.full_name[0]}
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200 line-clamp-1">
                    {emp.full_name.split(' ')[0]} {emp.full_name.split(' ')[1] || ''}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {emp.dni.slice(0, 4)}...{emp.dni.slice(-4)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Large One UI Style Touch Keypad */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3 bg-slate-900/90 border border-slate-800 p-3 sm:p-4 rounded-2xl shadow-xl">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
          <button
            key={num}
            onClick={() => handleKeyPress(num)}
            className="h-14 sm:h-16 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-semibold text-xl sm:text-2xl shadow-md border border-slate-800 active:scale-95 active:bg-cyan-950 transition flex items-center justify-center"
          >
            {num}
          </button>
        ))}

        {/* Backspace */}
        <button
          onClick={handleBackspace}
          className="h-14 sm:h-16 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 font-semibold text-lg shadow-md border border-slate-800 active:scale-95 transition flex items-center justify-center"
          title="Borrar dígito"
        >
          <Delete className="w-5 h-5" />
        </button>

        {/* Zero */}
        <button
          onClick={() => handleKeyPress('0')}
          className="h-14 sm:h-16 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-semibold text-xl sm:text-2xl shadow-md border border-slate-800 active:scale-95 active:bg-cyan-950 transition flex items-center justify-center"
        >
          0
        </button>

        {/* Check In Action Button */}
        <button
          onClick={() => handleSubmit()}
          disabled={!isValidLength || isLoading}
          className={`h-14 sm:h-16 rounded-xl font-bold text-sm sm:text-base shadow-lg transition flex flex-col items-center justify-center gap-0.5 active:scale-95 ${
            isValidLength && !isLoading
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/20'
              : 'bg-slate-950 border border-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-xs">Marcar</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
