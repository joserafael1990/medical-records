import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initializeGlobalErrorHandlers } from './utils/globalErrorHandlers';
import * as Sentry from '@sentry/react';

// Initialize Sentry for error monitoring (frontend)
// Solo se activa si REACT_APP_SENTRY_DSN está definido (solo en producción)
const sentryDsn = process.env.REACT_APP_SENTRY_DSN;
const isSentryEnabled = Boolean(sentryDsn);

Sentry.init({
  dsn: sentryDsn,
  environment: process.env.REACT_APP_SENTRY_ENVIRONMENT || 'development',
  tracesSampleRate: 0.1,
  // Configuración de replays para User Feedback
  // Según la documentación, el feedback puede requerir replays habilitados
  // Configuramos solo replaysOnErrorSampleRate para feedback asociado a errores
  replaysSessionSampleRate: 0.0, // No queremos replays de sesión completa
  replaysOnErrorSampleRate: 0.1, // 10% de replays cuando hay errores (para feedback)
  enabled: isSentryEnabled, // Solo si hay DSN
      integrations: isSentryEnabled
        ? [
            // User Feedback Widget con textos personalizados en español
            Sentry.feedbackIntegration({
              colorScheme: 'system',
              showBranding: false,
              // Textos personalizados en español
              triggerLabel: 'Reportar un problema',
              triggerAriaLabel: 'Reportar un problema',
              formTitle: 'Reportar un problema',
              submitButtonLabel: 'Enviar reporte',
              cancelButtonLabel: 'Cancelar',
              confirmButtonLabel: 'Confirmar',
              addScreenshotButtonLabel: 'Agregar una captura de pantalla',
              removeScreenshotButtonLabel: 'Eliminar captura de pantalla',
              nameLabel: 'Nombre',
              namePlaceholder: 'Tu nombre',
              emailLabel: 'Email',
              emailPlaceholder: 'tu.email@ejemplo.com',
              messageLabel: 'Descripción',
              messagePlaceholder: '¿Cuál es el problema? ¿Qué esperabas que pasara?',
              successMessageText: '¡Gracias por tu reporte! Nos ayudará a mejorar la aplicación.',
              // Callbacks para debugging
              onFormOpen: () => {
                // Capturar un evento cuando se abre el formulario para asegurar que el feedback tenga un eventId
                // Esto es necesario porque Sentry puede no registrar feedback sin eventId
                const eventId = Sentry.captureMessage('User Feedback: Form Opened', {
                  level: 'info',
                  tags: {
                    feedback_type: 'user_initiated',
                    source: 'feedback_widget',
                  },
                });
                console.log('📝 Formulario de feedback abierto, eventId capturado:', eventId);
                // Nota: Este eventId no se pasa automáticamente al widget, pero ayuda a debuggear
              },
              onSubmitSuccess: (data, eventId) => {
                console.log('✅ Feedback enviado exitosamente a Sentry:', {
                  eventId: eventId || 'N/A (feedback general)',
                  hasName: !!data.name,
                  hasEmail: !!data.email,
                  messageLength: data.message?.length || 0,
                  messagePreview: data.message?.substring(0, 50) + '...',
                });
                
                // Si no hay eventId, enviar feedback manualmente usando captureFeedback
                // Esto asegura que el feedback llegue a Sentry incluso sin eventId
                if (!eventId) {
                  console.warn('⚠️ Feedback sin eventId - enviando manualmente con captureFeedback...');
                  try {
                    Sentry.captureFeedback({
                      message: data.message || '',
                      name: data.name || undefined,
                      email: data.email || undefined,
                    });
                    console.log('✅ Feedback enviado manualmente usando captureFeedback');
                  } catch (error) {
                    console.error('❌ Error al enviar feedback manualmente:', error);
                  }
                }
                
                console.log('📍 Busca este feedback en Sentry en: User Feedback (no en Issues)');
                console.log('🔗 URL: https://[tu-org].sentry.io/projects/[tu-proyecto]/user-feedback/');
              },
              onSubmitError: (error) => {
                console.error('❌ Error al enviar feedback a Sentry:', error);
              },
            }),
          ]
        : [],
});

// Initialize global error handlers to catch unhandled errors
initializeGlobalErrorHandlers();

console.log('🚀 Iniciando CORTEX con React + Material-UI...');

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
