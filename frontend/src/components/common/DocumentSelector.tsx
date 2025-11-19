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

interface SelectedDocumentValue {
  document_id: number | null;
  document_value: string;
  document_name?: string;
}

interface DocumentSelectorProps {
  documentType: 'personal' | 'professional';
  value?: SelectedDocumentValue;
  onChange: (value: SelectedDocumentValue) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  label?: string;
  required?: boolean;
  fullWidth?: boolean;
}

export const DocumentSelector: React.FC<DocumentSelectorProps> = ({
  documentType,
  value = { document_id: null, document_value: '', document_name: undefined },
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
          if (doc && (selectedDocument?.id !== doc.id)) {
            setSelectedDocument(doc);
          }
        } else if (value?.document_name) {
          const placeholder: Document = {
            id: value.document_id ?? -1,
            name: value.document_name,
            document_type_id: documentTypeId
          };
          if (!selectedDocument || selectedDocument.id !== placeholder.id || selectedDocument.name !== placeholder.name) {
            setSelectedDocument(placeholder);
          }
        } else if (selectedDocument) {
          setSelectedDocument(null);
        }
      } catch (error) {
        logger.error('Error loading documents', error, 'api');
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
  }, [documentTypeId, value?.document_id, value?.document_name]);

  const handleDocumentChange = (newDocument: Document | null) => {
    setSelectedDocument(newDocument);
    // Cuando cambia el tipo de documento, mantener el valor solo si el documento anterior tenía valor
    // Pero si el nuevo documento es diferente, limpiar el valor
    const shouldClearValue = selectedDocument && newDocument && selectedDocument.id !== newDocument.id;
    onChange({
      document_id: newDocument?.id || null,
      document_value: shouldClearValue ? '' : (value?.document_value || ''),
      document_name: newDocument?.name
    });
  };

  const handleValueChange = (newValue: string) => {
    onChange({
      document_id: selectedDocument?.id || null,
      document_value: newValue,
      document_name: selectedDocument?.name
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
        isOptionEqualToValue={(option, val) => option.id === val.id}
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
          helperText={error && !value?.document_value ? 'El valor del documento es requerido' : undefined}
          margin="normal"
          required={required}
          fullWidth={fullWidth}
        />
      )}
    </Box>
  );
};

