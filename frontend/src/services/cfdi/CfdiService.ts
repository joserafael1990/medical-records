import { ApiBase } from '../base/ApiBase';
import { logger } from '../../utils/logger';

export interface CfdiIssuer {
  id: number;
  doctor_id: number;
  rfc: string;
  legal_name: string;
  tax_regime: string;
  postal_code: string;
  invoice_series: string | null;
  invoice_folio_counter: number;
  is_active: boolean;
  has_csd: boolean;
  csd_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CfdiIssuerInput {
  rfc: string;
  legal_name: string;
  tax_regime: string;
  postal_code: string;
  invoice_series?: string;
}

export interface CfdiInvoice {
  id: number;
  issuer_id: number;
  doctor_id: number;
  patient_id: number | null;
  consultation_id: number | null;
  facturama_id: string | null;
  uuid_sat: string | null;
  serie: string | null;
  folio: string | null;
  receptor_rfc: string;
  receptor_name: string;
  receptor_postal_code: string;
  receptor_tax_regime: string;
  cfdi_use: string;
  subtotal: number;
  total: number;
  currency: string;
  payment_form: string;
  payment_method: string;
  service_description: string;
  sat_product_code: string;
  sat_unit_code: string;
  pdf_url: string | null;
  xml_url: string | null;
  status: 'issued' | 'cancelled' | 'error';
  cancellation_reason: string | null;
  cancellation_substitute_uuid: string | null;
  cancelled_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface CfdiInvoiceInput {
  consultation_id?: number;
  patient_id?: number;
  receptor_rfc?: string;
  receptor_name?: string;
  receptor_postal_code?: string;
  receptor_tax_regime?: string;
  cfdi_use?: string;
  subtotal: number;
  currency?: string;
  payment_form?: string;
  payment_method?: string;
  service_description: string;
  sat_product_code?: string;
  sat_unit_code?: string;
}

export class CfdiService extends ApiBase {
  async getIssuer(): Promise<CfdiIssuer | null> {
    const resp = await this.api.get<CfdiIssuer | null>('/api/cfdi/issuer');
    return resp.data;
  }

  async createIssuer(input: CfdiIssuerInput): Promise<CfdiIssuer> {
    const resp = await this.api.post<CfdiIssuer>('/api/cfdi/issuer', input);
    return resp.data;
  }

  async updateIssuer(input: Partial<CfdiIssuerInput>): Promise<CfdiIssuer> {
    const resp = await this.api.put<CfdiIssuer>('/api/cfdi/issuer', input);
    return resp.data;
  }

  async uploadCsd(params: {
    cer_file: File;
    key_file: File;
    password: string;
  }): Promise<CfdiIssuer> {
    const fd = new FormData();
    fd.append('cer_file', params.cer_file);
    fd.append('key_file', params.key_file);
    fd.append('password', params.password);
    const resp = await this.api.post<CfdiIssuer>('/api/cfdi/issuer/csd', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return resp.data;
  }

  async deleteCsd(): Promise<CfdiIssuer> {
    const resp = await this.api.delete<CfdiIssuer>('/api/cfdi/issuer/csd');
    return resp.data;
  }

  async listInvoices(params?: {
    limit?: number;
    offset?: number;
    status?: string;
    consultation_id?: number;
  }): Promise<CfdiInvoice[]> {
    const resp = await this.api.get<CfdiInvoice[]>('/api/cfdi/invoices', { params });
    return resp.data;
  }

  async getInvoice(id: number): Promise<CfdiInvoice> {
    const resp = await this.api.get<CfdiInvoice>(`/api/cfdi/invoices/${id}`);
    return resp.data;
  }

  async createInvoice(input: CfdiInvoiceInput): Promise<CfdiInvoice> {
    const resp = await this.api.post<CfdiInvoice>('/api/cfdi/invoices', input);
    return resp.data;
  }

  async cancelInvoice(
    id: number,
    motive: '01' | '02' | '03' | '04',
    substitute_uuid?: string,
  ): Promise<CfdiInvoice> {
    const resp = await this.api.post<CfdiInvoice>(`/api/cfdi/invoices/${id}/cancel`, {
      motive,
      substitute_uuid,
    });
    return resp.data;
  }

  async downloadPdf(id: number): Promise<{ filename: string; base64: string }> {
    const resp = await this.api.get<{ filename: string; base64: string }>(
      `/api/cfdi/invoices/${id}/pdf`,
    );
    return resp.data;
  }

  async downloadXml(id: number): Promise<{ filename: string; base64: string }> {
    const resp = await this.api.get<{ filename: string; base64: string }>(
      `/api/cfdi/invoices/${id}/xml`,
    );
    return resp.data;
  }
}
