// Lista de países con códigos telefónicos y emojis de banderas
export interface CountryCode {
  code: string; // Código telefónico (ej: "+52")
  name: string; // Nombre del país
  flag: string; // Emoji de bandera
  countryCode: string; // Código ISO de 2 letras para emoji
}

// Función para obtener emoji de bandera desde código de país ISO
const getFlagEmoji = (countryCode: string): string => {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

// Lista de países más comunes con códigos telefónicos
export const COUNTRY_CODES: CountryCode[] = [
  { code: '+52', name: 'México', flag: getFlagEmoji('MX'), countryCode: 'MX' },
  { code: '+1', name: 'Estados Unidos', flag: getFlagEmoji('US'), countryCode: 'US' },
  { code: '+1', name: 'Canadá', flag: getFlagEmoji('CA'), countryCode: 'CA' },
  { code: '+34', name: 'España', flag: getFlagEmoji('ES'), countryCode: 'ES' },
  { code: '+54', name: 'Argentina', flag: getFlagEmoji('AR'), countryCode: 'AR' },
  { code: '+57', name: 'Colombia', flag: getFlagEmoji('CO'), countryCode: 'CO' },
  { code: '+56', name: 'Chile', flag: getFlagEmoji('CL'), countryCode: 'CL' },
  { code: '+51', name: 'Perú', flag: getFlagEmoji('PE'), countryCode: 'PE' },
  { code: '+55', name: 'Brasil', flag: getFlagEmoji('BR'), countryCode: 'BR' },
  { code: '+58', name: 'Venezuela', flag: getFlagEmoji('VE'), countryCode: 'VE' },
  { code: '+593', name: 'Ecuador', flag: getFlagEmoji('EC'), countryCode: 'EC' },
  { code: '+598', name: 'Uruguay', flag: getFlagEmoji('UY'), countryCode: 'UY' },
  { code: '+595', name: 'Paraguay', flag: getFlagEmoji('PY'), countryCode: 'PY' },
  { code: '+591', name: 'Bolivia', flag: getFlagEmoji('BO'), countryCode: 'BO' },
  { code: '+502', name: 'Guatemala', flag: getFlagEmoji('GT'), countryCode: 'GT' },
  { code: '+504', name: 'Honduras', flag: getFlagEmoji('HN'), countryCode: 'HN' },
  { code: '+503', name: 'El Salvador', flag: getFlagEmoji('SV'), countryCode: 'SV' },
  { code: '+505', name: 'Nicaragua', flag: getFlagEmoji('NI'), countryCode: 'NI' },
  { code: '+506', name: 'Costa Rica', flag: getFlagEmoji('CR'), countryCode: 'CR' },
  { code: '+507', name: 'Panamá', flag: getFlagEmoji('PA'), countryCode: 'PA' },
  { code: '+53', name: 'Cuba', flag: getFlagEmoji('CU'), countryCode: 'CU' },
  { code: '+1', name: 'República Dominicana', flag: getFlagEmoji('DO'), countryCode: 'DO' },
  { code: '+509', name: 'Haití', flag: getFlagEmoji('HT'), countryCode: 'HT' },
  { code: '+1', name: 'Jamaica', flag: getFlagEmoji('JM'), countryCode: 'JM' },
  { code: '+33', name: 'Francia', flag: getFlagEmoji('FR'), countryCode: 'FR' },
  { code: '+49', name: 'Alemania', flag: getFlagEmoji('DE'), countryCode: 'DE' },
  { code: '+39', name: 'Italia', flag: getFlagEmoji('IT'), countryCode: 'IT' },
  { code: '+44', name: 'Reino Unido', flag: getFlagEmoji('GB'), countryCode: 'GB' },
  { code: '+81', name: 'Japón', flag: getFlagEmoji('JP'), countryCode: 'JP' },
  { code: '+86', name: 'China', flag: getFlagEmoji('CN'), countryCode: 'CN' },
  { code: '+91', name: 'India', flag: getFlagEmoji('IN'), countryCode: 'IN' },
  { code: '+61', name: 'Australia', flag: getFlagEmoji('AU'), countryCode: 'AU' },
  { code: '+7', name: 'Rusia', flag: getFlagEmoji('RU'), countryCode: 'RU' },
  { code: '+82', name: 'Corea del Sur', flag: getFlagEmoji('KR'), countryCode: 'KR' },
  { code: '+65', name: 'Singapur', flag: getFlagEmoji('SG'), countryCode: 'SG' },
  { code: '+971', name: 'Emiratos Árabes Unidos', flag: getFlagEmoji('AE'), countryCode: 'AE' },
  { code: '+1', name: 'Puerto Rico', flag: getFlagEmoji('PR'), countryCode: 'PR' },
].sort((a, b) => a.name.localeCompare(b.name));

// Función para extraer código de país de un número telefónico completo
export const extractCountryCode = (phoneNumber: string): { countryCode: string; number: string } => {
  if (!phoneNumber) {
    return { countryCode: '+52', number: '' }; // Default México
  }

  // Buscar el código de país más largo que coincida al inicio
  const sortedCodes = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
  
  for (const country of sortedCodes) {
    if (phoneNumber.startsWith(country.code)) {
      return {
        countryCode: country.code,
        number: phoneNumber.substring(country.code.length).trim()
      };
    }
  }

  // Si no se encuentra, asumir que es México por defecto
  return { countryCode: '+52', number: phoneNumber };
};

// Función para obtener información del país por código
export const getCountryByCode = (code: string): CountryCode | undefined => {
  return COUNTRY_CODES.find(c => c.code === code);
};

