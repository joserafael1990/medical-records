"""legal framework: per-doctor privacy, platform legal docs

Revision ID: d1e2f3a4b5c6
Revises: b3c4d5e6f7a8
Create Date: 2026-04-22 18:00:00.000000

Blindaje legal para CORTEX bajo LFPDPPP:

1. `legal_documents` + `legal_acceptances` — versiones de los documentos
   de la *plataforma* (Aviso de Privacidad de CORTEX, Términos y
   Condiciones, Contrato de Encargo del Tratamiento) y la aceptación de
   cada doctor al firmar up. Separa la figura de CORTEX como **encargado**
   (art. 49 Reglamento LFPDPPP) de la figura del médico como
   **responsable** frente al paciente.

2. `privacy_consents.doctor_id` y `arco_requests.doctor_id` — scoping
   por médico. Un ARCO contra Dr. A no se mezcla con uno contra Dra. B.

3. `privacy_consents.rendered_content_hash` — hash SHA-256 del texto
   exacto que el paciente aceptó, para prueba ante IFAI aun si la
   plantilla se actualiza después.

4. `persons.legal_address` y `persons.arco_contact_email` — el domicilio
   del responsable (art. 16 fracc. I) y el medio para ejercer ARCO
   (art. 16 fracc. II). Requeridos al renderizar el aviso del doctor.

5. Seed: plantilla v1 del aviso del doctor → paciente + v1 de los tres
   documentos de la plataforma. Textos con los campos mínimos que exige
   LFPDPPP / NOM-024; el equipo legal los puede afinar, pero no se lanza
   en estado vacío (404) como hasta ahora.

6. Backfill: los `privacy_consents` existentes de médicos (que el flujo
   previo guardaba como "aviso al firmar up") se migran a
   `legal_acceptances` contra el documento de Aviso-Plataforma v1. No
   hay filas en prod (verificado antes de la migración), pero la lógica
   cubre el caso para entornos de dev con datos.

Downgrade: drop de tablas nuevas y columnas. Los consent hashes no son
reversibles por diseño.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "d1e2f3a4b5c6"
down_revision: Union[str, None] = "b3c4d5e6f7a8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# ---------------------------------------------------------------------------
# Seed content. Pensado como contenido mínimamente defensible, no final.
# El equipo legal debe revisar. Se mantiene en Español porque es obligatorio
# bajo LFPDPPP Art. 16 fracc. VII (lenguaje claro y comprensible para el
# titular, que en México es Español por default).
# ---------------------------------------------------------------------------

PATIENT_NOTICE_TEMPLATE_V1 = """AVISO DE PRIVACIDAD INTEGRAL

Responsable del tratamiento de los datos personales:
{{doctor_title}} {{doctor_name}}
Cédula profesional: {{doctor_cedula}}
Especialidad: {{doctor_specialty}}
Domicilio: {{doctor_legal_address}}
Medio de contacto para derechos ARCO: {{doctor_arco_email}}

1. Datos personales que se recaban.
Se recaban datos de identificación, contacto, datos sobre su estado de
salud presente, pasado o futuro, antecedentes clínicos, resultados de
estudios, diagnósticos, prescripciones y demás información necesaria
para la prestación del servicio médico. Entre éstos se incluyen datos
personales sensibles en términos del artículo 3 fracción VI de la
LFPDPPP (datos de salud).

2. Finalidades primarias.
Los datos se tratan para: (i) integrar el expediente clínico electrónico
conforme a la NOM-004-SSA3-2012; (ii) atender la consulta médica,
emitir diagnóstico, recetas y órdenes de estudio; (iii) dar seguimiento
clínico y continuidad de la atención; (iv) cumplir obligaciones fiscales
y regulatorias (NOM-024-SSA3-2012, NOM-035-SSA3-2012 cuando aplique, y
facturación CFDI cuando el paciente lo solicite).

3. Finalidades secundarias.
No se tratan los datos para finalidades distintas a las primarias sin
un consentimiento adicional expreso.

4. Transferencias.
Los datos NO se transfieren a terceros distintos del Responsable, salvo
cuando: (a) lo ordene una autoridad competente; (b) sea necesario para
atender una urgencia médica en otra institución; (c) el propio paciente
lo autorice expresamente.

5. Encargado tecnológico.
El Responsable utiliza a CORTEX (operado por Peregrino Tecnologías,
S.A.S. de C.V.) como Encargado tecnológico para el almacenamiento y
procesamiento de los datos, al amparo de un Contrato de Encargo del
Tratamiento conforme al artículo 49 del Reglamento de la LFPDPPP.
CORTEX no trata los datos para finalidades propias y aplica cifrado
AES-256-GCM sobre los datos sensibles en reposo.

