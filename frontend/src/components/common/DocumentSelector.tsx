import React, { useEffect, useState } from 'react';
import {
  Autocomplete,
  TextField,
  Box,
  FormControl,
  FormHelperText
} from '@mui/material';
import { apiService } from '../../services';
import { logger } from '../../utils/logger';

interface Document {
  id: number;
  name: string;
  document_type_id: number;
}

interface DocumentSelectorProps {
  documentType: 'personal' | 'professional';
  value?: { document_id: number | null; document_value: string };
  onChange: (value: { document_id: number | null; document_value: string }) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  label?: string;
  required?: boolean;
  fullWidth?: boolean;
}

export const DocumentSelector: React.FC<DocumentSelectorProps> = ({
  documentType,
  value = { document_id: null, document_value: '' },
  onChange,
  disabled = false,
  error = false,
  helperText,
  label,
  required = false,
  fullWidth = true
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  // Determine document type ID (1 = Personal, 2 = Profesional)
  const documentTypeId = documentType === 'personal' ? 1 : 2;

  useEffect(() => {
    const loadDocuments = async () => {
      setLoading(true);
      try {
        const docs = await apiService.documents.getDocumentsByType(documentTypeId);
        setDocuments(docs);
        
        // If value has document_id, find and set the selected document
        if (value?.document_id) {
          const doc = docs.find(d => d.id === value.document_id);
          if (doc) {
            setSelectedDocument(doc);
          }
        }
      } catch (error) {
        logger.error('Error loading documents', error, 'api');
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
  }, [documentTypeId, value?.document_id]);

  const handleDocumentChange = (newDocument: Document | null) => {
    setSelectedDocument(newDocument);
    // Cuando cambia el tipo de documento, mantener el valor solo si el documento anterior tenía valor
    // Pero si el nuevo documento es diferente, limpiar el valor
    const shouldClearValue = selectedDocument && newDocument && selectedDocument.id !== newDocument.id;
    onChange({
      document_id: newDocument?.id || null,
      document_value: shouldClearValue ? '' : (value?.document_value || '')
    });
  };

  const handleValueChange = (newValue: string) => {
    onChange({
      document_id: selectedDocument?.id || null,
      document_value: newValue
    });
  };

  // Generate label if not provided
  const defaultLabel = documentType === 'personal' 
    ? 'Documento Personal' 
    : 'Documento Profesional';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: fullWidth ? '100%' : 'auto' }}>
      <Autocomplete
        value={selectedDocument}
        onChange={(event, newValue: Document | null) => {
          handleDocumentChange(newValue);
        }}
        options={documents}
        getOptionLabel={(option) => option.name}
        disabled={disabled || loading}
        loading={loading}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label || defaultLabel}
            error={error && !selectedDocument}
            helperText={error && !selectedDocument ? helperText : undefined}
            margin="normal"
            required={required}
            fullWidth={fullWidth}
          />
        )}
        componentsProps={{
          popper: {
            style: { zIndex: 13000 }
          }
        }}
        sx={{
          width: fullWidth ? '100%' : 'auto',
          '& .MuiAutocomplete-popper': {
            zIndex: 13000
          }
        }}
      />
      
      {selectedDocument && (
        <TextField
          label={`Valor del ${selectedDocument.name}`}
          value={value?.document_value || ''}
          onChange={(e) => handleValueChange(e.target.value)}
          disabled={disabled}
          error={error && !value?.document_value}
          helperText={error && !value?.document_value ? 'El valor del documento es requerido' : helperText}
          margin="normal"
          required={required}
          fullWidth={fullWidth}
        />
      )}

      {error && !selectedDocument && (
        <FormControl error={true} fullWidth={fullWidth}>
          <FormHelperText>{helperText || 'Debe seleccionar un documento'}</FormHelperText>
        </FormControl>
      )}
    </Box>
  );
};

