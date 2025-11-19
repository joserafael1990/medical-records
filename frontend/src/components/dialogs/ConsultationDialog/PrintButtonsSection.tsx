import React, { useMemo } from 'react';
import {
  Box
} from '@mui/material';
import { PrintButtons } from '../../common/PrintButtons';
import type { ConsultationVitalSign } from '../../../types';

interface PrintButtonsSectionProps {
  // Show condition
  show: boolean;

  // Patient data
  selectedPatient: any;

  // Doctor data
  doctorProfile: any;
  appointmentOffice: any;

  // Consultation data
  consultation: any;
  consultationId: number | null;
  formData: {
    date: string;
    chief_complaint: string;
    primary_diagnosis: string;
    treatment_plan: string;
  };
  nextAppointmentDate?: string | null;
  personalDocument?: { document_id: number | null; document_value: string };
  
  // Prescriptions
  prescriptions: any[];
  
  // Clinical studies
  studies: any[];

  // Vital signs
  vitalSigns: ConsultationVitalSign[];
}

export const PrintButtonsSection: React.FC<PrintButtonsSectionProps> = ({
  show,
  selectedPatient,
  doctorProfile,
  appointmentOffice,
  consultation,
  consultationId,
  formData,
  personalDocument,
  prescriptions,
  studies,
  vitalSigns,
  nextAppointmentDate
}) => {
  if (!show) {
    return null;
  }

  // Debug: Log the data to see what we're receiving

  const vitalSignsSummary = useMemo(() => {
    const normalize = (value: string) =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

    const findSign = (keywords: string[]) => {
      if (!vitalSigns || vitalSigns.length === 0) {
        return undefined;
      }

      return vitalSigns.find(sign => {
        const name = normalize(sign.vital_sign_name || '');
        return keywords.some(keyword => name.includes(keyword));
      });
    };

    const formatValue = (sign?: ConsultationVitalSign) => {
      if (!sign) return '';
      const value = (sign.value || '').trim();
      if (!value) return '';
      const unit = (sign.unit || '').trim();
      return unit ? `${value} ${unit}` : value;
    };

    const parseNumber = (sign?: ConsultationVitalSign) => {
      if (!sign) return undefined;
      const raw = sign.value?.replace(',', '.');
      const numeric = raw ? parseFloat(raw) : NaN;
      return Number.isFinite(numeric) ? numeric : undefined;
    };

    const heightSign = findSign(['estatura', 'altura', 'talla']);
    const weightSign = findSign(['peso']);
    const temperatureSign = findSign(['temperatura']);
    const heartRateSign = findSign(['frecuencia cardiaca', 'frecuencia cardiaca', 'frecuencia card', 'fc', 'cardiaca']);
    const respiratoryRateSign = findSign(['frecuencia respiratoria', 'fr', 'respiratoria', 'respiracion']);
    const bmiSign = findSign(['imc', 'indice de masa corporal', 'bmi']);

    const heightValue = parseNumber(heightSign);
    const weightValue = parseNumber(weightSign);

    let bmiValue: string = formatValue(bmiSign);
    if (bmiValue && bmiSign && (!bmiSign.unit || bmiSign.unit.trim() === '')) {
      bmiValue = `${bmiValue} kg/m²`;
    }
    if (!bmiValue && heightValue && weightValue) {
      const heightInMeters = heightValue > 3 ? heightValue / 100 : heightValue;
      if (heightInMeters > 0) {
        const calculatedBMI = Math.round((weightValue / (heightInMeters * heightInMeters)) * 10) / 10;
        if (Number.isFinite(calculatedBMI)) {
          bmiValue = `${calculatedBMI.toFixed(1)} kg/m²`;
        }
      }
    }

    return {
      height: formatValue(heightSign),
      weight: formatValue(weightSign),
      temperature: formatValue(temperatureSign),
      heartRate: formatValue(heartRateSign),
      respiratoryRate: formatValue(respiratoryRateSign),
      bmi: bmiValue
    };
  }, [vitalSigns]);

  const consultationForPrint = useMemo(() => {
    const resolvedId = consultation?.id || consultationId || 0;
    return {
      ...consultation,
      id: resolvedId,
    };
  }, [consultation, consultationId]);

  const identificationInfo = useMemo(() => {
    const docId =
      personalDocument?.document_id ??
      consultation?.patient_document_id ??
      null;
    const rawValue =
      personalDocument?.document_value ??
      consultation?.patient_document_value ??
      '';
    const value = rawValue ? rawValue.trim() : '';

    let name: string | undefined = personalDocument?.document_name;

    if (docId && selectedPatient?.personal_documents && Array.isArray(selectedPatient.personal_documents)) {
      const matchingDoc = selectedPatient.personal_documents.find((doc: any) => doc.document_id === docId);
      name = matchingDoc?.document_name || matchingDoc?.document?.name;
    }

    if (!name) {
      name = consultation?.patient_document_name || undefined;
    }
    if (!name && docId) {
      name = `Documento oficial ${docId}`;
    }

    return {
      id: docId,
      value,
      name
    };
  }, [personalDocument, consultation?.patient_document_id, consultation?.patient_document_value, consultation?.patient_document_name, selectedPatient?.personal_documents]);

  // Build patient name from available fields
  const patientName = useMemo(() => {
    // Debug: Log consultation data
    console.log('🔍 Debug consultation data:', {
      consultation,
      patient_name: consultation?.patient_name,
      patient_id: consultation?.patient_id
    });

    // Priority 1: Use consultation.patient_name if available (most reliable when editing)
    // This comes from the backend when loading a consultation
    if (consultation?.patient_name && consultation.patient_name.trim() !== '' && consultation.patient_name !== 'Paciente No Identificado') {
      return consultation.patient_name.trim();
    }
    
    // Priority 2: Use selectedPatient.name if available
    if (selectedPatient?.name && selectedPatient.name.trim() !== '' && selectedPatient.name !== 'Paciente') {
      return selectedPatient.name.trim();
    }
    
    // Priority 3: Use selectedPatient.full_name if available
    if (selectedPatient?.full_name && selectedPatient.full_name.trim() !== '' && selectedPatient.full_name !== 'Paciente') {
      return selectedPatient.full_name.trim();
    }
    
    // Priority 4: Build from first_name, paternal_surname, maternal_surname
    const firstName = selectedPatient?.first_name || '';
    const paternalSurname = selectedPatient?.paternal_surname || '';
    const maternalSurname = selectedPatient?.maternal_surname || '';
    const constructedName = [firstName, paternalSurname, maternalSurname]
      .filter(Boolean)
      .join(' ')
      .trim();
    if (constructedName) {
      return constructedName;
    }
    
    // Last resort: fallback to 'Paciente'
    return 'Paciente';
  }, [selectedPatient, consultation?.patient_name]);

  return (
    <Box sx={{ width: '100%' }}>
      <PrintButtons
        patient={{
          id: selectedPatient?.id || 0,
          name: patientName,
          dateOfBirth: selectedPatient?.birth_date || undefined,
          gender: selectedPatient?.gender || undefined,
          phone: selectedPatient?.primary_phone || undefined,
          email: selectedPatient?.email || undefined,
          address: selectedPatient?.address || undefined,
          city: selectedPatient?.city || undefined,
          state: selectedPatient?.state || undefined,
          country: selectedPatient?.country || undefined,
          height: vitalSignsSummary.height,
          weight: vitalSignsSummary.weight,
          temperature: vitalSignsSummary.temperature,
          heartRate: vitalSignsSummary.heartRate,
          respiratoryRate: vitalSignsSummary.respiratoryRate,
          bmi: vitalSignsSummary.bmi,
          identificationType: identificationInfo.name,
          identificationValue: identificationInfo.value
        }}
        doctor={{
          id: doctorProfile?.id || 0,
          name: doctorProfile?.name || 'Médico',
          title: doctorProfile?.title || 'Dr.',
          specialty: doctorProfile?.specialty_name || '',
          license: doctorProfile?.professional_license || '',
          university: doctorProfile?.university || '',
          phone: appointmentOffice?.phone || doctorProfile?.phone || '',
          email: doctorProfile?.email || '',
          avatarType: doctorProfile?.avatar_type || doctorProfile?.avatar?.avatar_type || 'initials',
          avatarTemplateKey: doctorProfile?.avatar_template_key ?? doctorProfile?.avatar?.avatar_template_key ?? null,
          avatarFilePath: doctorProfile?.avatar_file_path ?? doctorProfile?.avatar?.avatar_file_path ?? null,
          avatarUrl: doctorProfile?.avatar?.url || doctorProfile?.avatar?.avatar_url || doctorProfile?.avatar_url || undefined,
          avatar: doctorProfile?.avatar ? {
            type: doctorProfile.avatar.avatar_type || doctorProfile.avatar_type || 'initials',
            templateKey: doctorProfile.avatar.avatar_template_key ?? doctorProfile.avatar_template_key ?? null,
            filePath: doctorProfile.avatar.avatar_file_path ?? doctorProfile.avatar_file_path ?? null,
            url: doctorProfile.avatar.url || doctorProfile.avatar.avatar_url || doctorProfile.avatar_url || undefined,
            avatar_url: doctorProfile.avatar.avatar_url || doctorProfile.avatar.url || doctorProfile.avatar_url || undefined
          } : (doctorProfile?.avatar_type || doctorProfile?.avatar_url ? {
            type: doctorProfile.avatar_type || 'initials',
            templateKey: doctorProfile.avatar_template_key ?? null,
            filePath: doctorProfile.avatar_file_path ?? null,
            url: doctorProfile.avatar_url || undefined,
            avatar_url: doctorProfile.avatar_url || undefined
          } : undefined),
          offices: appointmentOffice ? [{
            id: appointmentOffice.id,
            name: appointmentOffice.name,
            address: appointmentOffice.address,
            city: appointmentOffice.city,
            state: appointmentOffice.state_name,
            country: appointmentOffice.country_name,
            phone: appointmentOffice.phone,
            maps_url: appointmentOffice.maps_url,
            virtual_url: appointmentOffice.virtual_url,
            is_active: appointmentOffice.is_active,
            is_virtual: appointmentOffice.is_virtual,
            timezone: appointmentOffice.timezone
          }] : (doctorProfile?.offices && doctorProfile.offices.length > 0 ? doctorProfile.offices : [])
        }}
        consultation={{
          id: consultationForPrint.id || 0,
          date: consultationForPrint?.date || formData.date,
          time: consultationForPrint?.time || '10:00',
          type: consultationForPrint?.consultation_type || 'Seguimiento',
          reason: consultationForPrint?.chief_complaint || formData.chief_complaint || '',
          diagnosis: (consultationForPrint?.primary_diagnosis && consultationForPrint.primary_diagnosis.trim() !== '') 
            ? consultationForPrint.primary_diagnosis 
            : (formData.primary_diagnosis && formData.primary_diagnosis.trim() !== '') 
              ? formData.primary_diagnosis 
              : 'No especificado',
          notes: consultationForPrint?.notes || '',
          treatment_plan: consultationForPrint?.treatment_plan || formData.treatment_plan || '',
          folio: consultationForPrint?.folio,
          folioNumber: consultationForPrint?.folioNumber,
          folioCreatedAt: consultationForPrint?.folioCreatedAt,
          nextAppointmentDate: nextAppointmentDate || consultationForPrint?.nextAppointmentDate || null,
          patient_document_id: identificationInfo.id,
          patient_document_value: identificationInfo.value,
          patient_document_name: identificationInfo.name
        }}
        medications={(prescriptions || []).map(prescription => ({
          name: prescription.medication_name,
          dosage: prescription.dosage,
          frequency: prescription.frequency,
          duration: prescription.duration,
          instructions: prescription.instructions || '',
          quantity: prescription.quantity || 0,
          via_administracion: prescription.via_administracion || undefined
        }))}
        studies={(studies || []).map(study => ({
          name: study.study_name,
          type: study.study_type,
          category: study.study_type, // Using study_type as category
          description: study.study_name || 'Sin descripción',
          instructions: study.study_name || 'Seguir indicaciones del laboratorio',
          urgency: study.urgency || 'Rutina'
        }))}
        variant="outlined"
        size="small"
        direction="row"
        spacing={1}
        showDivider={true}
      />
    </Box>
  );
};


