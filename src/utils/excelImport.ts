import * as XLSX from 'xlsx';
import { Employee, ExcelEmployeeRow, ExcelImportResult } from '../types';
import { cleanDni, validateHonduranDni } from './hondurasDni';

function normalizeHeader(key: string): string {
  return (key || '')
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]/g, '');      // keep alphanumeric
}

export async function parseExcelFile(
  file: File,
  existingEmployees: Employee[]
): Promise<ExcelImportResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  // Get first sheet
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('El archivo de Excel no contiene hojas de cálculo.');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  // Parse rows as raw objects
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
    raw: false,
  });

  if (!rawRows || rawRows.length === 0) {
    throw new Error('La hoja de cálculo está vacía. Ingrese al menos un empleado.');
  }

  const existingDnis = new Set(existingEmployees.map(e => e.dni));
  const rows: ExcelEmployeeRow[] = [];
  let newEmployeesCount = 0;
  let updatedEmployeesCount = 0;
  let validCount = 0;
  let invalidCount = 0;

  for (const raw of rawRows) {
    // Find matching columns
    let rawDni = '';
    let rawName = '';
    let rawPosition = '';

    for (const [key, value] of Object.entries(raw)) {
      const norm = normalizeHeader(key);
      const valStr = String(value || '').trim();

      if (
        norm.includes('dni') ||
        norm.includes('identidad') ||
        norm.includes('cedula') ||
        norm.includes('identificacion') ||
        norm === 'id' ||
        norm === 'no' ||
        norm.includes('num')
      ) {
        if (!rawDni && valStr) rawDni = valStr;
      } else if (
        norm.includes('nombre') ||
        norm.includes('empleado') ||
        norm.includes('colaborador') ||
        norm.includes('personal') ||
        norm.includes('persona') ||
        norm === 'name' ||
        norm === 'fullname'
      ) {
        if (!rawName && valStr) rawName = valStr;
      } else if (
        norm.includes('cargo') ||
        norm.includes('posicion') ||
        norm.includes('puesto') ||
        norm.includes('rol') ||
        norm.includes('area') ||
        norm.includes('departamento') ||
        norm.includes('ocupacion') ||
        norm === 'position' ||
        norm === 'role'
      ) {
        if (!rawPosition && valStr) rawPosition = valStr;
      }
    }

    // Fallback if headers were not named: check index 0, 1, 2
    if (!rawDni && !rawName) {
      const values = Object.values(raw).map(v => String(v || '').trim()).filter(Boolean);
      if (values.length >= 2) {
        // Find whichever value looks like 13 digits
        const dniIndex = values.findIndex(v => cleanDni(v).length === 13);
        if (dniIndex !== -1) {
          rawDni = values[dniIndex];
          rawName = values[dniIndex === 0 ? 1 : 0];
          rawPosition = values[2] || 'Colaborador';
        }
      }
    }

    const dni = cleanDni(rawDni);
    const fullName = (rawName || '').trim();
    const position = (rawPosition || '').trim() || 'Colaborador';

    let valid = true;
    let error: string | undefined = undefined;

    if (!dni) {
      valid = false;
      error = 'DNI vacío o faltante';
    } else if (dni.length !== 13) {
      valid = false;
      error = `DNI inválido: tiene ${dni.length} dígitos (requiere exactamente 13)`;
    } else if (!fullName) {
      valid = false;
      error = 'Nombre completo faltante';
    }

    const isExisting = existingDnis.has(dni);

    if (valid) {
      validCount++;
      if (isExisting) {
        updatedEmployeesCount++;
      } else {
        newEmployeesCount++;
      }
    } else {
      invalidCount++;
    }

    rows.push({
      dni: dni || rawDni,
      full_name: fullName || '(Sin nombre)',
      position,
      valid,
      error,
      isExisting,
    });
  }

  return {
    totalParsed: rawRows.length,
    validCount,
    invalidCount,
    newEmployees: newEmployeesCount,
    updatedEmployees: updatedEmployeesCount,
    rows,
  };
}

/**
 * Generates an official Excel (.xlsx) template for Honduras employees
 */
export function generateExcelTemplateBlob(): Blob {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Empleados
  const headers = ['DNI (13 Dígitos)', 'Nombre Completo', 'Cargo o Posición'];
  const sampleData = [
    headers,
    ['1707199201234', 'José Leonel Carranza', 'Supervisor de Logística (Langue, Valle)'],
    ['0801199012345', 'Carlos Alberto Mejía', 'Ingeniero de Sistemas'],
    ['0501198823456', 'María Elena Morales', 'Gerente de Recursos Humanos'],
    ['0101199534567', 'David Antonio Flores', 'Supervisor de Operaciones'],
    ['0801200045678', 'Sofía Isabel Romero', 'Especialista en Calidad & UX'],
    ['1801199211223', 'Luis Fernando Ramos', 'Técnico de Soporte'],
    ['0301198533445', 'Ana Patricia Castro', 'Analista Contable'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sampleData);

  // Column widths
  ws['!cols'] = [
    { wch: 22 }, // DNI
    { wch: 32 }, // Nombre
    { wch: 30 }, // Cargo
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Empleados');

  // Sheet 2: Instrucciones
  const instructions = [
    ['INSTRUCCIONES PARA LA CARGA DE EMPLEADOS - BIOCHECK HONDURAS'],
    [''],
    ['1. COLUMNA DNI:'],
    ['   Debe contener el número de identidad de Honduras con exactamente 13 dígitos numéricos.'],
    ['   Ejemplos válidos: 0801199012345 o con guiones 0801-1990-12345.'],
    [''],
    ['2. COLUMNA NOMBRE COMPLETO:'],
    ['   Nombre y apellidos del colaborador.'],
    [''],
    ['3. COLUMNA CARGO O POSICIÓN:'],
    ['   Puesto laboral o departamento del empleado en la empresa.'],
    [''],
    ['4. PRESERVACIÓN DE LA BASE DE DATOS:'],
    ['   Al importar este archivo, el sistema NO BORRARÁ a los empleados ya enrolados.'],
    ['   Solo actualizará o agregará los registros nuevos. Ningún colaborador se eliminará'],
    ['   a menos que usted lo solicite explícitamente desde la opción "Eliminar Empleado".'],
  ];

  const wsInst = XLSX.utils.aoa_to_sheet(instructions);
  wsInst['!cols'] = [{ wch: 75 }];
  XLSX.utils.book_append_sheet(wb, wsInst, 'Instrucciones');

  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export function downloadExcelTemplate(filename = 'plantilla_empleados_honduras.xlsx') {
  const blob = generateExcelTemplateBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
