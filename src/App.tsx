import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Smartphone,
  Users,
  FileText,
  Clock,
  Sparkles,
  Download,
  AlertTriangle,
  WifiOff,
  CheckCircle2,
  Maximize2
} from 'lucide-react';
import { Employee, AttendanceRecord, CheckInResponse } from './types';
import { BiometricTerminal3D } from './components/BiometricTerminal3D';
import { KeypadCheckIn } from './components/KeypadCheckIn';
import { EmployeeManager } from './components/EmployeeManager';
import { AttendanceLogView } from './components/AttendanceLogView';
import { TimeSimulatorBar } from './components/TimeSimulatorBar';
import { SamsungS23Guide } from './components/SamsungS23Guide';
import { usePWAInstall } from './utils/usePWAInstall';
import { soundManager } from './utils/audio';

// Fallback seed employees for initial offline use
const INITIAL_SEED_EMPLOYEES: Employee[] = [
  {
    dni: '1707199201234',
    full_name: 'José Leonel Carranza',
    position: 'Supervisor de Logística (Langue, Valle)',
    enrolled_at: '2026-11-01 07:10:00 AM'
  },
  {
    dni: '0801199012345',
    full_name: 'Carlos Alberto Mejía',
    position: 'Ingeniero de Sistemas',
    enrolled_at: '2026-11-01 07:12:00 AM'
  },
  {
    dni: '0501198823456',
    full_name: 'María Elena Morales',
    position: 'Gerente de Recursos Humanos',
    enrolled_at: '2026-11-01 07:15:00 AM'
  },
  {
    dni: '0101199534567',
    full_name: 'David Antonio Flores',
    position: 'Supervisor de Operaciones',
    enrolled_at: '2026-11-02 07:22:00 AM'
  },
  {
    dni: '0801200045678',
    full_name: 'Sofía Isabel Romero',
    position: 'Especialista en Calidad & UX',
    enrolled_at: '2026-11-02 07:31:00 AM'
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'terminal' | 'keypad' | 'employees' | 'log' | 'samsung'>('terminal');
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_SEED_EMPLOYEES);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [activeEmployeeFor3D, setActiveEmployeeFor3D] = useState<Employee | null>(INITIAL_SEED_EMPLOYEES[0]);
  const [lastCheckInResult, setLastCheckInResult] = useState<CheckInResponse | null>(null);
  const [isScanning3D, setIsScanning3D] = useState(false);
  const [isLoadingCheckIn, setIsLoadingCheckIn] = useState(false);
  const [simulatedTime, setSimulatedTime] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  const { isInstallable, isInstalled, install } = usePWAInstall();

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch employees from server or localStorage
  const loadEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees');
      if (res.ok) {
        const data = await res.json();
        if (data.employees && data.employees.length > 0) {
          setEmployees(data.employees);
          localStorage.setItem('biocheck_employees', JSON.stringify(data.employees));
          if (!activeEmployeeFor3D) {
            setActiveEmployeeFor3D(data.employees[0]);
          }
          return;
        }
      }
    } catch {
      // Offline fallback
    }

    const saved = localStorage.getItem('biocheck_employees');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setEmployees(parsed);
        if (!activeEmployeeFor3D && parsed.length > 0) {
          setActiveEmployeeFor3D(parsed[0]);
        }
      } catch {}
    }
  }, [activeEmployeeFor3D]);

  // Fetch attendance records
  const loadAttendance = useCallback(async () => {
    const deletedKeys = new Set(JSON.parse(localStorage.getItem('biocheck_deleted_attendance_keys') || '[]'));

    try {
      const res = await fetch('/api/attendance');
      if (res.ok) {
        const data = await res.json();
        if (data.records) {
          const serverValid: AttendanceRecord[] = data.records.filter((r: AttendanceRecord) => !deletedKeys.has(`${r.dni}_${r.timestamp}`));

          const saved = localStorage.getItem('biocheck_attendance');
          let combined: AttendanceRecord[] = [...serverValid];
          if (saved) {
            try {
              const localList: AttendanceRecord[] = JSON.parse(saved);
              const serverKeys = new Set(serverValid.map((r: AttendanceRecord) => `${r.dni}_${r.timestamp}`));
              const unSynced = localList.filter(r => !serverKeys.has(`${r.dni}_${r.timestamp}`) && !deletedKeys.has(`${r.dni}_${r.timestamp}`));
              combined = [...serverValid, ...unSynced];
            } catch {}
          }

          // Strict deduplication by (dni + timestamp) and guaranteed globally unique IDs
          const seenKeys = new Set<string>();
          const seenIds = new Set<string>();
          const deduplicated: AttendanceRecord[] = [];

          for (const rec of combined) {
            const compositeKey = `${rec.dni}_${rec.timestamp}`;
            if (!seenKeys.has(compositeKey) && !deletedKeys.has(compositeKey)) {
              seenKeys.add(compositeKey);
              let safeId = rec.id || `att_${rec.dni}_${Date.now()}`;
              if (seenIds.has(safeId)) {
                safeId = `${safeId}_${rec.dni}_${deduplicated.length}`;
              }
              seenIds.add(safeId);
              deduplicated.push({
                ...rec,
                id: safeId
              });
            }
          }

          setAttendanceRecords(deduplicated);
          localStorage.setItem('biocheck_attendance', JSON.stringify(deduplicated));
          return;
        }
      }
    } catch {}

    const saved = localStorage.getItem('biocheck_attendance');
    if (saved) {
      try {
        const parsed: AttendanceRecord[] = JSON.parse(saved);
        const seenKeys = new Set<string>();
        const seenIds = new Set<string>();
        const deduplicated: AttendanceRecord[] = [];

        for (const rec of parsed) {
          const compositeKey = `${rec.dni}_${rec.timestamp}`;
          if (!seenKeys.has(compositeKey) && !deletedKeys.has(compositeKey)) {
            seenKeys.add(compositeKey);
            let safeId = rec.id || `att_${rec.dni}_${Date.now()}`;
            if (seenIds.has(safeId)) {
              safeId = `${safeId}_${rec.dni}_${deduplicated.length}`;
            }
            seenIds.add(safeId);
            deduplicated.push({
              ...rec,
              id: safeId
            });
          }
        }
        setAttendanceRecords(deduplicated);
        localStorage.setItem('biocheck_attendance', JSON.stringify(deduplicated));
      } catch {}
    }
  }, []);

  useEffect(() => {
    loadEmployees();
    loadAttendance();
  }, [loadEmployees, loadAttendance]);

  // Handle employee check-in (POST /check-in)
  const handleCheckIn = async (dni: string): Promise<CheckInResponse | null> => {
    setIsLoadingCheckIn(true);
    setIsScanning3D(true);
    soundManager.vibrate(30);

    const targetEmp = employees.find(e => e.dni === dni);
    if (targetEmp) {
      setActiveEmployeeFor3D(targetEmp);
    }

    try {
      const res = await fetch('/api/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dni,
          simulated_time: simulatedTime,
        }),
      });

      const data = await res.json();

      if (res.ok && data.status === 'success') {
        setLastCheckInResult(data);

        // Sound feedback based on punctuality evaluation
        if (data.in_observation) {
          soundManager.playWarningSound();
        } else {
          soundManager.playSuccessSound();
        }

        // Add to local attendance list
        const newRecord: AttendanceRecord = {
          id: `att_${data.dni}_${Date.now()}`,
          dni: data.dni,
          full_name: data.full_name,
          timestamp: data.timestamp,
          punctuality: data.punctuality,
          in_observation: data.in_observation,
          message: data.message,
        };
        setAttendanceRecords(prev => {
          const filtered = prev.filter(r => !(r.dni === newRecord.dni && r.timestamp === newRecord.timestamp));
          const updated = [newRecord, ...filtered];
          localStorage.setItem('biocheck_attendance', JSON.stringify(updated));
          return updated;
        });

        return data;
      } else {
        const errResp: CheckInResponse = {
          status: 'failed',
          message: data.message || data.error || 'DNI no registrado en el sistema.',
        };
        setLastCheckInResult(errResp);
        soundManager.playWarningSound();
        return errResp;
      }
    } catch (err) {
      // Local evaluation fallback if offline
      const emp = employees.find(e => e.dni === dni);
      if (!emp) {
        const failResp: CheckInResponse = {
          status: 'failed',
          message: 'El número de identidad no está registrado en el sistema.',
        };
        setLastCheckInResult(failResp);
        soundManager.playWarningSound();
        return failResp;
      }

      // Offline Honduras time computation
      const baseDate = simulatedTime ? new Date(simulatedTime) : new Date();
      const utc = baseDate.getTime() + baseDate.getTimezoneOffset() * 60000;
      const hnDate = new Date(utc - 6 * 3600000);

      const h = hnDate.getHours();
      const m = hnDate.getMinutes();
      const totalMin = h * 60 + m;

      let punctuality = 'Demasiado tarde';
      let in_observation = true;

      if (totalMin <= 7 * 60 + 20) {
        punctuality = 'Muy puntual';
        in_observation = false;
      } else if (totalMin <= 7 * 60 + 30) {
        punctuality = 'Puntual';
        in_observation = false;
      } else if (totalMin <= 7 * 60 + 35) {
        punctuality = 'Pasado de la hora de entrada';
        in_observation = true;
      }

      const timeStr = hnDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const dateStr = hnDate.toISOString().split('T')[0];
      const timestamp = `${dateStr} ${timeStr}`;

      const offlineResp: CheckInResponse = {
        status: 'success',
        dni,
        full_name: emp.full_name,
        position: emp.position,
        timestamp,
        punctuality,
        in_observation,
        message: `¡Bienvenido/a, ${emp.full_name}! Asistencia registrada (Modo Offline). Estado: ${punctuality}.` +
          (in_observation ? ' (Queda en observación)' : ''),
      };

      setLastCheckInResult(offlineResp);
      if (in_observation) soundManager.playWarningSound();
      else soundManager.playSuccessSound();

      const newRecord: AttendanceRecord = {
        id: `att_${dni}_${Date.now()}`,
        dni,
        full_name: emp.full_name,
        timestamp,
        punctuality,
        in_observation,
      };
      setAttendanceRecords(prev => {
        const filtered = prev.filter(r => !(r.dni === newRecord.dni && r.timestamp === newRecord.timestamp));
        const updated = [newRecord, ...filtered];
        localStorage.setItem('biocheck_attendance', JSON.stringify(updated));
        return updated;
      });

      return offlineResp;
    } finally {
      setIsLoadingCheckIn(false);
      setTimeout(() => setIsScanning3D(false), 1200);
    }
  };

  // Enroll employee (POST /enroll)
  const handleEnroll = async (data: { dni: string; full_name: string; position: string; photo_base64?: string }) => {
    try {
      const res = await fetch('/api/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (res.ok && result.status === 'success') {
        await loadEmployees();
        return true;
      } else {
        alert(result.error || 'Error al enrolar empleado.');
        return false;
      }
    } catch {
      // Local save
      const newEmp: Employee = {
        dni: data.dni,
        full_name: data.full_name,
        position: data.position,
        photo_url: data.photo_base64,
        enrolled_at: new Date().toLocaleString(),
      };
      const updated = [...employees, newEmp];
      setEmployees(updated);
      localStorage.setItem('biocheck_employees', JSON.stringify(updated));
      return true;
    }
  };

  // Update employee (PUT /employee/:dni)
  const handleUpdate = async (dni: string, data: { full_name?: string; position?: string; photo_base64?: string }) => {
    try {
      const res = await fetch(`/api/employee/${dni}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (res.ok) {
        await loadEmployees();
        return true;
      } else {
        alert(result.error || 'Error al actualizar empleado.');
        return false;
      }
    } catch {
      const updated = employees.map(e => e.dni === dni ? { ...e, ...data } : e);
      setEmployees(updated);
      localStorage.setItem('biocheck_employees', JSON.stringify(updated));
      return true;
    }
  };

  // Batch import employees from Excel/CSV (MERGES and NEVER deletes existing enrolled employees)
  const handleBatchImport = async (importedList: Array<{ dni: string; full_name: string; position: string }>) => {
    try {
      const res = await fetch('/api/employees/batch-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employees: importedList }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        if (data.employees) {
          setEmployees(data.employees);
          localStorage.setItem('biocheck_employees', JSON.stringify(data.employees));
          if (!activeEmployeeFor3D && data.employees.length > 0) {
            setActiveEmployeeFor3D(data.employees[0]);
          }
        } else {
          await loadEmployees();
        }
        return true;
      } else {
        alert(data.error || 'Error al importar colaboradores desde Excel.');
        return false;
      }
    } catch (err) {
      console.warn('Batch import server error, updating locally:', err);
      // Local merge safeguard - NEVER delete existing employees, merge by DNI
      const existingMap = new Map<string, Employee>();
      employees.forEach(e => existingMap.set(e.dni, { ...e }));

      const nowStr = new Date().toLocaleString();
      importedList.forEach(item => {
        const clean = item.dni.replace(/\D/g, '');
        if (clean.length === 13) {
          const prev = existingMap.get(clean);
          existingMap.set(clean, {
            dni: clean,
            full_name: item.full_name,
            position: item.position,
            photo_url: prev?.photo_url || null,
            photo_path: prev?.photo_path || null,
            enrolled_at: prev?.enrolled_at || nowStr,
            updated_at: nowStr,
          });
        }
      });

      const merged = Array.from(existingMap.values());
      setEmployees(merged);
      localStorage.setItem('biocheck_employees', JSON.stringify(merged));
      return true;
    }
  };

  // Delete employee (DELETE /employee/:dni)
  const handleDeleteOne = async (dni: string) => {
    try {
      await fetch(`/api/employee/${dni}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Error deleting employee on server:', err);
    }
    const updated = employees.filter(e => e.dni !== dni);
    setEmployees(updated);
    localStorage.setItem('biocheck_employees', JSON.stringify(updated));
    if (activeEmployeeFor3D?.dni === dni) {
      setActiveEmployeeFor3D(updated.length > 0 ? updated[0] : null);
    }
    soundManager.playSuccessSound();
    return true;
  };

  // Delete all employees (DELETE /employees)
  const handleDeleteAll = async () => {
    try {
      await fetch('/api/employees', { method: 'DELETE' });
    } catch {}
    setEmployees([]);
    setActiveEmployeeFor3D(null);
    localStorage.setItem('biocheck_employees', JSON.stringify([]));
    soundManager.playSuccessSound();
    return true;
  };

  // Reset demo
  const handleResetDemo = async () => {
    try {
      await fetch('/api/reset-demo', { method: 'POST' });
    } catch {}
    setEmployees(INITIAL_SEED_EMPLOYEES);
    setActiveEmployeeFor3D(INITIAL_SEED_EMPLOYEES[0]);
    localStorage.setItem('biocheck_employees', JSON.stringify(INITIAL_SEED_EMPLOYEES));
    return true;
  };

  // Delete a single attendance record (works both online and 100% offline)
  const handleDeleteOneAttendance = async (record: AttendanceRecord) => {
    // 1. Blacklist key permanently so it never reappears on reload or resync ("nunca regresa")
    const key = `${record.dni}_${record.timestamp}`;
    try {
      const existing: string[] = JSON.parse(localStorage.getItem('biocheck_deleted_attendance_keys') || '[]');
      if (!existing.includes(key)) {
        existing.push(key);
        localStorage.setItem('biocheck_deleted_attendance_keys', JSON.stringify(existing));
      }
    } catch {}

    // 2. Remove immediately from local state and update localStorage
    const updated = attendanceRecords.filter(r => {
      if (record.id && r.id === record.id) return false;
      if (r.dni === record.dni && r.timestamp === record.timestamp) return false;
      return true;
    });
    setAttendanceRecords(updated);
    localStorage.setItem('biocheck_attendance', JSON.stringify(updated));

    // 3. Inform server to erase from CSV
    try {
      await fetch(`/api/attendance/record/${record.id}?dni=${record.dni}&timestamp=${encodeURIComponent(record.timestamp)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: record.id,
          dni: record.dni,
          timestamp: record.timestamp,
        }),
      });
    } catch (err) {
      console.warn('Attendance record deleted locally (offline mode active):', err);
    }

    soundManager.playSuccessSound();
    return true;
  };

  // Clear today's attendance log only
  const handleClearTodayLog = async () => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const hnDate = new Date(utc - 6 * 3600000);
    const y = hnDate.getFullYear();
    const m = String(hnDate.getMonth() + 1).padStart(2, '0');
    const d = String(hnDate.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;

    try {
      const existing: string[] = JSON.parse(localStorage.getItem('biocheck_deleted_attendance_keys') || '[]');
      attendanceRecords.filter(r => r.timestamp.startsWith(todayStr)).forEach(r => {
        const k = `${r.dni}_${r.timestamp}`;
        if (!existing.includes(k)) existing.push(k);
      });
      localStorage.setItem('biocheck_deleted_attendance_keys', JSON.stringify(existing));
    } catch {}

    try {
      await fetch(`/api/attendance/today?date=${todayStr}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Error deleting today log on server:', err);
    }

    const updated = attendanceRecords.filter(r => !r.timestamp.startsWith(todayStr));
    setAttendanceRecords(updated);
    localStorage.setItem('biocheck_attendance', JSON.stringify(updated));
    soundManager.playSuccessSound();
    return true;
  };

  // Clear all attendance log
  const handleClearLog = async () => {
    try {
      await fetch('/api/attendance', { method: 'DELETE' });
    } catch {}
    setAttendanceRecords([]);
    localStorage.removeItem('biocheck_attendance');
    soundManager.playSuccessSound();
    return true;
  };

  // Export CSV
  const handleExportCsv = () => {
    window.open('/api/attendance/export', '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950 pb-20 sm:pb-6">
      {/* Top Navigation Bar styled with Samsung One UI aesthetics */}
      <header className="sticky top-0 z-40 bg-slate-950/90 border-b border-slate-800/80 px-4 py-3 backdrop-blur-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg text-white tracking-wide">
                  BIOCHECK <span className="text-cyan-400">HN</span>
                </h1>
                <span className="hidden sm:inline-block text-[10px] bg-cyan-950 text-cyan-300 font-mono px-2 py-0.5 rounded-full border border-cyan-800">
                  DNI 13 DÍGITOS
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Control de Asistencia &bull; Horario Tegucigalpa
              </p>
            </div>
          </div>

          {/* Quick Header Actions: Install Button for S23 Ultra */}
          <div className="flex items-center gap-2">
            {!isOnline && (
              <div className="flex items-center gap-1.5 text-xs bg-amber-950 text-amber-300 border border-amber-800 px-2.5 py-1 rounded-xl">
                <WifiOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Modo Offline</span>
              </div>
            )}

            {isInstallable && !isInstalled && (
              <button
                onClick={install}
                className="flex items-center gap-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-xl shadow-md transition active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Instalar en S23</span>
                <span className="sm:hidden">Instalar</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('samsung')}
              className={`p-2 rounded-xl border transition ${
                activeTab === 'samsung'
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
              }`}
              title="Guía Samsung Galaxy S23 Ultra"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-5 flex flex-col gap-4">
        {/* Time Simulator & Honduras Tegucigalpa Clock */}
        <TimeSimulatorBar
          simulatedTime={simulatedTime}
          onSetSimulatedTime={setSimulatedTime}
        />

        {/* Dynamic View Router */}
        {activeTab === 'terminal' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* 3D Interactive Biometric Terminal Column */}
            <div className="lg:col-span-7 h-[420px] sm:h-[480px] lg:h-[520px] w-full">
              <BiometricTerminal3D
                activeEmployee={activeEmployeeFor3D}
                lastStatus={lastCheckInResult?.punctuality || null}
                isInObservation={lastCheckInResult?.in_observation || false}
                isScanning={isScanning3D}
                onTriggerScan={() => {
                  if (activeEmployeeFor3D) {
                    handleCheckIn(activeEmployeeFor3D.dni);
                  }
                }}
              />
            </div>

            {/* Quick Touch Keypad for Galaxy S23 Ultra */}
            <div className="lg:col-span-5 w-full">
              <KeypadCheckIn
                employees={employees}
                onCheckIn={handleCheckIn}
                lastResult={lastCheckInResult}
                isLoading={isLoadingCheckIn}
                onSelectEmployeeFor3D={emp => setActiveEmployeeFor3D(emp)}
              />
            </div>
          </div>
        )}

        {activeTab === 'keypad' && (
          <div className="max-w-xl mx-auto w-full">
            <KeypadCheckIn
              employees={employees}
              onCheckIn={handleCheckIn}
              lastResult={lastCheckInResult}
              isLoading={isLoadingCheckIn}
              onSelectEmployeeFor3D={emp => setActiveEmployeeFor3D(emp)}
            />
          </div>
        )}

        {activeTab === 'employees' && (
          <EmployeeManager
            employees={employees}
            onEnroll={handleEnroll}
            onUpdate={handleUpdate}
            onBatchImport={handleBatchImport}
            onDeleteOne={handleDeleteOne}
            onDeleteAll={handleDeleteAll}
            onResetDemo={handleResetDemo}
            onSelectFor3D={emp => {
              setActiveEmployeeFor3D(emp);
              setActiveTab('terminal');
              soundManager.vibrate(20);
            }}
          />
        )}

        {activeTab === 'log' && (
          <AttendanceLogView
            records={attendanceRecords}
            onDeleteOneRecord={handleDeleteOneAttendance}
            onClearTodayLog={handleClearTodayLog}
            onClearLog={handleClearLog}
            onExportCsv={handleExportCsv}
          />
        )}

        {activeTab === 'samsung' && (
          <SamsungS23Guide onClose={() => setActiveTab('terminal')} />
        )}
      </main>

      {/* Floating Bottom Navigation Bar (Samsung One UI Inspired) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 border-t border-slate-800/80 px-3 py-2 backdrop-blur-xl">
        <div className="max-w-md mx-auto grid grid-cols-5 gap-1">
          <button
            onClick={() => {
              soundManager.playKeypadClick();
              setActiveTab('terminal');
            }}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition ${
              activeTab === 'terminal'
                ? 'text-cyan-400 bg-cyan-950/60 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Escáner 3D</span>
          </button>

          <button
            onClick={() => {
              soundManager.playKeypadClick();
              setActiveTab('keypad');
            }}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition ${
              activeTab === 'keypad'
                ? 'text-cyan-400 bg-cyan-950/60 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Marcaje</span>
          </button>

          <button
            onClick={() => {
              soundManager.playKeypadClick();
              setActiveTab('employees');
            }}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition ${
              activeTab === 'employees'
                ? 'text-cyan-400 bg-cyan-950/60 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Empleados</span>
          </button>

          <button
            onClick={() => {
              soundManager.playKeypadClick();
              setActiveTab('log');
            }}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition ${
              activeTab === 'log'
                ? 'text-cyan-400 bg-cyan-950/60 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Bitácora</span>
          </button>

          <button
            onClick={() => {
              soundManager.playKeypadClick();
              setActiveTab('samsung');
            }}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition ${
              activeTab === 'samsung'
                ? 'text-cyan-400 bg-cyan-950/60 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Android / iPad</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
