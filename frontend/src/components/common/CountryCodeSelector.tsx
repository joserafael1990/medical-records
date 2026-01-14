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
          placeholder={label}
          error={error}
          helperText={helperText}
          margin="none"
          inputProps={{
            ...params.inputProps,
            style: { textAlign: 'left' }
          }}
        />
      )}
      renderOption={(props, option) => {
        const { key, ...otherProps } = props;
        return (
          <MenuItem key={`${option.code}-${option.countryCode}`} {...otherProps}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <Box sx={{ fontSize: '1.5rem', lineHeight: 1 }}>{option.flag}</Box>
              <ListItemText 
                primary={option.name}
                secondary={option.code}
                primaryTypographyProps={{ style: { fontWeight: 500 } }}
              />
            </Box>
          </MenuItem>
        );
      }}
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
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        '& .MuiAutocomplete-root': {
          width: '100%',
          flex: 1,
          display: 'flex',
          flexDirection: 'column'
        },
        '& .MuiFormControl-root': {
          width: '100%',
          margin: 0,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          '& .MuiOutlinedInput-root': {
            marginTop: 0
          }
        },
        '& .MuiTextField-root': {
          margin: 0,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          '& .MuiInputBase-root': {
            marginTop: 0
          }
        },
        '& .MuiAutocomplete-inputRoot': {
          height: '56px !important',
          minHeight: '56px !important',
          maxHeight: '56px !important',
          alignItems: 'center',
          margin: 0,
          marginTop: '0 !important'
        },
        '& .MuiAutocomplete-input': {
          padding: '16.5px 14px !important',
          paddingRight: '42px !important'
        },
        '& .MuiAutocomplete-endAdornment': {
          position: 'absolute',
          right: '14px',
          top: '50%',
          transform: 'translateY(-50%)'
        },
        '& .MuiFormHelperText-root': {
          margin: '3px 14px 0',
          lineHeight: '1.66',
          minHeight: '1.66em'
        },
        '& .MuiAutocomplete-popper': {
          zIndex: 13000
        }
      }}
    />
  );
};

