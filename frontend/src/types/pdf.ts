export interface PatientInfo {
    id: number;
    name: string;
    title?: string;
    dateOfBirth?: string;
    gender?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    height?: string;
    weight?: string;
    temperature?: string;
    heartRate?: string;
    respiratoryRate?: string;
    bmi?: string;
    identificationType?: string;
    identificationValue?: string;
}

export interface DoctorInfo {
    id: number;
    name: string;
    title?: string;
    specialty?: string;
    license?: string;
    university?: string;
    phone?: string;
    email?: string;
    onlineConsultationUrl?: string;
    offices?: OfficeInfo[];
    avatarType?: 'initials' | 'preloaded' | 'custom';
    avatarTemplateKey?: string | null;
    avatarFilePath?: string | null;
    avatarUrl?: string;
    avatar_url?: string;
    avatar?: {
        type?: 'initials' | 'preloaded' | 'custom';
        templateKey?: string | null;
        filePath?: string | null;
        url?: string;
        avatar_url?: string;
    };
}

export interface OfficeInfo {
    id: number;
    name: string;
    address?: string;
    city?: string;
    state?: string;
    state_name?: string;
    country?: string;
    country_name?: string;
    phone?: string;
    mapsUrl?: string;
    is_virtual?: boolean;
    virtual_url?: string;
    maps_url?: string; // Added for compatibility
}

export interface MedicationInfo {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
    quantity?: number;
    via_administracion?: string;
}

export interface StudyInfo {
    name: string;
    type: string;
    category?: string;
    description?: string;
    instructions?: string;
    urgency?: string;
}

export interface ConsultationInfo {
    id: number;
    date: string;
    time?: string;
    type?: string;
    reason?: string;
    diagnosis?: string;
    prescribed_medications?: string;
    notes?: string;
    treatment_plan?: string;
    folio?: string;
    folioNumber?: number;
    folioCreatedAt?: string | null;
    nextAppointmentDate?: string | null;
    patient_document_id?: number | null;
    patient_document_value?: string;
    patient_document_name?: string;
}

export interface CertificateInfo {
    content: string;
    title?: string;
}
