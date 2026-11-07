import React, { useState, useRef } from 'react';
import {
  Users,
  UserPlus,
  Trash2,
  Edit2,
  Camera,
  Image as ImageIcon,
  Check,
  X,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Shield,
  RotateCcw,
  FileSpreadsheet,
  Upload,
  Download,
  Info
} from 'lucide-react';
import { Employee, ExcelImportResult } from '../types';
import { validateHonduranDni, formatHonduranDni, cleanDni, getDniDepartment } from '../utils/hondurasDni';
import { soundManager } from '../utils/audio';
import { parseExcelFile, downloadExcelTemplate } from '../utils/excelImport';

interface EmployeeManagerProps {
  employees: Employee[];
  onEnroll: (data: { dni: string; full_name: string; position: string; photo_base64?: string }) => Promise<boolean>;
  onUpdate: (dni: string, data: { full_name?: string; position?: string; photo_base64?: string }) => Promise<boolean>;
  onBatchImport: (employees: Array<{ dni: string; full_name: string; position: string }>) => Promise<boolean>;
  onDeleteOne: (dni: string) => Promise<boolean>;
  onDeleteAll: () => Promise<boolean>;
  onResetDemo: () => Promise<boolean>;
  onSelectFor3D?: (emp: Employee) => void;
}

