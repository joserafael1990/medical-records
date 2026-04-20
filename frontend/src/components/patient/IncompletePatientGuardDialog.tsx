/**
 * NOM-004 safety net: intercept a "Nueva Consulta" attempt for a patient
 * whose profile is missing mandatory fields (CURP, birth_date, gender).
 *
 * The doctor can't sign a compliant expediente without them, so rather
 * than let them fill the consulta and hit a failure later, we stop
 * them here with a one-click path to the patient edit dialog.
 */

import React from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import {
  CheckCircleOutline as BulletIcon,
  PersonSearch as EditPatientIcon,
} from '@mui/icons-material';
import type { Patient } from '../../types';
import { missingPatientFields } from '../../utils/patientProfileCompleteness';

interface IncompletePatientGuardDialogProps {
  open: boolean;
  patient: Patient | null | undefined;
  onClose: () => void;
  onCompleteNow: () => void;
}

export const IncompletePatientGuardDialog: React.FC<IncompletePatientGuardDialogProps> = ({
  open,
  patient,
  onClose,
  onCompleteNow,
}) => {
  const missing = missingPatientFields(patient);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Antes de firmar la consulta</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          NOM-004-SSA3-2012 requiere que el expediente clínico incluya CURP,
          fecha de nacimiento y género del paciente. No podemos generar una
          consulta firmada sin esos datos.
        </Alert>
        <Typography variant="body2" sx={{ mb: 1 }}>
          Faltan los siguientes campos de{' '}
          <strong>{patient?.name || 'este paciente'}</strong>:
        </Typography>
        <List dense>
          {missing.map((f) => (
            <ListItem key={f.key}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <BulletIcon color="warning" fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={f.label} />
            </ListItem>
          ))}
        </List>
        <Typography variant="caption" color="text.secondary">
          Puedes completarlos ahora (1-2 min) y volver a la consulta, o
          cancelar y regresar más tarde.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          startIcon={<EditPatientIcon />}
          onClick={onCompleteNow}
        >
          Completar datos ahora
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default IncompletePatientGuardDialog;
