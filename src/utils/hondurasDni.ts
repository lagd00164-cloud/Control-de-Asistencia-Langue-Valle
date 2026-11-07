export const HONDURAS_DEPARTMENTS: Record<string, string> = {
  '01': 'Atlántida (La Ceiba)',
  '02': 'Colón (Trujillo)',
  '03': 'Comayagua',
  '04': 'Copán (Santa Rosa)',
  '05': 'Cortés (San Pedro Sula)',
  '06': 'Choluteca',
  '07': 'El Paraíso (Yuscarán)',
  '08': 'Francisco Morazán (Tegucigalpa)',
  '09': 'Gracias a Dios (Puerto Lempira)',
  '10': 'Intibucá (La Esperanza)',
  '11': 'Islas de la Bahía (Roatán)',
  '12': 'La Paz',
  '13': 'Lempira (Gracias)',
  '14': 'Ocotepeque',
  '15': 'Olancho (Juticalpa)',
  '16': 'Santa Bárbara',
  '17': 'Valle (Nacaome)',
  '18': 'Yoro'
};

/**
 * Mapeo de Códigos de Municipio de Honduras (4 dígitos).
 * El código 1707 pertenece a Langue, departamento de Valle.
 */
export const HONDURAS_MUNICIPALITIES: Record<string, string> = {
  // Departamento de Valle (17)
  '1701': 'Nacaome, Valle (Cabecera)',
  '1702': 'Alianza, Valle',
  '1703': 'Amapala, Valle',
  '1704': 'Aramecina, Valle',
  '1705': 'Caridad, Valle',
  '1706': 'Goascorán, Valle',
  '1707': 'Langue, Valle', // Requerimiento específico
  '1708': 'San Francisco de Coray, Valle',
  '1709': 'San Lorenzo, Valle',

  // Francisco Morazán (08)
  '0801': 'Distrito Central (Tegucigalpa / M.D.C.), Fco. Morazán',
  '0802': 'Alubarén, Fco. Morazán',
  '0803': 'Cedros, Fco. Morazán',
  '0804': 'Curarén, Fco. Morazán',
  '0805': 'El Porvenir, Fco. Morazán',
  '0806': 'Guaimaca, Fco. Morazán',
  '0813': 'Ojojona, Fco. Morazán',
  '0820': 'Santa Lucía, Fco. Morazán',
  '0821': 'Talanga, Fco. Morazán',
  '0823': 'Valle de Ángeles, Fco. Morazán',
  '0824': 'Villa de San Francisco, Fco. Morazán',
  '0826': 'Sabanagrande, Fco. Morazán',

  // Cortés (05)
  '0501': 'San Pedro Sula, Cortés',
  '0502': 'Choloma, Cortés',
  '0503': 'Omoa, Cortés',
  '0506': 'Puerto Cortés, Cortés',
  '0511': 'Villanueva, Cortés',
  '0512': 'La Lima, Cortés',

  // Choluteca (06)
  '0601': 'Choluteca, Choluteca',
  '0606': 'Marcovia, Choluteca',
  '0611': 'Pespire, Choluteca',

  // Atlántida (01)
  '0101': 'La Ceiba, Atlántida',
  '0107': 'Tela, Atlántida',

  // Comayagua (03)
  '0301': 'Comayagua, Comayagua',
  '0319': 'Siguatepeque, Comayagua',

  // El Paraíso (07)
  '0701': 'Yuscarán, El Paraíso',
  '0703': 'Danlí, El Paraíso',
  '0704': 'El Paraíso, El Paraíso',

  // Copán (04)
  '0401': 'Santa Rosa de Copán, Copán',
  '0404': 'Copán Ruinas, Copán',

  // Colón (02)
  '0201': 'Trujillo, Colón',
  '0207': 'Tocoa, Colón',

  // Yoro (18)
  '1801': 'Yoro, Yoro',
  '1804': 'El Progreso, Yoro',
  '1807': 'Olanchito, Yoro',

  // Olancho (15)
  '1501': 'Juticalpa, Olancho',
  '1503': 'Catacamas, Olancho',

  // Santa Bárbara (16)
  '1601': 'Santa Bárbara, Santa Bárbara',

  // Lempira (13)
  '1301': 'Gracias, Lempira',

  // Intibucá (10)
  '1001': 'La Esperanza, Intibucá',

  // La Paz (12)
  '1201': 'La Paz, La Paz',

  // Ocotepeque (14)
  '1401': 'Ocotepeque, Ocotepeque',

  // Islas de la Bahía (11)
  '1101': 'Roatán, Islas de la Bahía',

  // Gracias a Dios (09)
  '0901': 'Puerto Lempira, Gracias a Dios'
};

/**
 * Valida que el número de identidad de Honduras tenga exactamente 13 dígitos numéricos.
 */
export function validateHonduranDni(dni: string): boolean {
  if (!dni) return false;
  const digits = dni.replace(/\D/g, '');
  return digits.length === 13;
}

/**
 * Formatea un DNI en formato estándar de Honduras: 0801-1990-12345 o 1707-1995-12345
 */
export function formatHonduranDni(dni: string): string {
  const digits = (dni || '').replace(/\D/g, '').slice(0, 13);
  if (digits.length <= 4) return digits;
  if (digits.length <= 8) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 13)}`;
}

/**
 * Limpia el DNI dejando solo los 13 dígitos
 */
export function cleanDni(dni: string): string {
  return (dni || '').replace(/\D/g, '').slice(0, 13);
}

/**
 * Obtiene el municipio y departamento de emisión en base a los primeros 4 o 2 dígitos.
 * El área 1707 pertenece a Langue, departamento de Valle.
 */
export function getDniDepartment(dni: string): string {
  const clean = cleanDni(dni);
  if (clean.length >= 4) {
    const code4 = clean.slice(0, 4);
    if (HONDURAS_MUNICIPALITIES[code4]) {
      return HONDURAS_MUNICIPALITIES[code4];
    }
  }
  if (clean.length >= 2) {
    const code2 = clean.slice(0, 2);
    if (HONDURAS_DEPARTMENTS[code2]) {
      return HONDURAS_DEPARTMENTS[code2];
    }
  }
  return '';
}