export const EmployeeManager: React.FC<EmployeeManagerProps> = ({
  employees,
  onEnroll,
  onUpdate,
  onBatchImport,
  onDeleteOne,
  onDeleteAll,
  onResetDemo,
  onSelectFor3D,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [dni, setDni] = useState('');
  const [fullName, setFullName] = useState('');
  const [position, setPosition] = useState('');
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirm delete modals
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  // Excel import state
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [excelResult, setExcelResult] = useState<ExcelImportResult | null>(null);
  const [excelFileName, setExcelFileName] = useState<string>('');
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [isImportingExcel, setIsImportingExcel] = useState(false);
  const [excelError, setExcelError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const handleExcelFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingExcel(true);
    setExcelError(null);
    setExcelFileName(file.name);
    soundManager.vibrate(20);

    try {
      const result = await parseExcelFile(file, employees);
      setExcelResult(result);
      if (result.validCount === 0) {
        setExcelError('No se encontraron filas con DNI de 13 dígitos válidos en este archivo.');
        soundManager.playWarningSound();
      } else {
        soundManager.playSuccessSound();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar el archivo Excel';
      setExcelError(msg);
      soundManager.playWarningSound();
    } finally {
      setIsParsingExcel(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleConfirmBatchImport = async () => {
    if (!excelResult) return;
    const validRows = excelResult.rows.filter(r => r.valid);
    if (validRows.length === 0) return;

    setIsImportingExcel(true);
    try {
      const payload = validRows.map(r => ({
        dni: r.dni,
        full_name: r.full_name,
        position: r.position,
      }));
      const success = await onBatchImport(payload);
      if (success) {
        setShowExcelModal(false);
        setExcelResult(null);
        soundManager.playSuccessSound();
      }
    } finally {
      setIsImportingExcel(false);
    }
  };

  const openEnrollModal = () => {
    soundManager.vibrate(15);
    setEditingEmployee(null);
    setDni('');
    setFullName('');
    setPosition('');
    setPhotoBase64(null);
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (emp: Employee) => {
    soundManager.vibrate(15);
    setEditingEmployee(emp);
    setDni(emp.dni);
    setFullName(emp.full_name);
    setPosition(emp.position);
    setPhotoBase64(emp.photo_url || null);
    setFormError(null);
    setShowModal(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('Por favor seleccione un archivo de imagen válido.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanD = cleanDni(dni);
    if (!validateHonduranDni(cleanD)) {
      setFormError('El DNI debe contener exactamente 13 dígitos numéricos (ej. 0801199012345).');
      soundManager.playWarningSound();
      return;
    }

    if (!fullName.trim() || !position.trim()) {
      setFormError('El nombre completo y el cargo son obligatorios.');
      soundManager.playWarningSound();
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingEmployee) {
        const success = await onUpdate(cleanD, {
          full_name: fullName.trim(),
          position: position.trim(),
          photo_base64: photoBase64 || undefined,
        });
        if (success) {
          setShowModal(false);
          soundManager.playSuccessSound();
        }
      } else {
        const success = await onEnroll({
          dni: cleanD,
          full_name: fullName.trim(),
          position: position.trim(),
          photo_base64: photoBase64 || undefined,
        });
        if (success) {
          setShowModal(false);
          soundManager.playSuccessSound();
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const q = searchQuery.toLowerCase();
    return (
      emp.full_name.toLowerCase().includes(q) ||
      emp.dni.includes(q) ||
      emp.position.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base sm:text-lg text-white">Nómina de Empleados</h2>
            <p className="text-xs text-slate-400">
              {employees.length} colaboradores registrados con DNI de Honduras
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Load from Excel button */}
          <button
            onClick={() => {
              soundManager.vibrate(15);
              setExcelResult(null);
              setExcelError(null);
              setShowExcelModal(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-semibold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl shadow-md transition active:scale-95"
            title="Importar base de datos de empleados desde archivo Excel o CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            <span>Cargar Excel</span>
          </button>

          {/* Download template button */}
          <button
            onClick={() => {
              soundManager.vibrate(10);
              downloadExcelTemplate();
              soundManager.playSuccessSound();
            }}
            className="flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs px-2.5 py-2.5 rounded-xl transition active:scale-95"
            title="Descargar plantilla oficial de Excel para carga de personal"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Plantilla</span>
          </button>

          {/* Manual enroll button */}
          <button
            onClick={openEnrollModal}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl shadow-md transition active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Enrolar</span>
          </button>

          {/* Delete all button */}
          {employees.length > 0 && (
            <button
              onClick={() => setShowDeleteAllConfirm(true)}
              className="flex items-center justify-center p-2.5 rounded-xl bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 border border-slate-700 transition"
              title="Eliminar todos los empleados"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          placeholder="Buscar por nombre, cargo o número de DNI..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
        />
      </div>

      {/* Employees Grid */}
      {filteredEmployees.length === 0 ? (
        <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-3">
          <Users className="w-10 h-10 text-slate-600" />
          <p className="text-sm text-slate-400">
            No se encontraron empleados registrados con ese criterio.
          </p>
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={openEnrollModal}
              className="text-xs bg-cyan-600 text-white font-medium px-4 py-2 rounded-xl hover:bg-cyan-500 transition"
            >
              Registrar Nuevo Empleado
            </button>
            <button
              onClick={onResetDemo}
              className="text-xs bg-slate-800 text-slate-300 font-medium px-4 py-2 rounded-xl hover:bg-slate-700 transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Cargar Muestra
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredEmployees.map((emp, idx) => {
            const dept = getDniDepartment(emp.dni);
            return (
              <div
                key={`${emp.dni}_${idx}`}
                className="bg-slate-900 border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-4 shadow-lg transition flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Photo or Initials */}
                  <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                    {emp.photo_url ? (
                      <img
                        src={emp.photo_url}
                        alt={emp.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-base font-bold text-cyan-400">
                        {emp.full_name[0]}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-white truncate">
                      {emp.full_name}
                    </h3>
                    <p className="text-xs text-cyan-300 truncate font-medium">
                      {emp.position}
                    </p>
                    <p className="font-mono text-xs text-slate-400 mt-0.5">
                      {formatHonduranDni(emp.dni)}
                    </p>
                    {dept && (
                      <p className="text-[10px] text-cyan-400/90 mt-0.5 truncate font-medium">
                        📍 {dept}
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {onSelectFor3D && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectFor3D(emp);
                      }}
                      className="p-2 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 text-cyan-400 border border-cyan-800/80 transition"
                      title="Ver credencial en Escáner 3D"
                    >
                      <Shield className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(emp);
                    }}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                    title="Editar empleado"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      soundManager.vibrate(20);
                      setEmployeeToDelete(emp);
                    }}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 border border-slate-700/50 hover:border-red-600/50 transition active:scale-95"
                    title="Eliminar empleado"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Enroll / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-400" />
                {editingEmployee ? 'Modificar Empleado' : 'Enrolar Nuevo Empleado'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
              {formError && (
                <div className="bg-red-950/60 border border-red-500/40 rounded-xl p-3 text-xs text-red-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* DNI Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Número de Identidad de Honduras (DNI - 13 dígitos) *
                </label>
                <input
                  type="text"
                  placeholder="0801199012345"
                  value={dni}
                  disabled={!!editingEmployee}
                  onChange={e => setDni(cleanDni(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 disabled:opacity-60"
                  maxLength={13}
                  required
                />
                {dni.length > 0 && (
                  <p className="text-[11px] text-cyan-400 mt-1 font-mono">
                    Formato: {formatHonduranDni(dni)} ({dni.length}/13)
                    {getDniDepartment(dni) ? ` — ${getDniDepartment(dni)}` : ''}
                  </p>
                )}
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  placeholder="ej. Carlos Alberto Mejía"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              {/* Position */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Cargo / Posición *
                </label>
                <input
                  type="text"
                  placeholder="ej. Ingeniero de Sistemas"
                  value={position}
                  onChange={e => setPosition(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              {/* Photo Input (Gallery or Camera on Samsung S23 Ultra) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Fotografía del Empleado (Opcional - Cámara o Galería)
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                    {photoBase64 ? (
                      <img
                        src={photoBase64}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-600" />
                    )}
                  </div>

                  <div className="flex flex-col gap-2 flex-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 py-2 px-3 rounded-xl border border-slate-700 transition"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Galería</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-cyan-950/80 hover:bg-cyan-900 text-xs font-medium text-cyan-300 py-2 px-3 rounded-xl border border-cyan-800 transition"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Tomar Foto</span>
                      </button>
                    </div>

                    {photoBase64 && (
                      <button
                        type="button"
                        onClick={() => setPhotoBase64(null)}
                        className="text-[11px] text-red-400 hover:underline text-left"
                      >
                        Remover foto
                      </button>
                    )}
                  </div>
                </div>

                {/* Hidden file inputs */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <input
                  type="file"
                  ref={cameraInputRef}
                  accept="image/*"
                  capture="user"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t border-slate-800 mt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-semibold shadow-lg transition active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting
                    ? 'Guardando...'
                    : editingEmployee
                    ? 'Actualizar'
                    : 'Enrolar Empleado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Single Employee Delete Confirmation Dialog */}
      {employeeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-slate-900 border border-red-500/40 rounded-3xl p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-950 text-red-400 mx-auto flex items-center justify-center mb-3 border border-red-800/60 shadow-lg shadow-red-950/50">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white">¿Eliminar empleado?</h3>

            <div className="my-3.5 p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex items-center gap-3 text-left">
              <div className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-cyan-400 font-bold shrink-0 overflow-hidden">
                {employeeToDelete.photo_url ? (
                  <img
                    src={employeeToDelete.photo_url}
                    alt={employeeToDelete.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-base">{employeeToDelete.full_name[0]}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm text-white truncate">
                  {employeeToDelete.full_name}
                </div>
                <div className="text-xs text-cyan-400 truncate font-medium">
                  {employeeToDelete.position}
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                  {formatHonduranDni(employeeToDelete.dni)}
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Esta acción dará de baja al colaborador del sistema de registro y eliminará su fotografía asociada.
            </p>

            <div className="flex items-center gap-3 mt-5">
              <button
                type="button"
                onClick={() => setEmployeeToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const targetDni = employeeToDelete.dni;
                  setEmployeeToDelete(null);
                  soundManager.vibrate([30, 40]);
                  await onDeleteOne(targetDni);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-lg shadow-red-600/30 transition active:scale-95"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Confirmation Dialog */}
      {showDeleteAllConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-slate-900 border border-red-500/40 rounded-3xl p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-950 text-red-400 mx-auto flex items-center justify-center mb-3 border border-red-800/60 shadow-lg shadow-red-950/50">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">¿Eliminar todos los empleados?</h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Esta acción eliminará permanentemente a los {employees.length} empleados registrados y limpiará todas las fotografías almacenadas en el sistema.
            </p>
            <div className="flex items-center gap-3 mt-5">
              <button
                onClick={() => setShowDeleteAllConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  setShowDeleteAllConfirm(false);
                  soundManager.vibrate([40, 50]);
                  await onDeleteAll();
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-lg shadow-red-600/30"
              >
                Sí, Eliminar Todos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Import Modal */}
      {showExcelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-slate-900 border border-emerald-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-700/60 text-emerald-400 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Cargar Base de Datos desde Excel
                  </h3>
                  <p className="text-xs text-slate-400">
                    Importa tu nómina en formato .xlsx, .xls o .csv
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowExcelModal(false);
                  setExcelResult(null);
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-3.5 scrollbar-thin">
              {/* Data Preservation Safeguard Notice */}
              <div className="bg-emerald-950/40 border border-emerald-600/40 rounded-2xl p-3.5 flex items-start gap-3 text-xs text-emerald-200">
                <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="text-white block font-semibold mb-0.5">
                    Garantía de Preservación de Empleados Enrolados
                  </strong>
                  Al cargar este archivo, los colaboradores ya enrolados <strong>NO se borrarán</strong> de la base de datos. El sistema únicamente integrará los nuevos y actualizará nombres o cargos para que cuando coloquen su DNI de 13 dígitos en el escáner o teclado, los reconozca al instante.
                </div>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => excelInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-emerald-500/80 bg-slate-950/60 hover:bg-slate-950 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2.5 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-900 group-hover:bg-emerald-950/80 border border-slate-800 group-hover:border-emerald-700/60 flex items-center justify-center text-slate-400 group-hover:text-emerald-300 transition shadow-inner">
                  <Upload className="w-6 h-6" />
                </div>

                <div>
                  <div className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition">
                    {excelFileName ? excelFileName : 'Toca aquí para seleccionar tu archivo Excel (.xlsx / .csv)'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Columnas requeridas: DNI (13 dígitos), Nombre Completo, Cargo
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      excelInputRef.current?.click();
                    }}
                    className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-xl transition shadow-md"
                  >
                    Examinar Archivo
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadExcelTemplate();
                    }}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium px-3 py-2 rounded-xl border border-slate-700 transition flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                    Descargar Plantilla
                  </button>
                </div>
              </div>

              {isParsingExcel && (
                <div className="text-center py-4 text-xs text-slate-300 flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  <span>Procesando archivo de nómina...</span>
                </div>
              )}

              {excelError && (
                <div className="bg-red-950/60 border border-red-500/40 rounded-xl p-3 text-xs text-red-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{excelError}</span>
                </div>
              )}

              {/* Preview of Parsed Rows */}
              {excelResult && (
                <div className="flex flex-col gap-3">
                  {/* Summary Counters */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-center">
                      <span className="text-[10px] text-slate-400 block">Total Leídos</span>
                      <span className="text-base font-bold text-white">{excelResult.totalParsed}</span>
                    </div>
                    <div className="bg-slate-950 border border-emerald-700/50 p-2.5 rounded-xl text-center">
                      <span className="text-[10px] text-emerald-400 block">Nuevos</span>
                      <span className="text-base font-bold text-emerald-400">+{excelResult.newEmployees}</span>
                    </div>
                    <div className="bg-slate-950 border border-cyan-700/50 p-2.5 rounded-xl text-center">
                      <span className="text-[10px] text-cyan-400 block">Actualizar</span>
                      <span className="text-base font-bold text-cyan-400">{excelResult.updatedEmployees}</span>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-center">
                      <span className="text-[10px] text-amber-400 block">Inválidos</span>
                      <span className="text-base font-bold text-amber-400">{excelResult.invalidCount}</span>
                    </div>
                  </div>

                  {/* Preview Rows Table */}
                  <div className="border border-slate-800 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
                        <tr>
                          <th className="py-2 px-3 font-semibold">DNI (13 dígitos)</th>
                          <th className="py-2 px-3 font-semibold">Colaborador</th>
                          <th className="py-2 px-3 font-semibold">Cargo</th>
                          <th className="py-2 px-3 font-semibold text-right">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {excelResult.rows.slice(0, 50).map((row, idx) => (
                          <tr key={idx} className={row.valid ? 'hover:bg-slate-800/40' : 'bg-red-950/20'}>
                            <td className="py-2 px-3 font-mono font-medium text-slate-200">
                              {row.valid ? formatHonduranDni(row.dni) : row.dni}
                            </td>
                            <td className="py-2 px-3 font-semibold text-white">
                              {row.full_name}
                            </td>
                            <td className="py-2 px-3 text-cyan-300">
                              {row.position}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {row.valid ? (
                                row.isExisting ? (
                                  <span className="text-[10px] bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-800 font-semibold">
                                    Actualizar
                                  </span>
                                ) : (
                                  <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-800 font-semibold">
                                    Nuevo
                                  </span>
                                )
                              ) : (
                                <span className="text-[10px] bg-red-950 text-red-300 px-2 py-0.5 rounded-full border border-red-800 font-semibold" title={row.error}>
                                  Inválido
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {excelResult.rows.length > 50 && (
                    <div className="text-[11px] text-slate-400 text-center">
                      ...y {excelResult.rows.length - 50} colaboradores más en la lista.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowExcelModal(false);
                  setExcelResult(null);
                }}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmBatchImport}
                disabled={!excelResult || excelResult.validCount === 0 || isImportingExcel}
                className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isImportingExcel ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Guardando en Base de Datos...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      Guardar en Base de Datos ({excelResult?.validCount || 0} Colaboradores)
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Excel File Input */}
      <input
        type="file"
        ref={excelInputRef}
        accept=".xlsx,.xls,.csv"
        onChange={handleExcelFileSelect}
        className="hidden"
      />
    </div>
  );
};