6. Derechos ARCO.
Usted tiene derecho a: Acceder a sus datos; Rectificarlos si son
inexactos; Cancelarlos cuando considere que no se utilizan conforme a
los principios aplicables; y Oponerse al tratamiento para fines
específicos. Para ejercer estos derechos envíe solicitud al medio de
contacto del Responsable señalado arriba, incluyendo nombre completo,
copia de identificación y descripción clara de la solicitud.

7. Revocación del consentimiento.
Puede revocar su consentimiento en cualquier momento mediante el mismo
medio de contacto. La revocación no tendrá efectos retroactivos sobre
datos ya procesados para finalidades primarias cuya conservación sea
obligatoria (expediente clínico: mínimo 5 años según NOM-004).

8. Cambios al aviso.
Cualquier cambio al presente aviso será notificado al correo o teléfono
proporcionado por el paciente, y publicado en la página pública del
Responsable.

Fecha de última actualización: {{effective_date}}
Versión: {{notice_version}}
"""

PATIENT_NOTICE_SHORT_SUMMARY_V1 = (
    "Sus datos clínicos son tratados por {{doctor_title}} {{doctor_name}} "
    "(cédula {{doctor_cedula}}) como responsable, con CORTEX como "
    "encargado tecnológico bajo contrato de encargo. Usted tiene derechos "
    "ARCO y puede revocar su consentimiento."
)

PLATFORM_PRIVACY_V1_TITLE = "Aviso de Privacidad de la Plataforma CORTEX"
PLATFORM_PRIVACY_V1 = """AVISO DE PRIVACIDAD — PLATAFORMA CORTEX (USUARIO MÉDICO)

Responsable: Peregrino Tecnologías, S.A.S. de C.V. ("CORTEX").
Domicilio: México (actualícese con domicilio fiscal vigente).
Contacto ARCO: privacidad@cortexclinico.com

1. Ámbito.
Este aviso regula el tratamiento de los datos personales del médico
usuario de la plataforma CORTEX. NO aplica a los datos clínicos de sus
pacientes; esos datos son tratados por usted como Responsable, con
CORTEX como Encargado tecnológico bajo un Contrato de Encargo
independiente.

2. Datos del médico que se recaban.
Nombre, correo, teléfono, cédula profesional, especialidad, domicilio
fiscal/legal, RFC, datos de facturación, información de pago y uso de
la plataforma.

3. Finalidades primarias.
(i) Prestar el servicio SaaS de expediente clínico; (ii) autenticación
y seguridad; (iii) soporte técnico; (iv) facturación; (v) cumplir
obligaciones fiscales y regulatorias de CORTEX.

4. Finalidades secundarias.
Mejora del producto mediante métricas agregadas y anónimas. Puede
oponerse a este tratamiento sin afectación al servicio principal.

5. Transferencias.
CORTEX utiliza infraestructura de Google Cloud Platform (almacenamiento,
cómputo y servicios de IA); y Facturama para emisión de CFDI cuando
usted active el módulo. Todos los subencargados están obligados a
cumplir la LFPDPPP.

6. Derechos ARCO.
Ejércelos en privacidad@cortexclinico.com.

Versión: v1 — Fecha: {{effective_date}}
"""

TOS_V1_TITLE = "Términos y Condiciones de Uso — CORTEX"
TOS_V1 = """TÉRMINOS Y CONDICIONES DE USO — CORTEX

1. Objeto. CORTEX otorga al médico usuario una licencia no exclusiva,
intransferible y revocable para usar la plataforma durante la vigencia
de su suscripción.

2. Uso permitido. El usuario se obliga a operar la plataforma únicamente
para fines de práctica médica lícita y a no usarla para actividades
ilegales, violatorias de derechos de terceros o que vulneren las normas
NOM-004, NOM-024 o LFPDPPP.

3. Cuenta. El usuario es responsable de mantener la confidencialidad de
sus credenciales. CORTEX no es responsable por accesos indebidos
derivados de negligencia del usuario.

4. Contenido del usuario. El expediente clínico y demás datos ingresados
son propiedad y responsabilidad del médico. CORTEX los procesa como
Encargado bajo el Contrato de Encargo del Tratamiento.

5. Disponibilidad. CORTEX se compromete a esfuerzo razonable para
mantener la plataforma disponible, sin garantía de disponibilidad
continua. Se notificarán con anticipación las ventanas programadas de
mantenimiento.

6. Pagos. Las tarifas aplicables son las publicadas al contratar. Los
pagos son no reembolsables salvo disposición expresa.

7. Terminación. Cualquiera de las partes puede dar por terminado el
contrato con 30 días de aviso. A la terminación, el médico podrá
exportar sus datos por 90 días mediante el módulo de exportación.

