import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Document as DocxDoc,
  Packer as DocxPacker,
  Paragraph as DocxPara,
  TextRun as DocxRun,
  Table as DocxTable,
  TableRow as DocxRow,
  TableCell as DocxCell,
  WidthType as DocxWidth,
  AlignmentType as DocxAlign,
  BorderStyle as DocxBorder,
  ShadingType as DocxShading,
  Header as DocxHdr,
  Footer as DocxFtr,
  PageNumber as DocxPage
} from 'docx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

const DATABASE_FILE = path.join(__dirname, 'employee_database.json');
const ATTENDANCE_LOG = path.join(__dirname, 'attendance_log.csv');
const UPLOAD_FOLDER = path.join(__dirname, 'employee_photos');

// Ensure directories exist
if (!fs.existsSync(UPLOAD_FOLDER)) {
  fs.mkdirSync(UPLOAD_FOLDER, { recursive: true });
}

export interface Employee {
  dni: string;
  full_name: string;
  position: string;
  photo_path: string | null;
  photo_url?: string | null;
  enrolled_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: string;
  dni: string;
  full_name: string;
  position: string;
  timestamp: string;
  timezone: string;
  punctuality: string;
  in_observation: boolean;
  message: string;
}

// Initial seed employees so the app is immediately demonstrable
const SEED_EMPLOYEES: Record<string, Employee> = {
  '1707199201234': {
    dni: '1707199201234',
    full_name: 'José Leonel Carranza',
    position: 'Supervisor de Logística (Langue, Valle)',
    photo_path: null,
    enrolled_at: '2026-11-01 07:10:00 AM',
    updated_at: '2026-11-01 07:10:00 AM'
  },
  '0801199012345': {
    dni: '0801199012345',
    full_name: 'Carlos Alberto Mejía',
    position: 'Ingeniero de Sistemas',
    photo_path: null,
    enrolled_at: '2026-11-01 07:12:00 AM',
    updated_at: '2026-11-01 07:12:00 AM'
  },
  '0501198823456': {
    dni: '0501198823456',
    full_name: 'María Elena Morales',
    position: 'Gerente de Recursos Humanos',
    photo_path: null,
    enrolled_at: '2026-11-01 07:15:00 AM',
    updated_at: '2026-11-01 07:15:00 AM'
  },
  '0101199534567': {
    dni: '0101199534567',
    full_name: 'David Antonio Flores',
    position: 'Supervisor de Operaciones',
    photo_path: null,
    enrolled_at: '2026-11-02 07:22:00 AM',
    updated_at: '2026-11-02 07:22:00 AM'
  },
  '0801200045678': {
    dni: '0801200045678',
    full_name: 'Sofía Isabel Romero',
    position: 'Especialista en Calidad & UX',
    photo_path: null,
    enrolled_at: '2026-11-02 07:31:00 AM',
    updated_at: '2026-11-02 07:31:00 AM'
  }
};

