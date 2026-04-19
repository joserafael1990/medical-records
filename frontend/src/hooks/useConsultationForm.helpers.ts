export const mapPatientDocument = (
  doc: any | null | undefined,
  fallbackValue?: string,
  fallbackName?: string
): { document_id: number | null; document_value: string; document_name?: string } => ({
  document_id: doc?.document_id ?? doc?.id ?? null,
  document_value: fallbackValue ?? doc?.document_value ?? '',
  document_name: doc?.document_name || doc?.document?.name || fallbackName
});

// Helper function to get current date in CDMX timezone
export const getCDMXDateTime = (): string => {
  const now = new Date();
  const cdmxTimeString = now.toLocaleString("sv-SE", { timeZone: "America/Mexico_City" });
  const cdmxDate = new Date(cdmxTimeString);
  return cdmxDate.toISOString();
};

export const DEFAULT_PHYSICAL_EXAMINATION = [
  'Paciente en buenas condiciones generales, alerta, orientada en persona, tiempo y espacio, cooperadora, con marcha y postura normales.',
  'Cabeza normocéfala, simétrica, sin lesiones ni deformidades.',
  'Pupilas isocóricas y normorreactivas a la luz.',
  'Pabellones auriculares sin alteraciones, conductos auditivos limpios y tímpanos íntegros.',
  'Nariz alineada, mucosa rosada, sin secreción ni congestión.',
  'Mucosa oral húmeda y rosada, dentadura en buen estado, faringe sin hiperemia ni exudado.',
  'Cuello simétrico, sin masas ni adenomegalias, tiroides no palpable, pulsos carotídeos presentes y simétricos.',
  'Tórax simétrico con movimientos respiratorios adecuados; murmullo vesicular bien distribuido, sin ruidos agregados.',
  'Ruidos cardiacos rítmicos, de buena intensidad, sin soplos ni galope.',
  'Abdomen plano, blando, depresible, no doloroso a la palpación, sin visceromegalias ni masas palpables, con ruidos peristálticos presentes y normales.',
  'Extremidades simétricas, sin edema, cianosis ni deformidades; pulsos periféricos palpables y simétricos, fuerza y tono muscular conservados.',
  'Sistema nervioso íntegro, con fuerza 5/5 en las cuatro extremidades, sensibilidad y reflejos osteotendinosos normales, marcha coordinada.'
].join('\n\n');
