export type LicenseType = 'trial' | 'basic' | 'premium';
export type LicenseStatus = 'active' | 'inactive' | 'expired' | 'suspended';

export interface License {
  id: number;
  doctor_id: number;
  license_type: LicenseType;
  start_date: string;
  expiration_date: string;
  payment_date: string | null;
  status: LicenseStatus;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: number | null;
  doctor?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface LicenseCreate {
  doctor_id: number;
  license_type: LicenseType;
  start_date: string;
  expiration_date: string;
  payment_date?: string | null;
  status?: LicenseStatus;
  is_active?: boolean;
  notes?: string | null;
}

export interface LicenseUpdate {
  license_type?: LicenseType;
  start_date?: string;
  expiration_date?: string;
  payment_date?: string | null;
  status?: LicenseStatus;
  is_active?: boolean;
  notes?: string | null;
}








