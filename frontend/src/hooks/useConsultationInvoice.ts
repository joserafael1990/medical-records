import { useCallback, useEffect, useState } from 'react';
import { apiService } from '../services';
import type { CfdiInvoice } from '../services';
import { openBase64InNewTab } from '../utils/base64File';
import { logger } from '../utils/logger';

/**
 * Devuelve la factura emitida asociada a una consulta (si existe).
 * Sólo considera status='issued' — las canceladas o con error se ignoran
 * para que el UI muestre "Facturar" y el médico re-emita.
 */
export function useConsultationInvoice(consultationId?: number | null) {
  const [invoice, setInvoice] = useState<CfdiInvoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [openingPdf, setOpeningPdf] = useState(false);

  const refresh = useCallback(async () => {
    if (!consultationId) {
      setInvoice(null);
      return;
    }
    try {
      setLoading(true);
      const list = await apiService.cfdi.listInvoices({
        consultation_id: consultationId,
        status: 'issued',
        limit: 1,
      });
      setInvoice(list[0] ?? null);
    } catch (err) {
      logger.error('Error cargando factura de consulta', err, 'api');
      setInvoice(null);
    } finally {
      setLoading(false);
    }
  }, [consultationId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openPdf = useCallback(async () => {
    if (!invoice) return;
    try {
      setOpeningPdf(true);
      const { base64 } = await apiService.cfdi.downloadPdf(invoice.id);
      openBase64InNewTab(base64, 'application/pdf');
    } catch (err) {
      logger.error('Error abriendo PDF de factura', err, 'api');
    } finally {
      setOpeningPdf(false);
    }
  }, [invoice]);

  return { invoice, loading, openingPdf, refresh, openPdf };
}
