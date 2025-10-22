================================================================================
SETUP INICIAL DE BASE DE DATOS
Sistema de Historias Clínicas Electrónicas
================================================================================

Este conjunto de scripts inicializa la base de datos con todos los catálogos
maestros necesarios para el funcionamiento completo del sistema.

================================================================================
📋 ARCHIVOS INCLUIDOS
================================================================================

1. initial_data_setup.sql
   - Países (28)
   - Estados/Provincias (527)
   - Relaciones de emergencia (29)
   - Especialidades médicas (174)
   
2. initial_data_setup_part2.sql
   - Medicamentos (403)
   
3. run_initial_setup.sh
   - Script ejecutable que carga todo automáticamente
   
4. INITIAL_SETUP_README.txt
   - Este archivo de instrucciones

================================================================================
🚀 MODO DE USO
================================================================================

OPCIÓN 1: SCRIPT AUTOMÁTICO (RECOMENDADO)
------------------------------------------

1. Asegúrate que Docker esté corriendo:
   
   docker ps
   
2. Ejecuta el script de setup:
   
   cd backend
   chmod +x run_initial_setup.sh
   ./run_initial_setup.sh
   
3. El script mostrará el progreso y un resumen al final


OPCIÓN 2: EJECUCIÓN MANUAL
---------------------------

1. Ejecuta cada archivo SQL en orden:

   # Parte 1: Países, estados, especialidades
   docker exec -i medical-records-main-postgres-db-1 \
     psql -U historias_user -d historias_clinicas \
     < backend/initial_data_setup.sql
   
   # Parte 2: Medicamentos
   docker exec -i medical-records-main-postgres-db-1 \
     psql -U historias_user -d historias_clinicas \
     < backend/initial_data_setup_part2.sql

2. Verifica la carga:
   
   docker exec medical-records-main-postgres-db-1 \
     psql -U historias_user -d historias_clinicas \
     -c "SELECT COUNT(*) FROM countries"

================================================================================
📊 DATOS INCLUIDOS
================================================================================

🌎 GEOGRAFÍA (555 registros)
   ✓ 28 Países de América Latina + otros
     • México, Argentina, Brasil, Chile, Colombia, Perú, Venezuela
     • Costa Rica, Cuba, Ecuador, Guatemala, Honduras, Nicaragua
     • Panamá, Paraguay, Uruguay, El Salvador, Bolivia, Haití
     • República Dominicana, Puerto Rico, Guyana, Surinam, Belice
     • Guayana Francesa, España, Estados Unidos
     • Otro (para casos especiales)
   
   ✓ 527 Estados/Provincias/Departamentos
     • México: 32 estados completos
     • Brasil: 27 estados
     • Argentina: 24 provincias
     • Colombia: 33 departamentos
     • Venezuela: 24 estados
     • Perú: 25 departamentos
     • Chile: 16 regiones
     • Estados genéricos para otros países

👨‍👩‍👧‍👦 RELACIONES DE EMERGENCIA (29 registros)
   ✓ Todas las relaciones familiares y sociales:
     • Padre, Madre, Hijo/a, Esposo/a, Hermano/a
     • Abuelo/a, Nieto/a, Tío/a, Primo/a, Sobrino/a
     • Suegro/a, Yerno, Nuera, Cuñado/a
     • Pareja/Concubino(a), Amigo, Vecino, Tutor Legal
     • Otro (comodín)

🏥 ESPECIALIDADES MÉDICAS (174 registros)
   ✓ Medicina (11 especialidades)
     • General, Interna, Familiar, Preventiva, del Trabajo
     • Deportiva, Emergencias, Crítica, Paliativa, Estética
     • Física y Rehabilitación
   
   ✓ Psicología (10 especialidades)
     • Clínica, Infantil, de la Salud, Neuropsicología
     • Educativa, Organizacional, Forense
     • Terapia Cognitivo-Conductual, Familiar, de Pareja
   
   ✓ Enfermería (8 especialidades)
     • General, Quirúrgica, Pediátrica, Obstétrica
     • Cuidados Intensivos, Geriátrica, Comunitaria, Emergencias
   
   ✓ Fisioterapia y Terapias (12 especialidades)
     • Fisioterapia (General, Deportiva, Neurológica, Pediátrica)
     • Terapia Ocupacional, Respiratoria, del Lenguaje
     • Fonoaudiología, Audiología, Logopatía, Fisiatría
   
   ✓ Nutrición (5 especialidades)
     • Clínica, Deportiva, Pediátrica, Dietética, Oncológica
   
   ✓ Odontología (8 especialidades)
     • General, Ortodoncia, Endodoncia, Periodoncia
     • Cirugía Oral, Odontopediatría, Prótesis, Implantología
   
   ✓ Especialidades médicas tradicionales (100+)
     • Cardiología, Endocrinología, Gastroenterología
     • Neurología, Pediatría, Ginecología, Urología
     • Psiquiatría, Oncología, Dermatología, Oftalmología
     • Traumatología, Cirugías especializadas, y muchas más

