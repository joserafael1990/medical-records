/**
 * Small visual indicator that a patient was created with minimal data
 * and still needs to be completed before a signed consultation can be
 * generated. Tooltip lists which fields are missing so the doctor can
 * act without guessing.
 */

import React from 'react';
import { Chip, Tooltip } from '@mui/material';
import { ReportProblemOutlined as WarnIcon } from '@mui/icons-material';
import type { Patient } from '../../types';
import { missingPatientFields } from '../../utils/patientProfileCompleteness';

interface IncompleteProfileChipProps {
  patient: Patient | null | undefined;
  /** Clickable — opens the PatientDialog in edit mode. Optional. */
  onClick?: () => void;
  size?: 'small' | 'medium';
}

export const IncompleteProfileChip: React.FC<IncompleteProfileChipProps> = ({
  patient,
  onClick,
  size = 'small',
}) => {
  const missing = missingPatientFields(patient);
  if (missing.length === 0) return null;

  const labels = missing.map((m) => m.label).join(', ');
  return (
    <Tooltip title={`Faltan: ${labels}`} arrow>
      <Chip
        size={size}
        color="warning"
        variant="outlined"
        icon={<WarnIcon />}
        label="Datos incompletos"
        onClick={onClick}
        clickable={Boolean(onClick)}
      />
    </Tooltip>
  );
};

export default IncompleteProfileChip;
