export const formatDate = (date: string | Date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('es-MX');
};

export const formatDateTime = (date: string | Date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString('es-MX');
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
  calculateAge,
  isValidDate
};