function loadDatabase(): Record<string, Employee> {
  try {
    if (fs.existsSync(DATABASE_FILE)) {
      const content = fs.readFileSync(DATABASE_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading database:', err);
  }
  // Initialize with seed data ONLY if file does not exist
  saveDatabase(SEED_EMPLOYEES);
  return SEED_EMPLOYEES;
}

function saveDatabase(db: Record<string, Employee>): void {
  fs.writeFileSync(DATABASE_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

export function validateHonduranDni(dni: string): boolean {
  if (!dni) return false;
  const clean = dni.trim().replace(/\D/g, '');
  return clean.length === 13;
}

export function getHondurasTime(customDate?: Date): {
  date: Date;
  formatted: string;
  hours: number;
  minutes: number;
  seconds: number;
} {
  const baseDate = customDate || new Date();
  // Honduras is UTC-6 all year (no DST)
  const utc = baseDate.getTime() + baseDate.getTimezoneOffset() * 60000;
  const hondurasOffset = -6 * 3600000;
  const hnDate = new Date(utc + hondurasOffset);

  const hours = hnDate.getHours();
  const minutes = hnDate.getMinutes();
  const seconds = hnDate.getSeconds();

  const year = hnDate.getFullYear();
  const month = String(hnDate.getMonth() + 1).padStart(2, '0');
  const day = String(hnDate.getDate()).padStart(2, '0');

  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  const strHours = String(displayHours).padStart(2, '0');
  const strMinutes = String(minutes).padStart(2, '0');
  const strSeconds = String(seconds).padStart(2, '0');

  const formatted = `${year}-${month}-${day} ${strHours}:${strMinutes}:${strSeconds} ${period}`;
  return { date: hnDate, formatted, hours, minutes, seconds };
}

export function evaluatePunctuality(hnHours: number, hnMinutes: number): {
  punctuality: string;
  in_observation: boolean;
} {
  // Python logic:
  // limit_time = time(7, 30, 0)
  // very_punctual_limit = time(7, 20, 0)
  // late_limit = time(7, 35, 0)
  // if t <= very_punctual_limit: "Muy puntual", False
  // elif t <= limit_time: "Puntual", False
  // elif t <= late_limit: "Pasado de la hora de entrada", True
  // else: "Demasiado tarde", True
  const totalMinutes = hnHours * 60 + hnMinutes;
  const veryPunctualMin = 7 * 60 + 20; // 7:20
  const limitMin = 7 * 60 + 30;        // 7:30
  const lateMin = 7 * 60 + 35;         // 7:35

  if (totalMinutes <= veryPunctualMin) {
    return { punctuality: 'Muy puntual', in_observation: false };
  } else if (totalMinutes <= limitMin) {
    return { punctuality: 'Puntual', in_observation: false };
  } else if (totalMinutes <= lateMin) {
    return { punctuality: 'Pasado de la hora de entrada', in_observation: true };
  } else {
    return { punctuality: 'Demasiado tarde', in_observation: true };
  }
}

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Serve photos statically
app.use('/employee_photos', express.static(UPLOAD_FOLDER));

// --- API ROUTES (matching user's Flask code and frontend extensions) ---

// Current Honduras Time and rule status
app.get(['/time', '/api/time'], (_req, res) => {
  const hn = getHondurasTime();
  const evaluation = evaluatePunctuality(hn.hours, hn.minutes);
  res.json({
    timestamp: hn.formatted,
    hours: hn.hours,
    minutes: hn.minutes,
    seconds: hn.seconds,
    timezone: 'America/Tegucigalpa (UTC-6)',
    status_at_moment: evaluation.punctuality,
    in_observation_at_moment: evaluation.in_observation,
    thresholds: {
      very_punctual: 'Hasta las 7:20 AM',
      punctual: 'De 7:21 AM a 7:30 AM',
      overdue_observation: 'De 7:31 AM a 7:35 AM (En observación)',
      too_late: 'De 7:36 AM en adelante (En observación)'
    }
  });
});

// List all employees
app.get(['/employees', '/api/employees'], (_req, res) => {
  const db = loadDatabase();
  res.json({
    total: Object.keys(db).length,
    employees: Object.values(db)
  });
});

// Batch import employees from Excel/CSV (MERGES with existing database, NEVER deletes existing enrolled employees)
app.post(['/employees/batch-import', '/api/employees/batch-import'], (req, res) => {
  const employeesList = req.body?.employees;
  if (!Array.isArray(employeesList) || employeesList.length === 0) {
    res.status(400).json({ error: 'Lista de empleados vacía o en formato inválido.' });
    return;
  }

  const db = loadDatabase();
  const hn = getHondurasTime();
  let addedCount = 0;
  let updatedCount = 0;
  const processedDnis: string[] = [];

  for (const emp of employeesList) {
    const rawDni = String(emp.dni || '').trim().replace(/\D/g, '');
    const fullName = String(emp.full_name || '').trim();
    const position = String(emp.position || '').trim() || 'Colaborador';

    if (validateHonduranDni(rawDni) && fullName) {
      if (db[rawDni]) {
        // Update without deleting or removing their photo
        db[rawDni].full_name = fullName;
        db[rawDni].position = position;
        db[rawDni].updated_at = hn.formatted;
        updatedCount++;
      } else {
        // Enroll new employee
        db[rawDni] = {
          dni: rawDni,
          full_name: fullName,
          position,
          photo_path: null,
          photo_url: null,
          enrolled_at: hn.formatted,
          updated_at: hn.formatted
        };
        addedCount++;
      }
      processedDnis.push(rawDni);
    }
  }

  // Save merged database (all previous employees remain intact!)
  saveDatabase(db);

  res.json({
    status: 'success',
    message: `Base de datos actualizada con éxito: ${addedCount} nuevo(s), ${updatedCount} actualizado(s). Total colaboradores: ${Object.keys(db).length}.`,
    addedCount,
    updatedCount,
    total: Object.keys(db).length,
    employees: Object.values(db)
  });
});

// Enroll an employee (POST /enroll)
app.post(['/enroll', '/api/enroll'], (req, res) => {
  const dni = String(req.body.dni || '').trim().replace(/\D/g, '');
  const full_name = String(req.body.full_name || '').trim();
  const position = String(req.body.position || '').trim();
  const photo_base64 = req.body.photo_base64; // Data URL or base64

  if (!validateHonduranDni(dni)) {
    res.status(400).json({
      error: 'Número de identidad de Honduras inválido. Debe tener exactamente 13 dígitos numéricos.'
    });
    return;
  }

  if (!full_name || !position) {
    res.status(400).json({
      error: 'El nombre completo y el cargo son obligatorios.'
    });
    return;
  }

  const db = loadDatabase();
  if (db[dni]) {
    res.status(409).json({
      error: 'El empleado con este DNI ya está registrado. Use PUT /employee/<dni> para modificarlo.'
    });
    return;
  }

  let photoPath: string | null = null;
  let photoUrl: string | null = null;

  if (photo_base64 && typeof photo_base64 === 'string' && photo_base64.startsWith('data:image')) {
    try {
      const match = photo_base64.match(/^data:image\/(\w+);base64,(.+)$/);
      if (match) {
        const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
        const data = match[2];
        const filename = `${dni}_avatar.${ext}`;
        const filePath = path.join(UPLOAD_FOLDER, filename);
        fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
        photoPath = filePath;
        photoUrl = `/employee_photos/${filename}`;
      }
    } catch (e) {
      console.warn('Failed saving photo file, storing as data URL fallback:', e);
      photoUrl = photo_base64;
    }
  }

  const hn = getHondurasTime();
  const newEmployee: Employee = {
    dni,
    full_name,
    position,
    photo_path: photoPath,
    photo_url: photoUrl,
    enrolled_at: hn.formatted,
    updated_at: hn.formatted
  };

  db[dni] = newEmployee;
  saveDatabase(db);

  res.json({
    status: 'success',
    message: `Empleado ${full_name} (${position}) enrolado correctamente.`,
    dni,
    photo_saved: photoUrl !== null,
    employee: newEmployee
  });
});

// Update employee (PUT /employee/<dni>)
app.put(['/employee/:dni', '/api/employee/:dni'], (req, res) => {
  const dni = String(req.params.dni || '').trim().replace(/\D/g, '');

  if (!validateHonduranDni(dni)) {
    res.status(400).json({ error: 'Número de identidad de Honduras inválido.' });
    return;
  }

  const db = loadDatabase();
  if (!db[dni]) {
    res.status(404).json({ error: 'El empleado no se encuentra registrado en el sistema.' });
    return;
  }

  const { full_name, position, photo_base64 } = req.body;
  if (full_name) db[dni].full_name = String(full_name).trim();
  if (position) db[dni].position = String(position).trim();

  if (photo_base64 && typeof photo_base64 === 'string' && photo_base64.startsWith('data:image')) {
    try {
      const match = photo_base64.match(/^data:image\/(\w+);base64,(.+)$/);
      if (match) {
        const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
        const filename = `${dni}_avatar.${ext}`;
        const filePath = path.join(UPLOAD_FOLDER, filename);
        fs.writeFileSync(filePath, Buffer.from(match[2], 'base64'));
        db[dni].photo_path = filePath;
        db[dni].photo_url = `/employee_photos/${filename}?v=${Date.now()}`;
      }
    } catch {
      db[dni].photo_url = photo_base64;
    }
  }

  const hn = getHondurasTime();
  db[dni].updated_at = hn.formatted;
  saveDatabase(db);

  res.json({
    status: 'success',
    message: `Datos del empleado con DNI ${dni} actualizados correctamente.`,
    updated_at: hn.formatted,
    employee: db[dni]
  });
});

// Delete specific employee (DELETE /employee/<dni>)
app.delete(['/employee/:dni', '/api/employee/:dni'], (req, res) => {
  const dni = String(req.params.dni || '').trim().replace(/\D/g, '');

  if (!validateHonduranDni(dni)) {
    res.status(400).json({ error: 'Número de identidad de Honduras inválido.' });
    return;
  }

  const db = loadDatabase();
  if (!db[dni]) {
    res.status(404).json({ error: 'El empleado no se encuentra registrado en el sistema.' });
    return;
  }

  const emp = db[dni];
  if (emp.photo_path && fs.existsSync(emp.photo_path)) {
    try {
      fs.unlinkSync(emp.photo_path);
    } catch (e) {
      console.warn('Error deleting photo file:', e);
    }
  }

  const fullName = emp.full_name;
  delete db[dni];
  saveDatabase(db);

  res.json({
    status: 'success',
    message: `Empleado ${fullName} con DNI ${dni} eliminado correctamente del sistema.`
  });
});

// Delete all employees (DELETE /employees)
app.delete(['/employees', '/api/employees'], (_req, res) => {
  const db = loadDatabase();
  if (Object.keys(db).length === 0) {
    res.json({ message: 'La base de datos ya está vacía.' });
    return;
  }

  for (const dni of Object.keys(db)) {
    const emp = db[dni];
    if (emp.photo_path && fs.existsSync(emp.photo_path)) {
      try {
        fs.unlinkSync(emp.photo_path);
      } catch {}
    }
  }

  saveDatabase({});

  res.json({
    status: 'success',
    message: 'Se han eliminado todos los empleados y sus fotografías del sistema.'
  });
});

// Check-in (POST /check-in)
app.post(['/check-in', '/api/check-in'], (req, res) => {
  const rawDni = req.body?.dni;
  const dni = String(rawDni || '').trim().replace(/\D/g, '');
  const simulatedTime = req.body?.simulated_time; // Optional simulation timestamp for manager demo

  if (!validateHonduranDni(dni)) {
    res.status(400).json({
      error: 'Número de identidad de Honduras inválido o no proporcionado (13 dígitos requeridos).'
    });
    return;
  }

  const db = loadDatabase();
  if (Object.keys(db).length === 0) {
    res.status(400).json({
      error: 'La base de datos de empleados está vacía.'
    });
    return;
  }

  if (!db[dni]) {
    res.status(404).json({
      status: 'failed',
      message: 'El número de identidad no está registrado en el sistema.'
    });
    return;
  }

  const storedData = db[dni];

  // Calculate Honduras time
  let checkInDate = new Date();
  if (simulatedTime) {
    const parsed = new Date(simulatedTime);
    if (!isNaN(parsed.getTime())) {
      checkInDate = parsed;
    }
  }

  const hn = getHondurasTime(checkInDate);
  const { punctuality, in_observation } = evaluatePunctuality(hn.hours, hn.minutes);

  // Append to attendance_log.csv
  const observationStr = in_observation ? 'Sí' : 'No';
  const logEntry = `${dni},"${storedData.full_name}","${hn.formatted}","${punctuality}","Observación: ${observationStr}"\n`;

  try {
    fs.appendFileSync(ATTENDANCE_LOG, logEntry, 'utf-8');
  } catch (err) {
    console.error('Failed writing to CSV:', err);
  }

  const responsePayload = {
    status: 'success',
    dni,
    full_name: storedData.full_name,
    position: storedData.position,
    photo_url: storedData.photo_url || null,
    timestamp: hn.formatted,
    timezone: 'America/Tegucigalpa',
    punctuality,
    in_observation,
    message: `¡Bienvenido/a, ${storedData.full_name}! Asistencia registrada. Estado: ${punctuality}.` +
      (in_observation ? ' (Queda en observación)' : '')
  };

  res.json(responsePayload);
});

// View attendance log
app.get(['/attendance', '/api/attendance'], (_req, res) => {
  if (!fs.existsSync(ATTENDANCE_LOG)) {
    res.json({ records: [], total: 0 });
    return;
  }

  const raw = fs.readFileSync(ATTENDANCE_LOG, 'utf-8');
  const lines = raw.trim().split('\n').filter(Boolean);
  const records = lines.map((line, idx) => {
    // Parse CSV line
    const parts = line.split(',');
    const dni = parts[0] || '';
    const name = (parts[1] || '').replace(/"/g, '');
    const timestamp = (parts[2] || '').replace(/"/g, '');
    const punctuality = (parts[3] || '').replace(/"/g, '');
    const obsPart = (parts[4] || '').replace(/"/g, '');
    const in_observation = obsPart.includes('Sí');

    return {
      id: `att_${idx + 1}`,
      dni,
      full_name: name,
      timestamp,
      punctuality,
      in_observation
    };
  }).reverse(); // Most recent first

  res.json({
    total: records.length,
    records
  });
});

// Export CSV download
app.get(['/attendance/export', '/api/attendance/export'], (_req, res) => {
  if (!fs.existsSync(ATTENDANCE_LOG)) {
    fs.writeFileSync(ATTENDANCE_LOG, 'DNI,Nombre Completo,Fecha y Hora (Tegucigalpa),Puntualidad,Observación\n', 'utf-8');
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="attendance_log_honduras.csv"');
  res.sendFile(ATTENDANCE_LOG);
});

// Export Word (.docx) download
app.get(['/attendance/export-word', '/api/attendance/export-word'], async (_req, res) => {
  try {
    let records: { dni: string; full_name: string; timestamp: string; punctuality: string; in_observation: boolean }[] = [];
    if (fs.existsSync(ATTENDANCE_LOG)) {
      const raw = fs.readFileSync(ATTENDANCE_LOG, 'utf-8');
      const lines = raw.trim().split('\n').filter(Boolean);
      records = lines.map(line => {
        const parts = line.split(',');
        const dni = (parts[0] || '').trim();
        const full_name = (parts[1] || '').replace(/"/g, '').trim();
        const timestamp = (parts[2] || '').replace(/"/g, '').trim();
        const punctuality = (parts[3] || '').replace(/"/g, '').trim();
        const in_observation = (parts[4] || '').includes('Sí');
        return { dni, full_name, timestamp, punctuality, in_observation };
      });
    }

    const hn = getHondurasTime();
    const formattedDate = `${hn.date.getFullYear()}-${String(hn.date.getMonth() + 1).padStart(2, '0')}-${String(hn.date.getDate()).padStart(2, '0')}`;

    const total = records.length;
    const obsCount = records.filter(r => r.in_observation).length;
    const punctCount = total - obsCount;
    const rate = total > 0 ? Math.round((punctCount / total) * 100) : 100;

    const makeHeaderCell = (text: string, width: number) => {
      return new DocxCell({
        width: { size: width, type: DocxWidth.PERCENTAGE },
        shading: { type: DocxShading.CLEAR, fill: '003366' },
        margins: { top: 120, bottom: 120, left: 100, right: 100 },
        children: [
          new DocxPara({
            alignment: DocxAlign.CENTER,
            children: [new DocxRun({ text, bold: true, color: 'FFFFFF', size: 18, font: 'Calibri' })]
          })
        ]
      });
    };

    const rows: InstanceType<typeof DocxRow>[] = [
      new DocxRow({
        tableHeader: true,
        children: [
          makeHeaderCell('N°', 6),
          makeHeaderCell('DNI HONDURAS', 22),
          makeHeaderCell('COLABORADOR', 28),
          makeHeaderCell('HORA REGISTRO', 22),
          makeHeaderCell('PUNTUALIDAD', 14),
          makeHeaderCell('OBS.', 8),
        ]
      })
    ];

    if (records.length === 0) {
      rows.push(
        new DocxRow({
          children: [
            new DocxCell({
              columnSpan: 6,
              margins: { top: 160, bottom: 160, left: 100, right: 100 },
              children: [
                new DocxPara({
                  alignment: DocxAlign.CENTER,
                  children: [new DocxRun({ text: 'Sin registros archivados en la bitácora.', italics: true, color: '64748B', font: 'Calibri', size: 20 })]
                })
              ]
            })
          ]
        })
      );
    } else {
      records.forEach((r, idx) => {
        const bg = r.in_observation ? 'FFF5F5' : idx % 2 === 1 ? 'F8FAFC' : 'FFFFFF';
        const color = r.in_observation ? 'B91C1C' : '047857';

        rows.push(
          new DocxRow({
            children: [
              new DocxCell({
                width: { size: 6, type: DocxWidth.PERCENTAGE },
                shading: { type: DocxShading.CLEAR, fill: bg },
                margins: { top: 100, bottom: 100, left: 80, right: 80 },
                children: [new DocxPara({ alignment: DocxAlign.CENTER, children: [new DocxRun({ text: String(idx + 1), size: 18, font: 'Calibri' })] })]
              }),
              new DocxCell({
                width: { size: 22, type: DocxWidth.PERCENTAGE },
                shading: { type: DocxShading.CLEAR, fill: bg },
                margins: { top: 100, bottom: 100, left: 80, right: 80 },
                children: [new DocxPara({ alignment: DocxAlign.CENTER, children: [new DocxRun({ text: r.dni, bold: true, size: 18, font: 'Consolas' })] })]
              }),
              new DocxCell({
                width: { size: 28, type: DocxWidth.PERCENTAGE },
                shading: { type: DocxShading.CLEAR, fill: bg },
                margins: { top: 100, bottom: 100, left: 80, right: 80 },
                children: [new DocxPara({ alignment: DocxAlign.LEFT, children: [new DocxRun({ text: r.full_name, bold: true, size: 18, font: 'Calibri' })] })]
              }),
              new DocxCell({
                width: { size: 22, type: DocxWidth.PERCENTAGE },
                shading: { type: DocxShading.CLEAR, fill: bg },
                margins: { top: 100, bottom: 100, left: 80, right: 80 },
                children: [new DocxPara({ alignment: DocxAlign.CENTER, children: [new DocxRun({ text: r.timestamp, size: 17, font: 'Calibri' })] })]
              }),
              new DocxCell({
                width: { size: 14, type: DocxWidth.PERCENTAGE },
                shading: { type: DocxShading.CLEAR, fill: bg },
                margins: { top: 100, bottom: 100, left: 80, right: 80 },
                children: [new DocxPara({ alignment: DocxAlign.CENTER, children: [new DocxRun({ text: r.punctuality, bold: true, color, size: 17, font: 'Calibri' })] })]
              }),
              new DocxCell({
                width: { size: 8, type: DocxWidth.PERCENTAGE },
                shading: { type: DocxShading.CLEAR, fill: bg },
                margins: { top: 100, bottom: 100, left: 80, right: 80 },
                children: [new DocxPara({ alignment: DocxAlign.CENTER, children: [new DocxRun({ text: r.in_observation ? 'SÍ' : 'NO', bold: true, color: r.in_observation ? 'DC2626' : '059669', size: 17, font: 'Calibri' })] })]
              }),
            ]
          })
        );
      });
    }

    const doc = new DocxDoc({
      creator: 'BioCheck Honduras',
      title: 'Bitácora Oficial de Asistencia - Honduras',
      sections: [{
        properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
        headers: {
          default: new DocxHdr({
            children: [
              new DocxPara({
                alignment: DocxAlign.RIGHT,
                children: [new DocxRun({ text: 'BioCheck HN - Control Oficial de Asistencia', color: '94A3B8', size: 16, font: 'Calibri' })]
              })
            ]
          })
        },
        footers: {
          default: new DocxFtr({
            children: [
              new DocxPara({
                alignment: DocxAlign.CENTER,
                children: [
                  new DocxRun({ text: 'Página ', size: 16, font: 'Calibri' }),
                  new DocxRun({ children: [DocxPage.CURRENT], size: 16, font: 'Calibri' }),
                  new DocxRun({ text: ' de ', size: 16, font: 'Calibri' }),
                  new DocxRun({ children: [DocxPage.TOTAL_PAGES], size: 16, font: 'Calibri' }),
                  new DocxRun({ text: ' | Tegucigalpa, Honduras (UTC-6)', color: '94A3B8', size: 16, font: 'Calibri' })
                ]
              })
            ]
          })
        },
        children: [
          new DocxPara({
            alignment: DocxAlign.CENTER,
            spacing: { after: 60 },
            children: [new DocxRun({ text: 'REPÚBLICA DE HONDURAS', bold: true, size: 26, color: '003366', font: 'Calibri' })]
          }),
          new DocxPara({
            alignment: DocxAlign.CENTER,
            spacing: { after: 120 },
            children: [new DocxRun({ text: 'BITÁCORA OFICIAL DE CONTROL DE ASISTENCIA Y PUNTUALIDAD', bold: true, size: 24, color: '0284C7', font: 'Calibri' })]
          }),
          new DocxPara({
            alignment: DocxAlign.CENTER,
            spacing: { after: 240 },
            children: [new DocxRun({ text: `Emitido el ${hn.formatted} (Zona Horaria Tegucigalpa UTC-6)`, italics: true, size: 18, color: '475569', font: 'Calibri' })]
          }),
          new DocxTable({
            width: { size: 100, type: DocxWidth.PERCENTAGE },
            rows: [
              new DocxRow({
                children: [
                  new DocxCell({
                    width: { size: 25, type: DocxWidth.PERCENTAGE },
                    shading: { type: DocxShading.CLEAR, fill: 'F8FAFC' },
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    children: [new DocxPara({ alignment: DocxAlign.CENTER, children: [new DocxRun({ text: 'TOTAL REGISTROS\n', size: 16, color: '64748B', bold: true, font: 'Calibri' }), new DocxRun({ text: String(total), size: 30, bold: true, color: '0F172A', font: 'Calibri' })] })]
                  }),
                  new DocxCell({
                    width: { size: 25, type: DocxWidth.PERCENTAGE },
                    shading: { type: DocxShading.CLEAR, fill: 'F8FAFC' },
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    children: [new DocxPara({ alignment: DocxAlign.CENTER, children: [new DocxRun({ text: 'PUNTUALES\n', size: 16, color: '059669', bold: true, font: 'Calibri' }), new DocxRun({ text: String(punctCount), size: 30, bold: true, color: '059669', font: 'Calibri' })] })]
                  }),
                  new DocxCell({
                    width: { size: 25, type: DocxWidth.PERCENTAGE },
                    shading: { type: DocxShading.CLEAR, fill: 'F8FAFC' },
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    children: [new DocxPara({ alignment: DocxAlign.CENTER, children: [new DocxRun({ text: 'EN OBSERVACIÓN\n', size: 16, color: 'DC2626', bold: true, font: 'Calibri' }), new DocxRun({ text: String(obsCount), size: 30, bold: true, color: 'DC2626', font: 'Calibri' })] })]
                  }),
                  new DocxCell({
                    width: { size: 25, type: DocxWidth.PERCENTAGE },
                    shading: { type: DocxShading.CLEAR, fill: 'F8FAFC' },
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    children: [new DocxPara({ alignment: DocxAlign.CENTER, children: [new DocxRun({ text: 'PUNTUALIDAD\n', size: 16, color: '0284C7', bold: true, font: 'Calibri' }), new DocxRun({ text: `${rate}%`, size: 30, bold: true, color: '0284C7', font: 'Calibri' })] })]
                  }),
                ]
              })
            ]
          }),
          new DocxPara({ spacing: { after: 240 }, children: [] }),
          new DocxTable({ width: { size: 100, type: DocxWidth.PERCENTAGE }, rows }),
          new DocxPara({ spacing: { after: 400 }, children: [] }),
          new DocxTable({
            width: { size: 100, type: DocxWidth.PERCENTAGE },
            borders: {
              top: { style: DocxBorder.NONE }, bottom: { style: DocxBorder.NONE },
              left: { style: DocxBorder.NONE }, right: { style: DocxBorder.NONE },
              insideHorizontal: { style: DocxBorder.NONE }, insideVertical: { style: DocxBorder.NONE },
            },
            rows: [
              new DocxRow({
                children: [
                  new DocxCell({
                    width: { size: 45, type: DocxWidth.PERCENTAGE },
                    children: [
                      new DocxPara({
                        alignment: DocxAlign.CENTER,
                        children: [
                          new DocxRun({ text: '_____________________________________\n', font: 'Calibri', size: 18 }),
                          new DocxRun({ text: 'Gerencia de Recursos Humanos\n', bold: true, font: 'Calibri', size: 18 }),
                          new DocxRun({ text: 'Firma y Sello Oficial', color: '64748B', font: 'Calibri', size: 16 })
                        ]
                      })
                    ]
                  }),
                  new DocxCell({ width: { size: 10, type: DocxWidth.PERCENTAGE }, children: [new DocxPara({ children: [] })] }),
                  new DocxCell({
                    width: { size: 45, type: DocxWidth.PERCENTAGE },
                    children: [
                      new DocxPara({
                        alignment: DocxAlign.CENTER,
                        children: [
                          new DocxRun({ text: '_____________________________________\n', font: 'Calibri', size: 18 }),
                          new DocxRun({ text: 'Supervisión de Operaciones\n', bold: true, font: 'Calibri', size: 18 }),
                          new DocxRun({ text: 'Vo.Bo. de Asistencia', color: '64748B', font: 'Calibri', size: 16 })
                        ]
                      })
                    ]
                  }),
                ]
              })
            ]
          })
        ]
      }]
    });

    const buffer = await DocxPacker.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="bitacora_asistencia_${formattedDate}.docx"`);
    res.send(buffer);
  } catch (err) {
    console.error('Error generating Word document:', err);
    res.status(500).json({ error: 'Error al generar el documento de Word.' });
  }
});

// Delete single attendance record (DELETE /attendance/record/:id or /api/attendance/record/:id)
app.delete(['/attendance/record/:id', '/api/attendance/record/:id', '/attendance/record', '/api/attendance/record'], (req, res) => {
  if (!fs.existsSync(ATTENDANCE_LOG)) {
    res.json({ status: 'success', message: 'No hay registros de asistencia para eliminar.', deletedCount: 0 });
    return;
  }

  const idParam = req.body?.id || req.params?.id || req.query?.id;
  const targetDni = (req.body?.dni || req.query?.dni) ? String(req.body?.dni || req.query?.dni).trim().replace(/\D/g, '') : null;
  const targetTimestamp = (req.body?.timestamp || req.query?.timestamp) ? String(req.body?.timestamp || req.query?.timestamp).trim() : null;

  const raw = fs.readFileSync(ATTENDANCE_LOG, 'utf-8');
  const lines = raw.trim().split('\n').filter(Boolean);

  let deleted = false;
  const remainingLines: string[] = [];

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const cleanLine = line.replace(/"/g, '');
    const parts = line.split(',');
    const dni = (parts[0] || '').trim().replace(/\D/g, '');
    const timestamp = (parts[2] || '').replace(/"/g, '').trim();

    const recordId = `att_${idx + 1}`;
    const detailedRecordId = `att_${idx + 1}_${dni}`;
    const reversedRecordId = `att_${lines.length - idx}`;
    const reversedDetailedRecordId = `att_${lines.length - idx}_${dni}`;

    // 1. Match by ID (normal, reversed, detailed or prefix)
    const matchesId = idParam && (
      recordId === idParam ||
      reversedRecordId === idParam ||
      detailedRecordId === idParam ||
      reversedDetailedRecordId === idParam ||
      String(idx + 1) === idParam ||
      String(idParam).startsWith(`att_${idx + 1}_`) ||
      String(idParam).startsWith(`att_${lines.length - idx}_`)
    );
    // 2. Match by exact DNI and timestamp
    const matchesDniTime = targetDni && targetTimestamp && (
      (dni === targetDni && (timestamp === targetTimestamp || timestamp.includes(targetTimestamp) || targetTimestamp.includes(timestamp))) ||
      (cleanLine.includes(targetDni) && cleanLine.includes(targetTimestamp))
    );
    // 3. Fallback: match by DNI if only one entry exists for that DNI
    const matchesDni = targetDni && !targetTimestamp && dni === targetDni;

    if (!deleted && (matchesDniTime || matchesId || matchesDni)) {
      deleted = true;
    } else {
      remainingLines.push(line);
    }
  }

  fs.writeFileSync(ATTENDANCE_LOG, remainingLines.length > 0 ? remainingLines.join('\n') + '\n' : '', 'utf-8');

  res.json({
    status: 'success',
    message: deleted ? 'Registro de asistencia individual eliminado correctamente.' : 'Registro procesado.',
    deleted,
    remainingCount: remainingLines.length
  });
});

// Clear today's attendance log only (DELETE /attendance/today or /api/attendance/today)
app.delete(['/attendance/today', '/api/attendance/today'], (req, res) => {
  if (!fs.existsSync(ATTENDANCE_LOG)) {
    res.json({ status: 'success', message: 'No hay registros de asistencia para eliminar.', deletedCount: 0 });
    return;
  }

  const hn = getHondurasTime();
  const todayDateStr = `${hn.date.getFullYear()}-${String(hn.date.getMonth() + 1).padStart(2, '0')}-${String(hn.date.getDate()).padStart(2, '0')}`;
  const targetDate = req.query.date ? String(req.query.date) : todayDateStr;

  const raw = fs.readFileSync(ATTENDANCE_LOG, 'utf-8');
  const lines = raw.trim().split('\n').filter(Boolean);

  let deletedCount = 0;
  const remainingLines: string[] = [];

  for (const line of lines) {
    if (line.includes(targetDate)) {
      deletedCount++;
    } else {
      remainingLines.push(line);
    }
  }

  if (remainingLines.length > 0) {
    fs.writeFileSync(ATTENDANCE_LOG, remainingLines.join('\n') + '\n', 'utf-8');
  } else {
    fs.writeFileSync(ATTENDANCE_LOG, '', 'utf-8');
  }

  res.json({
    status: 'success',
    message: `Se han eliminado ${deletedCount} registro(s) de asistencia del día (${targetDate}).`,
    deletedCount,
    remainingCount: remainingLines.length
  });
});

// Clear all attendance log
app.delete(['/attendance', '/api/attendance'], (_req, res) => {
  if (fs.existsSync(ATTENDANCE_LOG)) {
    fs.unlinkSync(ATTENDANCE_LOG);
  }
  res.json({ status: 'success', message: 'Registro completo de asistencia borrado exitosamente.' });
});

// Reset demo database to seeds
app.post(['/reset-demo', '/api/reset-demo'], (_req, res) => {
  saveDatabase(SEED_EMPLOYEES);
  res.json({ status: 'success', message: 'Base de datos restaurada con empleados de muestra.' });
});

// Setup Vite middlewares in development or static serve in production
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BioCheck Honduras full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