8. Limitación de responsabilidad. CORTEX no es responsable por
decisiones clínicas tomadas por el médico con base en la información
presentada por la plataforma. La plataforma es herramienta, no sustituye
el criterio profesional.

9. Jurisdicción. México. Tribunales competentes: Ciudad de México.

Versión: v1 — Fecha: {{effective_date}}
"""

DPA_V1_TITLE = "Contrato de Encargo del Tratamiento (Art. 49 Reglamento LFPDPPP)"
DPA_V1 = """CONTRATO DE ENCARGO DEL TRATAMIENTO

Celebrado entre el médico usuario ("Responsable") y Peregrino
Tecnologías, S.A.S. de C.V. ("Encargado" / "CORTEX"), al amparo del
artículo 49 del Reglamento de la LFPDPPP.

1. Objeto. El Encargado trata los datos personales de los pacientes del
Responsable (incluyendo datos sensibles de salud) exclusivamente por
cuenta y orden del Responsable, para prestar el servicio SaaS de
expediente clínico electrónico.

2. Instrucciones. El Encargado actúa únicamente conforme a las
instrucciones documentadas del Responsable, salvo cuando la ley le
obligue a proceder de otro modo.

3. Confidencialidad. El Encargado y su personal están obligados al
deber de confidencialidad incluso después de concluida la relación.

4. Medidas de seguridad. El Encargado aplica cifrado AES-256-GCM sobre
datos sensibles en reposo, TLS 1.2+ en tránsito, control de acceso
basado en roles, auditoría de accesos al expediente, y respaldo
continuo. Notificará al Responsable cualquier vulneración de seguridad
en un plazo máximo de 72 horas desde su detección.

5. Subencargados. El Responsable autoriza al Encargado a subcontratar:
Google Cloud Platform (almacenamiento y cómputo en US-Central), y
Facturama (emisión de CFDI cuando el Responsable lo active). El
Encargado responde por los subencargados como si fueran su personal
directo.

6. Derechos ARCO. Cuando un titular presente un ARCO ante el Encargado,
éste lo enrutará al Responsable dentro de 5 días hábiles y le brindará
las herramientas técnicas para responder (exportación del expediente,
cancelación lógica, rectificación).

7. Retención y devolución. A la terminación del servicio, el Encargado
conservará los datos durante 90 días adicionales para permitir la
exportación por parte del Responsable; posteriormente los suprimirá de
forma segura, salvo que la ley obligue a su conservación.

8. Auditoría. El Responsable podrá auditar el cumplimiento de este
contrato mediante solicitud escrita con 15 días de anticipación.

9. Responsabilidad. Cada parte responde por sus propios incumplimientos.
El Encargado no asume la figura de Responsable del tratamiento respecto
de los datos clínicos de los pacientes.

