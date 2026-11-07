import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
  Header,
  Footer,
  PageNumber
} from 'docx';
import { AttendanceRecord } from '../types';
import { formatHonduranDni } from './hondurasDni';

export async function generateAttendanceWordBlob(records: AttendanceRecord[]): Promise<Blob> {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const hnDate = new Date(utc - 6 * 3600000);
  const formattedToday = hnDate.toLocaleDateString('es-HN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const timeFormatted = hnDate.toLocaleTimeString('es-HN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const total = records.length;
  const observationCount = records.filter(r => r.in_observation).length;
  const punctualCount = total - observationCount;
  const punctualityRate = total > 0 ? Math.round((punctualCount / total) * 100) : 100;

  // Header Table Cells styling helper
  const createHeaderCell = (text: string, widthPercent: number) => {
    return new TableCell({
      width: { size: widthPercent, type: WidthType.PERCENTAGE },
      shading: {
        type: ShadingType.CLEAR,
        fill: '003366', // Honduras Deep Navy
      },
      margins: { top: 120, bottom: 120, left: 100, right: 100 },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text,
              bold: true,
              color: 'FFFFFF',
              size: 18, // 9pt
              font: 'Calibri'
            })
          ]
        })
      ]
    });
  };

  // Data rows
  const tableRows: TableRow[] = [
    // Header Row
    new TableRow({
      tableHeader: true,
      children: [
        createHeaderCell('N°', 6),
        createHeaderCell('DNI HONDURAS', 22),
        createHeaderCell('COLABORADOR', 28),
        createHeaderCell('HORA REGISTRO', 22),
        createHeaderCell('PUNTUALIDAD', 14),
        createHeaderCell('OBS.', 8),
      ]
    })
  ];

  if (records.length === 0) {
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 6,
            margins: { top: 180, bottom: 180, left: 100, right: 100 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'No hay registros de asistencia archivados en esta bitácora.',
                    italics: true,
                    color: '666666',
                    font: 'Calibri',
                    size: 20
                  })
                ]
              })
            ]
          })
        ]
      })
    );
  } else {
    records.forEach((record, index) => {
      const isAlt = index % 2 === 1;
      const rowBg = record.in_observation
        ? 'FFF5F5' // Light red/amber tint
        : isAlt
        ? 'F8FAFC'
        : 'FFFFFF';

      const statusColor = record.in_observation ? 'B91C1C' : '047857';

      tableRows.push(
        new TableRow({
          children: [
            // N°
            new TableCell({
              width: { size: 6, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: rowBg },
              margins: { top: 100, bottom: 100, left: 80, right: 80 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ text: String(index + 1), font: 'Calibri', size: 18 })
                  ]
                })
              ]
            }),
            // DNI
            new TableCell({
              width: { size: 22, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: rowBg },
              margins: { top: 100, bottom: 100, left: 80, right: 80 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: formatHonduranDni(record.dni),
                      bold: true,
                      font: 'Consolas',
                      size: 18
                    })
                  ]
                })
              ]
            }),
            // Colaborador
            new TableCell({
              width: { size: 28, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: rowBg },
              margins: { top: 100, bottom: 100, left: 80, right: 80 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.LEFT,
                  children: [
                    new TextRun({
                      text: record.full_name,
                      bold: true,
                      font: 'Calibri',
                      size: 18
                    })
                  ]
                })
              ]
            }),
            // Timestamp
            new TableCell({
              width: { size: 22, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: rowBg },
              margins: { top: 100, bottom: 100, left: 80, right: 80 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ text: record.timestamp, font: 'Calibri', size: 17 })
                  ]
                })
              ]
            }),
            // Puntualidad
            new TableCell({
              width: { size: 14, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: rowBg },
              margins: { top: 100, bottom: 100, left: 80, right: 80 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: record.punctuality,
                      bold: true,
                      color: statusColor,
                      font: 'Calibri',
                      size: 17
                    })
                  ]
                })
              ]
            }),
            // Observación
            new TableCell({
              width: { size: 8, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: rowBg },
              margins: { top: 100, bottom: 100, left: 80, right: 80 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: record.in_observation ? 'SÍ' : 'NO',
                      bold: true,
                      color: record.in_observation ? 'DC2626' : '059669',
                      font: 'Calibri',
                      size: 17
                    })
                  ]
                })
              ]
            }),
          ]
        })
      );
    });
  }

  const doc = new Document({
    creator: 'BioCheck Honduras',
    title: 'Bitácora Oficial de Asistencia - Honduras',
    description: 'Reporte oficial de control de asistencia generado en formato Word (.docx)',
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,    // 0.5 in
              right: 720,
              bottom: 720,
              left: 720,
            }
          }
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'BioCheck HN - Control Biométrico de Asistencia',
                    color: '94A3B8',
                    size: 16,
                    font: 'Calibri'
                  })
                ]
              })
            ]
          })
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'Página ',
                    size: 16,
                    font: 'Calibri'
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    font: 'Calibri'
                  }),
                  new TextRun({
                    text: ' de ',
                    size: 16,
                    font: 'Calibri'
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 16,
                    font: 'Calibri'
                  }),
                  new TextRun({
                    text: '  |  Tegucigalpa, M.D.C., Honduras',
                    color: '94A3B8',
                    size: 16,
                    font: 'Calibri'
                  })
                ]
              })
            ]
          })
        },
        children: [
          // Header Flag & Country Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: 'REPÚBLICA DE HONDURAS',
                bold: true,
                size: 26, // 13pt
                color: '003366',
                font: 'Calibri'
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: 'BITÁCORA OFICIAL DE CONTROL DE ASISTENCIA Y PUNTUALIDAD',
                bold: true,
                size: 24, // 12pt
                color: '0284C7',
                font: 'Calibri'
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: `Generado el ${formattedToday} a las ${timeFormatted} (Zona Horaria Tegucigalpa UTC-6)`,
                italics: true,
                size: 18,
                color: '475569',
                font: 'Calibri'
              })
            ]
          }),

          // Normative Box / Threshold explanation
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: 'F1F5F9' },
                    margins: { top: 120, bottom: 120, left: 140, right: 140 },
                    borders: {
                      left: { style: BorderStyle.SINGLE, size: 24, color: '0073CF' },
                      top: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE },
                      bottom: { style: BorderStyle.NONE }
                    },
                    children: [
                      new Paragraph({
                        spacing: { after: 60 },
                        children: [
                          new TextRun({
                            text: 'Criterios Oficiales de Evaluación de Horario de Entrada (Límite 7:30 AM):',
                            bold: true,
                            size: 18,
                            color: '0F172A',
                            font: 'Calibri'
                          })
                        ]
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: '• ≤ 07:20 AM: ', bold: true, color: '059669', size: 17, font: 'Calibri' }),
                          new TextRun({ text: 'Muy puntual  |  ', size: 17, font: 'Calibri' }),
                          new TextRun({ text: '• 07:21 a 07:30 AM: ', bold: true, color: '0284C7', size: 17, font: 'Calibri' }),
                          new TextRun({ text: 'Puntual  |  ', size: 17, font: 'Calibri' }),
                          new TextRun({ text: '• 07:31 a 07:35 AM: ', bold: true, color: 'D97706', size: 17, font: 'Calibri' }),
                          new TextRun({ text: 'Pasado de hora (En observación)  |  ', size: 17, font: 'Calibri' }),
                          new TextRun({ text: '• ≥ 07:36 AM: ', bold: true, color: 'DC2626', size: 17, font: 'Calibri' }),
                          new TextRun({ text: 'Demasiado tarde (En observación)', size: 17, font: 'Calibri' }),
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          }),

          // Spacing
          new Paragraph({ spacing: { after: 180 }, children: [] }),

          // KPI Summary Cards in a 4-column Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: 'TOTAL REGISTROS\n', size: 16, color: '64748B', bold: true, font: 'Calibri' }),
                          new TextRun({ text: String(total), size: 32, bold: true, color: '0F172A', font: 'Calibri' })
                        ]
                      })
                    ]
                  }),
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: 'PUNTUALES\n', size: 16, color: '059669', bold: true, font: 'Calibri' }),
                          new TextRun({ text: String(punctualCount), size: 32, bold: true, color: '059669', font: 'Calibri' })
                        ]
                      })
                    ]
                  }),
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: 'EN OBSERVACIÓN\n', size: 16, color: 'DC2626', bold: true, font: 'Calibri' }),
                          new TextRun({ text: String(observationCount), size: 32, bold: true, color: 'DC2626', font: 'Calibri' })
                        ]
                      })
                    ]
                  }),
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: 'ÍNDICE PUNTUALIDAD\n', size: 16, color: '0284C7', bold: true, font: 'Calibri' }),
                          new TextRun({ text: `${punctualityRate}%`, size: 32, bold: true, color: '0284C7', font: 'Calibri' })
                        ]
                      })
                    ]
                  }),
                ]
              })
            ]
          }),

          // Spacing
          new Paragraph({ spacing: { after: 240 }, children: [] }),

          // Title above table
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: 'Detalle Cronológico de Marcajes Registrados:',
                bold: true,
                size: 20,
                color: '1E293B',
                font: 'Calibri'
              })
            ]
          }),

          // Main Records Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: tableRows
          }),

          // Spacing
          new Paragraph({ spacing: { after: 480 }, children: [] }),

          // Signatures Section
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 45, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: '_____________________________________\n', font: 'Calibri', size: 20 }),
                          new TextRun({ text: 'Gerencia de Recursos Humanos\n', bold: true, font: 'Calibri', size: 18 }),
                          new TextRun({ text: 'Firma y Sello de Validación', color: '64748B', font: 'Calibri', size: 16 })
                        ]
                      })
                    ]
                  }),
                  new TableCell({
                    width: { size: 10, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [] })]
                  }),
                  new TableCell({
                    width: { size: 45, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: '_____________________________________\n', font: 'Calibri', size: 20 }),
                          new TextRun({ text: 'Supervisión y Control de Operaciones\n', bold: true, font: 'Calibri', size: 18 }),
                          new TextRun({ text: 'Vo.Bo. de Asistencia Oficial', color: '64748B', font: 'Calibri', size: 16 })
                        ]
                      })
                    ]
                  }),
                ]
              })
            ]
          })
        ]
      }
    ]
  });

  return await Packer.toBlob(doc);
}

export function downloadWordFile(blob: Blob, filename = 'bitacora_asistencia_honduras.docx') {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
