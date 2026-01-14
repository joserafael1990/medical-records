import React from 'react';
import {
  Box,
  TextField,
  Autocomplete,
  TextFieldProps,
  ListItemText,
  MenuItem
} from '@mui/material';
import { COUNTRY_CODES, CountryCode } from '../../utils/countryCodes';

interface PhoneNumberInputProps {
  countryCode: string;
  phoneNumber: string;
  onCountryCodeChange: (code: string) => void;
  onPhoneNumberChange: (number: string) => void;
  label?: string;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  fullWidth?: boolean;
}

export const PhoneNumberInput: React.FC<PhoneNumberInputProps> = ({
  countryCode,
  phoneNumber,
  onCountryCodeChange,
  onPhoneNumberChange,
  label = 'Número telefónico',
  error = false,
  helperText,
  disabled = false,
  required = false,
  placeholder = 'Ej: 222 123 4567',
  fullWidth = true
}) => {
  const selectedCountry = COUNTRY_CODES.find(c => c.code === countryCode) || COUNTRY_CODES[0];

  return (
    <Box sx={{ width: fullWidth ? '100%' : 'auto' }}>
      <TextField
        fullWidth={fullWidth}
        label={label}
        value={phoneNumber}
        onChange={(e) => {
          // Solo permitir números y espacios
          const value = e.target.value.replace(/[^\d\s]/g, '');
          onPhoneNumberChange(value);
        }}
        type="tel"
        error={error}
        helperText={helperText}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        InputProps={{
          startAdornment: (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 1.5,
                borderRight: '1px solid',
                borderColor: error ? 'error.main' : 'rgba(0, 0, 0, 0.23)',
                pr: 1.5,
                height: '100%',
                minWidth: '110px',
                maxWidth: '110px'
              }}
            >
              <Autocomplete
                value={selectedCountry}
                onChange={(event, newValue: CountryCode | null) => {
                  if (newValue) {
                    onCountryCodeChange(newValue.code);
                  }
                }}
                options={COUNTRY_CODES}
                getOptionLabel={(option) => `${option.flag} ${option.code}`}
                disabled={disabled}
                size="small"
                disableClearable
                sx={{
                  width: '100%',
                  '& .MuiOutlinedInput-root': {
                    padding: '0 !important',
                    border: 'none',
                    backgroundColor: 'transparent',
                    '& fieldset': {
                      border: 'none'
                    },
                    '&:hover fieldset': {
                      border: 'none'
                    },
                    '&.Mui-focused fieldset': {
                      border: 'none'
                    }
                  },
                  '& .MuiAutocomplete-input': {
                    padding: '0 !important',
                    fontSize: '0.875rem',
                    minWidth: '60px !important',
                    width: 'auto !important'
                  },
                  '& .MuiAutocomplete-inputRoot': {
                    padding: '0 !important',
                    height: '100%',
                    alignItems: 'center'
                  },
                  '& .MuiAutocomplete-endAdornment': {
                    right: '4px',
                    '& .MuiIconButton-root': {
                      padding: '4px'
                    }
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="standard"
                    InputProps={{
                      ...params.InputProps,
                      disableUnderline: true,
                      sx: {
                        padding: 0,
                        '& input': {
                          padding: '0 4px !important',
                          fontSize: '0.875rem',
                          textAlign: 'left',
                          cursor: 'pointer'
                        }
                      }
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
              />
            </Box>
          ),
          sx: {
            '& .MuiInputBase-input': {
              paddingLeft: '8px !important'
            },
            '& .MuiInputBase-root': {
              alignItems: 'center',
              '& .MuiInputAdornment-root': {
                marginLeft: 0
              }
            }
          }
        }}
        inputProps={{
          maxLength: 15,
          autoComplete: 'tel',
          'data-form-type': 'other'
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            '&:hover': {
              '& fieldset': {
                borderColor: error ? 'error.main' : 'primary.main'
              }
            },
            '& .MuiInputAdornment-root': {
              marginRight: 0
            }
          }
        }}
      />
    </Box>
  );
};

