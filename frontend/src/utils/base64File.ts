/**
 * Utilidades para abrir/descargar un archivo codificado en base64
 * (típicamente PDF/XML recibido de la API).
 */

export function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

export function openBase64InNewTab(base64: string, mimeType: string): void {
  const blob = base64ToBlob(base64, mimeType);
  const url = URL.createObjectURL(blob);
  // No revokeObjectURL inmediatamente — la pestaña nueva aún lo necesita.
  // Se libera automático cuando el browser cierra la pestaña.
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function downloadBase64(base64: string, filename: string, mimeType: string): void {
  const blob = base64ToBlob(base64, mimeType);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
