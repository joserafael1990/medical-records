export const formatDate = (date: string | Date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('es-MX');
};

export const formatDateTime = (date: string | Date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Mexico_City'
  });
};

export const formatDateTimeShort = (date: string | Date) => {
  if (!date) return '';
  const d = new Date(date);
  // Format the date in CDMX timezone
  return d.toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Mexico_City'
  });
};


export const calculateAge = (birthDate: string | Date) => {
  if (!birthDate) return 0;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};

export const isValidDate = (date: any) => {
  return date instanceof Date && !isNaN(date.getTime());
};

export default {
  formatDate,
  formatDateTime,
  formatDateTimeShort,
  calculateAge,
  isValidDate
};

