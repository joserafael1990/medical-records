// ============================================================================
// USE MEDICAL ORDERS HOOK - Hook para gestión de órdenes médicas
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { 
  MedicalOrder, 
  MedicalOrderFormData,
  OrderStatus 
} from '../types';
import {
  createMedicalOrder,
  getMedicalOrdersByConsultation,
  getMedicalOrdersByPatient,
  updateMedicalOrderStatus
} from '../services/api';

interface UseMedicalOrdersProps {
  consultationId?: string;
  patientId?: string;
  autoLoad?: boolean;
}

interface UseMedicalOrdersReturn {
  orders: MedicalOrder[];
  isLoading: boolean;
  isCreating: boolean;
  error: string | null;
  createOrder: (orderData: MedicalOrderFormData) => Promise<MedicalOrder | null>;
  loadOrders: () => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  printOrder: (order: MedicalOrder) => void;
  cancelOrder: (orderId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useMedicalOrders = ({
  consultationId,
  patientId,
  autoLoad = true
}: UseMedicalOrdersProps = {}): UseMedicalOrdersReturn => {
  const [orders, setOrders] = useState<MedicalOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load orders function
  const loadOrders = useCallback(async () => {
    if (!consultationId && !patientId) return;

    setIsLoading(true);
    setError(null);

    try {
      let ordersData: MedicalOrder[];
      
      if (consultationId) {
        ordersData = await getMedicalOrdersByConsultation(consultationId);
      } else if (patientId) {
        ordersData = await getMedicalOrdersByPatient(patientId);
      } else {
        ordersData = [];
      }

      setOrders(ordersData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar órdenes médicas';
      setError(errorMessage);
      console.error('Error loading medical orders:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        details: err instanceof Error ? err.stack : String(err)
      });
    } finally {
      setIsLoading(false);
    }
  }, [consultationId, patientId]);

  // Create new order
  const createOrder = useCallback(async (orderData: MedicalOrderFormData): Promise<MedicalOrder | null> => {
    setIsCreating(true);
    setError(null);

    try {
      const newOrder = await createMedicalOrder(orderData);
      
      // Add the new order to the current list
      setOrders(prevOrders => [newOrder, ...prevOrders]);
      
      return newOrder;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al crear orden médica';
      setError(errorMessage);
      console.error('Error creating medical order:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        details: err instanceof Error ? err.stack : String(err)
      });
      return null;
    } finally {
      setIsCreating(false);
    }
  }, []);

  // Update order status
  const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus) => {
    setError(null);

    try {
      await updateMedicalOrderStatus(orderId, status);
      
      // Update the order in the local state
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId
            ? { ...order, status, updated_at: new Date().toISOString() }
            : order
        )
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar estado de la orden';
      setError(errorMessage);
      console.error('Error updating order status:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        details: err instanceof Error ? err.stack : String(err)
      });
      throw err; // Re-throw to allow component to handle it
    }
  }, []);

  // Print order function
  const printOrder = useCallback((order: MedicalOrder) => {
    try {
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      
      if (!printWindow) {
        throw new Error('No se pudo abrir la ventana de impresión. Verifique que los pop-ups estén habilitados.');
      }

      // Basic HTML structure for printing
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Orden Médica - ${order.id}</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                margin: 20px; 
                font-size: 12px;
                line-height: 1.4;
              }
              .header { 
                text-align: center; 
                margin-bottom: 20px; 
                border-bottom: 2px solid #000;
                padding-bottom: 10px;
              }
              .title { 
                font-size: 24px; 
                font-weight: bold; 
                color: #1976d2;
                margin: 10px 0;
              }
              .subtitle { 
                font-size: 16px; 
                color: #666;
              }
              .section { 
                margin: 15px 0; 
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 5px;
              }
              .section-title { 
                font-weight: bold; 
                font-size: 14px;
                color: #1976d2;
                margin-bottom: 8px;
                border-bottom: 1px solid #ddd;
                padding-bottom: 4px;
              }
              .field { 
                margin: 5px 0; 
              }
              .field-label { 
                font-weight: bold; 
                display: inline-block;
                width: 120px;
              }
              .study-name {
                font-size: 16px;
                font-weight: bold;
                background-color: #f5f5f5;
                padding: 10px;
                border-radius: 5px;
                margin: 10px 0;
              }
              .clinical-indication {
                background-color: #f9f9f9;
                padding: 10px;
                border-radius: 5px;
                border-left: 4px solid #1976d2;
                margin: 10px 0;
              }
              .preparation {
                background-color: #fff3e0;
                padding: 10px;
                border-radius: 5px;
                border: 1px solid #ff9800;
                margin: 10px 0;
              }
              .footer {
                margin-top: 40px;
                display: flex;
                justify-content: space-between;
              }
              .signature {
                text-align: center;
                border-top: 1px solid #000;
                padding-top: 10px;
                width: 250px;
              }
              @media print {
                body { margin: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>CORTEX - Sistema Médico</h1>
              <div class="title">ORDEN MÉDICA</div>
              <div class="subtitle">${order.study_type}</div>
            </div>

            <div class="section">
              <div class="field">
                <span class="field-label">No. Orden:</span> ${order.id}
              </div>
              <div class="field">
                <span class="field-label">Fecha:</span> ${new Date(order.order_date).toLocaleDateString('es-MX')}
              </div>
              <div class="field">
                <span class="field-label">Paciente:</span> ${order.patient_name || 'No especificado'}
              </div>
            </div>

            <div class="section">
              <div class="section-title">ESTUDIO SOLICITADO</div>
              <div class="study-name">${order.study_name}</div>
              ${order.study_description ? `<div><strong>Descripción:</strong> ${order.study_description}</div>` : ''}
            </div>

            <div class="section">
              <div class="section-title">INDICACIÓN CLÍNICA</div>
              <div class="clinical-indication">${order.clinical_indication}</div>
              ${order.provisional_diagnosis ? `<div class="field"><span class="field-label">Diagnóstico:</span> ${order.provisional_diagnosis}</div>` : ''}
              ${order.diagnosis_cie10 ? `<div class="field"><span class="field-label">CIE-10:</span> ${order.diagnosis_cie10}</div>` : ''}
            </div>

            ${order.requires_preparation && order.preparation_instructions ? `
              <div class="section">
                <div class="section-title">⚠️ PREPARACIÓN REQUERIDA</div>
                <div class="preparation">${order.preparation_instructions}</div>
              </div>
            ` : ''}

            ${order.special_instructions ? `
              <div class="section">
                <div class="section-title">INSTRUCCIONES ESPECIALES</div>
                <div>${order.special_instructions}</div>
              </div>
            ` : ''}

            <div class="section">
              <div class="section-title">MÉDICO SOLICITANTE</div>
              <div class="field">
                <span class="field-label">Nombre:</span> ${order.ordering_doctor_name || 'No especificado'}
              </div>
              <div class="field">
                <span class="field-label">Cédula:</span> ${order.ordering_doctor_license || 'No especificado'}
              </div>
              <div class="field">
                <span class="field-label">Especialidad:</span> ${order.ordering_doctor_specialty || 'Medicina General'}
              </div>
            </div>

            <div class="footer">
              <div class="signature">
                <div><strong>${order.ordering_doctor_name}</strong></div>
                <div>Cédula: ${order.ordering_doctor_license}</div>
              </div>
              <div class="signature">
                <div><strong>FIRMA DIGITAL</strong></div>
                <div>${new Date(order.order_date).toLocaleDateString('es-MX')}</div>
              </div>
            </div>

            <div style="margin-top: 20px; font-size: 10px; color: #666; text-align: center;">
              Documento generado conforme a la NOM-004-SSA3-2012 del Expediente Clínico
            </div>
          </body>
        </html>
      `);

      printWindow.document.close();
      
      // Wait for content to load, then print
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);

      // Update status to completada if it was pendiente
      if (order.status === 'pendiente') {
        updateOrderStatus(order.id, 'completada').catch((err) => {
          console.error('Error updating order status after print:', {
            message: err instanceof Error ? err.message : 'Unknown error',
            details: err instanceof Error ? err.stack : String(err)
          });
        });
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al imprimir la orden';
      setError(errorMessage);
      console.error('Error printing order:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        details: err instanceof Error ? err.stack : String(err)
      });
    }
  }, [updateOrderStatus]);

  // Cancel order
  const cancelOrder = useCallback(async (orderId: string) => {
    await updateOrderStatus(orderId, 'cancelada');
  }, [updateOrderStatus]);

  // Refresh orders
  const refresh = useCallback(async () => {
    await loadOrders();
  }, [loadOrders]);

  // Auto-load orders on mount
  useEffect(() => {
    if (autoLoad && (consultationId || patientId)) {
      loadOrders();
    }
  }, [autoLoad, consultationId, patientId, loadOrders]);

  return {
    orders,
    isLoading,
    isCreating,
    error,
    createOrder,
    loadOrders,
    updateOrderStatus,
    printOrder,
    cancelOrder,
    refresh
  };
};

export default useMedicalOrders;
