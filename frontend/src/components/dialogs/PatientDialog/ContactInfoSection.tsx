import React from 'react';
import {
  Box,
  TextField,
  Grid,
  Typography
} from '@mui/material';
import {
  Phone as PhoneIcon,
  Email as EmailIcon
} from '@mui/icons-material';

interface ContactInfoSectionProps {
  formData: {
    email: string;
    primary_phone: string;
    home_address: string;
    address_city: string;
    address_postal_code: string;
  };
  onInputChange: (field: string, value: any) => void;
  errors: Record<string, string>;
}

export const ContactInfoSection: React.FC<ContactInfoSectionProps> = ({
  formData,
  onInputChange,
  errors
}) => {
  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <PhoneIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6" component="h3">
          Información de Contacto
        </Typography>
      </Box>
      
      <Grid container spacing={2}>
        {/* Email */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Correo Electrónico"
            type="email"
            value={formData.email}
            onChange={(e) => onInputChange('email', e.target.value)}
            error={!!errors.email}
            helperText={errors.email}
            fullWidth
            required
          />
        </Grid>
        
        {/* Primary Phone */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Teléfono Principal"
            type="tel"
            value={formData.primary_phone}
            onChange={(e) => onInputChange('primary_phone', e.target.value)}
            error={!!errors.primary_phone}
            helperText={errors.primary_phone}
            fullWidth
            required
            placeholder="+52 55 1234 5678"
          />
        </Grid>
        
        {/* Home Address */}
        <Grid item xs={12}>
          <TextField
            label="Dirección"
            value={formData.home_address}
            onChange={(e) => onInputChange('home_address', e.target.value)}
            error={!!errors.home_address}
            helperText={errors.home_address}
            fullWidth
            multiline
            rows={2}
            placeholder="Calle, número, colonia, delegación/municipio"
          />
        </Grid>
        
        {/* City */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Ciudad"
            value={formData.address_city}
            onChange={(e) => onInputChange('address_city', e.target.value)}
            error={!!errors.address_city}
            helperText={errors.address_city}
            fullWidth
          />
        </Grid>
        
        {/* Postal Code */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Código Postal"
            value={formData.address_postal_code}
            onChange={(e) => onInputChange('address_postal_code', e.target.value)}
            error={!!errors.address_postal_code}
            helperText={errors.address_postal_code}
            fullWidth
            inputProps={{ maxLength: 5 }}
          />
        </Grid>
      </Grid>
    </Box>
  );
};
