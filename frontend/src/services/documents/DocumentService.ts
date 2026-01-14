import { ApiBase } from '../base/ApiBase';
import { logger } from '../../utils/logger';

export class DocumentService extends ApiBase {
  /**
   * Get all document types
   */
  async getDocumentTypes(activeOnly: boolean = true): Promise<Array<{id: number, name: string, is_active: boolean}>> {
    try {
      const response = await this.api.get('/api/document-types', { params: { active_only: activeOnly } });
      return response.data;
    } catch (error) {
      logger.error('Error getting document types', error, 'api');
      throw error;
    }
  }

  /**
   * Get documents by type
   */
  async getDocumentsByType(documentTypeId: number, activeOnly: boolean = true): Promise<Array<{id: number, name: string, document_type_id: number}>> {
    try {
      const response = await this.api.get(`/api/document-types/${documentTypeId}/documents`, { params: { active_only: activeOnly } });
      return response.data;
    } catch (error) {
      logger.error('Error getting documents by type', error, 'api');
      throw error;
    }
  }

  /**
   * Get all documents with optional filter
   */
  async getDocuments(documentTypeId?: number, activeOnly: boolean = true): Promise<Array<{id: number, name: string, document_type_id: number}>> {
    try {
      const params: any = { active_only: activeOnly };
      if (documentTypeId) params.document_type_id = documentTypeId;
      const response = await this.api.get('/api/documents', { params });
      return response.data;
    } catch (error) {
      logger.error('Error getting documents', error, 'api');
      throw error;
    }
  }

  /**
   * Get person documents
   */
  async getPersonDocuments(personId: number, activeOnly: boolean = true): Promise<Array<{
    id: number;
    person_id: number;
    document_id: number;
    document_value: string;
    document?: { id: number; name: string; document_type_id: number };
  }>> {
    try {
      const response = await this.api.get(`/api/persons/${personId}/documents`, { params: { active_only: activeOnly } });
      return response.data;
    } catch (error) {
      logger.error('Error getting person documents', error, 'api');
      throw error;
    }
  }

  /**
   * Create or update person document
   */
  async savePersonDocument(
    personId: number,
    documentData: {
      document_id: number;
      document_value: string;
    }
  ): Promise<any> {
    try {
      const response = await this.api.post(`/api/persons/${personId}/documents`, documentData);
      return response.data;
    } catch (error) {
      logger.error('Error saving person document', error, 'api');
      throw error;
    }
  }

  /**
   * Delete person document
   */
  async deletePersonDocument(personId: number, documentId: number): Promise<void> {
    try {
      await this.api.delete(`/api/persons/${personId}/documents/${documentId}`);
    } catch (error) {
      logger.error('Error deleting person document', error, 'api');
      throw error;
    }
  }
}

