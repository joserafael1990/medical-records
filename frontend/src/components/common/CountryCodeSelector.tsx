import React from 'react';
import {
  Autocomplete,
  TextField,
  Box,
  ListItemText,
  MenuItem
} from '@mui/material';
import { COUNTRY_CODES, CountryCode } from '../../utils/countryCodes';

interface CountryCodeSelectorProps {
  value: string; // Código de país (ej: "+52")
  onChange: (countryCode: string) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  label?: string;
}

export const CountryCodeSelector: React.FC<CountryCodeSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  error = false,
  helperText,
  label = 'Código de país'
}) => {
  const selectedCountry = COUNTRY_CODES.find(c => c.code === value) || COUNTRY_CODES[0];

  return (
    <Autocomplete
      value={selectedCountry}
      onChange={(event, newValue: CountryCode | null) => {
        if (newValue) {
          onChange(newValue.code);
        }
      }}
      options={COUNTRY_CODES}
      getOptionLabel={(option) => `${option.flag} ${option.name} (${option.code})`}
      disabled={disabled}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          error={error}
          helperText={helperText}
          size="small"
          inputProps={{
            ...params.inputProps,
            style: { textAlign: 'left' }
          }}
        />
      )}
      renderOption={(props, option) => (
        <MenuItem {...props} key={`${option.code}-${option.countryCode}`}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <Box sx={{ fontSize: '1.5rem', lineHeight: 1 }}>{option.flag}</Box>
            <ListItemText 
              primary={option.name}
              secondary={option.code}
              primaryTypographyProps={{ style: { fontWeight: 500 } }}
            />
          </Box>
        </MenuItem>
      )}
      ListboxProps={{
        style: { maxHeight: 300 }
      }}
      componentsProps={{
        popper: {
          style: { zIndex: 13000 }
        }
      }}
      sx={{
        width: '100%',
        '& .MuiAutocomplete-popper': {
          zIndex: 13000
        }
      }}
    />
  );
};

