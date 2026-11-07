import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Clock,
  Calendar,
  CalendarX,
  X,
  Sparkles,
  FileSpreadsheet,
  FileCheck
} from 'lucide-react';
import { AttendanceRecord } from '../types';
import { formatHonduranDni, getDniDepartment } from '../utils/hondurasDni';
import { soundManager } from '../utils/audio';
import { generateAttendanceWordBlob, downloadWordFile } from '../utils/exportWord';

interface AttendanceLogViewProps {
  records: AttendanceRecord[];
  onDeleteOneRecord: (record: AttendanceRecord) => Promise<boolean>;
  onClearTodayLog: () => Promise<boolean>;
  onClearLog: () => Promise<boolean>;
  onExportCsv: () => void;
}

function getHondurasTodayDateStr(): string {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const hnDate = new Date(utc - 6 * 3600000);
  const y = hnDate.getFullYear();
  const m = String(hnDate.getMonth() + 1).padStart(2, '0');
  const d = String(hnDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const AttendanceLogView: React.FC<AttendanceLogViewProps> = ({
  records,
  onDeleteOneRecord,
  onClearTodayLog,
  onClearLog,
  onExportCsv,
}) => {
  const [filter, setFilter] = useState<'today' | 'all' | 'punctual' | 'observation'>('today');
  const [confirmModal, setConfirmModal] = useState<'today' | 'all' | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<AttendanceRecord | null>(null);
  const [wordModalOpen, setWordModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExportingWord, setIsExportingWord] = useState(false);

  const todayStr = getHondurasTodayDateStr();

  // Deduplicate records to ensure no duplicates in calculations or rendering
  const uniqueRecords = useMemo(() => {
    const seen = new Set<string>();
    return records.filter(r => {
      const key = `${r.dni}_${r.timestamp}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [records]);

  // Filter today's records
  const todayRecords = uniqueRecords.filter(r => r.timestamp.startsWith(todayStr));
  const todayCount = todayRecords.length;

  const filteredRecords = uniqueRecords.filter(r => {
    if (filter === 'today') return r.timestamp.startsWith(todayStr);
    if (filter === 'all') return true;
    if (filter === 'punctual') return r.punctuality.toLowerCase().includes('puntual') && !r.in_observation;
    if (filter === 'observation') return r.in_observation;
    return true;
  });

  // Calculate statistics
  const total = uniqueRecords.length;
  const observationCount = uniqueRecords.filter(r => r.in_observation).length;
  const punctualCount = total - observationCount;
  const punctualityRate = total > 0 ? Math.round((punctualCount / total) * 100) : 100;

  const handleExportWord = async (scope: 'all' | 'today' = 'all') => {
    setIsExportingWord(true);
    soundManager.vibrate(25);
    try {
      const listToExport = scope === 'today' ? todayRecords : records;
      const blob = await generateAttendanceWordBlob(listToExport);
      const filename = `bitacora_asistencia_${scope === 'today' ? 'hoy_' : 'completa_'}${todayStr}.docx`;
      downloadWordFile(blob, filename);
      soundManager.playSuccessSound();
      setWordModalOpen(false);
    } catch (err) {
      console.error('Error generating Word document:', err);
      // Fallback to server route
      window.open('/api/attendance/export-word', '_blank');
    } finally {
      setIsExportingWord(false);
    }
  };

  const handleConfirmDeleteToday = async () => {
    setIsDeleting(true);
    soundManager.vibrate([30, 40]);
    try {
      await onClearTodayLog();
      soundManager.playSuccessSound();
      setConfirmModal(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmDeleteAll = async () => {
    setIsDeleting(true);
    soundManager.vibrate([40, 50]);
    try {
      await onClearLog();
      soundManager.playSuccessSound();
      setConfirmModal(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base sm:text-lg text-white">Bitácora de Asistencias</h2>
            <p className="text-xs text-slate-400">
              attendance_log &bull; Tegucigalpa (UTC-6) &bull; Hoy: <strong className="text-cyan-400">{todayStr}</strong>
            </p>
          </div>
        </div>

        {/* Action Buttons: Export Word, Export CSV, Delete Today's History, and Delete All */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Main Word Export Button */}
          <button
            onClick={() => {
              if (todayCount > 0 && records.length > todayCount) {
                setWordModalOpen(true);
              } else {
                handleExportWord('all');
              }
            }}
            disabled={isExportingWord}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md transition active:scale-95 disabled:opacity-50"
            title="Descargar bitácora en formato Microsoft Word (.docx)"
          >
            {isExportingWord ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <FileCheck className="w-4 h-4 text-cyan-200" />
            )}
            <span>Descargar en Word (.docx)</span>
          </button>

          {/* CSV Export Button */}
          <button
            onClick={onExportCsv}
            className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs px-3 py-2.5 rounded-xl transition active:scale-95"
            title="Descargar en formato CSV plano"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>CSV</span>
          </button>

          {/* Delete Today's History Button */}
          {todayCount > 0 && (
            <button
              onClick={() => {
                soundManager.vibrate(20);
                setConfirmModal('today');
              }}
              className="flex items-center justify-center gap-1.5 bg-amber-950/70 hover:bg-amber-900 text-amber-300 border border-amber-700/60 font-semibold text-xs px-3 py-2.5 rounded-xl transition active:scale-95"
              title="Eliminar solo el historial de hoy"
            >
              <CalendarX className="w-4 h-4 text-amber-400" />
              <span>Eliminar Historial de Hoy ({todayCount})</span>
            </button>
          )}

          {/* Delete All History Button */}
          {records.length > 0 && (
            <button
              onClick={() => {
                soundManager.vibrate(20);
                setConfirmModal('all');
              }}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 border border-slate-700/60 hover:border-red-600/50 transition active:scale-95"
              title="Vaciar todo el historial"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats summary */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2.5 sm:p-3.5 shadow-lg text-center">
          <span className="text-[10px] sm:text-xs text-cyan-400 block font-medium">
            Marcajes Hoy
          </span>
          <span className="text-lg sm:text-2xl font-bold text-white mt-0.5 block">
            {todayCount}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2.5 sm:p-3.5 shadow-lg text-center">
          <span className="text-[10px] sm:text-xs text-slate-400 block font-medium">
            Total Histórico
          </span>
          <span className="text-lg sm:text-2xl font-bold text-slate-300 mt-0.5 block">
            {total}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2.5 sm:p-3.5 shadow-lg text-center">
          <span className="text-[10px] sm:text-xs text-emerald-400 block font-medium">
            Puntualidad
          </span>
          <span className="text-lg sm:text-2xl font-bold text-emerald-400 mt-0.5 block">
            {punctualityRate}%
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2.5 sm:p-3.5 shadow-lg text-center">
          <span className="text-[10px] sm:text-xs text-amber-400 block font-medium">
            En Observación
          </span>
          <span className="text-lg sm:text-2xl font-bold text-amber-400 mt-0.5 block">
            {observationCount}
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        <button
          onClick={() => {
            soundManager.playKeypadClick();
            setFilter('today');
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition flex items-center gap-1.5 ${
            filter === 'today'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Hoy ({todayCount})</span>
        </button>

        <button
          onClick={() => {
            soundManager.playKeypadClick();
            setFilter('all');
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition ${
            filter === 'all'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          Todos ({records.length})
        </button>

        <button
          onClick={() => {
            soundManager.playKeypadClick();
            setFilter('punctual');
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition ${
            filter === 'punctual'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          Puntuales ({punctualCount})
        </button>

        <button
          onClick={() => {
            soundManager.playKeypadClick();
            setFilter('observation');
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition ${
            filter === 'observation'
              ? 'bg-amber-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          En Observación ({observationCount})
        </button>
      </div>

      {/* Informative helper banner for deleting individual records today */}
      {filter === 'today' && todayCount > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 px-3.5 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
            <span>
              <strong>Historial de Hoy:</strong> Puede eliminar colaboradores <strong>uno por uno</strong> usando el botón rojo <span className="text-red-400 font-bold">«Eliminar»</span> en cada tarjeta de marcaje.
            </span>
          </div>
        </div>
      )}

      {/* Records List */}
      {filteredRecords.length === 0 ? (
        <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-2">
          <FileText className="w-10 h-10 text-slate-600" />
          <p className="text-sm text-slate-300 font-medium">
            {filter === 'today'
              ? 'No hay registros de asistencia marcados el día de hoy.'
              : 'No hay registros de asistencias para el filtro seleccionado.'}
          </p>
          <p className="text-xs text-slate-500">
            Los marcajes se registrarán automáticamente con la fecha y hora de Tegucigalpa.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filteredRecords.map((r, idx) => (
            <div
              key={r.id ? `${r.id}_${idx}` : `${r.dni}_${r.timestamp}_${idx}`}
              className={`bg-slate-900 border rounded-2xl p-3.5 sm:p-4 shadow-lg transition flex items-start justify-between gap-3 ${
                r.in_observation
                  ? 'border-amber-500/40 bg-amber-950/10'
                  : 'border-slate-800 hover:border-cyan-500/30'
              }`}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    r.in_observation
                      ? 'bg-amber-950 text-amber-400 border border-amber-800'
                      : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  }`}
                >
                  {r.in_observation ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <CheckCircle className="w-5 h-5" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <h4 className="font-bold text-sm text-white truncate">
                      {r.full_name}
                    </h4>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                        r.in_observation
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {r.punctuality}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-slate-400">
                    <span className="font-mono text-cyan-300">
                      DNI: {formatHonduranDni(r.dni)}
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {r.timestamp}
                    </span>
                  </div>

                  {getDniDepartment(r.dni) && (
                    <div className="mt-1 text-[11px] text-cyan-400 font-medium flex items-center gap-1">
                      <span>📍 {getDniDepartment(r.dni)}</span>
                    </div>
                  )}

                  {r.in_observation && (
                    <div className="mt-2 text-[11px] bg-amber-950/60 border border-amber-800/60 text-amber-300 px-2.5 py-1 rounded-lg">
                      ⚠️ <strong>Observación: Sí</strong> — Entrada registrada fuera del umbral límite de las 7:30 AM.
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button: Delete this individual record */}
              <div className="shrink-0 flex items-center self-center pl-2">
                <button
                  type="button"
                  onClick={() => {
                    soundManager.vibrate(20);
                    setRecordToDelete(r);
                  }}
                  className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-red-950/70 hover:bg-red-900 text-red-300 hover:text-white border border-red-800/60 hover:border-red-600 transition active:scale-95 flex items-center gap-1.5 shadow-sm"
                  title={`Eliminar marcaje individual de ${r.full_name} (${r.timestamp})`}
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <span className="text-[11px] sm:text-xs font-bold text-red-200">Eliminar</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal for Deleting Today's History */}
      {confirmModal === 'today' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-amber-950 text-amber-400 mx-auto flex items-center justify-center mb-3 border border-amber-800/60 shadow-lg shadow-amber-950/50">
              <CalendarX className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white">¿Eliminar historial del día?</h3>

            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Se eliminarán los <strong>{todayCount}</strong> registro(s) de asistencia correspondientes al día de hoy (<strong className="text-cyan-400">{todayStr}</strong>).
            </p>

            <p className="text-[11px] text-slate-400 mt-1">
              Los registros de fechas anteriores se conservarán en la bitácora CSV.
            </p>

            <div className="flex items-center gap-3 mt-5">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteToday}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/30 transition active:scale-95 disabled:opacity-50"
              >
                {isDeleting ? 'Eliminando...' : 'Sí, Eliminar de Hoy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deleting ALL History */}
      {confirmModal === 'all' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-slate-900 border border-red-500/40 rounded-3xl p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-950 text-red-400 mx-auto flex items-center justify-center mb-3 border border-red-800/60 shadow-lg shadow-red-950/50">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white">¿Vaciar toda la bitácora?</h3>

            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Esta acción eliminará de forma irreversible los <strong>{records.length}</strong> registros de asistencia acumulados en el archivo CSV.
            </p>

            <div className="flex items-center gap-3 mt-5">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAll}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-lg shadow-red-600/30 transition active:scale-95 disabled:opacity-50"
              >
                {isDeleting ? 'Borrando...' : 'Sí, Vaciar Todo'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal for Word (.docx) Export Selection */}
      {wordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-slate-900 border border-blue-500/40 rounded-3xl p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-blue-950 text-blue-400 mx-auto flex items-center justify-center mb-3 border border-blue-800/60 shadow-lg shadow-blue-950/50">
              <FileCheck className="w-6 h-6 text-cyan-300" />
            </div>

            <h3 className="text-lg font-bold text-white">Exportar a Microsoft Word</h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Seleccione el alcance de los registros que desea incluir en el documento oficial con membrete y firmas:
            </p>

            <div className="flex flex-col gap-2.5 my-4">
              <button
                type="button"
                onClick={() => handleExportWord('all')}
                disabled={isExportingWord}
                className="w-full py-3 px-4 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 text-left transition flex items-center justify-between group active:scale-95"
              >
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition">
                    Bitácora Completa (.docx)
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Incluye todos los {records.length} marcajes históricos
                  </div>
                </div>
                <Download className="w-4 h-4 text-cyan-400" />
              </button>

              <button
                type="button"
                onClick={() => handleExportWord('today')}
                disabled={isExportingWord}
                className="w-full py-3 px-4 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-left transition flex items-center justify-between group active:scale-95"
              >
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition">
                    Solo Marcajes de Hoy (.docx)
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {todayCount} registros del día {todayStr}
                  </div>
                </div>
                <Download className="w-4 h-4 text-cyan-400" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setWordModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deleting an Individual Attendance Record */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-slate-900 border border-red-500/40 rounded-3xl p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-950 text-red-400 mx-auto flex items-center justify-center mb-3 border border-red-800/60 shadow-lg shadow-red-950/50">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white">¿Eliminar marcaje individual?</h3>

            <div className="my-3.5 p-3.5 bg-slate-950 rounded-2xl border border-slate-800 text-left">
              <div className="font-bold text-sm text-white truncate">
                {recordToDelete.full_name}
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="font-mono text-cyan-300">
                  DNI: {formatHonduranDni(recordToDelete.dni)}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    recordToDelete.in_observation
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {recordToDelete.punctuality}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-400" />
                <span>Fecha y Hora: {recordToDelete.timestamp}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Esta acción eliminará únicamente este marcaje individual de la bitácora sin afectar el resto de registros del día de hoy.
            </p>

            <div className="flex items-center gap-3 mt-5">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!recordToDelete) return;
                  setIsDeleting(true);
                  soundManager.vibrate([30, 40]);
                  try {
                    await onDeleteOneRecord(recordToDelete);
                    soundManager.playSuccessSound();
                    setRecordToDelete(null);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-lg shadow-red-600/30 transition active:scale-95 disabled:opacity-50"
              >
                {isDeleting ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
