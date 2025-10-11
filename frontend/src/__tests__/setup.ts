// ============================================================================
// TEST SETUP - Configuración global para tests
// ============================================================================

import '@testing-library/jest-dom';

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  root = null;
  rootMargin = '';
  thresholds = [];
  
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords() { return []; }
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
global.localStorage = localStorageMock as any;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
global.sessionStorage = sessionStorageMock as any;

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to ignore specific console methods
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Global test utilities
export const createMockPatient = (overrides = {}) => ({
  id: 'PAT001',
  first_name: 'Juan',
  paternal_surname: 'Pérez',
  maternal_surname: 'García',
  full_name: 'Juan Pérez García',
  date_of_birth: '1990-01-01',
  age: 34,
  gender: 'Masculino',
  phone: '5551234567',
  email: 'juan@example.com',
  address: 'Calle Principal 123',
  family_history: 'Sin antecedentes',
  personal_pathological_history: 'Ninguno',
  personal_non_pathological_history: 'Ninguno',
  created_at: '2024-01-01T00:00:00Z',
  total_visits: 1,
  status: 'active' as const,
  ...overrides
});

export const createMockConsultation = (overrides = {}) => ({
  id: 'CONS001',
  patient_id: 'PAT001',
  patient_name: 'Juan Pérez García',
  date: '2024-01-01T10:00:00Z',
  chief_complaint: 'Dolor de cabeza',
  history_present_illness: 'Dolor de 2 días de evolución',
  physical_examination: 'Paciente consciente y orientado',
  primary_diagnosis: 'Cefalea tensional',
  treatment_plan: 'Paracetamol 500mg cada 8 horas',
  follow_up_instructions: 'Regresar en 1 semana',
  doctor_name: 'Dr. García Martínez',
  doctor_professional_license: '1234567',
  created_by: 'Dr. García Martínez',
  created_at: '2024-01-01T10:00:00Z',
  ...overrides
});

export const createMockAppointment = (overrides = {}) => ({
  id: 'APT001',
  patient_id: 'PAT001',
  patient_name: 'Juan Pérez García',
  date_time: '2024-01-01T10:00:00Z',
  appointment_type: 'consultation' as const,
  reason: 'Consulta de rutina',
  status: 'confirmed' as const,
  created_at: '2024-01-01T09:00:00Z',
  updated_at: '2024-01-01T09:00:00Z',
  ...overrides
});