Versión: v1 — Fecha: {{effective_date}}
"""


def upgrade() -> None:
    # -------------------------------------------------------------------
    # 1. legal_documents — versiones de Aviso-Plataforma, ToS, DPA.
    # -------------------------------------------------------------------
    op.create_table(
        "legal_documents",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("doc_type", sa.String(30), nullable=False),
        sa.Column("version", sa.String(20), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("effective_date", sa.Date, nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.CheckConstraint(
            "doc_type IN ('platform_privacy', 'tos', 'dpa')",
            name="legal_documents_doc_type_check",
        ),
        sa.UniqueConstraint("doc_type", "version", name="legal_documents_type_version_unique"),
    )
    op.create_index(
        "ix_legal_documents_active_type",
        "legal_documents",
        ["doc_type", "is_active"],
    )

    # -------------------------------------------------------------------
    # 2. legal_acceptances — firma del doctor en signup.
    # -------------------------------------------------------------------
    op.create_table(
        "legal_acceptances",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer,
            sa.ForeignKey("persons.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "document_id",
            sa.Integer,
            sa.ForeignKey("legal_documents.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("accepted_at", sa.DateTime, nullable=False),
        sa.Column("ip_address", sa.String(45)),
        sa.Column("user_agent", sa.Text),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("user_id", "document_id", name="legal_acceptances_user_doc_unique"),
    )
    op.create_index("ix_legal_acceptances_user", "legal_acceptances", ["user_id"])

    # -------------------------------------------------------------------
    # 3. persons: legal fields para que el aviso del doctor pueda renderizar.
    # -------------------------------------------------------------------
    op.execute("ALTER TABLE persons ADD COLUMN IF NOT EXISTS legal_address TEXT")
    op.execute("ALTER TABLE persons ADD COLUMN IF NOT EXISTS arco_contact_email VARCHAR(100)")

    # -------------------------------------------------------------------
    # 4. privacy_consents: doctor_id (scope) + rendered_content_hash (prueba).
    # -------------------------------------------------------------------
    op.execute(
        """
        ALTER TABLE privacy_consents
            ADD COLUMN IF NOT EXISTS doctor_id INTEGER
                REFERENCES persons(id) ON DELETE SET NULL
        """
    )
    op.execute(
        "ALTER TABLE privacy_consents ADD COLUMN IF NOT EXISTS rendered_content_hash VARCHAR(64)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_privacy_consents_doctor "
        "ON privacy_consents(doctor_id)"
    )

    # -------------------------------------------------------------------
    # 5. arco_requests: doctor_id.
    # -------------------------------------------------------------------
    op.execute(
        """
        ALTER TABLE arco_requests
            ADD COLUMN IF NOT EXISTS doctor_id INTEGER
                REFERENCES persons(id) ON DELETE SET NULL
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_arco_requests_doctor ON arco_requests(doctor_id)"
    )

    # -------------------------------------------------------------------
    # 6. Seed: plantilla v1 del aviso paciente-médico.
    # -------------------------------------------------------------------
    op.execute(
        sa.text(
            """
            INSERT INTO privacy_notices (version, title, content, short_summary, effective_date, is_active)
            SELECT :v, :t, :c, :s, CURRENT_DATE, true
            WHERE NOT EXISTS (SELECT 1 FROM privacy_notices WHERE version = :v)
            """
        ).bindparams(
            v="v1",
            t="Aviso de Privacidad del Médico al Paciente",
            c=PATIENT_NOTICE_TEMPLATE_V1,
            s=PATIENT_NOTICE_SHORT_SUMMARY_V1,
        )
    )

    # -------------------------------------------------------------------
    # 7. Seed: legal_documents v1.
    # -------------------------------------------------------------------
    for doc_type, title, content in [
        ("platform_privacy", PLATFORM_PRIVACY_V1_TITLE, PLATFORM_PRIVACY_V1),
        ("tos", TOS_V1_TITLE, TOS_V1),
        ("dpa", DPA_V1_TITLE, DPA_V1),
    ]:
        op.execute(
            sa.text(
                """
                INSERT INTO legal_documents (doc_type, version, title, content, effective_date, is_active)
                SELECT :dt, :v, :t, :c, CURRENT_DATE, true
                WHERE NOT EXISTS (
                    SELECT 1 FROM legal_documents WHERE doc_type = :dt AND version = :v
                )
                """
            ).bindparams(dt=doc_type, v="v1", t=title, c=content)
        )

    # -------------------------------------------------------------------
    # 8. Backfill: privacy_consents de médicos (person_type='doctor') se
    #    migran a legal_acceptances contra platform_privacy v1. El flujo
    #    previo guardaba ahí la aceptación del "Aviso al firmar up".
    #    Producción tiene 0 filas (verificado), esto es defensa en
    #    profundidad para entornos dev.
    # -------------------------------------------------------------------
    op.execute(
        """
        INSERT INTO legal_acceptances (user_id, document_id, accepted_at, ip_address, user_agent, created_at)
        SELECT
            pc.patient_id,  -- en el flujo previo, patient_id = doctor.id para consent de signup
            ld.id,
            pc.consent_date,
            pc.ip_address,
            pc.user_agent,
            pc.created_at
        FROM privacy_consents pc
        JOIN persons p ON p.id = pc.patient_id AND p.person_type = 'doctor'
        JOIN legal_documents ld ON ld.doc_type = 'platform_privacy' AND ld.version = 'v1'
        WHERE pc.consent_given = true
        ON CONFLICT ON CONSTRAINT legal_acceptances_user_doc_unique DO NOTHING
        """
    )

    # Limpiar privacy_consents huérfanos de doctores (ya no pertenecen ahí).
    op.execute(
        """
        DELETE FROM privacy_consents
        WHERE patient_id IN (
            SELECT id FROM persons WHERE person_type = 'doctor'
        )
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_arco_requests_doctor")
    op.execute("ALTER TABLE arco_requests DROP COLUMN IF EXISTS doctor_id")
    op.execute("DROP INDEX IF EXISTS ix_privacy_consents_doctor")
    op.execute("ALTER TABLE privacy_consents DROP COLUMN IF EXISTS rendered_content_hash")
    op.execute("ALTER TABLE privacy_consents DROP COLUMN IF EXISTS doctor_id")
    op.execute("ALTER TABLE persons DROP COLUMN IF EXISTS arco_contact_email")
    op.execute("ALTER TABLE persons DROP COLUMN IF EXISTS legal_address")
    op.drop_index("ix_legal_acceptances_user", table_name="legal_acceptances")
    op.drop_table("legal_acceptances")
    op.drop_index("ix_legal_documents_active_type", table_name="legal_documents")
    op.drop_table("legal_documents")