💊 MEDICAMENTOS (403 registros)
   ✓ Antibióticos (30+)
     • Penicilinas, Cefalosporinas, Macrólidos, Quinolonas
   
   ✓ Analgésicos y Antiinflamatorios (25+)
     • AINEs, Inhibidores COX-2, Opioides
   
   ✓ Cardiovasculares (35+)
     • IECA, ARA-II, Calcioantagonistas, Betabloqueadores
     • Diuréticos, Anticoagulantes
   
   ✓ Antidiabéticos (20+)
     • Metformina, Sulfonilureas, Inhibidores DPP-4
     • Inhibidores SGLT2, Insulinas
   
   ✓ Gastrointestinales (25+)
     • IBP, Antiácidos, Procinéticos, Antiespasmódicos
   
   ✓ Respiratorios (20+)
     • Broncodilatadores, Corticoides inhalados
     • Mucolíticos, Antihistamínicos
   
   ✓ Neurológicos y Psiquiátricos (30+)
     • Antidepresivos, Ansiolíticos, Antipsicóticos
     • Anticonvulsivantes, Hipnóticos
   
   ✓ Hormonales (15+)
     • Tiroideos, Corticoides, Hormonas sexuales

🔬 DIAGNÓSTICOS CIE-10 (202 diagnósticos + 43 categorías)
   ✓ Categorías completas del CIE-10:
     • A00-B99: Enfermedades infecciosas y parasitarias
     • C00-D49: Neoplasias
     • D50-D89: Enfermedades de la sangre
     • E00-E89: Endocrinas, nutricionales y metabólicas
     • F01-F99: Trastornos mentales
     • G00-G99: Enfermedades del sistema nervioso
     • H00-H95: Enfermedades del ojo y oído
     • I00-I99: Enfermedades del sistema circulatorio
     • J00-J99: Enfermedades del sistema respiratorio
     • Y muchas más...
   
   ✓ 202 diagnósticos más comunes codificados

================================================================================
✅ VERIFICACIÓN POST-INSTALACIÓN
================================================================================

Después de ejecutar el setup, verifica que todo se cargó correctamente:

1. Verificar conteos:

   docker exec medical-records-main-postgres-db-1 \
     psql -U historias_user -d historias_clinicas << 'EOF'
   
   SELECT 'Países: ' || COUNT(*) FROM countries;
   SELECT 'Estados: ' || COUNT(*) FROM states;
   SELECT 'Especialidades: ' || COUNT(*) FROM specialties;
   SELECT 'Relaciones: ' || COUNT(*) FROM emergency_relationships;
   SELECT 'Medicamentos: ' || COUNT(*) FROM medications;
   SELECT 'Diagnósticos: ' || COUNT(*) FROM diagnosis_catalog;
   
   EOF

2. Valores esperados:
   ✓ Países: 28
   ✓ Estados: 527
   ✓ Especialidades: 174
   ✓ Relaciones: 29
   ✓ Medicamentos: 403
   ✓ Diagnósticos: 202

3. Reiniciar backend:

   docker-compose restart python-backend

4. Verificar en el sistema web:
   - Crear un nuevo doctor
   - Seleccionar país → debe mostrar 28 países
   - Seleccionar especialidad → debe mostrar 174 opciones
   - Crear consulta → prescribir medicamento (403 disponibles)

================================================================================
🔄 CASOS DE USO
================================================================================

CASO 1: Primera instalación
   → Ejecuta este setup DESPUÉS de crear las tablas
   → El orden correcto es:
     1. docker-compose up -d
     2. Crear tablas (migrations)
     3. Ejecutar este setup inicial
     4. Reiniciar backend

CASO 2: Restauración de ambiente
   → Si pierdes la base de datos o creas un nuevo entorno
   → Ejecuta este setup para poblar catálogos maestros

CASO 3: Migración a producción
   → Usa estos scripts en el servidor de producción
   → Asegura que los catálogos estén completos desde el inicio

CASO 4: Ambiente de desarrollo
   → Cada desarrollador puede ejecutar este setup
   → Garantiza que todos tengan los mismos datos maestros

================================================================================
⚠️ NOTAS IMPORTANTES
================================================================================

1. CONFLICTOS:
   • Todos los scripts usan "ON CONFLICT DO NOTHING"
   • Es SEGURO ejecutarlos múltiples veces
   • No se duplicarán datos

2. ORDEN DE EJECUCIÓN:
   • PRIMERO: Crear las tablas (migrations)
   • SEGUNDO: Ejecutar este setup
   • Los archivos ya están en el orden correcto

3. TIEMPO DE EJECUCIÓN:
   • Script completo: ~30-60 segundos
   • Depende de la velocidad del sistema

4. PREREQUISITOS:
   • Docker corriendo
   • Base de datos 'historias_clinicas' creada
   • Todas las tablas creadas (migrations ejecutadas)

5. BACKUP:
   • Recomendado hacer backup DESPUÉS del setup
   • Facilita restauraciones futuras

================================================================================
🛠️ TROUBLESHOOTING
================================================================================

PROBLEMA: "relation does not exist"
SOLUCIÓN: Las tablas no existen aún. Ejecuta primero las migrations.

PROBLEMA: "role does not exist"
SOLUCIÓN: Verifica usuario y password en compose.yaml

PROBLEMA: "database does not exist"
SOLUCIÓN: Crea la base de datos primero o verifica el nombre

PROBLEMA: "permission denied"
SOLUCIÓN: Dale permisos de ejecución: chmod +x run_initial_setup.sh

PROBLEMA: Datos no aparecen en el sistema
SOLUCIÓN: Reinicia el backend: docker-compose restart python-backend

================================================================================
📞 SOPORTE
================================================================================

Para más información sobre el sistema:
- Revisa la documentación en /docs
- Consulta los scripts de migración en /backend/migrations
- Verifica docker-compose.yaml para configuración

Última actualización: 2025-10-22
Versión: 1.0
================================================================================

