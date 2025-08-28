import { apiService } from './api';
import { SearchFilters } from '../hooks/useAdvancedSearch';
import { Patient } from '../types';

export interface SearchablePatient extends Patient {
  searchableText?: string;
  relevanceScore?: number;
}

export interface SearchableConsultation {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_phone?: string;
  date: string;
  chief_complaint: string;
  primary_diagnosis: string;
  status?: string;
  searchableText?: string;
  relevanceScore?: number;
}

export class SearchService {
  // Helper function to create searchable text
  private static createSearchableText(obj: any, fields: string[]): string {
    return fields
      .map(field => {
        const value = field.split('.').reduce((o, key) => o?.[key], obj);
        return value ? String(value).toLowerCase() : '';
      })
      .filter(Boolean)
      .join(' ');
  }

  // Helper function to calculate relevance score
  private static calculateRelevance(item: any, query: string, fields: string[]): number {
    if (!query) return 1;
    
    const queryLower = query.toLowerCase();
    let score = 0;
    
    fields.forEach((field, index) => {
      const value = field.split('.').reduce((o, key) => o?.[key], item);
      if (value) {
        const valueLower = String(value).toLowerCase();
        
        // Exact match gets highest score
        if (valueLower === queryLower) {
          score += 100 * (fields.length - index);
        }
        // Starts with query gets high score
        else if (valueLower.startsWith(queryLower)) {
          score += 50 * (fields.length - index);
        }
        // Contains query gets medium score
        else if (valueLower.includes(queryLower)) {
          score += 25 * (fields.length - index);
        }
        // Fuzzy match (words) gets low score
        else if (queryLower.split(' ').some(word => valueLower.includes(word))) {
          score += 10 * (fields.length - index);
        }
      }
    });
    
    return score;
  }

  // Helper function to highlight search terms
  private static highlightSearchTerms(text: string, query: string): string {
    if (!query) return text;
    
    const queryWords = query.toLowerCase().split(' ').filter(Boolean);
    let highlightedText = text;
    
    queryWords.forEach(word => {
      const regex = new RegExp(`(${word})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
    });
    
    return highlightedText;
  }

  // Search patients
  static async searchPatients(
    query: string,
    filters: SearchFilters,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{
    items: SearchablePatient[];
    total: number;
    totalPages: number;
  }> {
    try {
      // Get all patients (in real app, this would be paginated from backend)
      const patients = await apiService.getPatients();
      
      // Define searchable fields (order matters for relevance)
      const searchableFields = [
        'first_name',
        'paternal_surname',
        'maternal_surname',
        'phone',
        'email',
        'internal_id',
        'curp',
        'address'
      ];

      // Add searchable text and calculate relevance
      const searchablePatients: SearchablePatient[] = patients.map(patient => ({
        ...patient,
        searchableText: this.createSearchableText(patient, searchableFields),
        relevanceScore: this.calculateRelevance(patient, query, searchableFields)
      }));

      // Filter by query
      let filteredPatients = searchablePatients;
      if (query) {
        const queryLower = query.toLowerCase();
        filteredPatients = searchablePatients.filter(patient => 
          patient.searchableText?.includes(queryLower)
        );
      }

      // Apply additional filters
      if (filters.status) {
        filteredPatients = filteredPatients.filter(patient => 
          patient.status === filters.status
        );
      }

      if (filters.dateRange?.start) {
        filteredPatients = filteredPatients.filter(patient => 
          patient.birth_date >= filters.dateRange!.start
        );
      }

      if (filters.dateRange?.end) {
        filteredPatients = filteredPatients.filter(patient => 
          patient.birth_date <= filters.dateRange!.end
        );
      }

      // Sort by relevance if searching, otherwise by name
      if (query) {
        filteredPatients.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
      } else {
        filteredPatients.sort((a, b) => {
          const aName = `${a.first_name} ${a.paternal_surname}`.toLowerCase();
          const bName = `${b.first_name} ${b.paternal_surname}`.toLowerCase();
          return aName.localeCompare(bName);
        });
      }

      // Paginate results
      const total = filteredPatients.length;
      const totalPages = Math.ceil(total / pageSize);
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedPatients = filteredPatients.slice(startIndex, endIndex);

      return {
        items: paginatedPatients,
        total,
        totalPages
      };
    } catch (error) {
      console.error('Error searching patients:', error);
      throw new Error('Error al buscar pacientes');
    }
  }

  // Search consultations
  static async searchConsultations(
    query: string,
    filters: SearchFilters,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{
    items: SearchableConsultation[];
    total: number;
    totalPages: number;
  }> {
    try {
      // Get all consultations (in real app, this would be paginated from backend)
      const consultations = await apiService.getConsultations('');
      
      // Convert to searchable format
      const searchableConsultations: SearchableConsultation[] = consultations.map(consultation => {
        const searchableFields = [
          'patient_name',
          'chief_complaint',
          'primary_diagnosis',
          'secondary_diagnoses',
          'treatment_plan'
        ];
        
        return {
          id: consultation.id,
          patient_id: consultation.patient_id,
          patient_name: consultation.patient_name || '',
          patient_phone: consultation.patient_phone,
          date: consultation.date,
          chief_complaint: consultation.chief_complaint || '',
          primary_diagnosis: consultation.primary_diagnosis || '',
          status: consultation.status,
          searchableText: this.createSearchableText(consultation, searchableFields),
          relevanceScore: this.calculateRelevance(consultation, query, searchableFields)
        };
      });

      // Filter by query
      let filteredConsultations = searchableConsultations;
      if (query) {
        const queryLower = query.toLowerCase();
        filteredConsultations = searchableConsultations.filter(consultation => 
          consultation.searchableText?.includes(queryLower)
        );
      }

      // Apply additional filters
      if (filters.dateRange?.start) {
        filteredConsultations = filteredConsultations.filter(consultation => 
          consultation.date >= filters.dateRange!.start
        );
      }

      if (filters.dateRange?.end) {
        filteredConsultations = filteredConsultations.filter(consultation => 
          consultation.date <= filters.dateRange!.end
        );
      }

      if (filters.status) {
        filteredConsultations = filteredConsultations.filter(consultation => 
          consultation.status === filters.status
        );
      }

      // Sort by relevance if searching, otherwise by date (newest first)
      if (query) {
        filteredConsultations.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
      } else {
        filteredConsultations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }

      // Paginate results
      const total = filteredConsultations.length;
      const totalPages = Math.ceil(total / pageSize);
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedConsultations = filteredConsultations.slice(startIndex, endIndex);

      return {
        items: paginatedConsultations,
        total,
        totalPages
      };
    } catch (error) {
      console.error('Error searching consultations:', error);
      throw new Error('Error al buscar consultas');
    }
  }

  // Get search suggestions based on query
  static getSearchSuggestions(query: string, type: 'patients' | 'consultations'): string[] {
    const suggestions: string[] = [];
    
    if (type === 'patients') {
      // Common patient search patterns
      if (query.match(/^\d/)) {
        suggestions.push(`Teléfono: ${query}`);
        suggestions.push(`ID: ${query}`);
      } else {
        suggestions.push(`Nombre: ${query}`);
        suggestions.push(`Apellido: ${query}`);
      }
    } else if (type === 'consultations') {
      // Common consultation search patterns
      suggestions.push(`Diagnóstico: ${query}`);
      suggestions.push(`Síntoma: ${query}`);
      suggestions.push(`Paciente: ${query}`);
    }
    
    return suggestions.slice(0, 5);
  }
}
