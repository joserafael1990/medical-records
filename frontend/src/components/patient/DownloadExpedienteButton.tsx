/**
 * "Descargar expediente (PDF)" button — fetches the aggregated
 * expediente from the backend and hands it to the client-side
 * jsPDF generator.
 */

import React, { useCallback, useState } from 'react';
import { Button, CircularProgress, Snackbar, Alert } from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import { apiService } from '../../services/ApiService';
import { ExpedienteCompletoGenerator } from '../../services/pdf/generators/ExpedienteCompletoGenerator';
import { selectBestOfficeForPDF } from '../../services/pdf/utils';
import type { DoctorInfo, OfficeInfo } from '../../types/pdf';
import { logger } from '../../utils/logger';

interface DownloadExpedienteButtonProps {
  patientId: number;
  patientName: string;
  doctorProfile: any;
}

export const DownloadExpedienteButton: React.FC<DownloadExpedienteButtonProps> = ({
  patientId,
  patientName,
  doctorProfile,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await apiService.expediente.getFullExpediente(patientId);

      // Resolve office for header (best-effort; the generator tolerates a
      // missing office).
      let office: OfficeInfo | null = null;
      try {
        const offices = doctorProfile?.offices && doctorProfile.offices.length > 0
          ? doctorProfile.offices
          : await apiService.offices.getOffices();
        if (offices && offices.length > 0) {
          office = selectBestOfficeForPDF(offices);
        }
      } catch (officeErr) {
        logger.warn('Could not load offices for expediente PDF', officeErr, 'ui');
      }

      const doctorInfo: DoctorInfo = {
        id: doctorProfile?.id || 0,
        name: doctorProfile?.name || 'Médico',
        title: doctorProfile?.title || 'Dr.',
        specialty: doctorProfile?.specialty_name || '',
        license: doctorProfile?.professional_license || '',
        university: doctorProfile?.university || '',
        phone: doctorProfile?.office_phone || doctorProfile?.phone || '',
        email: doctorProfile?.email || '',
        avatarType: doctorProfile?.avatar_type || doctorProfile?.avatar?.avatar_type || 'initials',
        avatarUrl: doctorProfile?.avatar_url || doctorProfile?.avatar?.avatar_url,
        avatarTemplateKey: doctorProfile?.avatar_template_key || doctorProfile?.avatar?.avatar_template_key,
        avatarFilePath: doctorProfile?.avatar_file_path || doctorProfile?.avatar?.avatar_file_path,
        avatar: doctorProfile?.avatar,
      };

      const generator = new ExpedienteCompletoGenerator();
      await generator.generate(payload, doctorInfo, office || undefined);
    } catch (err: any) {
      logger.error('Failed to generate expediente PDF', err, 'ui');
      const status = err?.response?.status;
      if (status === 404) setError('No se encontró al paciente.');
      else if (status === 403) setError('No tienes autorización sobre este paciente.');
      else setError('No pudimos generar el PDF. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [patientId, doctorProfile]);

  return (
    <>
      <Button
        variant="outlined"
        color="primary"
        startIcon={loading ? <CircularProgress size={16} /> : <DownloadIcon />}
        onClick={handleClick}
        disabled={loading}
        size="medium"
        fullWidth
        aria-label={`Descargar expediente de ${patientName}`}
      >
        {loading ? 'Generando expediente…' : 'Descargar expediente (PDF)'}
      </Button>
      <Snackbar
        open={Boolean(error)}
        autoHideDuration={5000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </>
  );
};

export default DownloadExpedienteButton;
