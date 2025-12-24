--
-- PostgreSQL database dump
--

\restrict BkRX0kd70X85zRng37HyimugXvyIjhRTRYnfapYvzVWKqlYxPCypoPkJnBHfTmq

-- Dumped from database version 16.11
-- Dumped by pg_dump version 18.1

-- Started on 2025-12-19 12:55:39 CST

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 5 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 273 (class 1259 OID 27368)
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


--
-- TOC entry 272 (class 1259 OID 27145)
-- Name: appointment_reminders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointment_reminders (
    id integer NOT NULL,
    appointment_id integer NOT NULL,
    reminder_number integer NOT NULL,
    offset_minutes integer NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    sent boolean DEFAULT false NOT NULL,
    sent_at timestamp without time zone,
    whatsapp_message_id character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 4633 (class 0 OID 0)
-- Dependencies: 272
-- Name: TABLE appointment_reminders; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.appointment_reminders IS 'Stores up to 3 automatic reminders per appointment. Each reminder can be enabled/disabled independently and has a custom offset_minutes (time before appointment).';


--
-- TOC entry 271 (class 1259 OID 27144)
-- Name: appointment_reminders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.appointment_reminders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4634 (class 0 OID 0)
-- Dependencies: 271
-- Name: appointment_reminders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.appointment_reminders_id_seq OWNED BY public.appointment_reminders.id;


--
-- TOC entry 245 (class 1259 OID 26705)
-- Name: appointment_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointment_types (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- TOC entry 244 (class 1259 OID 26704)
-- Name: appointment_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.appointment_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4635 (class 0 OID 0)
-- Dependencies: 244
-- Name: appointment_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.appointment_types_id_seq OWNED BY public.appointment_types.id;


--
-- TOC entry 247 (class 1259 OID 26716)
-- Name: appointments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointments (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    doctor_id integer NOT NULL,
    appointment_date timestamp without time zone NOT NULL,
    end_time timestamp without time zone NOT NULL,
    appointment_type_id integer NOT NULL,
    office_id integer,
    consultation_type character varying(50) DEFAULT 'Seguimiento'::character varying,
    status character varying(20) DEFAULT 'por_confirmar'::character varying,
    reminder_sent boolean DEFAULT false,
    reminder_sent_at timestamp without time zone,
    auto_reminder_enabled boolean DEFAULT false,
    auto_reminder_offset_minutes integer DEFAULT 360,
    cancelled_reason text,
    cancelled_at timestamp without time zone,
    cancelled_by integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by integer
);


--
-- TOC entry 246 (class 1259 OID 26715)
-- Name: appointments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.appointments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4636 (class 0 OID 0)
-- Dependencies: 246
-- Name: appointments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.appointments_id_seq OWNED BY public.appointments.id;


--
-- TOC entry 265 (class 1259 OID 26919)
-- Name: arco_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.arco_requests (
    id integer NOT NULL,
    patient_id integer,
    request_type character varying(20) NOT NULL,
    description text,
    status character varying(20) DEFAULT 'pending'::character varying,
    response text,
    processed_by integer,
    processed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT arco_requests_request_type_check CHECK (((request_type)::text = ANY ((ARRAY['access'::character varying, 'rectification'::character varying, 'cancellation'::character varying, 'opposition'::character varying])::text[])))
);


--
-- TOC entry 264 (class 1259 OID 26918)
-- Name: arco_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.arco_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4637 (class 0 OID 0)
-- Dependencies: 264
-- Name: arco_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.arco_requests_id_seq OWNED BY public.arco_requests.id;


--
-- TOC entry 259 (class 1259 OID 26866)
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id integer NOT NULL,
    user_id integer,
    user_email character varying(100),
    user_name character varying(200),
    user_type character varying(20),
    action character varying(50) NOT NULL,
    table_name character varying(50),
    record_id integer,
    old_values json,
    new_values json,
    changes_summary text,
    operation_type character varying(50),
    affected_patient_id integer,
    affected_patient_name character varying(200),
    ip_address character varying(45),
    user_agent text,
    session_id character varying(100),
    request_path character varying(500),
    request_method character varying(10),
    success boolean DEFAULT true,
    error_message text,
    security_level character varying(20) DEFAULT 'INFO'::character varying,
    "timestamp" timestamp without time zone DEFAULT now(),
    metadata json
);


--
-- TOC entry 258 (class 1259 OID 26865)
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4638 (class 0 OID 0)
-- Dependencies: 258
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;


--
-- TOC entry 249 (class 1259 OID 26762)
-- Name: clinical_studies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinical_studies (
    id integer NOT NULL,
    consultation_id integer,
    patient_id integer NOT NULL,
    doctor_id integer NOT NULL,
    study_type character varying(50) NOT NULL,
    study_name character varying(200) NOT NULL,
    ordered_date timestamp without time zone NOT NULL,
    performed_date timestamp without time zone,
    status character varying(20) DEFAULT 'ordered'::character varying,
    urgency character varying(20) DEFAULT 'normal'::character varying,
    clinical_indication text,
    ordering_doctor character varying(200),
    file_name character varying(255),
    file_path character varying(500),
    file_type character varying(100),
    file_size integer,
    created_by integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- TOC entry 248 (class 1259 OID 26761)
-- Name: clinical_studies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clinical_studies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4639 (class 0 OID 0)
-- Dependencies: 248
-- Name: clinical_studies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clinical_studies_id_seq OWNED BY public.clinical_studies.id;


--
-- TOC entry 251 (class 1259 OID 26795)
-- Name: consultation_prescriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consultation_prescriptions (
    id integer NOT NULL,
    consultation_id integer NOT NULL,
    medication_id integer NOT NULL,
    dosage character varying(255) NOT NULL,
    frequency character varying(255) NOT NULL,
    duration character varying(255) NOT NULL,
    quantity integer,
    via_administracion character varying(100),
    instructions text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- TOC entry 250 (class 1259 OID 26794)
-- Name: consultation_prescriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.consultation_prescriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4640 (class 0 OID 0)
-- Dependencies: 250
-- Name: consultation_prescriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.consultation_prescriptions_id_seq OWNED BY public.consultation_prescriptions.id;


--
-- TOC entry 255 (class 1259 OID 26823)
-- Name: consultation_vital_signs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consultation_vital_signs (
    id integer NOT NULL,
    consultation_id integer NOT NULL,
    vital_sign_id integer NOT NULL,
    value character varying(100) NOT NULL,
    unit character varying(20),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- TOC entry 254 (class 1259 OID 26822)
-- Name: consultation_vital_signs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.consultation_vital_signs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4641 (class 0 OID 0)
-- Dependencies: 254
-- Name: consultation_vital_signs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.consultation_vital_signs_id_seq OWNED BY public.consultation_vital_signs.id;


--
-- TOC entry 216 (class 1259 OID 26435)
-- Name: countries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.countries (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    phone_code character varying(5),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- TOC entry 215 (class 1259 OID 26434)
-- Name: countries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.countries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4642 (class 0 OID 0)
-- Dependencies: 215
-- Name: countries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.countries_id_seq OWNED BY public.countries.id;


--
-- TOC entry 267 (class 1259 OID 26941)
-- Name: data_retention_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_retention_logs (
    id integer NOT NULL,
    table_name character varying(50) NOT NULL,
    record_id integer NOT NULL,
    retention_period_years integer NOT NULL,
    expiration_date date NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT now()
);


--
-- TOC entry 266 (class 1259 OID 26940)
-- Name: data_retention_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.data_retention_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4643 (class 0 OID 0)
-- Dependencies: 266
-- Name: data_retention_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.data_retention_logs_id_seq OWNED BY public.data_retention_logs.id;


--
-- TOC entry 235 (class 1259 OID 26549)
-- Name: diagnosis_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.diagnosis_catalog (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    code character varying(50),
    category_id integer,
    description text,
    specialty character varying(100),
    severity_level character varying(50),
    is_chronic boolean DEFAULT false,
    is_contagious boolean DEFAULT false,
    age_group character varying(50),
    gender_specific character varying(50),
    is_active boolean DEFAULT true,
    created_by integer DEFAULT 0,
    search_vector tsvector,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- TOC entry 234 (class 1259 OID 26548)
-- Name: diagnosis_catalog_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.diagnosis_catalog_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4644 (class 0 OID 0)
-- Dependencies: 234
-- Name: diagnosis_catalog_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.diagnosis_catalog_id_seq OWNED BY public.diagnosis_catalog.id;


--
-- TOC entry 233 (class 1259 OID 26540)
-- Name: diagnosis_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.diagnosis_categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- TOC entry 4645 (class 0 OID 0)
-- Dependencies: 233
-- Name: TABLE diagnosis_categories; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.diagnosis_categories IS 'Categorías de diagnósticos';


--
-- TOC entry 232 (class 1259 OID 26539)
-- Name: diagnosis_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.diagnosis_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4646 (class 0 OID 0)
-- Dependencies: 232
-- Name: diagnosis_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.diagnosis_categories_id_seq OWNED BY public.diagnosis_categories.id;


--
-- TOC entry 268 (class 1259 OID 26958)
-- Name: diagnosis_search_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.diagnosis_search_view AS
 SELECT dc.id,
    dc.name,
    dc.code,
    dc.description,
    cat.name AS category_name,
    dc.specialty,
    dc.severity_level,
    dc.is_chronic,
    dc.is_contagious,
    dc.age_group,
    dc.gender_specific,
    dc.search_vector
   FROM (public.diagnosis_catalog dc
     LEFT JOIN public.diagnosis_categories cat ON ((dc.category_id = cat.id)))
  WHERE (dc.is_active = true);


--
-- TOC entry 281 (class 1259 OID 27980)
-- Name: document_folio_sequences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_folio_sequences (
    id integer NOT NULL,
    doctor_id integer NOT NULL,
    document_type character varying(50) NOT NULL,
    last_number integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 4647 (class 0 OID 0)
-- Dependencies: 281
-- Name: TABLE document_folio_sequences; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.document_folio_sequences IS 'Secuencias de folios por doctor y tipo de documento';


--
-- TOC entry 280 (class 1259 OID 27979)
-- Name: document_folio_sequences_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.document_folio_sequences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4648 (class 0 OID 0)
-- Dependencies: 280
-- Name: document_folio_sequences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.document_folio_sequences_id_seq OWNED BY public.document_folio_sequences.id;


--
-- TOC entry 283 (class 1259 OID 27998)
-- Name: document_folios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_folios (
    id integer NOT NULL,
    doctor_id integer NOT NULL,
    consultation_id integer NOT NULL,
    document_type character varying(50) NOT NULL,
    folio_number integer NOT NULL,
    formatted_folio character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 4649 (class 0 OID 0)
-- Dependencies: 283
-- Name: TABLE document_folios; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.document_folios IS 'Folios generados para recetas y órdenes de estudio';


--
-- TOC entry 282 (class 1259 OID 27997)
-- Name: document_folios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.document_folios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4650 (class 0 OID 0)
-- Dependencies: 282
-- Name: document_folios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.document_folios_id_seq OWNED BY public.document_folios.id;


--
-- TOC entry 223 (class 1259 OID 26474)
-- Name: document_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_types (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- TOC entry 4651 (class 0 OID 0)
-- Dependencies: 223
-- Name: TABLE document_types; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.document_types IS 'Tipos de documento (Personal, Profesional)';


--
-- TOC entry 222 (class 1259 OID 26473)
-- Name: document_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.document_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4652 (class 0 OID 0)
-- Dependencies: 222
-- Name: document_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.document_types_id_seq OWNED BY public.document_types.id;


--
-- TOC entry 225 (class 1259 OID 26486)
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    document_type_id integer,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- TOC entry 4653 (class 0 OID 0)
-- Dependencies: 225
-- Name: TABLE documents; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.documents IS 'Documentos por tipo (DNI, CURP, Cédula Profesional, etc.)';


--
-- TOC entry 224 (class 1259 OID 26485)
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4654 (class 0 OID 0)
-- Dependencies: 224
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;


--
-- TOC entry 219 (class 1259 OID 26457)
-- Name: emergency_relationships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emergency_relationships (
    code character varying(20) NOT NULL,
    name character varying(50) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- TOC entry 279 (class 1259 OID 27935)
-- Name: google_calendar_event_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.google_calendar_event_mappings (
    id integer NOT NULL,
    appointment_id integer NOT NULL,
    google_event_id character varying(255) NOT NULL,
    doctor_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 278 (class 1259 OID 27934)
-- Name: google_calendar_event_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.google_calendar_event_mappings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4655 (class 0 OID 0)
-- Dependencies: 278
-- Name: google_calendar_event_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.google_calendar_event_mappings_id_seq OWNED BY public.google_calendar_event_mappings.id;


--
-- TOC entry 277 (class 1259 OID 27915)
-- Name: google_calendar_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.google_calendar_tokens (
    id integer NOT NULL,
    doctor_id integer NOT NULL,
    access_token text NOT NULL,
    refresh_token text,
    token_expires_at timestamp without time zone,
    calendar_id character varying(255) DEFAULT 'primary'::character varying,
    sync_enabled boolean DEFAULT true,
    last_sync_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 276 (class 1259 OID 27914)
-- Name: google_calendar_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.google_calendar_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4656 (class 0 OID 0)
-- Dependencies: 276
-- Name: google_calendar_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.google_calendar_tokens_id_seq OWNED BY public.google_calendar_tokens.id;


--
-- TOC entry 275 (class 1259 OID 27884)
-- Name: licenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.licenses (
    id integer NOT NULL,
    doctor_id integer NOT NULL,
    license_type character varying(50) NOT NULL,
    start_date date NOT NULL,
    expiration_date date NOT NULL,
    payment_date date,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by integer,
    CONSTRAINT licenses_license_type_check CHECK (((license_type)::text = ANY ((ARRAY['trial'::character varying, 'basic'::character varying, 'premium'::character varying])::text[]))),
    CONSTRAINT licenses_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'expired'::character varying, 'suspended'::character varying])::text[])))
);


--
-- TOC entry 274 (class 1259 OID 27883)
-- Name: licenses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.licenses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4657 (class 0 OID 0)
-- Dependencies: 274
-- Name: licenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.licenses_id_seq OWNED BY public.licenses.id;


--
-- TOC entry 243 (class 1259 OID 26678)
-- Name: medical_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medical_records (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    doctor_id integer NOT NULL,
    consultation_date timestamp without time zone NOT NULL,
    chief_complaint text NOT NULL,
    history_present_illness text NOT NULL,
    family_history text NOT NULL,
    perinatal_history text NOT NULL,
    gynecological_and_obstetric_history text NOT NULL,
    personal_pathological_history text NOT NULL,
    personal_non_pathological_history text NOT NULL,
    physical_examination text NOT NULL,
    primary_diagnosis text NOT NULL,
    treatment_plan text NOT NULL,
    consultation_type character varying(50) DEFAULT 'Seguimiento'::character varying,
    secondary_diagnoses text,
    prescribed_medications text,
    laboratory_results text,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by integer,
    patient_document_id integer,
    patient_document_value character varying(255),
    follow_up_instructions text DEFAULT ''::text NOT NULL
);


--
-- TOC entry 242 (class 1259 OID 26677)
-- Name: medical_records_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.medical_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4658 (class 0 OID 0)
-- Dependencies: 242
-- Name: medical_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.medical_records_id_seq OWNED BY public.medical_records.id;


--
-- TOC entry 221 (class 1259 OID 26465)
-- Name: medical_specialties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medical_specialties (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- TOC entry 4659 (class 0 OID 0)
-- Dependencies: 221
-- Name: TABLE medical_specialties; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.medical_specialties IS 'Especialidades médicas';


--
-- TOC entry 220 (class 1259 OID 26464)
-- Name: medical_specialties_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.medical_specialties_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4660 (class 0 OID 0)
-- Dependencies: 220
-- Name: medical_specialties_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.medical_specialties_id_seq OWNED BY public.medical_specialties.id;


--
-- TOC entry 231 (class 1259 OID 26527)
-- Name: medications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medications (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by integer DEFAULT 0
);


--
-- TOC entry 230 (class 1259 OID 26526)
-- Name: medications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.medications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4661 (class 0 OID 0)
-- Dependencies: 230
-- Name: medications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.medications_id_seq OWNED BY public.medications.id;


--
-- TOC entry 241 (class 1259 OID 26647)
-- Name: offices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.offices (
    id integer NOT NULL,
    doctor_id integer NOT NULL,
    name character varying(200) NOT NULL,
    address text,
    city character varying(100),
    state_id integer,
    country_id integer,
    postal_code character varying(10),
    phone character varying(20),
    timezone character varying(50) DEFAULT 'America/Mexico_City'::character varying,
    maps_url text,
    is_active boolean DEFAULT true,
    is_virtual boolean DEFAULT false,
    virtual_url character varying(500),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- TOC entry 240 (class 1259 OID 26646)
-- Name: offices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.offices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4662 (class 0 OID 0)
-- Dependencies: 240
-- Name: offices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.offices_id_seq OWNED BY public.offices.id;


--
-- TOC entry 239 (class 1259 OID 26622)
-- Name: person_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.person_documents (
    id integer NOT NULL,
    person_id integer NOT NULL,
    document_id integer NOT NULL,
    document_value character varying(255) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- TOC entry 4663 (class 0 OID 0)
-- Dependencies: 239
-- Name: TABLE person_documents; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.person_documents IS 'Relación normalizada entre personas y documentos';


--
-- TOC entry 238 (class 1259 OID 26621)
-- Name: person_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.person_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4664 (class 0 OID 0)
-- Dependencies: 238
-- Name: person_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.person_documents_id_seq OWNED BY public.person_documents.id;


--
-- TOC entry 237 (class 1259 OID 26571)
-- Name: persons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.persons (
    id integer NOT NULL,
    person_code character varying(20) NOT NULL,
    person_type character varying(20) NOT NULL,
    title character varying(10),
    birth_date date,
    gender character varying(20),
    civil_status character varying(20),
    birth_city character varying(100),
    birth_state_id integer,
    birth_country_id integer,
    email character varying(100),
    primary_phone character varying(20),
    home_address text,
    address_city character varying(100),
    address_state_id integer,
    address_country_id integer,
    address_postal_code character varying(5),
    specialty_id integer,
    university character varying(200),
    graduation_year integer,
    professional_license character varying(50),
    appointment_duration integer,
    insurance_provider character varying(100),
    insurance_number character varying(50),
    emergency_contact_name character varying(200),
    emergency_contact_phone character varying(20),
    emergency_contact_relationship character varying(20),
    hashed_password character varying(255),
    is_active boolean DEFAULT true,
    last_login timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by integer,
    name character varying(200) NOT NULL,
    avatar_type character varying(50),
    avatar_template_key character varying(100),
    avatar_file_path character varying(500),
    CONSTRAINT persons_person_type_check CHECK (((person_type)::text = ANY ((ARRAY['doctor'::character varying, 'patient'::character varying, 'admin'::character varying])::text[])))
);


--
-- TOC entry 236 (class 1259 OID 26570)
-- Name: persons_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.persons_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4665 (class 0 OID 0)
-- Dependencies: 236
-- Name: persons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.persons_id_seq OWNED BY public.persons.id;


--
-- TOC entry 263 (class 1259 OID 26899)
-- Name: privacy_consents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.privacy_consents (
    id integer NOT NULL,
    patient_id integer,
    notice_id integer,
    consent_given boolean NOT NULL,
    consent_date timestamp without time zone NOT NULL,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- TOC entry 262 (class 1259 OID 26898)
-- Name: privacy_consents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.privacy_consents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4666 (class 0 OID 0)
-- Dependencies: 262
-- Name: privacy_consents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.privacy_consents_id_seq OWNED BY public.privacy_consents.id;


--
-- TOC entry 261 (class 1259 OID 26888)
-- Name: privacy_notices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.privacy_notices (
    id integer NOT NULL,
    version character varying(20) NOT NULL,
    title character varying(200) NOT NULL,
    content text NOT NULL,
    effective_date date NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- TOC entry 260 (class 1259 OID 26887)
-- Name: privacy_notices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.privacy_notices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4667 (class 0 OID 0)
-- Dependencies: 260
-- Name: privacy_notices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.privacy_notices_id_seq OWNED BY public.privacy_notices.id;


--
-- TOC entry 257 (class 1259 OID 26842)
-- Name: schedule_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schedule_templates (
    id integer NOT NULL,
    doctor_id integer,
    office_id integer NOT NULL,
    day_of_week integer NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    consultation_duration integer,
    break_duration integer,
    lunch_start time without time zone,
    lunch_end time without time zone,
    time_blocks jsonb DEFAULT '[]'::jsonb,
    CONSTRAINT schedule_templates_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6)))
);


--
-- TOC entry 4668 (class 0 OID 0)
-- Dependencies: 257
-- Name: COLUMN schedule_templates.office_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_templates.office_id IS 'Reference to office/consultorio';


--
-- TOC entry 4669 (class 0 OID 0)
-- Dependencies: 257
-- Name: COLUMN schedule_templates.consultation_duration; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_templates.consultation_duration IS 'Duration of each consultation in minutes (default: 30)';


--
-- TOC entry 4670 (class 0 OID 0)
-- Dependencies: 257
-- Name: COLUMN schedule_templates.break_duration; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_templates.break_duration IS 'Break time between consultations in minutes (default: 0)';


--
-- TOC entry 4671 (class 0 OID 0)
-- Dependencies: 257
-- Name: COLUMN schedule_templates.lunch_start; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_templates.lunch_start IS 'Lunch break start time';


--
-- TOC entry 4672 (class 0 OID 0)
-- Dependencies: 257
-- Name: COLUMN schedule_templates.lunch_end; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_templates.lunch_end IS 'Lunch break end time';


--
-- TOC entry 4673 (class 0 OID 0)
-- Dependencies: 257
-- Name: COLUMN schedule_templates.time_blocks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_templates.time_blocks IS 'Array of time blocks in JSON format: [{"start_time": "09:00", "end_time": "12:00", "is_active": true}, ...]';


--
-- TOC entry 256 (class 1259 OID 26841)
-- Name: schedule_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.schedule_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4674 (class 0 OID 0)
-- Dependencies: 256
-- Name: schedule_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.schedule_templates_id_seq OWNED BY public.schedule_templates.id;


--
-- TOC entry 218 (class 1259 OID 26444)
-- Name: states; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.states (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    country_id integer,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- TOC entry 217 (class 1259 OID 26443)
-- Name: states_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.states_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4675 (class 0 OID 0)
-- Dependencies: 217
-- Name: states_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.states_id_seq OWNED BY public.states.id;


--
-- TOC entry 229 (class 1259 OID 26512)
-- Name: study_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.study_catalog (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    code character varying(50),
    category_id integer NOT NULL,
    specialty character varying(100),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- TOC entry 228 (class 1259 OID 26511)
-- Name: study_catalog_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.study_catalog_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4676 (class 0 OID 0)
-- Dependencies: 228
-- Name: study_catalog_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.study_catalog_id_seq OWNED BY public.study_catalog.id;


--
-- TOC entry 227 (class 1259 OID 26503)
-- Name: study_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.study_categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- TOC entry 226 (class 1259 OID 26502)
-- Name: study_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.study_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4677 (class 0 OID 0)
-- Dependencies: 226
-- Name: study_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.study_categories_id_seq OWNED BY public.study_categories.id;


--
-- TOC entry 270 (class 1259 OID 26968)
-- Name: v_data_retention_expiring; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_data_retention_expiring AS
 SELECT table_name,
    record_id,
    expiration_date,
    retention_period_years,
    status
   FROM public.data_retention_logs
  WHERE (((status)::text = 'active'::text) AND (expiration_date <= (CURRENT_DATE + '30 days'::interval)))
  ORDER BY expiration_date;


--
-- TOC entry 269 (class 1259 OID 26963)
-- Name: v_data_retention_stats; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_data_retention_stats AS
 SELECT table_name,
    count(*) AS total_records,
    count(
        CASE
            WHEN ((status)::text = 'active'::text) THEN 1
            ELSE NULL::integer
        END) AS active_records,
    count(
        CASE
            WHEN ((status)::text = 'expired'::text) THEN 1
            ELSE NULL::integer
        END) AS expired_records,
    min(expiration_date) AS earliest_expiration,
    max(expiration_date) AS latest_expiration
   FROM public.data_retention_logs
  GROUP BY table_name;


--
-- TOC entry 253 (class 1259 OID 26815)
-- Name: vital_signs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vital_signs (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- TOC entry 252 (class 1259 OID 26814)
-- Name: vital_signs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vital_signs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4678 (class 0 OID 0)
-- Dependencies: 252
-- Name: vital_signs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vital_signs_id_seq OWNED BY public.vital_signs.id;


--
-- TOC entry 4213 (class 2604 OID 27148)
-- Name: appointment_reminders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_reminders ALTER COLUMN id SET DEFAULT nextval('public.appointment_reminders_id_seq'::regclass);


--
-- TOC entry 4170 (class 2604 OID 26708)
-- Name: appointment_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_types ALTER COLUMN id SET DEFAULT nextval('public.appointment_types_id_seq'::regclass);


--
-- TOC entry 4173 (class 2604 OID 26719)
-- Name: appointments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments ALTER COLUMN id SET DEFAULT nextval('public.appointments_id_seq'::regclass);


--
-- TOC entry 4207 (class 2604 OID 26922)
-- Name: arco_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arco_requests ALTER COLUMN id SET DEFAULT nextval('public.arco_requests_id_seq'::regclass);


--
-- TOC entry 4198 (class 2604 OID 26869)
-- Name: audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);


--
-- TOC entry 4181 (class 2604 OID 26765)
-- Name: clinical_studies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_studies ALTER COLUMN id SET DEFAULT nextval('public.clinical_studies_id_seq'::regclass);


--
-- TOC entry 4186 (class 2604 OID 26798)
-- Name: consultation_prescriptions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_prescriptions ALTER COLUMN id SET DEFAULT nextval('public.consultation_prescriptions_id_seq'::regclass);


--
-- TOC entry 4190 (class 2604 OID 26826)
-- Name: consultation_vital_signs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_vital_signs ALTER COLUMN id SET DEFAULT nextval('public.consultation_vital_signs_id_seq'::regclass);


--
-- TOC entry 4110 (class 2604 OID 26438)
-- Name: countries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.countries ALTER COLUMN id SET DEFAULT nextval('public.countries_id_seq'::regclass);


--
-- TOC entry 4210 (class 2604 OID 26944)
-- Name: data_retention_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_retention_logs ALTER COLUMN id SET DEFAULT nextval('public.data_retention_logs_id_seq'::regclass);


--
-- TOC entry 4144 (class 2604 OID 26552)
-- Name: diagnosis_catalog id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnosis_catalog ALTER COLUMN id SET DEFAULT nextval('public.diagnosis_catalog_id_seq'::regclass);


--
-- TOC entry 4141 (class 2604 OID 26543)
-- Name: diagnosis_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnosis_categories ALTER COLUMN id SET DEFAULT nextval('public.diagnosis_categories_id_seq'::regclass);


--
-- TOC entry 4231 (class 2604 OID 27983)
-- Name: document_folio_sequences id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_folio_sequences ALTER COLUMN id SET DEFAULT nextval('public.document_folio_sequences_id_seq'::regclass);


--
-- TOC entry 4235 (class 2604 OID 28001)
-- Name: document_folios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_folios ALTER COLUMN id SET DEFAULT nextval('public.document_folios_id_seq'::regclass);


--
-- TOC entry 4121 (class 2604 OID 26477)
-- Name: document_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_types ALTER COLUMN id SET DEFAULT nextval('public.document_types_id_seq'::regclass);


--
-- TOC entry 4125 (class 2604 OID 26489)
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


--
-- TOC entry 4228 (class 2604 OID 27938)
-- Name: google_calendar_event_mappings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_calendar_event_mappings ALTER COLUMN id SET DEFAULT nextval('public.google_calendar_event_mappings_id_seq'::regclass);


--
-- TOC entry 4223 (class 2604 OID 27918)
-- Name: google_calendar_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_calendar_tokens ALTER COLUMN id SET DEFAULT nextval('public.google_calendar_tokens_id_seq'::regclass);


--
-- TOC entry 4218 (class 2604 OID 27887)
-- Name: licenses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licenses ALTER COLUMN id SET DEFAULT nextval('public.licenses_id_seq'::regclass);


--
-- TOC entry 4165 (class 2604 OID 26681)
-- Name: medical_records id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_records ALTER COLUMN id SET DEFAULT nextval('public.medical_records_id_seq'::regclass);


--
-- TOC entry 4118 (class 2604 OID 26468)
-- Name: medical_specialties id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_specialties ALTER COLUMN id SET DEFAULT nextval('public.medical_specialties_id_seq'::regclass);


--
-- TOC entry 4136 (class 2604 OID 26530)
-- Name: medications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medications ALTER COLUMN id SET DEFAULT nextval('public.medications_id_seq'::regclass);


--
-- TOC entry 4159 (class 2604 OID 26650)
-- Name: offices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offices ALTER COLUMN id SET DEFAULT nextval('public.offices_id_seq'::regclass);


--
-- TOC entry 4155 (class 2604 OID 26625)
-- Name: person_documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_documents ALTER COLUMN id SET DEFAULT nextval('public.person_documents_id_seq'::regclass);


--
-- TOC entry 4151 (class 2604 OID 26574)
-- Name: persons id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persons ALTER COLUMN id SET DEFAULT nextval('public.persons_id_seq'::regclass);


--
-- TOC entry 4205 (class 2604 OID 26902)
-- Name: privacy_consents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.privacy_consents ALTER COLUMN id SET DEFAULT nextval('public.privacy_consents_id_seq'::regclass);


--
-- TOC entry 4202 (class 2604 OID 26891)
-- Name: privacy_notices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.privacy_notices ALTER COLUMN id SET DEFAULT nextval('public.privacy_notices_id_seq'::regclass);


--
-- TOC entry 4193 (class 2604 OID 26845)
-- Name: schedule_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_templates ALTER COLUMN id SET DEFAULT nextval('public.schedule_templates_id_seq'::regclass);


--
-- TOC entry 4113 (class 2604 OID 26447)
-- Name: states id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.states ALTER COLUMN id SET DEFAULT nextval('public.states_id_seq'::regclass);


--
-- TOC entry 4132 (class 2604 OID 26515)
-- Name: study_catalog id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_catalog ALTER COLUMN id SET DEFAULT nextval('public.study_catalog_id_seq'::regclass);


--
-- TOC entry 4129 (class 2604 OID 26506)
-- Name: study_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_categories ALTER COLUMN id SET DEFAULT nextval('public.study_categories_id_seq'::regclass);


--
-- TOC entry 4188 (class 2604 OID 26818)
-- Name: vital_signs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vital_signs ALTER COLUMN id SET DEFAULT nextval('public.vital_signs_id_seq'::regclass);


--
-- TOC entry 4617 (class 0 OID 27368)
-- Dependencies: 273
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.alembic_version (version_num) FROM stdin;
d5be39ff35bc
\.


--
-- TOC entry 4616 (class 0 OID 27145)
-- Dependencies: 272
-- Data for Name: appointment_reminders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.appointment_reminders (id, appointment_id, reminder_number, offset_minutes, enabled, sent, sent_at, whatsapp_message_id, created_at, updated_at) FROM stdin;
5	1	1	650	t	f	\N	\N	2025-12-16 04:08:47.701945	2025-12-16 04:08:47.701952
14	3	1	240	t	t	2025-12-18 23:50:26.623836	\N	2025-12-16 18:02:24.336317	2025-12-18 23:50:26.624775
17	12	1	5425	t	t	2025-12-19 02:35:05.403214	\N	2025-12-18 20:31:39.885045	2025-12-19 02:35:05.458735
9	2	1	575	t	f	\N	\N	2025-12-16 05:26:06.790263	2025-12-16 05:26:06.79028
18	13	1	708	t	t	2025-12-19 03:12:02.449312	\N	2025-12-19 03:09:14.716487	2025-12-19 03:12:02.535181
\.


--
-- TOC entry 4592 (class 0 OID 26705)
-- Dependencies: 245
-- Data for Name: appointment_types; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.appointment_types (id, name, is_active, created_at) FROM stdin;
1	Presencial	t	2025-12-09 19:29:05.605183
2	En línea	t	2025-12-09 19:29:05.605183
\.


--
-- TOC entry 4594 (class 0 OID 26716)
-- Dependencies: 247
-- Data for Name: appointments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.appointments (id, patient_id, doctor_id, appointment_date, end_time, appointment_type_id, office_id, consultation_type, status, reminder_sent, reminder_sent_at, auto_reminder_enabled, auto_reminder_offset_minutes, cancelled_reason, cancelled_at, cancelled_by, created_at, updated_at, created_by) FROM stdin;
12	6	1	2025-12-22 15:00:00	2025-12-22 16:00:00	1	1	Seguimiento	por_confirmar	f	\N	f	360	\N	\N	\N	2025-12-18 18:26:26.494069	2025-12-18 20:31:39.129526	\N
3	6	1	2025-12-18 20:00:00	2025-12-16 20:00:00	1	1	Seguimiento	cancelada	f	\N	f	360	\N	\N	\N	2025-12-16 05:26:51.7605	2025-12-19 03:05:03.123659	\N
13	6	1	2025-12-19 09:00:00	2025-12-19 10:00:00	1	1	Seguimiento	por_confirmar	f	\N	f	360	\N	\N	\N	2025-12-19 03:09:13.221154	2025-12-19 03:09:13.221163	\N
1	6	1	2025-12-16 15:00:00	2025-12-16 16:00:00	1	1	Seguimiento	cancelada	f	\N	f	360	\N	\N	\N	2025-12-15 21:32:06.72719	2025-12-16 04:08:48.184177	\N
2	6	1	2025-12-16 15:00:00	2025-12-16 16:00:00	1	1	Seguimiento	cancelada	f	\N	f	360	\N	\N	\N	2025-12-16 04:49:42.997474	2025-12-16 05:26:07.170427	\N
4	6	1	2025-12-17 17:00:00	2025-12-17 18:00:00	1	1	Seguimiento	completed	f	\N	f	360	\N	\N	\N	2025-12-16 19:22:48.94934	2025-12-16 21:39:00.607487	\N
5	6	1	2025-12-17 16:00:00	2025-12-17 17:00:00	1	1	Seguimiento	completed	f	\N	f	360	\N	\N	\N	2025-12-16 21:38:51.915287	2025-12-17 16:11:42.651202	\N
6	6	1	2025-12-17 09:00:00	2025-12-17 10:00:00	1	1	Seguimiento	completed	f	\N	f	360	\N	\N	\N	2025-12-17 16:12:08.51386	2025-12-17 19:17:28.1851	\N
11	6	1	2025-12-18 13:00:00	2025-12-18 14:00:00	1	1	Seguimiento	cancelada	f	\N	f	360	\N	\N	\N	2025-12-18 18:23:53.379536	2025-12-18 18:25:07.30711	\N
10	6	1	2025-12-18 14:00:00	2025-12-18 15:00:00	1	1	Seguimiento	cancelada	f	\N	f	360	\N	\N	\N	2025-12-18 18:08:09.979013	2025-12-18 18:25:09.939665	\N
9	6	1	2025-12-18 16:00:00	2025-12-18 17:00:00	1	1	Seguimiento	cancelada	f	\N	f	360	\N	\N	\N	2025-12-18 17:56:37.979596	2025-12-18 18:25:11.020004	\N
7	6	1	2025-12-18 19:00:00	2025-12-18 20:00:00	1	1	Seguimiento	cancelada	f	\N	f	360	\N	\N	\N	2025-12-17 19:17:22.155522	2025-12-18 18:25:12.437523	\N
8	6	1	2025-12-19 15:00:00	2025-12-19 16:00:00	1	1	Seguimiento	cancelada	f	\N	f	360	\N	\N	\N	2025-12-18 16:18:48.106555	2025-12-18 18:43:04.190215	\N
\.


--
-- TOC entry 4612 (class 0 OID 26919)
-- Dependencies: 265
-- Data for Name: arco_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.arco_requests (id, patient_id, request_type, description, status, response, processed_by, processed_at, created_at) FROM stdin;
\.


--
-- TOC entry 4606 (class 0 OID 26866)
-- Dependencies: 259
-- Data for Name: audit_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_log (id, user_id, user_email, user_name, user_type, action, table_name, record_id, old_values, new_values, changes_summary, operation_type, affected_patient_id, affected_patient_name, ip_address, user_agent, session_id, request_path, request_method, success, error_message, security_level, "timestamp", metadata) FROM stdin;
1	\N	SYSTEM	SYSTEM	system	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	/api/auth/login	POST	f	Credenciales inválidas	WARNING	2025-12-11 00:05:45.697407	{"login_attempt": true, "change_folio": "AL-51A206A8E2DC"}
2	\N	SYSTEM	SYSTEM	system	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	/api/auth/login	POST	f	Credenciales inválidas	WARNING	2025-12-11 00:06:31.91809	{"login_attempt": true, "change_folio": "AL-EFD16C57DB42"}
3	\N	SYSTEM	SYSTEM	system	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.2	Mozilla/5.0 (iPhone; CPU iPhone OS 18_6_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/143.0.7499.92 Mobile/15E148 Safari/604.1	\N	/api/auth/login	POST	f	Credenciales inválidas	WARNING	2025-12-11 01:12:25.758892	{"login_attempt": true, "change_folio": "AL-9552023661E6"}
4	\N	SYSTEM	SYSTEM	system	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	/api/auth/login	POST	f	Credenciales inválidas	WARNING	2025-12-11 15:49:31.104713	{"login_attempt": true, "change_folio": "AL-14473D908F93"}
5	\N	SYSTEM	SYSTEM	system	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	/api/auth/login	POST	f	Credenciales inválidas	WARNING	2025-12-11 15:49:35.282987	{"login_attempt": true, "change_folio": "AL-F959DBB49E35"}
6	\N	SYSTEM	SYSTEM	system	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	/api/auth/login	POST	f	Credenciales inválidas	WARNING	2025-12-11 17:59:46.101193	{"login_attempt": true, "change_folio": "AL-8C4D80E98304"}
7	\N	SYSTEM	SYSTEM	system	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	/api/auth/login	POST	f	Credenciales inválidas	WARNING	2025-12-11 18:07:11.250925	{"login_attempt": true, "change_folio": "AL-FD03B333FFCB"}
8	\N	SYSTEM	SYSTEM	system	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	/api/auth/login	POST	f	Credenciales inválidas	WARNING	2025-12-11 18:21:19.953993	{"login_attempt": true, "change_folio": "AL-293481298C4E"}
9	\N	SYSTEM	SYSTEM	system	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	/api/auth/login	POST	f	Internal server error	WARNING	2025-12-11 18:31:32.686888	{"login_attempt": true, "change_folio": "AL-EC5450FB8660"}
10	\N	SYSTEM	SYSTEM	system	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	/api/auth/login	POST	f	Internal server error	WARNING	2025-12-11 18:31:56.065396	{"login_attempt": true, "change_folio": "AL-2DCAE843C914"}
11	\N	SYSTEM	SYSTEM	system	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	/api/auth/login	POST	f	Internal server error	WARNING	2025-12-11 18:32:11.835804	{"login_attempt": true, "change_folio": "AL-1C0A8C352EC6"}
12	\N	SYSTEM	SYSTEM	system	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	/api/auth/login	POST	f	Internal server error	WARNING	2025-12-11 19:22:57.578375	{"login_attempt": true, "change_folio": "AL-82E6318B09BB"}
13	\N	SYSTEM	SYSTEM	system	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	/api/auth/login	POST	f	Internal server error	WARNING	2025-12-11 19:22:59.092707	{"login_attempt": true, "change_folio": "AL-944961584FF1"}
14	\N	SYSTEM	SYSTEM	system	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	/api/auth/login	POST	f	Credenciales inválidas	WARNING	2025-12-11 19:29:52.236234	{"login_attempt": true, "change_folio": "AL-79CF42BD776B"}
15	\N	SYSTEM	SYSTEM	system	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	/api/auth/login	POST	f	Credenciales inválidas	WARNING	2025-12-11 19:29:58.736849	{"login_attempt": true, "change_folio": "AL-095A4E8F390B"}
16	\N	SYSTEM	SYSTEM	system	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	/api/auth/login	POST	f	Internal server error	WARNING	2025-12-11 19:30:10.998654	{"login_attempt": true, "change_folio": "AL-5D88ABC186D4"}
17	\N	SYSTEM	SYSTEM	system	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	/api/auth/login	POST	f	Internal server error	WARNING	2025-12-11 19:44:30.114597	{"login_attempt": true, "change_folio": "AL-AA6C8CC284F5"}
18	\N	SYSTEM	SYSTEM	system	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	/api/auth/login	POST	f	Internal server error	WARNING	2025-12-11 19:44:53.215766	{"login_attempt": true, "change_folio": "AL-F613609393A8"}
19	\N	SYSTEM	SYSTEM	system	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	/api/auth/login	POST	f	Internal server error	WARNING	2025-12-11 19:45:20.478997	{"login_attempt": true, "change_folio": "AL-372451DD58C1"}
20	\N	SYSTEM	SYSTEM	system	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	/api/auth/login	POST	f	License validation failed: No active license found. Please contact administrator.	WARNING	2025-12-11 20:02:43.85636	{"login_attempt": true, "change_folio": "AL-E0E5FD528A2E"}
21	\N	SYSTEM	SYSTEM	system	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	/api/auth/login	POST	f	No active license found. Please contact administrator.	WARNING	2025-12-11 20:02:44.22044	{"login_attempt": true, "change_folio": "AL-B7721724DA4C"}
22	\N	SYSTEM	SYSTEM	system	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	/api/auth/login	POST	f	License validation failed: No active license found. Please contact administrator.	WARNING	2025-12-11 20:02:45.522539	{"login_attempt": true, "change_folio": "AL-BC20AF4784D3"}
23	\N	SYSTEM	SYSTEM	system	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	/api/auth/login	POST	f	No active license found. Please contact administrator.	WARNING	2025-12-11 20:02:45.675244	{"login_attempt": true, "change_folio": "AL-78B62033AA27"}
24	\N	SYSTEM	SYSTEM	system	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	/api/auth/login	POST	f	Credenciales inválidas	WARNING	2025-12-11 20:04:48.817847	{"login_attempt": true, "change_folio": "AL-22668EC446D4"}
25	\N	SYSTEM	SYSTEM	system	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	/api/auth/login	POST	f	Credenciales inválidas	WARNING	2025-12-11 20:41:49.20966	{"login_attempt": true, "change_folio": "AL-FF7331F166F5"}
26	\N	SYSTEM	SYSTEM	system	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	/api/auth/login	POST	f	Credenciales inválidas	WARNING	2025-12-11 20:41:56.831285	{"login_attempt": true, "change_folio": "AL-53338AAE8F4F"}
27	\N	SYSTEM	SYSTEM	system	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	/api/auth/login	POST	f	Credenciales inválidas	WARNING	2025-12-11 21:08:05.538588	{"login_attempt": true, "change_folio": "AL-4DF4BAA875EE"}
28	\N	SYSTEM	SYSTEM	system	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	/api/auth/login	POST	f	Credenciales inválidas	WARNING	2025-12-11 21:08:10.945766	{"login_attempt": true, "change_folio": "AL-91BB82133722"}
29	\N	SYSTEM	SYSTEM	system	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	/api/auth/login	POST	f	Credenciales inválidas	WARNING	2025-12-11 21:11:04.378728	{"login_attempt": true, "change_folio": "AL-D8B8383213E8"}
30	\N	SYSTEM	SYSTEM	system	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	/api/auth/login	POST	f	Credenciales inválidas	WARNING	2025-12-11 21:11:09.076945	{"login_attempt": true, "change_folio": "AL-A547CAF0CFC4"}
31	\N	SYSTEM	SYSTEM	system	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	/api/auth/login	POST	f	Credenciales inválidas	WARNING	2025-12-11 21:27:09.382736	{"login_attempt": true, "change_folio": "AL-C34CFA3805C7"}
32	\N	SYSTEM	SYSTEM	system	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	/api/auth/login	POST	f	Credenciales inválidas	WARNING	2025-12-11 21:29:41.744969	{"login_attempt": true, "change_folio": "AL-442EE06774C2"}
33	\N	SYSTEM	SYSTEM	system	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	/api/auth/login	POST	f	Credenciales inválidas	WARNING	2025-12-11 21:29:47.159999	{"login_attempt": true, "change_folio": "AL-5DAD8AE7B115"}
34	\N	SYSTEM	SYSTEM	system	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	/api/auth/login	POST	f	License validation failed: No active license found. Please contact administrator.	WARNING	2025-12-11 21:29:53.887442	{"login_attempt": true, "change_folio": "AL-D73A49368387"}
35	\N	SYSTEM	SYSTEM	system	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	/api/auth/login	POST	f	No active license found. Please contact administrator.	WARNING	2025-12-11 21:29:54.028213	{"login_attempt": true, "change_folio": "AL-17F914D35022"}
36	\N	SYSTEM	SYSTEM	system	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	/api/auth/login	POST	f	Credenciales inválidas	WARNING	2025-12-11 21:30:00.089198	{"login_attempt": true, "change_folio": "AL-1F59B2E42787"}
37	\N	SYSTEM	SYSTEM	system	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	/api/auth/login	POST	f	Credenciales inválidas	WARNING	2025-12-11 21:30:06.180781	{"login_attempt": true, "change_folio": "AL-33702AC93F17"}
38	0	SYSTEM	SYSTEM	system	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	/api/auth/login	POST	t	\N	INFO	2025-12-11 21:30:44.029871	{"login_attempt": true, "change_folio": "AL-2DA69B60AEAA"}
39	1	adriana.morenoh@outlook.es	Gloria Adriana Moreno Hernandez	doctor	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	/api/auth/login	POST	t	\N	INFO	2025-12-11 21:32:11.633737	{"login_attempt": true, "change_folio": "AL-D0B54E55CFBA"}
40	1	adriana.morenoh@outlook.es	Gloria Adriana Moreno Hernandez	doctor	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	/api/auth/login	POST	t	\N	INFO	2025-12-12 00:52:34.687683	{"login_attempt": true, "change_folio": "AL-F1B090708104"}
41	1	adriana.morenoh@outlook.es	Gloria Adriana Moreno Hernandez	doctor	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	/api/auth/login	POST	t	\N	INFO	2025-12-12 00:53:16.586881	{"login_attempt": true, "change_folio": "AL-DDBB2C4CA9B2"}
42	1	adriana.morenoh@outlook.es	Gloria Adriana Moreno Hernandez	doctor	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	/api/auth/login	POST	t	\N	INFO	2025-12-12 00:53:17.762093	{"login_attempt": true, "change_folio": "AL-B082C6A45156"}
43	1	adriana.morenoh@outlook.es	Gloria Adriana Moreno Hernandez	doctor	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	/api/auth/login	POST	t	\N	INFO	2025-12-12 19:04:32.527166	{"login_attempt": true, "change_folio": "AL-8EE6427089D9"}
44	1	adriana.morenoh@outlook.es	Gloria Adriana Moreno Hernandez	doctor	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	/api/auth/login	POST	t	\N	INFO	2025-12-15 18:35:15.984266	{"login_attempt": true, "change_folio": "AL-6CF9218F3D8A"}
45	1	adriana.morenoh@outlook.es	Gloria Adriana Moreno Hernandez	doctor	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	/api/auth/login	POST	t	\N	INFO	2025-12-16 19:21:42.925035	{"login_attempt": true, "change_folio": "AL-5970BD74D9FD"}
46	1	adriana.morenoh@outlook.es	Gloria Adriana Moreno Hernandez	doctor	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	/api/auth/login	POST	t	\N	INFO	2025-12-16 20:29:36.17605	{"login_attempt": true, "change_folio": "AL-B66373CC0848"}
47	1	adriana.morenoh@outlook.es	Gloria Adriana Moreno Hernandez	doctor	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	/api/auth/login	POST	t	\N	INFO	2025-12-16 20:34:12.117835	{"login_attempt": true, "change_folio": "AL-0E2E3034AA44"}
48	1	adriana.morenoh@outlook.es	Gloria Adriana Moreno Hernandez	doctor	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	/api/auth/login	POST	t	\N	INFO	2025-12-16 20:34:12.911727	{"login_attempt": true, "change_folio": "AL-66F783B50408"}
49	1	adriana.morenoh@outlook.es	Gloria Adriana Moreno Hernandez	doctor	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	/api/auth/login	POST	t	\N	INFO	2025-12-16 20:34:14.009245	{"login_attempt": true, "change_folio": "AL-A6E153DAC02C"}
50	1	adriana.morenoh@outlook.es	Gloria Adriana Moreno Hernandez	doctor	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	/api/auth/login	POST	t	\N	INFO	2025-12-16 20:34:15.293879	{"login_attempt": true, "change_folio": "AL-A1D4E1870F76"}
51	1	adriana.morenoh@outlook.es	Gloria Adriana Moreno Hernandez	doctor	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	/api/auth/login	POST	t	\N	INFO	2025-12-16 20:35:17.499739	{"login_attempt": true, "change_folio": "AL-7058A70235A5"}
52	1	adriana.morenoh@outlook.es	Gloria Adriana Moreno Hernandez	doctor	UPDATE	persons	6	{"id": 6, "person_code": "PAT000001", "person_type": "patient", "title": null, "name": "Jose Garcia", "birth_date": null, "gender": null, "civil_status": null, "birth_city": null, "birth_state_id": null, "birth_country_id": null, "email": null, "primary_phone": "+525579449672", "avatar_type": "initials", "avatar_template_key": null, "avatar_file_path": null, "home_address": null, "address_city": null, "address_state_id": null, "address_country_id": null, "address_postal_code": null, "appointment_duration": null, "specialty_id": null, "university": null, "graduation_year": null, "insurance_provider": null, "insurance_number": null, "emergency_contact_name": null, "emergency_contact_phone": null, "emergency_contact_relationship": null, "hashed_password": "***REDACTED***", "is_active": true, "last_login": null, "created_at": "2025-12-15T21:32:06.134628", "created_by": 1}	{"id": 6, "person_code": "PAT000001", "person_type": "patient", "title": null, "name": "Jose Garcia", "birth_date": null, "gender": "Masculino", "civil_status": null, "birth_city": null, "birth_state_id": null, "birth_country_id": null, "email": null, "primary_phone": "+525579449672", "avatar_type": "initials", "avatar_template_key": null, "avatar_file_path": null, "home_address": null, "address_city": null, "address_state_id": null, "address_country_id": null, "address_postal_code": null, "appointment_duration": null, "specialty_id": null, "university": null, "graduation_year": null, "insurance_provider": null, "insurance_number": null, "emergency_contact_name": null, "emergency_contact_phone": null, "emergency_contact_relationship": null, "hashed_password": "***REDACTED***", "is_active": true, "last_login": null, "created_at": "2025-12-15T21:32:06.134628", "updated_at": "2025-12-16T21:38:58.827079", "created_by": 1}	gender: 'None' → 'Masculino'	patient_update	6	Jose Garcia	10.0.2.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	/api/patients/6	PUT	t	\N	INFO	2025-12-16 21:38:59.043271	{"change_folio": "AL-9AED579F313C"}
53	1	adriana.morenoh@outlook.es	Gloria Adriana Moreno Hernandez	doctor	CREATE	medical_records	1	null	{"patient_id": 6, "consultation_date": "2025-12-16 15:37:33", "consultation_type": "Seguimiento", "primary_diagnosis": "CIE-10: O03.9 - Aborto espont\\u00e1neo, incompleto, sin complicaciones, no especificado"}	Creación de nuevo registro con 4 campos	consultation_create	6	Jose Garcia	10.0.2.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	/api/consultations	POST	t	\N	INFO	2025-12-16 21:39:00.866607	{"change_folio": "AL-88E4B1D4CFA3"}
54	1	adriana.morenoh@outlook.es	Gloria Adriana Moreno Hernandez	doctor	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	/api/auth/login	POST	t	\N	INFO	2025-12-16 23:52:36.590789	{"login_attempt": true, "change_folio": "AL-8BEC401FEF49"}
55	1	adriana.morenoh@outlook.es	Gloria Adriana Moreno Hernandez	doctor	DELETE	clinical_studies	1	{"id": 1, "consultation_id": 1, "patient_id": 6, "doctor_id": 1, "study_type": "hematologia", "study_name": "Hemograma Completo", "ordered_date": "2025-12-16T00:00:00", "performed_date": null, "status": "ordered", "urgency": "routine", "clinical_indication": "", "ordering_doctor": "Lic. Lic. Gloria Adriana Moreno Hernandez", "file_name": null, "file_path": null, "file_type": null, "file_size": null, "created_at": "2025-12-16T21:39:04.505968", "updated_at": "2025-12-16T21:39:04.505976", "created_by": 1}	null	Eliminación de registro	clinical_study_delete	6	Jose Garcia	10.0.2.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	/api/clinical-studies/1	DELETE	t	\N	INFO	2025-12-17 16:10:28.634077	{"consultation_id": 1, "change_folio": "AL-C17C12A98BF3"}
56	1	adriana.morenoh@outlook.es	Gloria Adriana Moreno Hernandez	doctor	UPDATE	persons	6	{"id": 6, "person_code": "PAT000001", "person_type": "patient", "title": null, "name": "Jose Garcia", "birth_date": null, "gender": "Masculino", "civil_status": null, "birth_city": null, "birth_state_id": null, "birth_country_id": null, "email": null, "primary_phone": "+525579449672", "avatar_type": "initials", "avatar_template_key": null, "avatar_file_path": null, "home_address": null, "address_city": null, "address_state_id": null, "address_country_id": null, "address_postal_code": null, "appointment_duration": null, "specialty_id": null, "university": null, "graduation_year": null, "insurance_provider": null, "insurance_number": null, "emergency_contact_name": null, "emergency_contact_phone": null, "emergency_contact_relationship": null, "hashed_password": "***REDACTED***", "is_active": true, "last_login": null, "created_at": "2025-12-15T21:32:06.134628", "created_by": 1}	{"id": 6, "person_code": "PAT000001", "person_type": "patient", "title": null, "name": "Jose Garcia", "birth_date": null, "gender": "Masculino", "civil_status": null, "birth_city": null, "birth_state_id": null, "birth_country_id": null, "email": null, "primary_phone": "+525579449672", "avatar_type": "initials", "avatar_template_key": null, "avatar_file_path": null, "home_address": null, "address_city": null, "address_state_id": null, "address_country_id": null, "address_postal_code": null, "appointment_duration": null, "specialty_id": null, "university": null, "graduation_year": null, "insurance_provider": null, "insurance_number": null, "emergency_contact_name": null, "emergency_contact_phone": null, "emergency_contact_relationship": null, "hashed_password": "***REDACTED***", "is_active": true, "last_login": null, "created_at": "2025-12-15T21:32:06.134628", "updated_at": "2025-12-17T16:11:41.328044", "created_by": 1}	Sin cambios detectados	patient_update	6	Jose Garcia	10.0.2.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	/api/patients/6	PUT	t	\N	INFO	2025-12-17 16:11:41.534327	{"change_folio": "AL-C53084BD112D"}
57	1	adriana.morenoh@outlook.es	Gloria Adriana Moreno Hernandez	doctor	CREATE	medical_records	2	null	{"patient_id": 6, "consultation_date": "2025-12-17 10:10:33", "consultation_type": "Seguimiento", "primary_diagnosis": ""}	Creación de nuevo registro con 4 campos	consultation_create	6	Jose Garcia	10.0.2.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	/api/consultations	POST	t	\N	INFO	2025-12-17 16:11:42.886719	{"change_folio": "AL-15B5996020D4"}
58	1	adriana.morenoh@outlook.es	Gloria Adriana Moreno Hernandez	doctor	UPDATE	persons	6	{"id": 6, "person_code": "PAT000001", "person_type": "patient", "title": null, "name": "Jose Garcia", "birth_date": null, "gender": "Masculino", "civil_status": null, "birth_city": null, "birth_state_id": null, "birth_country_id": null, "email": null, "primary_phone": "+525579449672", "avatar_type": "initials", "avatar_template_key": null, "avatar_file_path": null, "home_address": null, "address_city": null, "address_state_id": null, "address_country_id": null, "address_postal_code": null, "appointment_duration": null, "specialty_id": null, "university": null, "graduation_year": null, "insurance_provider": null, "insurance_number": null, "emergency_contact_name": null, "emergency_contact_phone": null, "emergency_contact_relationship": null, "hashed_password": "***REDACTED***", "is_active": true, "last_login": null, "created_at": "2025-12-15T21:32:06.134628", "created_by": 1}	{"id": 6, "person_code": "PAT000001", "person_type": "patient", "title": null, "name": "Jose Garcia", "birth_date": null, "gender": "Masculino", "civil_status": null, "birth_city": null, "birth_state_id": null, "birth_country_id": null, "email": null, "primary_phone": "+525579449672", "avatar_type": "initials", "avatar_template_key": null, "avatar_file_path": null, "home_address": null, "address_city": null, "address_state_id": null, "address_country_id": null, "address_postal_code": null, "appointment_duration": null, "specialty_id": null, "university": null, "graduation_year": null, "insurance_provider": null, "insurance_number": null, "emergency_contact_name": null, "emergency_contact_phone": null, "emergency_contact_relationship": null, "hashed_password": "***REDACTED***", "is_active": true, "last_login": null, "created_at": "2025-12-15T21:32:06.134628", "updated_at": "2025-12-17T19:17:26.402943", "created_by": 1}	Sin cambios detectados	patient_update	6	Jose Garcia	10.0.2.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	/api/patients/6	PUT	t	\N	INFO	2025-12-17 19:17:26.611094	{"change_folio": "AL-E348E0E8278D"}
59	1	adriana.morenoh@outlook.es	Gloria Adriana Moreno Hernandez	doctor	CREATE	medical_records	3	null	{"patient_id": 6, "consultation_date": "2025-12-17 13:16:28", "consultation_type": "Seguimiento", "primary_diagnosis": ""}	Creación de nuevo registro con 4 campos	consultation_create	6	Jose Garcia	10.0.2.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	/api/consultations	POST	t	\N	INFO	2025-12-17 19:17:28.428074	{"change_folio": "AL-075071CF70EB"}
60	\N	SYSTEM	SYSTEM	system	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	/api/auth/login	POST	f	Credenciales inválidas	WARNING	2025-12-18 16:16:33.453161	{"login_attempt": true, "change_folio": "AL-5A1382C804C4"}
61	\N	SYSTEM	SYSTEM	system	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	/api/auth/login	POST	f	Credenciales inválidas	WARNING	2025-12-18 16:16:38.139556	{"login_attempt": true, "change_folio": "AL-F2BB1DEEEAF1"}
62	1	adriana.morenoh@outlook.es	Gloria Adriana Moreno Hernandez	doctor	LOGIN	\N	\N	null	null	Sin cambios	authentication	\N	\N	10.0.2.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	/api/auth/login	POST	t	\N	INFO	2025-12-18 16:17:47.940551	{"login_attempt": true, "change_folio": "AL-B4F15C9B8F90"}
\.


--
-- TOC entry 4596 (class 0 OID 26762)
-- Dependencies: 249
-- Data for Name: clinical_studies; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clinical_studies (id, consultation_id, patient_id, doctor_id, study_type, study_name, ordered_date, performed_date, status, urgency, clinical_indication, ordering_doctor, file_name, file_path, file_type, file_size, created_by, created_at, updated_at) FROM stdin;
2	2	6	1	hematologia	Hemograma Completo	2025-12-17 00:00:00	2025-12-17 19:16:37.250429	completed	routine		Lic. Lic. Gloria Adriana Moreno Hernandez	Orden-Medica_Jose_Garcia_2025-12-16T15_37_33.pdf	clinical_studies/e797a8b5a8dc.pdf	application/pdf	13639	1	2025-12-17 16:11:45.935875	2025-12-17 19:16:37.250488
\.


--
-- TOC entry 4598 (class 0 OID 26795)
-- Dependencies: 251
-- Data for Name: consultation_prescriptions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.consultation_prescriptions (id, consultation_id, medication_id, dosage, frequency, duration, quantity, via_administracion, instructions, created_at) FROM stdin;
1	1	343	20mg	3 dias	8 duas	\N			2025-12-16 21:39:07.150653
\.


--
-- TOC entry 4602 (class 0 OID 26823)
-- Dependencies: 255
-- Data for Name: consultation_vital_signs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.consultation_vital_signs (id, consultation_id, vital_sign_id, value, unit, created_at, updated_at) FROM stdin;
1	1	8	129	cm	2025-12-16 21:39:05.440145	2025-12-16 21:39:05.440155
2	1	7	12	kg	2025-12-16 21:39:05.972172	2025-12-16 21:39:05.972184
3	1	9	7.2	kg/m²	2025-12-16 21:39:06.498548	2025-12-16 21:39:06.498557
4	3	8	120	cm	2025-12-17 19:17:31.847961	2025-12-17 19:17:31.847969
5	3	7	23	kg	2025-12-17 19:17:32.769931	2025-12-17 19:17:32.769941
\.


--
-- TOC entry 4563 (class 0 OID 26435)
-- Dependencies: 216
-- Data for Name: countries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.countries (id, name, phone_code, is_active, created_at) FROM stdin;
1	México	+52	t	2025-12-09 19:29:05.605183
2	Estados Unidos	+1	t	2025-12-09 19:29:05.605183
3	España	+34	t	2025-12-09 19:29:05.605183
4	Argentina	+54	t	2025-12-09 19:29:05.605183
5	Colombia	+57	t	2025-12-09 19:29:05.605183
6	Chile	+56	t	2025-12-09 19:29:05.605183
7	Perú	+51	t	2025-12-09 19:29:05.605183
9	Venezuela	+58	t	2025-12-09 19:29:05.605183
10	Ecuador	+593	t	2025-12-09 19:29:05.605183
11	Uruguay	+598	t	2025-12-09 19:29:05.605183
12	Paraguay	+595	t	2025-12-09 19:29:05.605183
13	Bolivia	+591	t	2025-12-09 19:29:05.605183
14	Guatemala	+502	t	2025-12-09 19:29:05.605183
15	Honduras	+504	t	2025-12-09 19:29:05.605183
16	El Salvador	+503	t	2025-12-09 19:29:05.605183
17	Nicaragua	+505	t	2025-12-09 19:29:05.605183
18	Costa Rica	+506	t	2025-12-09 19:29:05.605183
19	Panamá	+507	t	2025-12-09 19:29:05.605183
21	República Dominicana	+1	t	2025-12-09 19:29:05.605183
22	Otro	\N	t	2025-12-09 19:29:05.605183
\.


--
-- TOC entry 4614 (class 0 OID 26941)
-- Dependencies: 267
-- Data for Name: data_retention_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.data_retention_logs (id, table_name, record_id, retention_period_years, expiration_date, status, created_at) FROM stdin;
\.


--
-- TOC entry 4582 (class 0 OID 26549)
-- Dependencies: 235
-- Data for Name: diagnosis_catalog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.diagnosis_catalog (id, name, code, category_id, description, specialty, severity_level, is_chronic, is_contagious, age_group, gender_specific, is_active, created_by, search_vector, created_at, updated_at) FROM stdin;
1	Diarrea y gastroenteritis de presunto origen infeccioso	A09	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
2	Sepsis	A41.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
3	Infección viral	B34.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
4	Infección por VIH	B20	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
5	Tuberculosis pulmonar	A15.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
6	Hepatitis A	B15.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
7	Hepatitis B crónica	B18.1	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
8	Hepatitis C crónica	B18.2	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
9	Herpes zóster	B02.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
10	Varicela	B01.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
11	Neoplasia maligna de bronquio o pulmón, no especificada	C34.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
12	Neoplasia maligna de mama, parte no especificada	C50.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
13	Neoplasia maligna de próstata	C61	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
14	Neoplasia maligna de colon, no especificada	C18.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
15	Neoplasia maligna del recto	C20	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
16	Neoplasia maligna del estómago	C16.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
17	Leucemia mieloide aguda	C92.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
18	Leucemia linfoblástica aguda	C91.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
19	Linfoma no Hodgkin	C85.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
20	Linfoma de Hodgkin	C81.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
21	Diabetes mellitus tipo 2 sin complicaciones	E11.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
22	Hipotiroidismo	E03.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
23	Obesidad	E66.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
24	Hipertiroidismo	E05.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
25	Síndrome metabólico	E88.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
26	Diabetes mellitus tipo 1	E10.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
27	Bocio no tóxico, no especificado	E04.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
28	Hipercolesterolemia pura	E78.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
29	Hipertrigliceridemia	E78.1	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
30	Gota, no especificada	M10.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
31	Hipertensión esencial (primaria)	I10	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
32	Enfermedad cardíaca isquémica crónica, no especificada	I25.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
33	Infarto cerebral, no especificado	I63.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
34	Insuficiencia cardíaca, no especificada	I50.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
35	Arritmia cardíaca, no especificada	I49.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
36	Fibrilación y aleteo auricular	I48	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
37	Infarto agudo de miocardio, no especificado	I21.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
38	Angina de pecho inestable	I20.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
39	Miocardiopatía dilatada	I42.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
40	Estenosis aórtica	I06.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
41	Infección aguda de las vías respiratorias superiores, no especificada	J06.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
42	Neumonía, organismo no especificado	J18.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
43	Enfermedad pulmonar obstructiva crónica con exacerbación aguda, no especificada	J44.1	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
44	Asma, no especificada	J45.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
45	Bronquitis aguda, no especificada	J20.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
46	Bronquitis crónica simple	J41.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
47	Enfisema, no especificado	J43.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
48	Asma predominantemente alérgica	J45.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
49	Sinusitis aguda, no especificada	J01.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
50	Rinitis alérgica	J30.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
51	Enfermedad por reflujo gastroesofágico sin esofagitis	K21.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
52	Apendicitis aguda	K35.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
53	Enfermedad del hígado, no especificada	K76.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
54	Gastritis, no especificada	K29.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
55	Úlcera gástrica, no especificada como aguda o crónica, sin hemorragia ni perforación	K25.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
56	Úlcera duodenal, no especificada	K26.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
57	Hepatitis crónica, no especificada	K73.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
58	Cálculos biliares sin obstrucción	K80.2	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
59	Pancreatitis aguda, no especificada	K85.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
60	Enfermedad inflamatoria intestinal	K50.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
61	Infección de tracto urinario, sitio no especificado	N39.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
62	Enfermedad renal crónica en estadio 6	N18.6	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
63	Cálculo del tracto urinario, no especificado	N20.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
64	Hiperplasia benigna de próstata	N40	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
65	Incontinencia urinaria	N39.4	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
66	Pielonefritis aguda	N10	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
67	Cistitis, no especificada	N30.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
68	Prostatitis crónica	N41.1	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
69	Insuficiencia renal aguda	N17.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
70	Cálculo del riñón	N20.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
71	Episodio depresivo, no especificado	F32.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
72	Trastorno de ansiedad, no especificado	F41.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
73	Trastorno de pánico	F41.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
74	Esquizofrenia	F20.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
75	Trastorno bipolar	F31.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
76	Trastorno obsesivo-compulsivo	F42.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
77	Trastorno de estrés postraumático	F43.1	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
78	Trastorno hipercinético, no especificado	F90.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
79	Trastorno del espectro autista	F84.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
80	Trastorno de personalidad límite	F60.3	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
81	Epilepsia, no especificada	G40.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
82	Migraña sin aura (migraña común)	G43.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
83	Cefalea de tipo tensional	G44.2	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
84	Enfermedad de Parkinson	G20	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
85	Polineuropatía, no especificada	G62.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
86	Esclerosis múltiple	G35	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
87	Demencia	F03	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
88	Enfermedad de Alzheimer	G30.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
89	Neuralgia del trigémino	G50.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
90	Síndrome del túnel carpiano	G56.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
91	Artritis reumatoide, no especificada	M06.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
92	Artrosis, no especificada	M19.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
93	Osteoporosis sin fractura patológica	M81.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
94	Dolor lumbar bajo	M54.5	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
95	Tendinitis	M79.31	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
96	Cervicalgia	M54.2	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
97	Otras bursopatías, no especificada	M71.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
98	Artritis gotosa	M10.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
99	Fibromialgia	M79.30	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
100	Síndrome del túnel carpiano, mano no dominante	G56.01	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
101	Enfermedad cardíaca hipertensiva sin insuficiencia cardíaca	I11.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
102	Angina de pecho, no especificada	I20.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
103	Várices de miembros inferiores sin complicaciones	I83.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
104	Diabetes mellitus tipo 2 con complicaciones renales	E11.2	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
105	Diabetes mellitus tipo 2 con complicaciones oculares	E11.3	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
106	Diabetes mellitus sin especificar, sin complicaciones	E14.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
107	Hiperlipidemia, no especificada	E78.5	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
108	Disfunción digestiva	K30	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
109	Estreñimiento	K59.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
110	Diarrea funcional	K59.1	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
111	Enfermedad hepática alcohólica, no especificada	K70.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
112	Cirrosis hepática, no especificada	K74.6	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
113	Hemorragia gastrointestinal, no especificada	K92.2	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
114	Enfermedad pulmonar obstructiva crónica con infección respiratoria aguda	J44.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
115	Enfermedad pulmonar obstructiva crónica, no especificada	J44.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
116	Bronquitis, no especificada como aguda o crónica	J40	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
117	Rinofaringitis aguda (resfriado común)	J00	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
118	Rinitis crónica	J31.2	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
119	Sinusitis crónica, no especificada	J32.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
120	Migraña, no especificada	G43.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
121	Cefalea vascular, no clasificada en otra parte	G44.1	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
122	Cefalea	R51	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
123	Lesión anóxica del cerebro, no clasificada en otra parte	G93.1	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
124	Hidrocefalia, no especificada	G91.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
125	Trastorno extrapiramidal y del movimiento, no especificado	G25.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
126	Dorsalgia, no especificada	M54.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
127	Dolor en articulación	M25.5	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
128	Poliartrosis, no especificada	M15.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
129	Paniculitis, no especificada	M79.3	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
130	Fractura de fémur, parte no especificada	S72.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
131	Fractura de antebrazo, parte no especificada	S52.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
132	Dolor en miembro	M79.6	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
133	Rigidez articular, no clasificada en otra parte	M25.6	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
134	Radiculopatía	M54.1	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
135	Amenorrea, no especificada	N91.2	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
136	Menstruación irregular, no especificada	N92.6	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
137	Dismenorrea, no especificada	N94.6	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
138	Vaginitis aguda	N76.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
139	Enfermedad inflamatoria pélvica femenina, no especificada	N73.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
140	Endometriosis, no especificada	N80.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
141	Embarazo de alto riesgo, no especificado	O09.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
142	Atención materna por otros signos de sufrimiento fetal	O36.4	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
143	Hiperplasia de próstata con síntomas del tracto urinario inferior	N40.1	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
144	Enfermedad inflamatoria de la próstata, no especificada	N41.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
145	Enfermedad renal crónica, no especificada	N18.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
146	Insuficiencia renal no especificada	N19	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
147	Acné, no especificado	L70.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
148	Dermatitis atópica, no especificada	L20.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
149	Otras dermatitis, no especificadas	L30.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
150	Urticaria, no especificada	L50.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
151	Rosácea, no especificada	L71.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
152	Dermatofitosis, no especificada	B35.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
153	Psoriasis, no especificada	L40.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
154	Otras afecciones eritematosas, no especificadas	L53.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
155	Trastorno depresivo recurrente, no especificado	F33.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
156	Trastornos de adaptación	F43.2	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
157	Insomnio no orgánico	F51.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
158	Conjuntivitis, no especificada	H10.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
159	Hipermetropía	H52.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
160	Astigmatismo	H52.1	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
161	Astigmatismo e hipermetropía	H52.2	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
162	Catarata senil, no especificada	H25.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
163	Glaucoma, no especificado	H40.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
164	Otros recién nacidos de bajo peso	P07.1	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
165	Dificultad respiratoria del recién nacido, no especificada	P22.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
166	Ictericia neonatal, no especificada	P59.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
167	Tos ferina, no especificada	A37.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
168	Difteria, no especificada	A36.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
169	Anemia por deficiencia de hierro, no especificada	D50.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
170	Anemia, no especificada	D64.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
171	Trombocitopenia, no especificada	D69.6	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
172	Neoplasia maligna de páncreas, no especificada	C25.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
173	Infección intestinal bacteriana, no especificada	A04.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
174	Infección bacteriana de sitio no especificado	A49.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
175	Neumonía debida a Streptococcus pneumoniae	J13	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
176	Neumonía bacteriana, no especificada	J15.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
177	Neumonía viral, no especificada	J12.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
178	Lupus eritematoso sistémico, no especificado	M32.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
179	Trastorno del tejido conectivo sistémico, no especificado	M35.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
180	Reumatismo, no especificado	M79.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
181	Fiebre, no especificada	R50.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
182	Dificultad respiratoria	R06.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
183	Náusea y vómito	R11	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
184	Malestar y fatiga	R53	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
185	Hiperglucemia, no especificada	R73.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
186	Resultados anormales de estudios de la función respiratoria	R94.3	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
187	Enfermedad renal hipertensiva sin insuficiencia renal	I12.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
188	Enfermedad cardiorrenal hipertensiva, no especificada	I13.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
189	Enfermedad pulmonar cardíaca, no especificada	I27.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
190	Aterosclerosis generalizada y no especificada	I70.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
191	Enfermedad vascular periférica, no especificada	I73.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
192	Trastorno de la tiroides, no especificado	E07.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
193	Diabetes mellitus tipo 2 con complicaciones neurológicas	E11.4	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
194	Diabetes mellitus tipo 2 con complicaciones circulatorias periféricas	E11.5	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
195	Diabetes mellitus tipo 2 con otras complicaciones especificadas	E11.6	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
196	Diabetes mellitus tipo 2 con múltiples complicaciones	E11.7	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
197	Obesidad debida a exceso de calorías	E66.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
198	Sobrepeso	E66.3	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
199	Hipopotasemia	E87.6	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
200	Exceso de líquido	E87.7	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
201	Enfermedad del esófago, no especificada	K22.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
202	Úlcera péptica, sitio no especificado	K27.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
203	Úlcera gastro-yeyunal, no especificada	K28.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
204	Enfermedad del estómago y del duodeno, no especificada	K31.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
205	Síndrome del intestino irritable sin diarrea	K58.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
206	Neuropatía intestinal, no clasificada en otra parte	K59.2	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
207	Polipo del colon	K63.5	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
208	Peritonitis, no especificada	K65.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
209	Cirrosis hepática alcohólica	K70.3	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
210	Enfermedad tóxica del hígado, no especificada	K71.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
211	Insuficiencia hepática, no especificada	K72.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
212	Enfermedad inflamatoria del hígado, no especificada	K75.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
213	Cálculo de la vesícula biliar con obstrucción	K80.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
214	Colecistitis, no especificada	K81.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
215	Enfermedad de la vesícula biliar, no especificada	K82.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
216	Enfermedad de las vías biliares, no especificada	K83.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
217	Enfermedad del páncreas, no especificada	K86.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
218	Trastornos de la vesícula biliar, vías biliares y páncreas en enfermedades clasificadas en otra parte	K87	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
219	Hematemesis	K92.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
220	Melena	K92.1	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
221	Trastornos de otros órganos digestivos especificados en enfermedades clasificadas en otra parte	K93.8	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
222	Faringitis aguda, no especificada	J02.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
223	Amigdalitis aguda, no especificada	J03.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
224	Laringitis aguda	J04.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
225	Laringitis obstructiva aguda (crup)	J05.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
226	Gripe debida a virus de la gripe aviar identificado	J09.X	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
300	Placa pleural con asbestosis	J92.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
227	Gripe con otras manifestaciones respiratorias, virus de la gripe identificado	J10.1	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
228	Gripe con otras manifestaciones respiratorias, virus no identificado	J11.1	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
229	Neumonía debida a Haemophilus influenzae	J14	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
230	Neumonía debida a Klebsiella pneumoniae	J15.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
231	Neumonía debida a estafilococos	J15.2	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
232	Neumonía debida a Chlamydias	J16.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
233	Neumonía en enfermedades clasificadas en otra parte	J17	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
234	Bronconeumonía, organismo no especificado	J18.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
235	Neumonía lobar, organismo no especificado	J18.1	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
236	Neumonía hipostática, organismo no especificado	J18.2	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
237	Neumonía en enfermedades clasificadas en otra parte	J19	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
238	Bronquiolitis aguda, no especificada	J21.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
239	Infección aguda de las vías respiratorias inferiores, no especificada	J22	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
240	Rinitis alérgica, no especificada	J30.4	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
241	Rinitis crónica	J31.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
242	Sinusitis maxilar crónica	J32.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
243	Sinusitis frontal crónica	J32.1	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
244	Sinusitis etmoidal crónica	J32.2	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
245	Sinusitis esfenoidal crónica	J32.3	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
246	Pansinusitis crónica	J32.4	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
247	Pólipo nasal, no especificado	J33.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
248	Hipertrofia de cornetes nasales	J34.3	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
249	Amigdalitis crónica	J35.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
250	Hipertrofia de las amígdalas	J35.1	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
251	Hipertrofia de las adenoides	J35.2	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
252	Hipertrofia de las amígdalas con hipertrofia de las adenoides	J35.3	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
253	Absceso periamigdalino	J36	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
254	Laringitis crónica	J37.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
255	Laringotraqueítis crónica	J37.1	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
256	Parálisis de las cuerdas vocales y de la laringe	J38.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
257	Pólipo de las cuerdas vocales y de la laringe	J38.1	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
258	Nódulos de las cuerdas vocales	J38.2	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
259	Otras enfermedades de las cuerdas vocales	J38.3	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
260	Edema de la laringe	J38.4	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
261	Espasmo laríngeo	J38.5	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
262	Estenosis de la laringe	J38.6	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
263	Otras enfermedades de la laringe	J38.7	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
264	Absceso retrofaríngeo y parafaríngeo	J39.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
265	Otro absceso de la faringe	J39.1	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
266	Otras enfermedades de la faringe	J39.2	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
267	Reacción de hipersensibilidad de las vías respiratorias superiores, sitio no especificado	J39.3	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
268	Otras enfermedades especificadas de las vías respiratorias superiores	J39.8	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
269	Enfermedad de las vías respiratorias superiores, no especificada	J39.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
270	Bronquitis crónica mucopurulenta	J41.1	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
271	Bronquitis crónica mixta simple y mucopurulenta	J41.8	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
272	Bronquitis crónica, no especificada	J42	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
273	Enfisema de Macleod	J43.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
274	Enfisema panlobulillar	J43.1	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
275	Enfisema centrolobulillar	J43.2	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
276	Otro enfisema	J43.8	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
277	Asma no alérgica	J45.1	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
278	Asma mixta	J45.8	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
279	Estado asmático	J46	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
280	Bronquiectasia	J47	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
281	Neumoconiosis de los mineros del carbón	J60	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
282	Neumoconiosis, no especificada	J64	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
283	Neumonitis por hipersensibilidad debida a polvo orgánico no especificado	J67.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
284	Afecciones respiratorias debidas a inhalación de productos químicos, gases, humos y vapores, no especificadas	J68.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
285	Neumonía debida a alimentos y vómitos	J69.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
286	Neumonía debida a otros sólidos y líquidos	J69.8	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
287	Afecciones respiratorias debidas a otras sustancias externas, no especificadas	J70.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
288	Síndrome de dificultad respiratoria del adulto	J80	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
289	Edema pulmonar, no especificado	J81	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
290	Eosinofilia pulmonar, no clasificada en otra parte	J82	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
291	Enfermedad pulmonar intersticial, no especificada	J84.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
292	Gangrena y necrosis del pulmón	J85.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
293	Absceso del pulmón con neumonía	J85.1	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
294	Absceso del pulmón sin neumonía	J85.2	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
295	Absceso del mediastino	J85.3	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
296	Piótorax con fístula	J86.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
297	Piótorax sin fístula	J86.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
298	Derrame pleural, no clasificado en otra parte	J90	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
299	Derrame pleural en afecciones clasificadas en otra parte	J91	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
301	Placa pleural sin asbestosis	J92.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
302	Neumotórax espontáneo con tensión	J93.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
303	Neumotórax espontáneo sin tensión	J93.1	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
304	Otro neumotórax	J93.8	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
305	Neumotórax, no especificado	J93.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
306	Quilotórax	J94.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
307	Fibrótorax	J94.1	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
308	Hemotórax	J94.2	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
309	Otras afecciones pleurales especificadas	J94.8	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
310	Afección pleural, no especificada	J94.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
311	Disfunción de traqueostomía	J95.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
312	Insuficiencia pulmonar aguda consecutiva a cirugía	J95.1	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
313	Insuficiencia pulmonar aguda consecutiva a procedimiento no quirúrgico	J95.2	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
314	Insuficiencia pulmonar crónica consecutiva a cirugía	J95.3	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
315	Síndrome de Mendelson	J95.4	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
316	Otras afecciones respiratorias consecutivas a procedimientos	J95.8	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
317	Afección respiratoria consecutiva a procedimiento, no especificada	J95.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
318	Insuficiencia respiratoria aguda	J96.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
319	Insuficiencia respiratoria crónica	J96.1	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
320	Insuficiencia respiratoria, no especificada	J96.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
321	Enfermedades de la tráquea y de los bronquios, no clasificadas en otra parte	J98.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
322	Colapso pulmonar	J98.1	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
323	Enfisema intersticial	J98.2	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
324	Enfisema compensatorio	J98.3	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
325	Otros trastornos del pulmón	J98.4	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
326	Enfermedades del mediastino, no clasificadas en otra parte	J98.5	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
327	Trastornos del diafragma	J98.6	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
328	Otras afecciones respiratorias especificadas	J98.8	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
329	Afección respiratoria, no especificada	J98.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
330	Afecciones respiratorias en enfermedades clasificadas en otra parte	J99	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
331	Meningitis bacteriana, no especificada	G00.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
332	Meningitis, no especificada	G03.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
333	Encefalitis, mielitis y encefalomielitis, no especificada	G04.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
334	Enfermedad de Huntington	G10	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
335	Ataxia hereditaria, no especificada	G11.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
336	Atrofia muscular espinal, no especificada	G12.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
337	Parkinsonismo secundario, no especificado	G21.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
338	Distonía, no especificada	G24.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
339	Degeneración del sistema nervioso, no especificada	G31.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
340	Otro desmielinización aguda diseminada, no especificada	G36.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
341	Otra enfermedad desmielinizante del sistema nervioso central, no especificada	G37.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
342	Epilepsia localizada (focal) (parcial) idiopática	G40.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
343	Epilepsia localizada (focal) (parcial) sintomática	G40.1	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
344	Epilepsia localizada (focal) (parcial) criptogénica	G40.2	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
345	Epilepsia generalizada idiopática	G40.3	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
346	Otras epilepsias generalizadas	G40.4	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
347	Epilepsias especiales	G40.5	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
348	Crisis de gran mal, no especificadas (con o sin pequeño mal)	G40.6	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
349	Crisis de pequeño mal, no especificadas, sin crisis de gran mal	G40.7	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
350	Otras epilepsias	G40.8	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
351	Estado de gran mal	G41.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
352	Estado de pequeño mal	G41.1	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
353	Estado parcial complejo	G41.2	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
354	Otro estado epiléptico	G41.8	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
355	Estado epiléptico, no especificado	G41.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
356	Migraña con aura (migraña clásica)	G43.1	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
357	Estado de mal migrañoso	G43.2	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
358	Migraña complicada	G43.3	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
359	Otras migrañas	G43.8	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
360	Síndrome de cefalea en racimos	G44.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
361	Cefalea postraumática crónica	G44.3	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
362	Cefalea inducida por medicamentos, no clasificada en otra parte	G44.4	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
363	Otras síndromes de cefalea especificadas	G44.8	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
364	Trastornos de inicio y mantenimiento del sueño (insomnio)	G47.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
365	Trastornos de somnolencia excesiva (hipersomnia)	G47.1	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
366	Trastornos del ciclo sueño-vigilia	G47.2	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
367	Apnea del sueño	G47.3	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
368	Narcolepsia y cataplejía	G47.4	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
369	Otros trastornos del sueño	G47.8	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
370	Trastorno del sueño, no especificado	G47.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
371	Parálisis de Bell	G51.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
372	Trastorno de nervio craneal, no especificado	G52.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
373	Trastorno del plexo, no especificado	G54.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
374	Mononeuropatía del miembro superior, no especificada	G56.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
375	Mononeuropatía del miembro inferior, no especificada	G57.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
376	Otra mononeuropatía, no especificada	G58.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
377	Mononeuropatía en enfermedades clasificadas en otra parte, no especificada	G59.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
378	Neuropatía hereditaria e idiopática, no especificada	G60.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
379	Polineuropatía inflamatoria, no especificada	G61.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
380	Polineuropatía en enfermedades clasificadas en otra parte, no especificada	G63.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
381	Otros trastornos del sistema nervioso periférico	G64	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
382	Miastenia gravis y otros trastornos neuromusculares, no especificados	G70.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
383	Distrofia muscular, no especificada	G71.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
384	Miopatía, no especificada	G72.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
385	Trastornos de la unión neuromuscular y del músculo en enfermedades clasificadas en otra parte, no especificados	G73.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
386	Parálisis cerebral, no especificada	G80.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
387	Hemiplejía, no especificada	G81.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
388	Paraplejía y tetraplejía, no especificada	G82.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
389	Otros síndromes paralíticos, no especificados	G83.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
390	Trastorno del sistema nervioso autónomo, no especificado	G90.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
391	Encefalopatía tóxica	G92	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
392	Quiste cerebral	G93.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
393	Hipertensión intracraneal benigna	G93.2	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
394	Encefalopatía postvirica, no especificada	G93.3	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
395	Encefalopatía, no especificada	G93.4	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
396	Compresión del encéfalo	G93.5	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
397	Edema cerebral	G93.6	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
398	Síndrome de Reye	G93.7	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
399	Otras enfermedades especificadas del encéfalo	G93.8	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
400	Enfermedad del encéfalo, no especificada	G93.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
401	Otros trastornos del encéfalo en enfermedades clasificadas en otra parte	G94	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
402	Enfermedad de la médula espinal, no especificada	G95.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
403	Trastorno del sistema nervioso central, no especificado	G96.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
404	Trastorno del sistema nervioso consecutivo a procedimiento, no especificado	G97.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
405	Otros trastornos del sistema nervioso, no especificados	G98.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
406	Trastornos del sistema nervioso en enfermedades clasificadas en otra parte, no especificados	G99.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
407	Artritis piógena, no especificada	M00.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
408	Infección directa de articulación en enfermedades infecciosas y parasitarias clasificadas en otra parte	M01.X	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
409	Artropatía reactiva, no especificada	M02.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
410	Artropatía postinfecciosa y reactiva en enfermedades clasificadas en otra parte, no especificada	M03.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
411	Artritis reumatoide seropositiva, no especificada	M05.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
412	Artropatía psoriásica y enteropática, no especificada	M07.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
413	Artritis juvenil, no especificada	M08.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
414	Artritis juvenil en enfermedades clasificadas en otra parte, no especificada	M09.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
415	Otras artropatías por depósito de cristales, no especificadas	M11.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
416	Otras artropatías especificadas, no especificadas	M12.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
417	Artritis, no especificada	M13.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
418	Artropatía en otras enfermedades clasificadas en otra parte, no especificada	M14.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
419	Coxartrosis (artrosis de cadera), no especificada	M16.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
420	Gonartrosis (artrosis de rodilla), no especificada	M17.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
421	Artrosis de la primera articulación carpometacarpiana, no especificada	M18.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
422	Deformidad adquirida de los dedos de la mano y del pie, no especificada	M20.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
423	Otra deformidad adquirida de miembro, no especificada	M21.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
424	Trastorno de la rótula, no especificado	M22.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
425	Trastorno interno de la rodilla, no especificado	M23.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
426	Otros trastornos articulares específicos, no especificados	M24.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
427	Hemartrosis	M25.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
428	Fístula articular	M25.1	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
429	Flail joint	M25.2	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
430	Otra inestabilidad articular	M25.3	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
431	Derrame articular	M25.4	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
432	Osteofito	M25.7	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
433	Otros trastornos articulares específicos	M25.8	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
434	Trastorno articular, no especificado	M25.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
435	Deformidades dentofaciales (incluye maloclusión), no especificada	M26.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
436	Otras enfermedades de los maxilares, no especificadas	M27.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
437	Poliarteritis nodosa y afecciones relacionadas, no especificada	M30.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
438	Otras vasculopatías necrosantes, no especificada	M31.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
439	Dermatomiositis, no especificada	M33.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
440	Esclerosis sistémica, no especificada	M34.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
441	Sistemopatías del tejido conectivo en enfermedades clasificadas en otra parte, no especificada	M36.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
442	Cifosis y lordosis, no especificada	M40.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
443	Escoliosis, no especificada	M41.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
444	Osteocondrosis de la columna vertebral, no especificada	M42.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
445	Otras deformidades adquiridas de la columna vertebral y del cuello, no especificadas	M43.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
446	Espondilitis anquilosante, no especificada	M45.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
447	Otras espondilopatías inflamatorias, no especificada	M46.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
448	Espondilosis, no especificada	M47.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
449	Otras espondilopatías, no especificada	M48.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
450	Espondilopatías en enfermedades clasificadas en otra parte, no especificada	M49.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
451	Trastorno de disco cervical, no especificado	M50.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
452	Trastorno de disco intervertebral, no especificado	M51.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
453	Otros trastornos de la columna dorsal y dorsolumbar, no especificados	M53.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
454	Paniculitis que afecta regiones del cuello y de la espalda	M54.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
455	Ciática	M54.3	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
456	Lumbago con ciática	M54.4	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
457	Dolor en la columna torácica	M54.6	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
458	Otras dorsalgias	M54.8	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
459	Miositis, no especificada	M60.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
460	Calcificación y osificación del músculo, no especificada	M61.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
461	Otros trastornos del músculo, no especificados	M62.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
462	Trastornos del músculo en enfermedades clasificadas en otra parte, no especificados	M63.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
463	Sinovitis y tenosinovitis, no especificada	M65.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
464	Ruptura espontánea de sinovia y de tendón, no especificada	M66.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
465	Trastorno de la sinovia y del tendón, no especificado	M67.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
466	Trastorno de la sinovia y del tendón en enfermedades clasificadas en otra parte, no especificado	M68.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
467	Trastornos de los tejidos blandos relacionados con el uso, el sobreuso y la presión, no especificado	M70.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
468	Trastornos fibroblásticos, no especificado	M72.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
469	Trastornos de los tejidos blandos en enfermedades clasificadas en otra parte, no especificado	M73.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
470	Lesión del hombro, no especificada	M75.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
471	Entesopatías de miembro inferior, excluido pie, no especificada	M76.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
472	Otras entesopatías, no especificada	M77.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
473	Mialgia	M79.1	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
474	Neuralgia y neuritis, no especificadas	M79.2	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
475	Hipertrofia del (del los) cuerpo(s) graso(s) de la rodilla	M79.4	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
476	Cuerpo residual en tejido blando	M79.5	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
477	Otros trastornos de los tejidos blandos especificados	M79.8	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
478	Trastorno de los tejidos blandos, no especificado	M79.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
479	Osteoporosis con fractura patológica, no especificada	M80.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
480	Osteoporosis sin fractura patológica, no especificada	M81.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
481	Osteoporosis en enfermedades clasificadas en otra parte, no especificada	M82.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
482	Osteomalacia del adulto, no especificada	M83.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
483	Trastorno de la continuidad del hueso, no especificado	M84.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
484	Trastorno de la densidad y de la estructura óseas, no especificado	M85.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
485	Osteomielitis, no especificada	M86.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
486	Necrosis aséptica del hueso, no especificada	M87.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
487	Enfermedad de Paget del hueso (osteítis deformante), no especificada	M88.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
488	Otros trastornos del hueso, no especificados	M89.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
489	Osteopatía en enfermedades clasificadas en otra parte, no especificada	M90.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
490	Osteocondrosis juvenil de cadera y pelvis, no especificada	M91.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
491	Otras osteocondrosis juveniles, no especificadas	M92.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
492	Otras osteocondropatías, no especificadas	M93.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
493	Otros trastornos del cartílago, no especificados	M94.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
494	Otras deformidades adquiridas del sistema musculoesquelético y del tejido conjuntivo, no especificada	M95.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
495	Trastornos musculoesqueléticos consecutivos a procedimientos, no especificado	M96.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
496	Seudoartrosis y fracaso de la unión de fractura, no especificados	M97.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
497	Lesión biomecánica, no especificada	M99.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
498	Salpingitis y ooforitis, no especificada	N70.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
499	Enfermedad inflamatoria del útero, excepto el cuello, no especificada	N71.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
500	Enfermedad inflamatoria del cuello del útero	N72	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
501	Trastorno inflamatorio de la pelvis femenina en enfermedades clasificadas en otra parte, no especificado	N74.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
502	Enfermedad de la glándula de Bartholin, no especificada	N75.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
503	Ulceración e inflamación vulvovaginal en otras enfermedades clasificadas en otra parte	N77.8	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
565	Atención materna por otros problemas fetales conocidos o sospechados, no especificados	O36.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
504	Ulceración e inflamación vulvovaginal en enfermedades clasificadas en otra parte, no especificada	N77.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
505	Trastorno inflamatorio de la vulva y de la vagina, no especificado	N78.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
506	Prolapso genital femenino, no especificado	N81.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
507	Fístula que afecta el tracto genital femenino, no especificada	N82.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
508	Trastorno no inflamatorio del ovario, de la trompa de Falopio y del ligamento ancho, no especificado	N83.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
509	Pólipo del tracto genital femenino, no especificado	N84.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
510	Trastorno no inflamatorio del útero, no especificado	N85.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
511	Erosión y ectropión del cuello del útero	N86	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
512	Displasia del cuello del útero, no especificada	N87.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
513	Otros trastornos no inflamatorios del cuello del útero, no especificados	N88.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
514	Trastorno no inflamatorio de la vagina, no especificado	N89.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
515	Trastorno no inflamatorio de la vulva y del periné, no especificado	N90.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
516	Menstruación excesiva y frecuente con ciclo regular	N92.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
517	Menstruación excesiva y frecuente con ciclo irregular	N92.1	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
518	Menstruación excesiva en la pubertad	N92.2	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
519	Ovulación hemorrágica	N92.3	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
520	Hemorragia excesiva en la menopausia y la perimenopausia	N92.4	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
521	Otras menstruaciones irregulares especificadas	N92.5	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
522	Hemorragia uterina o vaginal anormal, no especificada	N93.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
523	Dolor en la mitad del ciclo menstrual	N94.0	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
524	Dispareunia	N94.1	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
525	Vaginismo	N94.2	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
526	Síndrome de tensión premenstrual	N94.3	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
527	Dismenorrea primaria	N94.4	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
528	Dismenorrea secundaria	N94.5	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
529	Otras afecciones especificadas asociadas con los órganos genitales femeninos y con el ciclo menstrual	N94.8	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
530	Afección no especificada asociada con los órganos genitales femeninos y con el ciclo menstrual	N94.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
531	Trastornos de la menopausia y de la perimenopausia, no especificado	N95.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
532	Aborto habitual	N96	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
533	Esterilidad femenina, no especificada	N97.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
534	Complicaciones asociadas con la fecundación artificial, no especificadas	N98.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
535	Embarazo ectópico, no especificado	O00.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
536	Ovo anormal y mola hidatiforme, no especificados	O02.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
537	Aborto espontáneo, incompleto, sin complicaciones, no especificado	O03.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
538	Aborto médico, incompleto, sin complicaciones, no especificado	O04.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
539	Otro aborto, incompleto, sin complicaciones, no especificado	O05.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
540	Aborto, no especificado, incompleto, sin complicaciones	O06.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
541	Intento fallido de aborto, sin complicaciones, no especificado	O07.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
542	Complicaciones consecutivas a aborto, embarazo ectópico y mola hidatiforme, no especificadas	O08.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
543	Hipertensión preexistente que complica el embarazo, el parto y el puerperio, no especificada	O10.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
544	Hipertensión preexistente con proteinuria superpuesta	O11	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
545	Edema y proteinuria gestacionales (inducidos por el embarazo), sin hipertensión, no especificados	O12.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
546	Hipertensión gestacional (inducida por el embarazo) sin proteinuria significativa	O13	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
547	Preeclampsia, no especificada	O14.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
548	Eclampsia en el embarazo, el parto o el puerperio, no especificada	O15.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
549	Hipertensión materna, no especificada	O16	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
550	Hemorragia al inicio del embarazo, no especificada	O20.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
551	Vómitos excesivos en el embarazo, no especificados	O21.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
552	Complicaciones venosas en el embarazo, no especificadas	O22.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
553	Infección del tracto genitourinario en el embarazo, no especificada	O23.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
554	Diabetes mellitus en el embarazo, el parto o el puerperio, no especificada	O24.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
555	Desnutrición en el embarazo, el parto o el puerperio	O25	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
556	Atención materna por otra complicación especificada del embarazo, no especificada	O26.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
557	Hallazgo anormal en el examen antenatal de la madre, no especificado	O28.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
558	Complicaciones de la anestesia administrada durante el embarazo, no especificadas	O29.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
559	Embarazo múltiple, no especificado	O30.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
560	Complicaciones específicas del embarazo múltiple, no especificadas	O31.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
561	Atención materna por presentación anormal conocida o sospechada del feto, no especificada	O32.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
562	Atención materna por desproporción conocida o sospechada, no especificada	O33.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
563	Atención materna por anormalidad conocida o sospechada de los órganos pélvicos, no especificada	O34.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
564	Atención materna por anormalidad y lesión fetales conocidas o sospechadas, no especificada	O35.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
566	Polihidramnios, no especificado	O40.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
567	Otros trastornos de las membranas y del líquido amniótico, no especificados	O41.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
568	Ruptura prematura de membranas, no especificada	O42.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
569	Trastornos de la placenta, no especificados	O43.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
570	Placenta previa, no especificada	O44.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
571	Desprendimiento prematuro de la placenta, no especificado	O45.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
572	Hemorragia anteparto, no especificada	O46.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
573	Falso trabajo de parto, no especificado	O47.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
574	Embarazo prolongado	O48	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
575	Parto prematuro	O60	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
576	Fallo en la inducción del trabajo de parto, no especificado	O61.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
577	Anormalidades de las contracciones, no especificadas	O62.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
578	Trabajo de parto prolongado, no especificado	O63.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
579	Obstrucción del trabajo de parto debida a presentación, posición o actitud anormales del feto, no especificada	O64.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
580	Obstrucción del trabajo de parto debida a anormalidad pélvica materna, no especificada	O65.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
581	Otra obstrucción del trabajo de parto, no especificada	O66.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
582	Trabajo de parto y parto complicados por hemorragia intraparto, no especificada	O67.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
583	Trabajo de parto y parto complicados por sufrimiento fetal, no especificado	O68.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
584	Trabajo de parto y parto complicados por anormalidad del cordón umbilical, no especificada	O69.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
585	Desgarro del periné durante el parto, de tercer grado, no especificado	O70.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
586	Otra laceración obstétrica, no especificada	O71.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
587	Hemorragia postparto, no especificada	O72.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
588	Retención de la placenta y de las membranas, sin hemorragia, no especificada	O73.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
589	Complicaciones de la anestesia durante el trabajo de parto y el parto, no especificadas	O74.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
590	Otras complicaciones del trabajo de parto y del parto, no especificadas	O75.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
591	Parto único espontáneo	O80	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
592	Parto único con forceps y ventosa extractora	O81	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
593	Parto único por cesárea	O82	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
594	Otro parto único asistido, no especificado	O83.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
595	Parto múltiple, todos espontáneos, no especificado	O84.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
596	Sepsis puerperal	O85	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
597	Otra infección puerperal, no especificada	O86.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
598	Complicaciones venosas en el puerperio, no especificadas	O87.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
599	Embolia obstétrica, no especificada	O88.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
600	Complicaciones de la anestesia administrada durante el puerperio, no especificadas	O89.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
601	Complicaciones del puerperio, no clasificadas en otra parte, no especificada	O90.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
602	Infecciones de la mama asociadas con el parto, no especificada	O91.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
603	Otras anormalidades de la mama y de la lactancia asociadas con el parto, no especificadas	O92.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
604	Secuelas de complicaciones del embarazo, parto y puerperio	O94	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
605	Muerte obstétrica de causa no especificada	O95	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
606	Muerte por cualquier causa obstétrica que ocurre más de 42 días pero menos de un año después del parto, no especificada	O96.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
607	Muerte por secuelas de causas obstétricas directas, no especificada	O97.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
608	Enfermedades maternas infecciosas y parasitarias que complican el embarazo, el parto y el puerperio, no especificada	O98.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
609	Otras enfermedades maternas que complican el embarazo, el parto y el puerperio, no especificada	O99.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
610	Cálculo del tracto urinario inferior, no especificado	N21.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
611	Trastorno resultante de función renal tubular alterada, no especificado	N25.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
612	Riñón contraído, no especificado	N26.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
613	Otros trastornos del riñón y del uréter, no especificados	N28.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
614	Otros trastornos del riñón y del uréter en enfermedades clasificadas en otra parte, no especificados	N29.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
615	Trastorno de la vejiga, no especificado	N32.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
616	Uretritis y síndrome uretral, no especificados	N34.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
617	Estenosis uretral, no especificada	N35.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
618	Otro trastorno de la uretra, no especificado	N36.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
619	Trastorno del sistema urinario, no especificado	N39.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
620	Hiperplasia de la próstata, no especificada	N40.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
621	Otros trastornos de la próstata, no especificados	N42.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
622	Hidrocele y espermatocele, no especificados	N43.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
623	Torsión del testículo	N44.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
624	Orquitis y epididimitis, no especificadas	N45.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
625	Esterilidad masculina, no especificada	N46.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
626	Fimosis, parafimosis y adherencias del prepucio y pene	N47	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
627	Otros trastornos del pene, no especificados	N48.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
628	Trastornos inflamatorios de órganos genitales masculinos, no especificados	N49.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
629	Otros trastornos de órganos genitales masculinos, no especificados	N50.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
630	Trastornos de los órganos genitales masculinos en enfermedades clasificadas en otra parte, no especificados	N51.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
631	Síndrome de piel escaldada estafilocócica	L00	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
632	Impetigo, no especificado	L01.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
633	Absceso cutáneo, furúnculo y ántrax, no especificados	L02.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
634	Celulitis, no especificada	L03.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
635	Linfadenitis aguda, no especificada	L04.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
636	Quiste pilonidal, no especificado	L05.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
637	Infección localizada de la piel y del tejido subcutáneo, no especificada	L08.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
638	Seborrea, no especificada	L21.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
639	Dermatitis del pañal	L22	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
640	Dermatitis alérgica de contacto, no especificada	L23.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
641	Dermatitis de contacto por irritantes, no especificada	L24.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
642	Dermatitis de contacto, no especificada	L25.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
643	Dermatitis exfoliativa	L26	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
644	Dermatitis debida a sustancias ingeridas, no especificada	L27.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
645	Liquen simple crónico y prurigo, no especificados	L28.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
646	Prurito, no especificado	L29.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
647	Quiste folicular de la piel y del tejido subcutáneo, no especificado	L72.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
648	Otras afecciones foliculares, no especificadas	L73.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
649	Trastornos de las glándulas sudoríparas ecrinas, no especificados	L74.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
650	Trastornos de las glándulas apocrinas sudoríparas, no especificados	L75.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
651	Vitiligo	L80	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
652	Otros trastornos de la pigmentación, no especificados	L81.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
653	Queratosis seborreica	L82	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
654	Callos y callosidades	L84	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
655	Otros trastornos de la epidermis engrosada, no especificados	L85.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
656	Trastornos de la eliminación transepidérmica, no especificados	L87.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
657	Úlcera de decúbito, no especificada	L89.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
658	Atrofias cutáneas, no especificadas	L90.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
659	Trastornos hipertróficos de la piel, no especificados	L91.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
660	Trastornos granulomatosos de la piel y del tejido subcutáneo, no especificados	L92.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
661	Lupus eritematoso, no especificado	L93.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
662	Otros trastornos localizados del tejido conectivo, no especificados	L94.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
663	Vasculitis limitada a la piel, no especificada	L95.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
664	Trastorno de la piel y del tejido subcutáneo, no especificado	L98.9	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
665	Otros trastornos de la piel y del tejido subcutáneo en enfermedades clasificadas en otra parte	L99	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
666	consulta de niño sano	\N	\N	\N	\N	\N	f	f	\N	\N	t	0	\N	2025-12-10 01:29:05.605183+00	2025-12-10 01:29:05.605183+00
\.


--
-- TOC entry 4580 (class 0 OID 26540)
-- Dependencies: 233
-- Data for Name: diagnosis_categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.diagnosis_categories (id, name, is_active, created_at) FROM stdin;
\.


--
-- TOC entry 4625 (class 0 OID 27980)
-- Dependencies: 281
-- Data for Name: document_folio_sequences; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.document_folio_sequences (id, doctor_id, document_type, last_number, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4627 (class 0 OID 27998)
-- Dependencies: 283
-- Data for Name: document_folios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.document_folios (id, doctor_id, consultation_id, document_type, folio_number, formatted_folio, created_at) FROM stdin;
\.


--
-- TOC entry 4570 (class 0 OID 26474)
-- Dependencies: 223
-- Data for Name: document_types; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.document_types (id, name, is_active, created_at, updated_at) FROM stdin;
1	Personal	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
2	Profesional	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
\.


--
-- TOC entry 4572 (class 0 OID 26486)
-- Dependencies: 225
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.documents (id, name, document_type_id, is_active, created_at, updated_at) FROM stdin;
1	DNI	1	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
2	C.I	1	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
3	DUI	1	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
4	DPI	1	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
5	CURP	1	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
6	C.I.P	1	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
7	C.I.E	1	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
8	Otro	1	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
9	Número de Colegiación	2	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
10	Matrícula Nacional	2	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
11	Número de Registro	2	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
12	Registro Médico Nacional	2	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
13	Cédula Profesional	2	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
14	Número de Colegiatura	2	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
15	Número de Registro Profesional	2	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
16	Medical License Number	2	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
17	Otro	2	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
\.


--
-- TOC entry 4566 (class 0 OID 26457)
-- Dependencies: 219
-- Data for Name: emergency_relationships; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.emergency_relationships (code, name, is_active, created_at) FROM stdin;
ABUELA	Abuela	t	2025-12-09 19:29:05.605183
ABUELO	Abuelo	t	2025-12-09 19:29:05.605183
AMIGA	Amiga	t	2025-12-09 19:29:05.605183
AMIGO	Amigo	t	2025-12-09 19:29:05.605183
COMADRE	Comadre	t	2025-12-09 19:29:05.605183
COMPADRE	Compadre	t	2025-12-09 19:29:05.605183
CUNIADA	Cuñada	t	2025-12-09 19:29:05.605183
CUNIADO	Cuñado	t	2025-12-09 19:29:05.605183
ESPOSA	Esposa	t	2025-12-09 19:29:05.605183
ESPOSO	Esposo	t	2025-12-09 19:29:05.605183
HERMANA	Hermana	t	2025-12-09 19:29:05.605183
HERMANO	Hermano	t	2025-12-09 19:29:05.605183
HIJA	Hija	t	2025-12-09 19:29:05.605183
HIJO	Hijo	t	2025-12-09 19:29:05.605183
MADRE	Madre	t	2025-12-09 19:29:05.605183
NUERA	Nuera	t	2025-12-09 19:29:05.605183
OTRO	Otro	t	2025-12-09 19:29:05.605183
PADRE	Padre	t	2025-12-09 19:29:05.605183
PRIMA	Prima	t	2025-12-09 19:29:05.605183
PRIMO	Primo	t	2025-12-09 19:29:05.605183
SOBRINA	Sobrina	t	2025-12-09 19:29:05.605183
SOBRINO	Sobrino	t	2025-12-09 19:29:05.605183
SUEGRA	Suegra	t	2025-12-09 19:29:05.605183
SUEGRO	Suegro	t	2025-12-09 19:29:05.605183
TIA	Tía	t	2025-12-09 19:29:05.605183
TIO	Tío	t	2025-12-09 19:29:05.605183
VECINA	Vecina	t	2025-12-09 19:29:05.605183
VECINO	Vecino	t	2025-12-09 19:29:05.605183
YERNO	Yerno	t	2025-12-09 19:29:05.605183
\.


--
-- TOC entry 4623 (class 0 OID 27935)
-- Dependencies: 279
-- Data for Name: google_calendar_event_mappings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.google_calendar_event_mappings (id, appointment_id, google_event_id, doctor_id, created_at, updated_at) FROM stdin;
1	11	aj0a5v6r1r2fdhuq8ammdahnu8	1	2025-12-18 18:23:54.066396	2025-12-18 18:23:54.066403
2	10	buvca1hqmg1jl6rjnmenu9m53o	1	2025-12-18 18:25:09.438048	2025-12-18 18:25:09.438056
3	9	p9nuqg5lndk4ua348qf4mjn86o	1	2025-12-18 18:25:11.805893	2025-12-18 18:25:11.805898
4	7	qmv166f2jto6jojodapo5f9c3c	1	2025-12-18 18:25:13.161891	2025-12-18 18:25:13.161897
5	12	gm9f1i8qh2k9gua6eu6ifc7e5o	1	2025-12-18 18:26:27.142302	2025-12-18 18:26:27.142309
6	8	bilhnds8std2h9hjb3bpp2q6m4	1	2025-12-18 18:43:03.727595	2025-12-18 18:43:03.727601
7	13	64bo2iaqerckdqqlclncfm5qck	1	2025-12-19 03:09:14.505412	2025-12-19 03:09:14.50542
\.


--
-- TOC entry 4621 (class 0 OID 27915)
-- Dependencies: 277
-- Data for Name: google_calendar_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.google_calendar_tokens (id, doctor_id, access_token, refresh_token, token_expires_at, calendar_id, sync_enabled, last_sync_at, created_at, updated_at) FROM stdin;
3	1	ya29.a0Aa7pCA_quCyahYxj6edX2oYalnzBxS_ONqgtOKKZSMOC0OnNnwWzgo6gfaNlr9LzcXU1trAbTS4p01YIerpb4jFSa2wwgAdXoIX_olrnkL8lu6eg3-4wsGWUa2JCT36kFsKBROBVAeZQsCrQCQD9Jm28KW32oRaHE8pz8dfNbDkp7M6A1Yj4UJQrVozfxvoaSiLqupbMaCgYKAQESARUSFQHGX2MiFsfX8ngSQzuI-roLS46vsg0207	1//01Ro-hudBfCgXCgYIARAAGAESNwF-L9Irg5oP51wivAP6-O7mMEQR7MwHtsQcWW_odPxWtQQeLtZj8Hh8QySn934jppb22-LSSgM	2025-12-19 03:59:00.952829	primary	t	\N	2025-12-18 18:26:13.080983	2025-12-19 02:59:01.957236
\.


--
-- TOC entry 4619 (class 0 OID 27884)
-- Dependencies: 275
-- Data for Name: licenses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.licenses (id, doctor_id, license_type, start_date, expiration_date, payment_date, status, is_active, notes, created_at, updated_at, created_by) FROM stdin;
1	1	trial	2025-12-11	2029-01-01	\N	active	t	\N	2025-12-11 21:31:16.705684	2025-12-11 22:06:22.632257	0
\.


--
-- TOC entry 4590 (class 0 OID 26678)
-- Dependencies: 243
-- Data for Name: medical_records; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.medical_records (id, patient_id, doctor_id, consultation_date, chief_complaint, history_present_illness, family_history, perinatal_history, gynecological_and_obstetric_history, personal_pathological_history, personal_non_pathological_history, physical_examination, primary_diagnosis, treatment_plan, consultation_type, secondary_diagnoses, prescribed_medications, laboratory_results, notes, created_at, updated_at, created_by, patient_document_id, patient_document_value, follow_up_instructions) FROM stdin;
1	6	1	2025-12-16 15:37:33	nXME64u2sHlJN0bcgVzkAXHoSdZ4TlkDr8jyC6drXj0dmT4F0mQqdG5z6wDB8P4HJDWOoTsbqv8v							KunLsrk0/VHRs6TX9gkbFy8+SJxl+/7kBrdzSSzgqRmLpSrLc6h5nT3MSYrqEfAjbzaXSmPYZ3yJiuF1o3oEr9F2FJoreZTh10NDbRkFIWR3807IRlDPEAM7z0s2jCIHSTPixNtB2utfEWHbj0ZnAcaQgrYQxv0w90naEOmJ7R3UQ8I6NHIBKrtoBZWzBkKUHSwVUjQ4mB5QnHVPlUyXZJzE9IfVwCQ+H6Mad8c61A6Hly1gEZYvY41H+2uT4ujVVoCKyDvCyiP+VVnJAfVXfCGpPfDAXx2mbHQaJ+ZstS5lzXTJMUmhsMbUy2h/+zo+knoIFx2fgBhR6tKZIatxpo07m2pAoD6Vu+CU6eOO9Ycw4PMwyA2EeKjXWu9ABKnAUyldjzEww16SWf+p2/N8lRVHEFzy0rzdhaIzmETDi6M0AsPdBpotmvNag0a6HAFzsryTGInkZYV5qNOLbbMpxVVzsKDvJ611lFLc3N46ylURQ5dkA2iPzK0opjxM3eFeuRpkybvtKgktj3W6pHbbknbO1IJM7yRzy4dxEBZvk23XK5Nsjh0zLwdaduUBn1l63C4aIom4v6UwGoqTd6G4pGJAEkQoT++ks7WomV5c0dIFjDeBCfl1LSMS1Qu4vCbFmdDkBItE5dCu0iyRLSptXrTbJL4N4d4hku/KHWTu0Gid52rQwWXD4fh/0YPyFyqY5SLwK7iptSCYPawa/ZN7VNZBnoMCAejbN/g87ksk2vvL0iu9ENAhbhe6VmdecHjD1E4WEFfdB9je6RcTjxW3n78r87oDhQ8iR69ZeAL29WVfSk/kUxUqwmpCVNYVFKky2bwmHUBNgY5yR0wfPxB9ZAg2ZEaczFwftTycUlQ4V6J5ThMrD03TKItDZAo9UuTdkFlZyrCiaNrM+LCrdZB+o4kej4Z5TqSYQVPTFlIH8DopbfQSwkjCruX3kV5EZNaAD8b+pkdZXrXWKRihItO5fQKq76vnuuC0Mgl6kK7+ZFEV7kju0P5dhvwokWKcP8We3KSQA1x+eeGRr1JTrCB8vB/iebkNT3M3DwYmtvHP1Wr1MWtV3OX5xjAZpFI2mhN+2h60A3vgTl6b7J1m0GGxhg+XICnhgxA3I2OydZ3x3leIuNjfIm+IfNqkSFRUniLMRzsu48rlhTc9/0ZgOHNolTUgzeQDvKbpC/dOc+2Hq3h/u0S09giQOxVFZM2AkuEjYORo8CmpdttNm1E22kcSohD63Tnsdu4JpJCXgl29dbHuN/ukXt61dxq7MAUKuKgqD7d1dhEpP4q/EmZzO/2vBPosh4B+2Y6z2jGdqdT4CXsATQPHz3UfLcfzNEMbNwFc9DuLijAPjdciTm7DGUmMEqJvqTgFnyhnSdmw60E/TQbmC5swvyDLD87soLKz0Ic0x65VsAUE3Z0gBBb4VAv8Q4k+fZ7NC+g/gWNUwewWiFyC1qx1UlW0Ss760sG2jCQzTswAKdD9pVAEB+UENn90vcAmrZVjgH7Wb39+5tTeSCTE31eDA0hk7UZ8tavzFpROb5sjcDzaJeqxFtnrLXghfqAIkh6OZItkNmk/1AsPNCM3cj/E85KddOu5yGJEzJ/cRk9b9yBGtWJz4JlWdgrqtpU5qPUUa5apTgJGpLOsw2yytpFe3HttZwSB0KQMTch467X3UiCJMqrNVNRSEqdIPwI2qFWZ6ZU2zPre3ZZ0hMs=	VtIjq1FFHhnSUZi7XKjSidh/rbWV/VoBir31Itg7Kq5DyGXmoJrDONfGLrNcUdjOErXHNG/URM6r7xh4FfRYY5nhCiASVe5bKhx1qI9wekbzXP2j120F0NoQ19gJ/2DqnfE1r05neNgnhTsb/T4PkKLUmVjjc1bnNlHddWObfQ==	zz8FJWHOHYf7bNqQlLSSk0q4GqlFf4LT0MX3cJrEt580wfRsDhcFxi6ZI93ovnB+AEpFAQ==	Seguimiento	mJoiyoqNrQgKEMxtA01zGPcP0i/desPYYPUCGxcqny0Eu1dkD6kIl9FwCfb+EjSaQylotoWBq8834WIErHlqsJsEeXEfp++yO0iylHr7sOwTJmcHQ10pZY5q2Tob87+81Q0Yd3JUlLk10aPecL4qnz3mbkI=				2025-12-16 21:39:00.331062	2025-12-16 21:39:00.331069	1	\N	\N	VvqPVUgY1yqnDcad3/hs14mI+boBXc6h2KOj/m10plFhOw2oF6x48EvPksSCNLFcPIk=
2	6	1	2025-12-17 10:10:33	SQSJUUjmjBwbe0xP9u9ETW/eIkuxyANMLWFt1PAiIbG8OPaJxAILFjXojX3cnL5Z0IdtOZQKLdI=							kp6OIRozOHawmTqnG4SrlRm66UqsMKNrsAdObSuybojSPc/9ot91O+i86CdmqshFiKF+sZFM+2dhwhTy1MzQBXWy1eE2LDRttvpS5ENSk39zRldYPL7qrlBU6CAg6P5RVv0rnikjyecrPXfFh2t55Thio3rp83tu5J5iP1OVGr5owzSXPuBynwWmz1/p8uaBnadAEgl+/C1NkHTOtvkYLVBIYRL2TUtcIzyM6XVjFMHUX61EVQa9FKWQaWZNyQ+WJpumdLsfwCzZsQ+JykVjONrYR6z2+OMuk9s0Fq18fnMQ1dJfobDuQ1dW+w8dBLJrJRLIu0n7Mw/LFOFRaUxwjAQhBhCZzLgQdbisMNb5nT2i+MELy9cxkjv21bje+Z9Y4c/qt2GZw6bfmDeUnDP+UDpH1dsU9+OkIsun3qRh6U+V4xhmDCE11oBFDDVjohcj0DrRi/daBqQBRK4Uj2Bz6xDyrIt/+sRT/vKGq/ScpJpzj3t1INaAHePnOr7Bx1Z/CBaJgjylZX3CtsLHGX7f1yLA9bwOV9LGVcVnxbfPgYiGlOi7H5rqZ6An2BmgK8/6Wpl48FnBMXRq5xB+IdMR3OlhaR2CtdOqaPY9okvg5VjvpKFcr+tvls2QNqar/12dPNS/8VRkkz0JZg8/Xpls0od0IA2iXsU/msKi6eqyni87w4fkAb6oNsG/ghsmMOeYkQ7zdA/5vYn5jw5JpMzfHxtuJpbuLGVMExaj7kl+eNvxjjQ4SYiQCS5FIFF9XFgKAPGvjV+y9pybR/9fnhQV73AHwbfX1SYHp6jfClhH9/psmMmeVV1EWM/Cl7gDGu/Q3D9BhFlhp/EPyLOBVkkv4ZYOkSimtlRYmSfKbibvMp1PlyqjNhRtOGh8L9Qs42kvwRWoyEHDp8Ihfpmw3OVAiY3jESyfn9WB/1dBf5jG1yxz3Mg/kx1AuCwLyRHBxtPfUMsXbEqiXcNYHtAXoOSTvPo0uY/tniRQI5JbZe1l4ZKiFbiR3QoBk/ZjMHfNr4WyvTfcV68TNgXRgRVvirQXj73arsZ4OHy+mqM0yae5BnpUxjN7stSbnXU9LIEtCWYOXdP5KkFeeyYo5IKU3HWdlYHD5voMGCYAYLgB5lnvyiu3FGirauMcQtkBT7SIFcl0qGw8qzASmIRlKl8u4BS1uRIjhClTA0Dcp3ga/dYZNHVqpk/sKyT4lBzjI6ieSJNoDheB6PjMn3v+95lpV/eKQjKW2kLAbP/MFL8VNP0UWo8fcrmP+PJcw+UjmxUi+mmY8kCl2qjGafl3TXfPyOFcwPda3Eo+7vXrMp88vZCzbCoD8wX+vnVAruTJwmiSwSsavjoE6pgt1Ldj5XcV6cLVD0qzlJP+3YE0/LtZeKDdEJEblodrBQnrc3nPTe1f5GVwAfRaXjETMYURiq4m+FHGiQXaxmae7rfQA1VWYHu9SEuF3OsxFl6YpGYUXQLY82IHNCYv+sPvskMiu2/qbLw/FQAKlqTGI0viS/HOJM54cKf5V6Hc1UTbquT7+Pw83dBvQN8J5F5GER2mMX1LNuvf/irwkYq0taFXmvdtySDQBoN7F3/EhLMCBOo/E5FPEemSpQQEY9U+lvl3N/+UfHzHtQH6//JvbysHe5eek0OHwlk/qixTKEQEYdPQQZWtamK+0aEgEWU6rgkrwbRZPGliBgx0uXdizoSx/96k139FL7E=			Seguimiento					2025-12-17 16:11:42.407763	2025-12-17 16:11:42.407769	1	\N	\N	
3	6	1	2025-12-17 13:16:28	Is+8tn1HThmp2/TPKVo4AMjekW0Bt8ozMPNetPCFEbFYSc0VAPe8RLP1B/GH8MlJPtKSJuTbMqziZg==							jsd9sqAOQMaNhW8DEix2tjF3v/LqUPNIvuaYyc63/TFxFLhA29BL1bgmUCSYclojv0BHARd6gfW4T0hX2BD73A4eQUxGT886lIjhzN78N+QnKL5HHu4FG/APcioerbMNAwNUTWTrzi1Klc5a3jsrB41G1mCIMNrGlpLRZRdKj0v9YhdcKLmSnzd0e+7B9mgstGjBARLID/zKxboYLOR1b1MmBwiPiroizXFflEqXN7/rw6G9OsyuydZttST/3swRcwFTlGpHKqvTG7Wg5YBXfIpYUPSWNKJm4jCn47gC0jy3BshbStekTKypWECfE1MP0K+KrNbLBmG9hXgtwcX9VrWjR7gLd/brvICXuePYMdTuHn6rqmZIPkXDm+59Qe8sEsts5N7+ZrQLZNg97lzA3bcrBfKpoM94RpXf7QKd1oIBiDVTiTIPBNrGHXJrY2K5m1cB618Dke46qguJWXrabNULo0s4nwOA7ggbpza2w7Xo2cuxDnkz+jlXO5jPMUmJPl3zYRPvzbyY1u+yXaMbEoaasqPWJh/VjZ691JXRRmzdhudkEn1Ie9hoFCQI3pSuUj6vGwRKuvGgnM8jCGpiDzrXqLm4d1ND3JpG8RZJQqBIKuac3mrxh6ISnkfRCj+pjalZbZDX9koCIG2jzaee+LXrS8CYnqQKnW79CKMwM+VeS3uTpY8p/2YNEZjbjv4Xj+svYNIQPMw2Efqa2o1Nr5cPsLy0SNWB6M7tnjdWn3MDGlEfrHTlYYdOU6fQqmlPgWcTXVPdMStC4nr4nxb8gPkMWIxAZEzJYL4Sm8jcoaYH89Kd9RdeIlG7XzDCFbOqV/HuK1uq9E542WCF7BQs98fcCgR64YqCdzPWz6fGHXKYf7Dd3S5a3SDVqoOQqm58b8AIbSzMGg/Be2lYEEK5ip5vEyLf79MWPOHBkWcdyn7iuyLmEidc9Vc/cj16L+2UKZ/jmi9O9gT99bOjGnBqXT+HPLvFnEVro+Is0ihW8Lw4p1s2SG69znXIPqZ+yYE1pKeo97BAOiLLZwcDp7It4YDaQzoHfTFhIMAndy91yJ+I2NyW4YpsOkk+lg0kg6IoW5gkh/Xk5QdD1gMR/Eq9DIfgqJN5YnjRFNEbmX7CiCpMQ25eT9e9796GSQmsSSKwxGuOpAqk5/9XVBYt9sPDUJ3b/adEaKepb15ul5Ua6v1WrVZu1037LOIRAoMQmFgwD03TnIhwhzzzQgwaDpQrZky5KEEHUIjrRpuA2LOEJApRjL4zq4xyFL4n51OHV33vVnVHfrAMSPSq+4hI2GGge74OI13wuKCoTIJExcFx41IDzoAwqLdkT+iaXTyKL7x0dJKGzJ/zIN06KAL6HN8vRerFyOX5PpcRyvI+rgKmeMLxSLprCpI5s6xhe3svoNFv83QiWKFxMw9P3tkBJMy+ddq1Q3t6XaEWg7tKkaOD0wdyhEqKmcZgOcryU6tYZmaegUoYXJyX02hXPyybpXONtQBkXcfqkvxSkbi7JdIvn1hjHAj5qF7FF6GgYCgaQ0ulaEGB1JLfoZ73Lh2PzIy+mbpm69SyMq9++ZXvcz9YMhWOyF6sGgq1sNlsba0ptzKwAaps+uaIThO+765YCFSdrLMmLqOj6R4Vq+Qwl1wjIQkIo/LyzSzRQvu387YRsLM2eNsjSO5tsd/io2GYxkiu0HRJq+7D2s8S/aP1iSG0qhs=			Seguimiento					2025-12-17 19:17:27.950149	2025-12-17 19:17:27.950158	1	\N	\N	
\.


--
-- TOC entry 4568 (class 0 OID 26465)
-- Dependencies: 221
-- Data for Name: medical_specialties; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.medical_specialties (id, name, is_active, created_at) FROM stdin;
1	Medicina General	t	2025-12-09 19:29:05.605183
2	Cardiología	t	2025-12-09 19:29:05.605183
3	Dermatología	t	2025-12-09 19:29:05.605183
4	Endocrinología	t	2025-12-09 19:29:05.605183
5	Gastroenterología	t	2025-12-09 19:29:05.605183
6	Ginecología	t	2025-12-09 19:29:05.605183
7	Hematología	t	2025-12-09 19:29:05.605183
8	Infectología	t	2025-12-09 19:29:05.605183
9	Medicina Interna	t	2025-12-09 19:29:05.605183
10	Nefrología	t	2025-12-09 19:29:05.605183
11	Neurología	t	2025-12-09 19:29:05.605183
12	Obstetricia	t	2025-12-09 19:29:05.605183
13	Oftalmología	t	2025-12-09 19:29:05.605183
14	Oncología	t	2025-12-09 19:29:05.605183
15	Ortopedia	t	2025-12-09 19:29:05.605183
16	Otorrinolaringología	t	2025-12-09 19:29:05.605183
17	Pediatría	t	2025-12-09 19:29:05.605183
18	Psiquiatría	t	2025-12-09 19:29:05.605183
19	Psicología	t	2025-12-09 19:29:05.605183
20	Radiología	t	2025-12-09 19:29:05.605183
21	Reumatología	t	2025-12-09 19:29:05.605183
22	Traumatología	t	2025-12-09 19:29:05.605183
23	Urología	t	2025-12-09 19:29:05.605183
24	Anestesiología	t	2025-12-09 19:29:05.605183
25	Cirugía General	t	2025-12-09 19:29:05.605183
26	Cirugía Plástica	t	2025-12-09 19:29:05.605183
27	Cirugía Cardiovascular	t	2025-12-09 19:29:05.605183
\.


--
-- TOC entry 4578 (class 0 OID 26527)
-- Dependencies: 231
-- Data for Name: medications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.medications (id, name, is_active, created_at, updated_at, created_by) FROM stdin;
1	Paracetamol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
2	Ibuprofeno	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
3	Naproxeno	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
4	Diclofenaco	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
5	Tramadol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
6	Ketorolaco	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
7	Metamizol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
8	Piroxicam	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
9	Indometacina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
10	Meloxicam	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
11	Celecoxib	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
12	Etoricoxib	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
13	Nabumetona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
14	Sulindaco	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
15	Tenoxicam	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
16	Aspirina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
17	Codeína	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
18	Morfina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
19	Oxicodona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
20	Fentanilo	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
21	Hidromorfona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
22	Buprenorfina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
23	Tapentadol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
24	Pregabalina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
25	Gabapentina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
26	Carbamazepina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
27	Oxcarbazepina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
28	Topiramato	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
29	Lamotrigina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
30	Valproato	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
31	Fenitoína	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
32	Levetiracetam	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
33	Clonazepam	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
34	Diazepam	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
35	Lorazepam	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
36	Alprazolam	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
37	Midazolam	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
38	Bromazepam	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
39	Clorazepato	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
40	Temazepam	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
41	Zolpidem	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
42	Zopiclona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
43	Eszopiclona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
44	Ramelteón	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
45	Melatonina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
46	Doxepina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
47	Mirtazapina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
48	Trazodona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
49	Amitriptilina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
50	Nortriptilina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
51	Imipramina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
52	Desipramina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
53	Clomipramina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
54	Fluoxetina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
55	Sertralina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
56	Paroxetina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
57	Citalopram	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
58	Escitalopram	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
59	Venlafaxina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
60	Duloxetina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
61	Bupropión	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
62	Agomelatina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
63	Vortioxetina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
64	Quetiapina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
65	Olanzapina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
66	Risperidona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
67	Aripiprazol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
68	Ziprasidona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
69	Paliperidona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
70	Haloperidol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
71	Clorpromazina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
72	Tioridazina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
73	Flufenazina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
74	Perfenazina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
75	Trifluoperazina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
76	Clozapina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
77	Lurasidona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
78	Asenapina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
79	Cariprazina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
80	Iloperidona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
81	Brexpiprazol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
82	Pimavanserina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
83	Valbenazina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
84	Tetrabenazina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
85	Deutetrabenazina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
86	Amantadina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
87	Levodopa	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
88	Carbidopa	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
89	Selegilina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
90	Rasagilina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
91	Pramipexol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
92	Ropinirol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
93	Rotigotina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
94	Apomorfina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
95	Trihexifenidilo	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
96	Benztropina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
97	Biperideno	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
98	Propranolol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
99	Nadolol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
100	Timolol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
101	Metoprolol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
102	Amoxicilina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
103	Ampicilina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
104	Penicilina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
105	Oxacilina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
106	Cloxacilina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
107	Dicloxacilina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
108	Nafcilina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
109	Piperacilina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
110	Ticarcilina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
111	Azlocilina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
112	Mezlocilina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
113	Aztreonam	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
114	Imipenem	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
115	Meropenem	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
116	Ertapenem	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
117	Doripenem	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
118	Cefalexina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
119	Cefazolina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
120	Cefadroxilo	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
121	Cefalotina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
122	Cefaclor	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
123	Cefprozil	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
124	Cefuroxima	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
125	Cefoxitina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
126	Cefotetán	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
127	Cefotaxima	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
128	Ceftazidima	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
129	Ceftriaxona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
130	Cefepima	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
131	Ceftarolina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
132	Ceftolozano	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
133	Cefiderocol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
134	Azitromicina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
135	Claritromicina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
136	Eritromicina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
137	Roxitromicina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
138	Telitromicina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
139	Diritromicina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
140	Doxiciclina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
141	Minociclina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
142	Tetraciclina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
143	Oxitetraciclina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
144	Tigeiclina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
145	Eravaciclina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
146	Omadaciclina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
147	Ciprofloxacino	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
148	Levofloxacino	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
149	Moxifloxacino	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
150	Ofloxacino	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
151	Norfloxacino	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
152	Lomefloxacino	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
153	Gatifloxacino	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
154	Gemifloxacino	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
155	Sparfloxacino	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
156	Trovafloxacino	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
157	Delafloxacino	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
158	Besifloxacino	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
159	Clindamicina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
160	Lincomicina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
161	Vancomicina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
162	Teicoplanina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
163	Daptomicina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
164	Linezolid	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
165	Tedizolid	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
166	Quinupristina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
167	Dalfopristina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
168	Tigeciclina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
169	Metronidazol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
170	Tinidazol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
171	Ornidazol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
172	Secnidazol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
173	Nitrofurantoína	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
174	Fosfomicina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
175	Ácido Nalidíxico	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
176	Ácido Pipemídico	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
177	Trimetoprima	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
178	Sulfametoxazol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
179	Sulfadiazina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
180	Sulfisoxazol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
181	Sulfadimidina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
182	Sulfametizol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
183	Sulfacloropiridazina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
184	Sulfametoxipiridazina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
185	Rifampicina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
186	Rifabutina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
187	Rifapentina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
188	Isoniazida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
189	Pirazinamida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
190	Etambutol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
191	Estreptomicina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
192	Capreomicina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
193	Cicloserina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
194	Ácido Paraaminosalicílico	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
195	Bedaquilina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
196	Delamanida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
197	Pretomanida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
198	Sutezolid	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
199	Clofazimina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
200	Dapsona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
201	Tioacetazona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
202	Terizidona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
203	Protionamida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
204	Etionamida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
205	Ácido Tiocítico	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
206	Ácido Tioctico	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
207	Ácido Alfa Lipoico	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
208	Glutatión	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
209	N-acetilcisteína	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
210	Ácido Aminocaproico	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
211	Ácido Tranexamico	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
212	Ácido Épsilon Aminocaproico	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
213	Ácido Aminometilbenzoico	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
214	Ácido Paraaminometilbenzoico	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
215	Colistina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
216	Polimixina B	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
217	Ácido Fusídico	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
218	Retapamulina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
219	Mupirocina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
220	Bacitracina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
221	Neomicina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
222	Kanamicina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
223	Amikacina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
336	Filgotinib	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
224	Gentamicina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
225	Tobramicina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
226	Netilmicina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
227	Isepamicina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
228	Plazomicina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
229	Arbekacina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
230	Astromicina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
231	Ácido Fosfónico	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
232	Fosmidomicina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
233	Fosfazina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
234	Fosfato	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
235	Fosfonato	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
236	Fosfonitrilo	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
237	Flucloxacilina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
238	Meticilina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
239	Benzilpenicilina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
240	Penicilina G	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
241	Penicilina V	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
242	Fenoximetilpenicilina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
243	Benzatina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
244	Procaína	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
245	Prednisona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
246	Prednisolona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
247	Metilprednisolona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
248	Dexametasona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
249	Betametasona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
250	Hidrocortisona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
251	Cortisona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
252	Fludrocortisona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
253	Triamcinolona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
254	Beclometasona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
255	Budesonida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
256	Fluticasona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
257	Mometasona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
258	Ciclesonida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
259	Deflazacort	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
260	Clobetasol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
261	Halobetasol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
262	Flucinolona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
263	Fluocinolona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
264	Fluocinonida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
265	Desoximetasona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
266	Alclometasona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
267	Amcinonida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
268	Desonida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
269	Flurandrenolida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
270	Halometonida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
271	Prednicarbato	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
272	Diflorasona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
273	Ulobetasol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
274	Ácido Salicílico	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
275	Ácido Acetilsalicílico	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
276	Diflunisal	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
277	Salsalato	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
278	Tolmetina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
279	Aceclofenaco	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
280	Etodolaco	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
281	Lornoxicam	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
282	Isoxicam	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
283	Rofecoxib	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
284	Valdecoxib	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
285	Parecoxib	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
286	Lumiracoxib	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
287	Firocoxib	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
288	Cimicoxib	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
289	Mavacoxib	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
290	Colchicina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
291	Probenecida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
292	Alopurinol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
293	Febuxostat	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
294	Pegloticasa	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
295	Rasburicasa	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
296	Lesinurad	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
297	Verinurad	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
298	Metotrexato	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
299	Leflunomida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
300	Sulfasalazina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
301	Hidroxicloroquina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
302	Cloroquina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
303	Azatioprina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
304	Micofenolato	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
305	Ciclosporina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
306	Tacrolimus	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
307	Sirolimus	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
308	Everolimus	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
309	Belatacept	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
310	Abatacept	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
311	Rituximab	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
312	Tocilizumab	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
313	Adalimumab	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
314	Infliximab	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
315	Etanercept	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
316	Golimumab	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
317	Certolizumab	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
318	Vedolizumab	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
319	Ustekinumab	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
320	Secukinumab	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
321	Ixekizumab	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
322	Brodalumab	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
323	Guselkumab	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
324	Tildrakizumab	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
325	Risankizumab	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
326	Mirikizumab	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
327	Bimekizumab	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
328	Anakinra	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
329	Canakinumab	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
330	Ilaris	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
331	Sarilumab	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
332	Kevzara	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
333	Baricitinib	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
334	Tofacitinib	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
335	Upadacitinib	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
337	Peficitinib	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
338	Ruxolitinib	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
339	Fedratinib	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
340	Pacritinib	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
341	Momelotinib	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
342	Ritlecitinib	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
343	Abrocitinib	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
344	Deucravacitinib	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
345	Ibrexafungerp	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
346	Rezafungin	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
347	Fosmanogepix	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
348	Olorofim	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
349	Fosravuconazol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
350	Omeprazol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
351	Lansoprazol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
352	Pantoprazol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
353	Rabeprazol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
354	Esomeprazol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
355	Dexlansoprazol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
356	Tenatoprazol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
357	Ilaprazol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
358	Ranitidina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
359	Famotidina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
360	Cimetidina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
361	Nizatidina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
362	Roxatidina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
363	Lafutidina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
364	Ebrotidina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
365	Lavoltidina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
366	Sucralfato	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
367	Bismuto	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
368	Subsalicilato	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
369	Carbonato	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
370	Hidróxido	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
371	Aluminio	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
372	Magnesio	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
373	Calcio	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
374	Sodio	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
375	Bicarbonato	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
376	Litio	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
377	Potasio	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
378	Metoclopramida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
379	Domperidona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
380	Cisaprida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
381	Mosaprida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
382	Itoprida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
383	Tegaserod	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
384	Prucaloprida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
385	Lubiprostone	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
386	Linaclótida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
387	Plecanatida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
388	Elobixibat	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
389	Tenapanor	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
390	Crofelemer	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
391	Rifaximina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
392	Mesalazina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
393	Olsalazina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
394	Balsalazida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
395	Mercaptopurina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
396	Fidaxomicina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
397	Bezlotoxumab	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
398	Actoxumab	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
399	Surotomycin	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
400	Cadazolid	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
401	LFF571	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
402	Ridinilazol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
403	Ramizol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
404	Microcin	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
405	J25	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
406	Lactobacillus	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
407	Bifidobacterium	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
408	Saccharomyces	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
409	Boulardii	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
410	Enterococcus	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
411	Faecium	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
412	Streptococcus	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
413	Thermophilus	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
414	Lactococcus	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
415	Lactis	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
416	Leuconostoc	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
417	Mesenteroides	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
418	Pediococcus	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
419	Acidilactici	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
420	Acidophilus	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
421	Casei	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
422	Rhamnosus	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
423	Reuteri	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
424	Bifidum	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
425	Longum	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
426	Breve	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
427	Infantis	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
428	Losartán	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
429	Valsartán	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
430	Irbesartán	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
431	Candesartán	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
432	Telmisartán	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
433	Olmesartán	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
434	Azilsartán	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
435	Eprosartán	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
436	Enalapril	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
437	Lisinopril	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
438	Captopril	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
439	Ramipril	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
440	Quinapril	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
441	Perindopril	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
442	Fosinopril	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
443	Benazepril	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
444	Trandolapril	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
445	Cilazapril	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
446	Imidapril	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
447	Moexipril	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
448	Spirapril	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
449	Zofenopril	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
450	Amlodipino	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
451	Nifedipino	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
452	Felodipino	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
453	Isradipino	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
454	Nicardipino	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
455	Nisoldipino	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
456	Nitrendipino	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
457	Lacidipino	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
458	Manidipino	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
459	Lercanidipino	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
460	Aranidipino	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
461	Barnidipino	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
462	Cilnidipino	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
463	Efonidipino	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
464	Verapamilo	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
465	Diltiazem	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
466	Atenolol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
467	Bisoprolol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
468	Pindolol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
469	Acebutolol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
470	Betaxolol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
471	Celiprolol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
472	Esmolol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
473	Labetalol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
474	Nebivolol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
475	Carvedilol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
476	Bucindolol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
477	Penbutolol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
478	Sotalol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
479	Furosemida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
480	Hidroclorotiazida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
481	Clorotiazida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
482	Bendroflumetiazida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
483	Metolazona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
484	Indapamida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
485	Clortalidona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
486	Triantereno	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
487	Amilorida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
488	Espironolactona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
489	Eplerenona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
490	Canrenona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
491	Canrenoato	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
492	Triamtereno	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
493	Digoxina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
494	Digitoxina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
495	Ouabaina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
496	Estrofantina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
497	Lanatosido	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
498	Acetildigoxina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
499	Metildigoxina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
500	Atorvastatina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
501	Simvastatina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
502	Lovastatina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
503	Pravastatina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
504	Fluvastatina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
505	Rosuvastatina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
506	Pitavastatina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
507	Ezetimiba	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
508	Colestiramina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
509	Colestipol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
510	Colesevelam	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
511	Ácido	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
512	Nicotínico	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
513	Niacina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
514	Fenofibrato	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
515	Gemfibrozilo	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
516	Bezafibrato	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
517	Ciprofibrato	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
518	Clofibrato	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
519	Etofibrato	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
520	Acetilsalicílico	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
521	Clopidogrel	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
522	Prasugrel	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
523	Ticagrelor	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
524	Cangrelor	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
525	Vorapaxar	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
526	Ticlopidina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
527	Dipyridamole	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
528	Cilostazol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
529	Pentoxifilina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
530	Warfarina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
531	Acenocumarol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
532	Fenprocumón	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
533	Dabigatrán	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
534	Rivaroxabán	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
535	Apixabán	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
536	Edoxabán	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
537	Betrixabán	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
538	Heparina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
539	Enoxaparina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
540	Dalteparina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
541	Tinzaparina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
542	Nadroparina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
543	Certoparina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
544	Bemiparina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
545	Reviparina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
546	Fondaparinux	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
547	Idraparinux	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
548	Idrabiotaparinux	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
549	Argatroban	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
550	Bivalirudina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
551	Lepirudina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
552	Desirudina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
553	Hirudina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
554	Melagatrán	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
555	Ximelagatrán	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
556	Etexilato	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
557	Andexanet	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
558	Alfa	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
559	Ciraparantag	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
560	Idarucizumab	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
561	Salbutamol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
562	Terbutalina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
563	Fenoterol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
564	Formoterol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
565	Salmeterol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
566	Indacaterol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
567	Olodaterol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
568	Vilanterol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
569	Arformoterol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
570	Levalbuterol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
571	Pirbuterol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
572	Procaterol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
573	Rimiterol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
574	Tulobuterol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
575	Clenbuterol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
576	Bambuterol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
577	Bromuro	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
578	Ipratropio	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
579	Tiotropio	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
580	Umeclidinio	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
581	Glicopirronio	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
582	Aclidinio	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
583	Revefenacina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
584	Montelukast	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
585	Zafirlukast	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
586	Pranlukast	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
587	Zileutón	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
588	Omalizumab	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
589	Mepolizumab	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
590	Reslizumab	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
591	Benralizumab	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
592	Dupilumab	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
593	Tralokinumab	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
594	Lebrikizumab	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
595	Tezepelumab	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
596	Fevipiprant	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
597	Setipiprant	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
598	Timapiprant	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
599	Lirentelimab	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
600	Guaifenesina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
601	Bromhexina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
602	Ambroxol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
603	Acetilcisteína	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
604	Carbocisteína	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
605	Erdosteína	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
606	Fudosteína	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
607	Letosteína	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
608	Efedrina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
609	Pseudoefedrina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
610	Fenilefrina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
611	Oximetazolina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
612	Xilometazolina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
613	Nafazolina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
614	Tetrizolina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
615	Cromoglicato	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
616	Nedocromil	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
617	Cromoglicico	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
618	Ketotifeno	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
619	Olopatadina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
620	Azelastina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
621	Epinastina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
622	Emedastina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
623	Bepotastina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
624	Bilastina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
625	Cetirizina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
626	Levocetirizina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
627	Fexofenadina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
628	Loratadina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
629	Desloratadina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
630	Rupatadina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
631	Ebastina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
632	Mizolastina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
633	Metformina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
634	Glibenclamida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
635	Glipizida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
636	Glicazida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
637	Glimepirida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
638	Repaglinida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
639	Nateglinida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
640	Mitiglinida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
641	Pioglitazona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
642	Rosiglitazona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
643	Troglitazona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
644	Lobeglitazona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
645	Dapagliflozina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
646	Canagliflozina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
647	Empagliflozina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
648	Ertugliflozina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
649	Sotagliflozina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
650	Bexagliflozina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
651	Tofogliflozina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
652	Luseogliflozina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
653	Ipragliflozina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
654	Sitagliptina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
655	Vildagliptina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
656	Saxagliptina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
657	Alogliptina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
658	Linagliptina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
659	Gemigliptina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
660	Anagliptina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
661	Teneligliptina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
662	Trelagliptina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
663	Omarigliptina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
664	Evogliptina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
665	Gosogliptina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
666	Dutogliptina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
667	Melogliptina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
668	Acarbosa	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
669	Miglitol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
670	Voglibosa	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
671	Emiglitate	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
672	Exenatida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
673	Liraglutida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
674	Lixisenatida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
675	Dulaglutida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
676	Semaglutida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
677	Albiglutida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
678	Tirzepatida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
679	Retatrutida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
680	Insulina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
681	Glargina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
682	Detemir	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
683	Degludec	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
684	NPH	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
685	Regular	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
686	Lispro	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
687	Aspart	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
688	Glulisina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
689	U300	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
690	U100	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
691	U200	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
692	Pramlintida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
693	Amylina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
694	Diazóxido	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
695	Octreotida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
696	Lanreotida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
697	Pasireotida	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
698	Somatostatina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
699	Bromocriptina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
700	Tiamina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
701	Riboflavina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
702	Pantoténico	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
703	Piridoxina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
704	Biotina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
705	Fólico	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
706	Cobalamina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
707	Ascórbico	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
708	Vitamina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
709	Retinol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
710	Colecalciferol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
711	Tocoferol	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
712	Filoquinona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
713	Menaquinona	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
714	Hierro	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
715	Sulfato	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
716	Ferroso	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
717	Fumarato	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
718	Gluconato	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
719	Carbonilo	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
720	Sucrosomial	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
721	Folinico	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
722	Citrato	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
723	Lactato	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
724	Óxido	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
725	Aspartato	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
726	Zinc	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
727	Acetato	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
728	Picolinato	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
729	Selenio	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
730	Selenito	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
731	Selenato	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
732	Metionina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
733	Cobre	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
734	Manganeso	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
735	Cromo	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
736	Cloruro	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
737	Molibdeno	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
738	Molibdato	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
739	Yodo	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
740	aspirina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
741	motrin	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
742	loratadina	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	0
\.


--
-- TOC entry 4588 (class 0 OID 26647)
-- Dependencies: 241
-- Data for Name: offices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.offices (id, doctor_id, name, address, city, state_id, country_id, postal_code, phone, timezone, maps_url, is_active, is_virtual, virtual_url, created_at, updated_at) FROM stdin;
1	1	Arancione	Av Paseos de Zakia Ote 240 int 50	El Marques	22	\N	\N	+525518731862	America/Mexico_City	https://maps.app.goo.gl/MZfHp5L1hqev96MM8	t	f	\N	2025-12-10 19:27:53.134918	2025-12-10 19:27:53.134923
\.


--
-- TOC entry 4586 (class 0 OID 26622)
-- Dependencies: 239
-- Data for Name: person_documents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.person_documents (id, person_id, document_id, document_value, is_active, created_at, updated_at) FROM stdin;
1	1	5	MOGH981005MDFRRL09	t	2025-12-10 19:27:52.695401	2025-12-12 00:10:46.423355
2	1	13	11161195	t	2025-12-10 19:27:52.895179	2025-12-12 00:10:46.324324
\.


--
-- TOC entry 4584 (class 0 OID 26571)
-- Dependencies: 237
-- Data for Name: persons; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.persons (id, person_code, person_type, title, birth_date, gender, civil_status, birth_city, birth_state_id, birth_country_id, email, primary_phone, home_address, address_city, address_state_id, address_country_id, address_postal_code, specialty_id, university, graduation_year, professional_license, appointment_duration, insurance_provider, insurance_number, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, hashed_password, is_active, last_login, created_at, updated_at, created_by, name, avatar_type, avatar_template_key, avatar_file_path) FROM stdin;
0	SYS	admin	\N	\N	\N	\N	\N	\N	\N	rafael@cortexclinico.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	$2b$12$xcSllVt3s.j8XYKEjcZXyejInh7Gy1sBBOQiYFWVsHQPJvjEcKWbW	t	\N	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183	\N	System Administrator	\N	\N	\N
1	DOC000001	doctor	Lic.	1989-10-04	F	\N	\N	\N	\N	adriana.morenoh@outlook.es	+525518731852	\N	\N	\N	\N	\N	19	UNAM	2010	\N	60	\N	\N	\N	\N	\N	$2b$12$xcSllVt3s.j8XYKEjcZXyejInh7Gy1sBBOQiYFWVsHQPJvjEcKWbW	t	\N	2025-12-10 19:27:52.51783	2025-12-12 00:10:45.897274	\N	Gloria Adriana Moreno Hernandez	initials	\N	\N
6	PAT000001	patient	\N	\N	Masculino	\N	\N	\N	\N	\N	+525579449672	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2025-12-15 21:32:06.134628	2025-12-17 19:17:26.402943	1	Jose Garcia	initials	\N	\N
\.


--
-- TOC entry 4610 (class 0 OID 26899)
-- Dependencies: 263
-- Data for Name: privacy_consents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.privacy_consents (id, patient_id, notice_id, consent_given, consent_date, ip_address, user_agent, created_at) FROM stdin;
\.


--
-- TOC entry 4608 (class 0 OID 26888)
-- Dependencies: 261
-- Data for Name: privacy_notices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.privacy_notices (id, version, title, content, effective_date, is_active, created_at) FROM stdin;
\.


--
-- TOC entry 4604 (class 0 OID 26842)
-- Dependencies: 257
-- Data for Name: schedule_templates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.schedule_templates (id, doctor_id, office_id, day_of_week, start_time, end_time, is_active, created_at, updated_at, consultation_duration, break_duration, lunch_start, lunch_end, time_blocks) FROM stdin;
4	1	1	0	09:00:00	17:00:00	t	2025-12-12 01:27:57.707854	2025-12-12 01:28:17.565264	\N	\N	\N	\N	[{"end_time": "17:00", "start_time": "09:00"}]
5	1	1	1	09:00:00	18:00:00	t	2025-12-12 01:27:57.707854	2025-12-12 01:28:18.058102	\N	\N	\N	\N	[{"end_time": "18:00", "start_time": "09:00"}]
6	1	1	2	09:00:00	18:00:00	t	2025-12-12 01:27:57.707854	2025-12-12 01:28:18.540169	\N	\N	\N	\N	[{"end_time": "18:00", "start_time": "09:00"}]
7	1	1	3	09:00:00	18:00:00	t	2025-12-12 01:27:57.707854	2025-12-12 01:28:19.041259	\N	\N	\N	\N	[{"end_time": "18:00", "start_time": "09:00"}]
8	1	1	4	09:00:00	18:00:00	t	2025-12-12 01:27:57.707854	2025-12-12 01:28:19.868662	\N	\N	\N	\N	[{"end_time": "18:00", "start_time": "09:00"}]
\.


--
-- TOC entry 4565 (class 0 OID 26444)
-- Dependencies: 218
-- Data for Name: states; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.states (id, name, country_id, is_active, created_at) FROM stdin;
1	Aguascalientes	1	t	2025-12-09 19:29:05.605183
2	Baja California	1	t	2025-12-09 19:29:05.605183
3	Baja California Sur	1	t	2025-12-09 19:29:05.605183
4	Campeche	1	t	2025-12-09 19:29:05.605183
5	Chiapas	1	t	2025-12-09 19:29:05.605183
6	Chihuahua	1	t	2025-12-09 19:29:05.605183
7	Ciudad de México	1	t	2025-12-09 19:29:05.605183
8	Coahuila	1	t	2025-12-09 19:29:05.605183
9	Colima	1	t	2025-12-09 19:29:05.605183
10	Durango	1	t	2025-12-09 19:29:05.605183
11	Guanajuato	1	t	2025-12-09 19:29:05.605183
12	Guerrero	1	t	2025-12-09 19:29:05.605183
13	Hidalgo	1	t	2025-12-09 19:29:05.605183
14	Jalisco	1	t	2025-12-09 19:29:05.605183
15	México	1	t	2025-12-09 19:29:05.605183
16	Michoacán	1	t	2025-12-09 19:29:05.605183
17	Morelos	1	t	2025-12-09 19:29:05.605183
18	Nayarit	1	t	2025-12-09 19:29:05.605183
19	Nuevo León	1	t	2025-12-09 19:29:05.605183
20	Oaxaca	1	t	2025-12-09 19:29:05.605183
21	Puebla	1	t	2025-12-09 19:29:05.605183
22	Querétaro	1	t	2025-12-09 19:29:05.605183
23	Quintana Roo	1	t	2025-12-09 19:29:05.605183
24	San Luis Potosí	1	t	2025-12-09 19:29:05.605183
25	Sinaloa	1	t	2025-12-09 19:29:05.605183
26	Sonora	1	t	2025-12-09 19:29:05.605183
27	Tabasco	1	t	2025-12-09 19:29:05.605183
28	Tamaulipas	1	t	2025-12-09 19:29:05.605183
29	Tlaxcala	1	t	2025-12-09 19:29:05.605183
30	Veracruz	1	t	2025-12-09 19:29:05.605183
31	Yucatán	1	t	2025-12-09 19:29:05.605183
32	Zacatecas	1	t	2025-12-09 19:29:05.605183
33	Alabama	2	t	2025-12-09 19:29:05.605183
34	Alaska	2	t	2025-12-09 19:29:05.605183
35	Arizona	2	t	2025-12-09 19:29:05.605183
36	Arkansas	2	t	2025-12-09 19:29:05.605183
37	California	2	t	2025-12-09 19:29:05.605183
38	Colorado	2	t	2025-12-09 19:29:05.605183
39	Connecticut	2	t	2025-12-09 19:29:05.605183
40	Delaware	2	t	2025-12-09 19:29:05.605183
41	Florida	2	t	2025-12-09 19:29:05.605183
42	Georgia	2	t	2025-12-09 19:29:05.605183
43	Hawaii	2	t	2025-12-09 19:29:05.605183
44	Idaho	2	t	2025-12-09 19:29:05.605183
45	Illinois	2	t	2025-12-09 19:29:05.605183
46	Indiana	2	t	2025-12-09 19:29:05.605183
47	Iowa	2	t	2025-12-09 19:29:05.605183
48	Kansas	2	t	2025-12-09 19:29:05.605183
49	Kentucky	2	t	2025-12-09 19:29:05.605183
50	Louisiana	2	t	2025-12-09 19:29:05.605183
51	Maine	2	t	2025-12-09 19:29:05.605183
52	Maryland	2	t	2025-12-09 19:29:05.605183
53	Massachusetts	2	t	2025-12-09 19:29:05.605183
54	Michigan	2	t	2025-12-09 19:29:05.605183
55	Minnesota	2	t	2025-12-09 19:29:05.605183
56	Mississippi	2	t	2025-12-09 19:29:05.605183
57	Missouri	2	t	2025-12-09 19:29:05.605183
58	Montana	2	t	2025-12-09 19:29:05.605183
59	Nebraska	2	t	2025-12-09 19:29:05.605183
60	Nevada	2	t	2025-12-09 19:29:05.605183
61	New Hampshire	2	t	2025-12-09 19:29:05.605183
62	New Jersey	2	t	2025-12-09 19:29:05.605183
63	New Mexico	2	t	2025-12-09 19:29:05.605183
64	New York	2	t	2025-12-09 19:29:05.605183
65	North Carolina	2	t	2025-12-09 19:29:05.605183
66	North Dakota	2	t	2025-12-09 19:29:05.605183
67	Ohio	2	t	2025-12-09 19:29:05.605183
68	Oklahoma	2	t	2025-12-09 19:29:05.605183
69	Oregon	2	t	2025-12-09 19:29:05.605183
70	Pennsylvania	2	t	2025-12-09 19:29:05.605183
71	Rhode Island	2	t	2025-12-09 19:29:05.605183
72	South Carolina	2	t	2025-12-09 19:29:05.605183
73	South Dakota	2	t	2025-12-09 19:29:05.605183
74	Tennessee	2	t	2025-12-09 19:29:05.605183
75	Texas	2	t	2025-12-09 19:29:05.605183
76	Utah	2	t	2025-12-09 19:29:05.605183
77	Vermont	2	t	2025-12-09 19:29:05.605183
78	Virginia	2	t	2025-12-09 19:29:05.605183
79	Washington	2	t	2025-12-09 19:29:05.605183
80	West Virginia	2	t	2025-12-09 19:29:05.605183
81	Wisconsin	2	t	2025-12-09 19:29:05.605183
82	Wyoming	2	t	2025-12-09 19:29:05.605183
83	District of Columbia	2	t	2025-12-09 19:29:05.605183
84	Andalucía	3	t	2025-12-09 19:29:05.605183
85	Aragón	3	t	2025-12-09 19:29:05.605183
86	Asturias	3	t	2025-12-09 19:29:05.605183
87	Baleares	3	t	2025-12-09 19:29:05.605183
88	Canarias	3	t	2025-12-09 19:29:05.605183
89	Cantabria	3	t	2025-12-09 19:29:05.605183
90	Castilla-La Mancha	3	t	2025-12-09 19:29:05.605183
91	Castilla y León	3	t	2025-12-09 19:29:05.605183
92	Cataluña	3	t	2025-12-09 19:29:05.605183
93	Comunidad Valenciana	3	t	2025-12-09 19:29:05.605183
94	Extremadura	3	t	2025-12-09 19:29:05.605183
95	Galicia	3	t	2025-12-09 19:29:05.605183
96	La Rioja	3	t	2025-12-09 19:29:05.605183
97	Madrid	3	t	2025-12-09 19:29:05.605183
98	Murcia	3	t	2025-12-09 19:29:05.605183
99	Navarra	3	t	2025-12-09 19:29:05.605183
100	País Vasco	3	t	2025-12-09 19:29:05.605183
101	Buenos Aires	4	t	2025-12-09 19:29:05.605183
102	Catamarca	4	t	2025-12-09 19:29:05.605183
103	Chaco	4	t	2025-12-09 19:29:05.605183
104	Chubut	4	t	2025-12-09 19:29:05.605183
105	Córdoba	4	t	2025-12-09 19:29:05.605183
106	Corrientes	4	t	2025-12-09 19:29:05.605183
107	Entre Ríos	4	t	2025-12-09 19:29:05.605183
108	Formosa	4	t	2025-12-09 19:29:05.605183
109	Jujuy	4	t	2025-12-09 19:29:05.605183
110	La Pampa	4	t	2025-12-09 19:29:05.605183
111	La Rioja	4	t	2025-12-09 19:29:05.605183
112	Mendoza	4	t	2025-12-09 19:29:05.605183
113	Misiones	4	t	2025-12-09 19:29:05.605183
114	Neuquén	4	t	2025-12-09 19:29:05.605183
115	Río Negro	4	t	2025-12-09 19:29:05.605183
116	Salta	4	t	2025-12-09 19:29:05.605183
117	San Juan	4	t	2025-12-09 19:29:05.605183
118	San Luis	4	t	2025-12-09 19:29:05.605183
119	Santa Cruz	4	t	2025-12-09 19:29:05.605183
120	Santa Fe	4	t	2025-12-09 19:29:05.605183
121	Santiago del Estero	4	t	2025-12-09 19:29:05.605183
122	Tierra del Fuego	4	t	2025-12-09 19:29:05.605183
123	Tucumán	4	t	2025-12-09 19:29:05.605183
124	Amazonas	5	t	2025-12-09 19:29:05.605183
125	Antioquia	5	t	2025-12-09 19:29:05.605183
126	Arauca	5	t	2025-12-09 19:29:05.605183
127	Atlántico	5	t	2025-12-09 19:29:05.605183
128	Bolívar	5	t	2025-12-09 19:29:05.605183
129	Boyacá	5	t	2025-12-09 19:29:05.605183
130	Caldas	5	t	2025-12-09 19:29:05.605183
131	Caquetá	5	t	2025-12-09 19:29:05.605183
132	Casanare	5	t	2025-12-09 19:29:05.605183
133	Cauca	5	t	2025-12-09 19:29:05.605183
134	Cesar	5	t	2025-12-09 19:29:05.605183
135	Chocó	5	t	2025-12-09 19:29:05.605183
136	Córdoba	5	t	2025-12-09 19:29:05.605183
137	Cundinamarca	5	t	2025-12-09 19:29:05.605183
138	Guainía	5	t	2025-12-09 19:29:05.605183
139	Guaviare	5	t	2025-12-09 19:29:05.605183
140	Huila	5	t	2025-12-09 19:29:05.605183
141	La Guajira	5	t	2025-12-09 19:29:05.605183
142	Magdalena	5	t	2025-12-09 19:29:05.605183
143	Meta	5	t	2025-12-09 19:29:05.605183
144	Nariño	5	t	2025-12-09 19:29:05.605183
145	Norte de Santander	5	t	2025-12-09 19:29:05.605183
146	Putumayo	5	t	2025-12-09 19:29:05.605183
147	Quindío	5	t	2025-12-09 19:29:05.605183
148	Risaralda	5	t	2025-12-09 19:29:05.605183
149	San Andrés y Providencia	5	t	2025-12-09 19:29:05.605183
150	Santander	5	t	2025-12-09 19:29:05.605183
151	Sucre	5	t	2025-12-09 19:29:05.605183
152	Tolima	5	t	2025-12-09 19:29:05.605183
153	Valle del Cauca	5	t	2025-12-09 19:29:05.605183
154	Vaupés	5	t	2025-12-09 19:29:05.605183
155	Vichada	5	t	2025-12-09 19:29:05.605183
156	Bogotá D.C.	5	t	2025-12-09 19:29:05.605183
157	Arica y Parinacota	6	t	2025-12-09 19:29:05.605183
158	Tarapacá	6	t	2025-12-09 19:29:05.605183
159	Antofagasta	6	t	2025-12-09 19:29:05.605183
160	Atacama	6	t	2025-12-09 19:29:05.605183
161	Coquimbo	6	t	2025-12-09 19:29:05.605183
162	Valparaíso	6	t	2025-12-09 19:29:05.605183
163	Región Metropolitana	6	t	2025-12-09 19:29:05.605183
164	O'Higgins	6	t	2025-12-09 19:29:05.605183
165	Maule	6	t	2025-12-09 19:29:05.605183
166	Ñuble	6	t	2025-12-09 19:29:05.605183
167	Biobío	6	t	2025-12-09 19:29:05.605183
168	Araucanía	6	t	2025-12-09 19:29:05.605183
169	Los Ríos	6	t	2025-12-09 19:29:05.605183
170	Los Lagos	6	t	2025-12-09 19:29:05.605183
171	Aysén	6	t	2025-12-09 19:29:05.605183
172	Magallanes	6	t	2025-12-09 19:29:05.605183
173	Amazonas	7	t	2025-12-09 19:29:05.605183
174	Áncash	7	t	2025-12-09 19:29:05.605183
175	Apurímac	7	t	2025-12-09 19:29:05.605183
176	Arequipa	7	t	2025-12-09 19:29:05.605183
177	Ayacucho	7	t	2025-12-09 19:29:05.605183
178	Cajamarca	7	t	2025-12-09 19:29:05.605183
179	Callao	7	t	2025-12-09 19:29:05.605183
180	Cusco	7	t	2025-12-09 19:29:05.605183
181	Huancavelica	7	t	2025-12-09 19:29:05.605183
182	Huánuco	7	t	2025-12-09 19:29:05.605183
183	Ica	7	t	2025-12-09 19:29:05.605183
184	Junín	7	t	2025-12-09 19:29:05.605183
185	La Libertad	7	t	2025-12-09 19:29:05.605183
186	Lambayeque	7	t	2025-12-09 19:29:05.605183
187	Lima	7	t	2025-12-09 19:29:05.605183
188	Loreto	7	t	2025-12-09 19:29:05.605183
189	Madre de Dios	7	t	2025-12-09 19:29:05.605183
190	Moquegua	7	t	2025-12-09 19:29:05.605183
191	Pasco	7	t	2025-12-09 19:29:05.605183
192	Piura	7	t	2025-12-09 19:29:05.605183
193	Puno	7	t	2025-12-09 19:29:05.605183
194	San Martín	7	t	2025-12-09 19:29:05.605183
195	Tacna	7	t	2025-12-09 19:29:05.605183
196	Tumbes	7	t	2025-12-09 19:29:05.605183
197	Ucayali	7	t	2025-12-09 19:29:05.605183
198	Amazonas	9	t	2025-12-09 19:29:05.605183
199	Anzoátegui	9	t	2025-12-09 19:29:05.605183
200	Apure	9	t	2025-12-09 19:29:05.605183
201	Aragua	9	t	2025-12-09 19:29:05.605183
202	Barinas	9	t	2025-12-09 19:29:05.605183
203	Bolívar	9	t	2025-12-09 19:29:05.605183
204	Carabobo	9	t	2025-12-09 19:29:05.605183
205	Cojedes	9	t	2025-12-09 19:29:05.605183
206	Delta Amacuro	9	t	2025-12-09 19:29:05.605183
207	Distrito Capital	9	t	2025-12-09 19:29:05.605183
208	Falcón	9	t	2025-12-09 19:29:05.605183
209	Guárico	9	t	2025-12-09 19:29:05.605183
210	Lara	9	t	2025-12-09 19:29:05.605183
211	Mérida	9	t	2025-12-09 19:29:05.605183
212	Miranda	9	t	2025-12-09 19:29:05.605183
213	Monagas	9	t	2025-12-09 19:29:05.605183
214	Nueva Esparta	9	t	2025-12-09 19:29:05.605183
215	Portuguesa	9	t	2025-12-09 19:29:05.605183
216	Sucre	9	t	2025-12-09 19:29:05.605183
217	Táchira	9	t	2025-12-09 19:29:05.605183
218	Trujillo	9	t	2025-12-09 19:29:05.605183
219	Vargas	9	t	2025-12-09 19:29:05.605183
220	Yaracuy	9	t	2025-12-09 19:29:05.605183
221	Zulia	9	t	2025-12-09 19:29:05.605183
222	Azuay	10	t	2025-12-09 19:29:05.605183
223	Bolívar	10	t	2025-12-09 19:29:05.605183
224	Cañar	10	t	2025-12-09 19:29:05.605183
225	Carchi	10	t	2025-12-09 19:29:05.605183
226	Chimborazo	10	t	2025-12-09 19:29:05.605183
227	Cotopaxi	10	t	2025-12-09 19:29:05.605183
228	El Oro	10	t	2025-12-09 19:29:05.605183
229	Esmeraldas	10	t	2025-12-09 19:29:05.605183
230	Galápagos	10	t	2025-12-09 19:29:05.605183
231	Guayas	10	t	2025-12-09 19:29:05.605183
232	Imbabura	10	t	2025-12-09 19:29:05.605183
233	Loja	10	t	2025-12-09 19:29:05.605183
234	Los Ríos	10	t	2025-12-09 19:29:05.605183
235	Manabí	10	t	2025-12-09 19:29:05.605183
236	Morona Santiago	10	t	2025-12-09 19:29:05.605183
237	Napo	10	t	2025-12-09 19:29:05.605183
238	Orellana	10	t	2025-12-09 19:29:05.605183
239	Pastaza	10	t	2025-12-09 19:29:05.605183
240	Pichincha	10	t	2025-12-09 19:29:05.605183
241	Santa Elena	10	t	2025-12-09 19:29:05.605183
242	Santo Domingo	10	t	2025-12-09 19:29:05.605183
243	Sucumbíos	10	t	2025-12-09 19:29:05.605183
244	Tungurahua	10	t	2025-12-09 19:29:05.605183
245	Zamora Chinchipe	10	t	2025-12-09 19:29:05.605183
246	Artigas	11	t	2025-12-09 19:29:05.605183
247	Canelones	11	t	2025-12-09 19:29:05.605183
248	Cerro Largo	11	t	2025-12-09 19:29:05.605183
249	Colonia	11	t	2025-12-09 19:29:05.605183
250	Durazno	11	t	2025-12-09 19:29:05.605183
251	Flores	11	t	2025-12-09 19:29:05.605183
252	Florida	11	t	2025-12-09 19:29:05.605183
253	Lavalleja	11	t	2025-12-09 19:29:05.605183
254	Maldonado	11	t	2025-12-09 19:29:05.605183
255	Montevideo	11	t	2025-12-09 19:29:05.605183
256	Paysandú	11	t	2025-12-09 19:29:05.605183
257	Río Negro	11	t	2025-12-09 19:29:05.605183
258	Rivera	11	t	2025-12-09 19:29:05.605183
259	Rocha	11	t	2025-12-09 19:29:05.605183
260	Salto	11	t	2025-12-09 19:29:05.605183
261	San José	11	t	2025-12-09 19:29:05.605183
262	Soriano	11	t	2025-12-09 19:29:05.605183
263	Tacuarembó	11	t	2025-12-09 19:29:05.605183
264	Treinta y Tres	11	t	2025-12-09 19:29:05.605183
265	Alto Paraguay	12	t	2025-12-09 19:29:05.605183
266	Alto Paraná	12	t	2025-12-09 19:29:05.605183
267	Amambay	12	t	2025-12-09 19:29:05.605183
268	Asunción	12	t	2025-12-09 19:29:05.605183
269	Boquerón	12	t	2025-12-09 19:29:05.605183
270	Caaguazú	12	t	2025-12-09 19:29:05.605183
271	Caazapá	12	t	2025-12-09 19:29:05.605183
272	Canindeyú	12	t	2025-12-09 19:29:05.605183
273	Central	12	t	2025-12-09 19:29:05.605183
274	Concepción	12	t	2025-12-09 19:29:05.605183
275	Cordillera	12	t	2025-12-09 19:29:05.605183
276	Guairá	12	t	2025-12-09 19:29:05.605183
277	Itapúa	12	t	2025-12-09 19:29:05.605183
278	Misiones	12	t	2025-12-09 19:29:05.605183
279	Ñeembucú	12	t	2025-12-09 19:29:05.605183
280	Paraguarí	12	t	2025-12-09 19:29:05.605183
281	Presidente Hayes	12	t	2025-12-09 19:29:05.605183
282	San Pedro	12	t	2025-12-09 19:29:05.605183
283	Chuquisaca	13	t	2025-12-09 19:29:05.605183
284	La Paz	13	t	2025-12-09 19:29:05.605183
285	Cochabamba	13	t	2025-12-09 19:29:05.605183
286	Oruro	13	t	2025-12-09 19:29:05.605183
287	Potosí	13	t	2025-12-09 19:29:05.605183
288	Tarija	13	t	2025-12-09 19:29:05.605183
289	Santa Cruz	13	t	2025-12-09 19:29:05.605183
290	Beni	13	t	2025-12-09 19:29:05.605183
291	Pando	13	t	2025-12-09 19:29:05.605183
292	Alta Verapaz	14	t	2025-12-09 19:29:05.605183
293	Baja Verapaz	14	t	2025-12-09 19:29:05.605183
294	Chimaltenango	14	t	2025-12-09 19:29:05.605183
295	Chiquimula	14	t	2025-12-09 19:29:05.605183
296	El Progreso	14	t	2025-12-09 19:29:05.605183
297	Escuintla	14	t	2025-12-09 19:29:05.605183
298	Guatemala	14	t	2025-12-09 19:29:05.605183
299	Huehuetenango	14	t	2025-12-09 19:29:05.605183
300	Izabal	14	t	2025-12-09 19:29:05.605183
301	Jalapa	14	t	2025-12-09 19:29:05.605183
302	Jutiapa	14	t	2025-12-09 19:29:05.605183
303	Petén	14	t	2025-12-09 19:29:05.605183
304	Quetzaltenango	14	t	2025-12-09 19:29:05.605183
305	Quiché	14	t	2025-12-09 19:29:05.605183
306	Retalhuleu	14	t	2025-12-09 19:29:05.605183
307	Sacatepéquez	14	t	2025-12-09 19:29:05.605183
308	San Marcos	14	t	2025-12-09 19:29:05.605183
309	Santa Rosa	14	t	2025-12-09 19:29:05.605183
310	Sololá	14	t	2025-12-09 19:29:05.605183
311	Suchitepéquez	14	t	2025-12-09 19:29:05.605183
312	Totonicapán	14	t	2025-12-09 19:29:05.605183
313	Zacapa	14	t	2025-12-09 19:29:05.605183
314	Atlántida	15	t	2025-12-09 19:29:05.605183
315	Choluteca	15	t	2025-12-09 19:29:05.605183
316	Colón	15	t	2025-12-09 19:29:05.605183
317	Comayagua	15	t	2025-12-09 19:29:05.605183
318	Copán	15	t	2025-12-09 19:29:05.605183
319	Cortés	15	t	2025-12-09 19:29:05.605183
320	El Paraíso	15	t	2025-12-09 19:29:05.605183
321	Francisco Morazán	15	t	2025-12-09 19:29:05.605183
322	Gracias a Dios	15	t	2025-12-09 19:29:05.605183
323	Intibucá	15	t	2025-12-09 19:29:05.605183
324	Islas de la Bahía	15	t	2025-12-09 19:29:05.605183
325	La Paz	15	t	2025-12-09 19:29:05.605183
326	Lempira	15	t	2025-12-09 19:29:05.605183
327	Ocotepeque	15	t	2025-12-09 19:29:05.605183
328	Olancho	15	t	2025-12-09 19:29:05.605183
329	Santa Bárbara	15	t	2025-12-09 19:29:05.605183
330	Valle	15	t	2025-12-09 19:29:05.605183
331	Yoro	15	t	2025-12-09 19:29:05.605183
332	Ahuachapán	16	t	2025-12-09 19:29:05.605183
333	Cabañas	16	t	2025-12-09 19:29:05.605183
334	Chalatenango	16	t	2025-12-09 19:29:05.605183
335	Cuscatlán	16	t	2025-12-09 19:29:05.605183
336	La Libertad	16	t	2025-12-09 19:29:05.605183
337	La Paz	16	t	2025-12-09 19:29:05.605183
338	La Unión	16	t	2025-12-09 19:29:05.605183
339	Morazán	16	t	2025-12-09 19:29:05.605183
340	San Miguel	16	t	2025-12-09 19:29:05.605183
341	San Salvador	16	t	2025-12-09 19:29:05.605183
342	San Vicente	16	t	2025-12-09 19:29:05.605183
343	Santa Ana	16	t	2025-12-09 19:29:05.605183
344	Sonsonate	16	t	2025-12-09 19:29:05.605183
345	Usulután	16	t	2025-12-09 19:29:05.605183
346	Boaco	17	t	2025-12-09 19:29:05.605183
347	Carazo	17	t	2025-12-09 19:29:05.605183
348	Chinandega	17	t	2025-12-09 19:29:05.605183
349	Chontales	17	t	2025-12-09 19:29:05.605183
350	Estelí	17	t	2025-12-09 19:29:05.605183
351	Granada	17	t	2025-12-09 19:29:05.605183
352	Jinotega	17	t	2025-12-09 19:29:05.605183
353	León	17	t	2025-12-09 19:29:05.605183
354	Madriz	17	t	2025-12-09 19:29:05.605183
355	Managua	17	t	2025-12-09 19:29:05.605183
356	Masaya	17	t	2025-12-09 19:29:05.605183
357	Matagalpa	17	t	2025-12-09 19:29:05.605183
358	Nueva Segovia	17	t	2025-12-09 19:29:05.605183
359	Río San Juan	17	t	2025-12-09 19:29:05.605183
360	Rivas	17	t	2025-12-09 19:29:05.605183
361	Atlántico Norte	17	t	2025-12-09 19:29:05.605183
362	Atlántico Sur	17	t	2025-12-09 19:29:05.605183
363	San José	18	t	2025-12-09 19:29:05.605183
364	Alajuela	18	t	2025-12-09 19:29:05.605183
365	Cartago	18	t	2025-12-09 19:29:05.605183
366	Heredia	18	t	2025-12-09 19:29:05.605183
367	Guanacaste	18	t	2025-12-09 19:29:05.605183
368	Puntarenas	18	t	2025-12-09 19:29:05.605183
369	Limón	18	t	2025-12-09 19:29:05.605183
370	Bocas del Toro	19	t	2025-12-09 19:29:05.605183
371	Coclé	19	t	2025-12-09 19:29:05.605183
372	Colón	19	t	2025-12-09 19:29:05.605183
373	Chiriquí	19	t	2025-12-09 19:29:05.605183
374	Darién	19	t	2025-12-09 19:29:05.605183
375	Herrera	19	t	2025-12-09 19:29:05.605183
376	Los Santos	19	t	2025-12-09 19:29:05.605183
377	Panamá	19	t	2025-12-09 19:29:05.605183
378	Panamá Oeste	19	t	2025-12-09 19:29:05.605183
379	Veraguas	19	t	2025-12-09 19:29:05.605183
380	Guna Yala	19	t	2025-12-09 19:29:05.605183
381	Emberá-Wounaan	19	t	2025-12-09 19:29:05.605183
382	Ngäbe-Buglé	19	t	2025-12-09 19:29:05.605183
383	Azua	21	t	2025-12-09 19:29:05.605183
384	Baoruco	21	t	2025-12-09 19:29:05.605183
385	Barahona	21	t	2025-12-09 19:29:05.605183
386	Dajabón	21	t	2025-12-09 19:29:05.605183
387	Distrito Nacional	21	t	2025-12-09 19:29:05.605183
388	Duarte	21	t	2025-12-09 19:29:05.605183
389	Espaillat	21	t	2025-12-09 19:29:05.605183
390	Hato Mayor	21	t	2025-12-09 19:29:05.605183
391	Hermanas Mirabal	21	t	2025-12-09 19:29:05.605183
392	Independencia	21	t	2025-12-09 19:29:05.605183
393	La Altagracia	21	t	2025-12-09 19:29:05.605183
394	La Romana	21	t	2025-12-09 19:29:05.605183
395	La Vega	21	t	2025-12-09 19:29:05.605183
396	María Trinidad Sánchez	21	t	2025-12-09 19:29:05.605183
397	Monseñor Nouel	21	t	2025-12-09 19:29:05.605183
398	Monte Cristi	21	t	2025-12-09 19:29:05.605183
399	Monte Plata	21	t	2025-12-09 19:29:05.605183
400	Pedernales	21	t	2025-12-09 19:29:05.605183
401	Peravia	21	t	2025-12-09 19:29:05.605183
402	Puerto Plata	21	t	2025-12-09 19:29:05.605183
403	Samaná	21	t	2025-12-09 19:29:05.605183
404	San Cristóbal	21	t	2025-12-09 19:29:05.605183
405	San José de Ocoa	21	t	2025-12-09 19:29:05.605183
406	San Juan	21	t	2025-12-09 19:29:05.605183
407	San Pedro de Macorís	21	t	2025-12-09 19:29:05.605183
408	Sánchez Ramírez	21	t	2025-12-09 19:29:05.605183
409	Santiago	21	t	2025-12-09 19:29:05.605183
410	Santiago Rodríguez	21	t	2025-12-09 19:29:05.605183
411	Santo Domingo	21	t	2025-12-09 19:29:05.605183
412	Valverde	21	t	2025-12-09 19:29:05.605183
413	Otro	22	t	2025-12-09 19:29:05.605183
\.


--
-- TOC entry 4576 (class 0 OID 26512)
-- Dependencies: 229
-- Data for Name: study_catalog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.study_catalog (id, name, code, category_id, specialty, is_active, created_at, updated_at) FROM stdin;
1	Hemograma Completo	\N	1	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
2	Biometría Hemática	\N	1	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
3	Recuento de Plaquetas	\N	1	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
4	Frotis de Sangre Periférica	\N	1	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
5	Velocidad de Sedimentación Globular (VSG)	\N	1	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
6	Proteína C Reactiva (PCR)	\N	1	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
7	Tiempo de Protrombina (TP)	\N	1	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
8	Tiempo de Tromboplastina Parcial (TTP)	\N	1	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
9	Fibrinógeno	\N	1	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
10	Ferritina	\N	1	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
11	Transferrina	\N	1	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
12	Saturación de Transferrina	\N	1	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
13	Electroforesis de Hemoglobina	\N	1	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
14	Reticulocitos	\N	1	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
15	Coagulación Completa	\N	1	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
16	Anticoagulante Lúpico	\N	1	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
17	Dímero D	\N	1	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
18	Antitrombina III	\N	1	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
19	Factor de von Willebrand	\N	1	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
20	Haptoglobina	\N	1	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
21	Glucosa en Ayunas	\N	2	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
22	Glucosa Postprandial	\N	2	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
23	Hemoglobina Glicosilada (HbA1c)	\N	2	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
24	Perfil Lipídico Completo	\N	2	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
25	Colesterol Total	\N	2	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
26	Colesterol HDL	\N	2	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
27	Colesterol LDL	\N	2	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
28	Triglicéridos	\N	2	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
29	Perfil Hepático Completo	\N	2	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
30	Transaminasa GPT (ALT)	\N	2	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
31	Transaminasa GOT (AST)	\N	2	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
32	Fosfatasa Alcalina	\N	2	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
33	Bilirrubina Total	\N	2	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
34	Bilirrubina Directa	\N	2	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
35	Bilirrubina Indirecta	\N	2	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
36	Gamma Glutamil Transferasa (GGT)	\N	2	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
37	Perfil Renal Completo	\N	2	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
38	Urea	\N	2	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
39	Creatinina	\N	2	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
40	Ácido Úrico	\N	2	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
41	Depuración de Creatinina	\N	2	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
42	Microalbuminuria	\N	2	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
43	Proteínas Totales	\N	2	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
44	Albumina	\N	2	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
45	Globulinas	\N	2	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
46	Electrolitos Séricos	\N	2	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
47	Sodio	\N	2	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
48	Potasio	\N	2	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
49	Cloro	\N	2	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
50	Calcio	\N	2	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
51	Fósforo	\N	2	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
52	Magnesio	\N	2	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
53	Amilasa	\N	2	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
54	Lipasa	\N	2	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
55	Lactato Deshidrogenasa (LDH)	\N	2	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
56	Creatina Quinasa (CK)	\N	2	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
57	Troponina I	\N	2	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
58	Troponina T	\N	2	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
59	BNP (Péptido Natriurético Cerebral)	\N	2	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
60	Ácido Láctico	\N	2	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
61	Cultivo de Orina	\N	3	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
62	Urocultivo con Antibiograma	\N	3	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
63	Cultivo de Esputo	\N	3	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
64	Cultivo de Secreción Faríngea	\N	3	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
65	Cultivo de Herida	\N	3	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
66	Cultivo de Sangre (Hemocultivo)	\N	3	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
67	Cultivo de Líquido Cefalorraquídeo	\N	3	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
68	Cultivo de Heces	\N	3	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
69	Parasitológico en Heces	\N	3	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
70	Cultivo de Exudado Vaginal	\N	3	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
71	Cultivo de Exudado Uretral	\N	3	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
72	Tinción de Gram	\N	3	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
73	Ziehl-Neelsen (BK)	\N	3	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
74	Prueba de Sensibilidad Antimicrobiana	\N	3	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
75	Antibiograma	\N	3	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
76	Cultivo de Hongos	\N	3	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
77	Cultivo de Micobacterias	\N	3	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
78	Prueba de Clamidia	\N	3	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
79	Prueba de Gonorrea	\N	3	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
80	Cultivo de Virus	\N	3	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
81	Anticuerpos Antinucleares (ANA)	\N	4	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
82	Factor Reumatoide	\N	4	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
83	Anticuerpos Anti-ADN	\N	4	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
84	Anticuerpos Anti-Sm	\N	4	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
85	Anticuerpos Anti-Ro (SSA)	\N	4	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
86	Anticuerpos Anti-La (SSB)	\N	4	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
87	Anticuerpos Anticardiolipina	\N	4	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
88	Complemento C3	\N	4	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
89	Complemento C4	\N	4	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
90	Inmunoglobulinas (IgG, IgA, IgM)	\N	4	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
91	Inmunoglobulina E (IgE)	\N	4	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
92	Prueba de Alergias	\N	4	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
93	Panel de Alergias Alimentarias	\N	4	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
94	Panel de Alergias Ambientales	\N	4	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
95	Prueba de Celiaquía (Anti-transglutaminasa)	\N	4	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
96	Anticuerpos Antimicrosomales	\N	4	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
97	Anticuerpos Antitiroglobulina	\N	4	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
98	Anticuerpos Antiperoxidasa	\N	4	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
99	Prueba de VIH	\N	4	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
100	Prueba de Hepatitis B	\N	4	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
101	Prueba de Hepatitis C	\N	4	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
102	Prueba de Hepatitis A	\N	4	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
103	Prueba de Sífilis (VDRL)	\N	4	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
104	Prueba de Toxoplasmosis	\N	4	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
105	Prueba de Rubéola	\N	4	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
106	Prueba de Citomegalovirus (CMV)	\N	4	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
107	Prueba de Herpes Simple	\N	4	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
108	Prueba de Varicela Zóster	\N	4	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
109	Prueba de Mononucleosis	\N	4	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
110	Prueba de Brucelosis	\N	4	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
111	Radiografía de Tórax PA y Lateral	\N	5	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
112	Radiografía de Tórax AP	\N	5	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
113	Radiografía de Abdomen	\N	5	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
114	Radiografía de Columna Lumbar	\N	5	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
115	Radiografía de Columna Cervical	\N	5	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
116	Radiografía de Columna Dorsal	\N	5	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
117	Radiografía de Cráneo	\N	5	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
118	Radiografía de Hombro	\N	5	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
119	Radiografía de Codo	\N	5	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
120	Radiografía de Muñeca	\N	5	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
121	Radiografía de Mano	\N	5	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
122	Radiografía de Cadera	\N	5	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
123	Radiografía de Rodilla	\N	5	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
124	Radiografía de Tobillo	\N	5	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
125	Radiografía de Pie	\N	5	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
126	Radiografía de Senos Paranasales	\N	5	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
127	Radiografía de Mandíbula	\N	5	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
128	Radiografía de Pelvis	\N	5	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
129	Serie Ósea	\N	5	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
130	Radiografía de Abdomen con Contraste	\N	5	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
131	Ultrasonido Abdominal Completo	\N	6	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
132	Ultrasonido de Hígado	\N	6	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
133	Ultrasonido de Vesícula Biliar	\N	6	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
134	Ultrasonido de Riñones	\N	6	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
135	Ultrasonido de Vejiga	\N	6	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
136	Ultrasonido Pélvico	\N	6	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
137	Ultrasonido Obstétrico	\N	6	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
138	Ultrasonido Transvaginal	\N	6	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
139	Ultrasonido de Próstata	\N	6	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
140	Ultrasonido de Tiroides	\N	6	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
141	Ultrasonido de Mamas	\N	6	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
142	Ultrasonido de Testículos	\N	6	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
143	Ultrasonido Doppler Venoso	\N	6	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
144	Ultrasonido Doppler Arterial	\N	6	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
145	Ultrasonido Doppler de Carótidas	\N	6	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
146	Ultrasonido Obstétrico con Doppler	\N	6	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
147	Ultrasonido de Partes Blandas	\N	6	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
148	Ultrasonido de Cuello	\N	6	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
149	Ultrasonido Doppler de Extremidades	\N	6	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
150	Ultrasonido de Abdomen Superior	\N	6	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
151	Tomografía Axial Computarizada (TAC) de Cráneo	\N	7	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
152	TAC de Tórax	\N	7	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
153	TAC de Abdomen	\N	7	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
154	TAC de Pelvis	\N	7	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
155	TAC de Columna Cervical	\N	7	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
156	TAC de Columna Dorsal	\N	7	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
157	TAC de Columna Lumbar	\N	7	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
158	TAC de Cráneo con Contraste	\N	7	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
159	TAC de Tórax con Contraste	\N	7	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
160	TAC de Abdomen con Contraste	\N	7	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
161	TAC de Pelvis con Contraste	\N	7	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
162	TAC de Cuello	\N	7	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
163	TAC de Senos Paranasales	\N	7	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
164	TAC de Órbitas	\N	7	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
165	TAC de Huesos Faciales	\N	7	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
166	TAC de Extremidades	\N	7	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
167	Angio-TAC de Tórax	\N	7	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
168	Angio-TAC de Abdomen	\N	7	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
169	TAC de Tórax con Angiografía Pulmonar	\N	7	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
170	TAC Multicorte de Alta Resolución	\N	7	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
171	Resonancia Magnética de Cráneo	\N	8	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
172	Resonancia Magnética de Columna Cervical	\N	8	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
173	Resonancia Magnética de Columna Dorsal	\N	8	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
174	Resonancia Magnética de Columna Lumbar	\N	8	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
175	Resonancia Magnética de Rodilla	\N	8	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
176	Resonancia Magnética de Hombro	\N	8	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
177	Resonancia Magnética de Cadera	\N	8	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
178	Resonancia Magnética de Tobillo	\N	8	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
179	Resonancia Magnética de Muñeca	\N	8	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
180	Resonancia Magnética de Tórax	\N	8	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
181	Resonancia Magnética de Abdomen	\N	8	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
182	Resonancia Magnética de Pelvis	\N	8	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
183	Resonancia Magnética de Cráneo con Contraste	\N	8	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
184	Resonancia Magnética de Columna con Contraste	\N	8	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
185	Resonancia Magnética de Abdomen con Contraste	\N	8	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
186	Angioresonancia Magnética	\N	8	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
187	Resonancia Magnética de Mamas	\N	8	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
188	Resonancia Magnética de Próstata	\N	8	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
189	Resonancia Magnética Funcional	\N	8	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
190	Resonancia Magnética de Difusión	\N	8	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
191	Electrocardiograma (ECG)	\N	9	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
192	Electrocardiograma de Esfuerzo	\N	9	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
193	Holter de 24 Horas	\N	9	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
194	Holter de 48 Horas	\N	9	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
195	Holter de 7 Días	\N	9	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
196	MAPA (Monitoreo Ambulatorio de Presión Arterial)	\N	9	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
197	Ecocardiograma Transtorácico	\N	9	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
198	Ecocardiograma Transesofágico	\N	9	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
199	Ecocardiograma de Esfuerzo	\N	9	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
200	Ecocardiograma con Doppler	\N	9	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
201	Prueba de Esfuerzo (Ergometría)	\N	9	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
202	Prueba de Esfuerzo con Medicina Nuclear	\N	9	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
203	Cateterismo Cardiaco	\N	9	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
204	Angiografía Coronaria	\N	9	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
205	Angiografía de Arterias Periféricas	\N	9	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
206	Prueba de Tilt (Mesa Basculante)	\N	9	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
207	Estudio Electrofisiológico	\N	9	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
208	Ablación por Radiofrecuencia	\N	9	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
209	Prueba de Tabla de Esfuerzo	\N	9	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
210	Ecocardiograma Fetal	\N	9	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
211	Papanicolaou (Citología Cervical)	\N	10	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
212	Colposcopía	\N	10	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
213	Biopsia de Cuello Uterino	\N	10	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
214	Ecografía Ginecológica	\N	10	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
215	Ecografía Obstétrica Primer Trimestre	\N	10	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
216	Ecografía Obstétrica Segundo Trimestre	\N	10	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
217	Ecografía Obstétrica Tercer Trimestre	\N	10	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
218	Ecografía de Morfología Fetal	\N	10	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
219	Ecografía Doppler Obstétrico	\N	10	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
220	Histerosalpingografía	\N	10	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
221	Histeroscopía Diagnóstica	\N	10	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
222	Laparoscopía Ginecológica	\N	10	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
223	Prueba de Hormonas Femeninas	\N	10	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
224	Prueba de Embarazo (Beta HCG)	\N	10	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
225	Prueba de Estrógenos	\N	10	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
226	Prueba de Progesterona	\N	10	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
227	Prueba de FSH	\N	10	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
228	Prueba de LH	\N	10	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
229	Prueba de Prolactina	\N	10	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
230	Mamografía	\N	10	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
231	Ecografía Urológica	\N	11	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
232	Ecografía de Próstata	\N	11	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
233	Ecografía de Testículos	\N	11	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
234	Ecografía de Vejiga	\N	11	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
235	Ecografía Renal	\N	11	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
236	Urografía Excretora	\N	11	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
237	Cistografía	\N	11	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
238	Cistoscopía	\N	11	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
239	Uretrocistografía	\N	11	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
240	Uretrocistoscopía	\N	11	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
241	Biopsia de Próstata	\N	11	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
242	Antígeno Prostático Específico (PSA)	\N	11	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
243	PSA Libre	\N	11	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
244	PSA Total	\N	11	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
245	Prueba de Testosterona	\N	11	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
246	Semenograma	\N	11	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
247	Análisis de Semen	\N	11	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
248	Prueba de Fertilidad Masculina	\N	11	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
249	Estudio Urodinámico	\N	11	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
250	Nefrostomía	\N	11	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
251	Endoscopía Digestiva Alta	\N	12	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
252	Colonoscopía	\N	12	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
253	Sigmoidoscopía	\N	12	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
254	Cápsula Endoscópica	\N	12	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
255	Colangiopancreatografía Retrógrada Endoscópica (CPRE)	\N	12	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
256	Ecografía Endoscópica	\N	12	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
257	Manometría Esofágica	\N	12	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
258	pHmetría Esofágica	\N	12	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
259	Prueba de Aliento para Helicobacter Pylori	\N	12	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
260	Prueba de Sangre Oculta en Heces	\N	12	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
261	Prueba de Antígeno Fecal	\N	12	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
262	Análisis de Heces	\N	12	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
263	Coprocultivo	\N	12	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
264	Prueba de Elastasa Fecal	\N	12	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
265	Prueba de Calprotectina Fecal	\N	12	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
266	Biopsia de Estómago	\N	12	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
267	Biopsia de Intestino	\N	12	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
268	Prueba de Tolerancia a la Lactosa	\N	12	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
269	Prueba de Malabsorción	\N	12	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
270	Endoscopía con Biopsia	\N	12	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
271	Perfil Tiroideo Completo	\N	13	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
272	TSH (Hormona Estimulante del Tiroides)	\N	13	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
273	T4 Libre	\N	13	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
274	T4 Total	\N	13	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
275	T3 Libre	\N	13	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
276	T3 Total	\N	13	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
277	Tiroglobulina	\N	13	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
278	Calcitonina	\N	13	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
279	Hormona del Crecimiento (GH)	\N	13	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
280	IGF-1 (Factor de Crecimiento Similar a la Insulina)	\N	13	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
281	Cortisol en Sangre	\N	13	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
282	Cortisol en Orina de 24 Horas	\N	13	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
283	ACTH (Hormona Adrenocorticotrópica)	\N	13	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
284	Aldosterona	\N	13	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
285	Renina	\N	13	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
286	Prueba de Tolerancia a la Glucosa	\N	13	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
287	Curva de Glucosa	\N	13	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
288	Insulina en Ayunas	\N	13	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
289	Peptido C	\N	13	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
290	Hemoglobina Glicosilada (HbA1c)	\N	13	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
291	Electroencefalograma (EEG)	\N	14	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
292	EEG con Privación de Sueño	\N	14	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
293	Electromiografía (EMG)	\N	14	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
294	Estudio de Conducción Nerviosa	\N	14	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
295	Potenciales Evocados Visuales	\N	14	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
296	Potenciales Evocados Auditivos	\N	14	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
297	Potenciales Evocados Somatosensoriales	\N	14	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
298	Resonancia Magnética de Cráneo	\N	14	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
299	Resonancia Magnética de Columna	\N	14	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
300	Angioresonancia de Cerebro	\N	14	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
301	TAC de Cráneo	\N	14	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
302	TAC de Columna	\N	14	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
303	Punción Lumbar	\N	14	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
304	Análisis de Líquido Cefalorraquídeo	\N	14	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
305	Doppler Transcraneal	\N	14	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
306	Doppler de Vasos del Cuello	\N	14	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
307	Polisomnografía	\N	14	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
308	Test de Latencia Múltiple del Sueño	\N	14	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
309	Biopsia de Nervio	\N	14	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
310	Biopsia de Músculo	\N	14	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
311	Examen de Agudeza Visual	\N	15	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
312	Refracción	\N	15	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
313	Tonometría (Presión Intraocular)	\N	15	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
314	Fondo de Ojo	\N	15	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
315	Oftalmoscopía	\N	15	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
316	Campimetría	\N	15	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
317	Perimetría	\N	15	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
318	Biomicroscopía	\N	15	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
319	Paquimetría	\N	15	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
320	Gonioscopía	\N	15	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
321	Ecografía Ocular	\N	15	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
322	Tomografía de Coherencia Óptica (OCT)	\N	15	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
323	Angiografía Fluoresceínica	\N	15	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
324	Angiografía con Verde de Indocianina	\N	15	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
325	Electroretinograma	\N	15	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
326	Potenciales Visuales Evocados	\N	15	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
327	Biopsia de Conjuntiva	\N	15	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
328	Prueba de Schirmer	\N	15	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
329	Prueba de Color	\N	15	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
330	Topografía Corneal	\N	15	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
331	Audiometría	\N	16	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
332	Audiometría Tonal	\N	16	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
333	Audiometría Vocal	\N	16	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
334	Impedanciometría	\N	16	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
335	Timpanometría	\N	16	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
336	Reflejos Estapediales	\N	16	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
337	Potenciales Evocados Auditivos del Tronco Cerebral	\N	16	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
338	Otoemisiones Acústicas	\N	16	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
339	Rinoscopía	\N	16	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
340	Laringoscopía	\N	16	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
341	Laringoscopía Directa	\N	16	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
342	Videoendoscopía Nasofaríngea	\N	16	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
343	Rinomanometría	\N	16	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
344	Biopsia de Nasofaringe	\N	16	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
345	Biopsia de Laringe	\N	16	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
346	TAC de Huesos Temporales	\N	16	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
347	TAC de Senos Paranasales	\N	16	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
348	Resonancia Magnética de Oído Interno	\N	16	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
349	Prueba Vestibular	\N	16	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
350	Videonistagmografía	\N	16	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
351	Biopsia de Piel	\N	17	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
352	Dermoscopía	\N	17	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
353	Dermatoscopía Digital	\N	17	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
354	Prueba del Parche	\N	17	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
355	Prueba de Prick	\N	17	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
356	Prueba Intradérmica	\N	17	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
357	Cultivo de Hongos	\N	17	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
358	Examen Directo de Hongos	\N	17	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
359	Prueba de Woods	\N	17	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
360	Biopsia de Cuero Cabelludo	\N	17	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
361	Análisis de Cabello	\N	17	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
362	Prueba de Alergia Cutánea	\N	17	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
363	Prueba de Fototipo	\N	17	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
364	Prueba de Sensibilidad	\N	17	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
365	Cultivo de Bacterias Cutáneas	\N	17	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
366	Análisis de Uñas	\N	17	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
367	Prueba de Acidez	\N	17	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
368	Prueba de Hidratación	\N	17	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
369	Mapeo de Lunares	\N	17	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
370	Dermatoscopía de Seguimiento	\N	17	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
371	Biopsia por Aspiración con Aguja Fina (BAAF)	\N	18	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
372	Biopsia Core	\N	18	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
373	Biopsia Quirúrgica	\N	18	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
374	Biopsia de Médula Ósea	\N	18	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
375	Citología de Exudado	\N	18	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
376	Citología de Líquidos	\N	18	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
377	Análisis Histopatológico	\N	18	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
378	Inmunohistoquímica	\N	18	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
379	Análisis de Fluorescencia In Situ (FISH)	\N	18	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
380	Análisis Molecular	\N	18	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
381	Biopsia de Ganglio Linfático	\N	18	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
382	Citología de Tiroides	\N	18	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
383	Citología de Mama	\N	18	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
384	Citología de Pulmón	\N	18	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
385	Citología de Hígado	\N	18	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
386	Citología de Páncreas	\N	18	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
387	Biopsia de Próstata	\N	18	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
388	Biopsia de Riñón	\N	18	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
389	Biopsia de Hígado	\N	18	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
390	Biopsia de Pulmón	\N	18	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
391	Cariotipo	\N	19	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
392	Análisis Cromosómico	\N	19	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
393	Prueba de ADN	\N	19	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
394	Prueba de Paternidad	\N	19	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
395	Análisis Genético de Portadores	\N	19	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
396	Prueba Prenatal No Invasiva	\N	19	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
397	Amniocentesis	\N	19	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
398	Biopsia de Vellosidades Coriónicas	\N	19	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
399	Secuenciación Genómica	\N	19	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
400	Análisis de Mutaciones	\N	19	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
401	Prueba de Síndrome de Down	\N	19	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
402	Prueba de Fibrosis Quística	\N	19	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
403	Prueba de Talasemia	\N	19	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
404	Prueba de Hemofilia	\N	19	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
405	Prueba de Enfermedad de Huntington	\N	19	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
406	Análisis de Farmacogenómica	\N	19	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
407	Prueba de Cáncer Hereditario	\N	19	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
408	Prueba de BRCA	\N	19	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
409	Análisis de Microarrays	\N	19	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
410	Prueba de Predisposición Genética	\N	19	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
411	Gammagrafía Ósea	\N	20	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
412	Gammagrafía Tiroidea	\N	20	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
413	Gammagrafía Renal	\N	20	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
414	Gammagrafía Hepática	\N	20	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
415	Gammagrafía Pulmonar	\N	20	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
416	Gammagrafía Cardiaca	\N	20	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
417	Gammagrafía de Perfusión Miocárdica	\N	20	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
418	PET Scan (Tomografía por Emisión de Positrones)	\N	20	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
419	PET-CT	\N	20	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
420	SPECT (Tomografía Computarizada por Emisión de Fotón Único)	\N	20	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
421	SPECT Cerebral	\N	20	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
422	Gammagrafía de Paratiroides	\N	20	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
423	Gammagrafía de Adrenales	\N	20	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
424	Gammagrafía de Linfáticos	\N	20	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
425	Gammagrafía de Glándulas Salivales	\N	20	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
426	Prueba de Captación de Yodo	\N	20	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
427	Gammagrafía de Medula Ósea	\N	20	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
428	Gammagrafía de Inflamación	\N	20	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
429	Gammagrafía de Abscesos	\N	20	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
430	Gammagrafía de Tumores	\N	20	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
431	Espirometría Simple	\N	21	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
432	Espirometría Completa	\N	21	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
433	Espirometría con Prueba de Broncodilatación	\N	21	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
434	Volúmenes Pulmonares	\N	21	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
435	Capacidad de Difusión de Monóxido de Carbono (DLCO)	\N	21	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
436	Prueba de Esfuerzo Respiratorio	\N	21	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
437	Prueba de Oxígeno	\N	21	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
438	Gasometría Arterial	\N	21	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
439	Gasometría Venosa	\N	21	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
440	Prueba de Caminata de 6 Minutos	\N	21	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
441	Prueba de Ejercicio Cardiopulmonar	\N	21	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
442	Pletismografía	\N	21	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
443	Prueba de Reactividad Bronquial	\N	21	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
444	Prueba de Reto con Metacolina	\N	21	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
445	Prueba de Reto con Histamina	\N	21	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
446	Prueba de Flujo Espiratorio Pico	\N	21	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
447	Prueba de Capacidad Pulmonar	\N	21	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
448	Prueba de Volúmenes Residuales	\N	21	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
449	Prueba de Capacidad Vital	\N	21	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
450	Prueba de Ventilación Máxima	\N	21	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
451	Electrocardiograma de Reposo	\N	22	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
452	Electrocardiograma de Esfuerzo	\N	22	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
453	Electrocardiograma de 12 Derivaciones	\N	22	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
454	Electrocardiograma de Monitoreo Continuo	\N	22	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
455	Electrocardiograma de Alta Resolución	\N	22	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
456	Electrocardiograma de Señal Promediada	\N	22	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
457	Electrocardiograma de Vectocardiografía	\N	22	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
458	Electrocardiograma de Intervalos	\N	22	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
459	Electrocardiograma de Onda T	\N	22	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
460	Electrocardiograma de Análisis de Variabilidad	\N	22	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
461	Electrocardiograma de Ritmo	\N	22	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
462	Electrocardiograma de Frecuencia Cardiaca	\N	22	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
463	Electrocardiograma de Segmento ST	\N	22	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
464	Electrocardiograma de Complejo QRS	\N	22	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
465	Electrocardiograma de Onda P	\N	22	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
466	Electrocardiograma de Derivaciones Precordiales	\N	22	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
467	Electrocardiograma de Derivaciones de Extremidades	\N	22	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
468	Electrocardiograma de Monitoreo Ambulatorio	\N	22	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
469	Electrocardiograma de Telemetría	\N	22	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
470	Electrocardiograma de Análisis Avanzado	\N	22	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
471	Prueba de Esfuerzo Máximo	\N	23	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
472	Prueba de Consumo de Oxígeno (VO2 Max)	\N	23	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
473	Prueba de Umbral Anaeróbico	\N	23	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
474	Prueba de Composición Corporal	\N	23	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
475	Análisis de Impedancia Bioeléctrica	\N	23	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
476	Prueba de Densidad Ósea	\N	23	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
477	Prueba de Flexibilidad	\N	23	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
478	Prueba de Fuerza Muscular	\N	23	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
479	Prueba de Resistencia	\N	23	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
480	Prueba de Agilidad	\N	23	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
481	Prueba de Velocidad	\N	23	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
482	Prueba de Coordinación	\N	23	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
483	Prueba de Equilibrio	\N	23	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
484	Prueba de Reacción	\N	23	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
485	Prueba de Capacidad Aeróbica	\N	23	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
486	Prueba de Capacidad Anaeróbica	\N	23	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
487	Prueba de Recuperación	\N	23	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
488	Prueba de Hidratación	\N	23	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
489	Prueba de Nutrición Deportiva	\N	23	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
490	Prueba de Rendimiento Deportivo	\N	23	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
491	Mamografía de Detección	\N	24	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
492	Mamografía Diagnóstica	\N	24	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
493	Tomografía de Mama	\N	24	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
494	Resonancia Magnética de Mama	\N	24	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
495	Biopsia de Mama	\N	24	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
496	Marcadores Tumorales	\N	24	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
497	CEA (Antígeno Carcinoembrionario)	\N	24	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
498	CA 19-9	\N	24	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
499	CA 125	\N	24	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
500	PSA (Antígeno Prostático Específico)	\N	24	\N	t	2025-12-09 19:29:05.605183	2025-12-09 19:29:05.605183
\.


--
-- TOC entry 4574 (class 0 OID 26503)
-- Dependencies: 227
-- Data for Name: study_categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.study_categories (id, name, is_active, created_at) FROM stdin;
1	Hematología	t	2025-12-09 19:29:05.605183
2	Química Sanguínea	t	2025-12-09 19:29:05.605183
3	Microbiología	t	2025-12-09 19:29:05.605183
4	Inmunología	t	2025-12-09 19:29:05.605183
5	Radiología	t	2025-12-09 19:29:05.605183
6	Ultrasonido	t	2025-12-09 19:29:05.605183
7	Tomografía	t	2025-12-09 19:29:05.605183
8	Resonancia Magnética	t	2025-12-09 19:29:05.605183
9	Cardiología	t	2025-12-09 19:29:05.605183
10	Ginecología	t	2025-12-09 19:29:05.605183
11	Urología	t	2025-12-09 19:29:05.605183
12	Gastroenterología	t	2025-12-09 19:29:05.605183
13	Endocrinología	t	2025-12-09 19:29:05.605183
14	Neurología	t	2025-12-09 19:29:05.605183
15	Oftalmología	t	2025-12-09 19:29:05.605183
16	Otorrinolaringología	t	2025-12-09 19:29:05.605183
17	Dermatología	t	2025-12-09 19:29:05.605183
18	Patología	t	2025-12-09 19:29:05.605183
19	Genética	t	2025-12-09 19:29:05.605183
20	Medicina Nuclear	t	2025-12-09 19:29:05.605183
21	Espirometría	t	2025-12-09 19:29:05.605183
22	Electrocardiograma	t	2025-12-09 19:29:05.605183
23	Medicina del Deporte	t	2025-12-09 19:29:05.605183
24	Oncología	t	2025-12-09 19:29:05.605183
25	Medicina Preventiva	t	2025-12-09 19:29:05.605183
\.


--
-- TOC entry 4600 (class 0 OID 26815)
-- Dependencies: 253
-- Data for Name: vital_signs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vital_signs (id, name, created_at) FROM stdin;
1	Frecuencia Cardíaca	2025-12-09 19:29:05.605183
2	Frecuencia Respiratoria	2025-12-09 19:29:05.605183
3	Presión Arterial Sistólica	2025-12-09 19:29:05.605183
4	Presión Arterial Diastólica	2025-12-09 19:29:05.605183
5	Temperatura	2025-12-09 19:29:05.605183
6	Saturación de Oxígeno	2025-12-09 19:29:05.605183
7	Peso	2025-12-09 19:29:05.605183
8	Estatura	2025-12-09 19:29:05.605183
9	Índice de Masa Corporal	2025-12-09 19:29:05.605183
10	Perímetro cefálico	2025-12-09 19:29:05.605183
11	Superficie Corporal	2025-12-09 19:29:05.605183
\.


--
-- TOC entry 4679 (class 0 OID 0)
-- Dependencies: 271
-- Name: appointment_reminders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.appointment_reminders_id_seq', 18, true);


--
-- TOC entry 4680 (class 0 OID 0)
-- Dependencies: 244
-- Name: appointment_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.appointment_types_id_seq', 2, true);


--
-- TOC entry 4681 (class 0 OID 0)
-- Dependencies: 246
-- Name: appointments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.appointments_id_seq', 13, true);


--
-- TOC entry 4682 (class 0 OID 0)
-- Dependencies: 264
-- Name: arco_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.arco_requests_id_seq', 1, false);


--
-- TOC entry 4683 (class 0 OID 0)
-- Dependencies: 258
-- Name: audit_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.audit_log_id_seq', 62, true);


--
-- TOC entry 4684 (class 0 OID 0)
-- Dependencies: 248
-- Name: clinical_studies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.clinical_studies_id_seq', 2, true);


--
-- TOC entry 4685 (class 0 OID 0)
-- Dependencies: 250
-- Name: consultation_prescriptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.consultation_prescriptions_id_seq', 1, true);


--
-- TOC entry 4686 (class 0 OID 0)
-- Dependencies: 254
-- Name: consultation_vital_signs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.consultation_vital_signs_id_seq', 5, true);


--
-- TOC entry 4687 (class 0 OID 0)
-- Dependencies: 215
-- Name: countries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.countries_id_seq', 20, true);


--
-- TOC entry 4688 (class 0 OID 0)
-- Dependencies: 266
-- Name: data_retention_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.data_retention_logs_id_seq', 1, false);


--
-- TOC entry 4689 (class 0 OID 0)
-- Dependencies: 234
-- Name: diagnosis_catalog_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.diagnosis_catalog_id_seq', 666, true);


--
-- TOC entry 4690 (class 0 OID 0)
-- Dependencies: 232
-- Name: diagnosis_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.diagnosis_categories_id_seq', 1, false);


--
-- TOC entry 4691 (class 0 OID 0)
-- Dependencies: 280
-- Name: document_folio_sequences_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.document_folio_sequences_id_seq', 1, false);


--
-- TOC entry 4692 (class 0 OID 0)
-- Dependencies: 282
-- Name: document_folios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.document_folios_id_seq', 1, false);


--
-- TOC entry 4693 (class 0 OID 0)
-- Dependencies: 222
-- Name: document_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.document_types_id_seq', 2, true);


--
-- TOC entry 4694 (class 0 OID 0)
-- Dependencies: 224
-- Name: documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.documents_id_seq', 17, true);


--
-- TOC entry 4695 (class 0 OID 0)
-- Dependencies: 278
-- Name: google_calendar_event_mappings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.google_calendar_event_mappings_id_seq', 7, true);


--
-- TOC entry 4696 (class 0 OID 0)
-- Dependencies: 276
-- Name: google_calendar_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.google_calendar_tokens_id_seq', 3, true);


--
-- TOC entry 4697 (class 0 OID 0)
-- Dependencies: 274
-- Name: licenses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.licenses_id_seq', 2, true);


--
-- TOC entry 4698 (class 0 OID 0)
-- Dependencies: 242
-- Name: medical_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.medical_records_id_seq', 3, true);


--
-- TOC entry 4699 (class 0 OID 0)
-- Dependencies: 220
-- Name: medical_specialties_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.medical_specialties_id_seq', 27, true);


--
-- TOC entry 4700 (class 0 OID 0)
-- Dependencies: 230
-- Name: medications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.medications_id_seq', 742, true);


--
-- TOC entry 4701 (class 0 OID 0)
-- Dependencies: 240
-- Name: offices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.offices_id_seq', 1, true);


--
-- TOC entry 4702 (class 0 OID 0)
-- Dependencies: 238
-- Name: person_documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.person_documents_id_seq', 2, true);


--
-- TOC entry 4703 (class 0 OID 0)
-- Dependencies: 236
-- Name: persons_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.persons_id_seq', 6, true);


--
-- TOC entry 4704 (class 0 OID 0)
-- Dependencies: 262
-- Name: privacy_consents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.privacy_consents_id_seq', 1, false);


--
-- TOC entry 4705 (class 0 OID 0)
-- Dependencies: 260
-- Name: privacy_notices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.privacy_notices_id_seq', 1, false);


--
-- TOC entry 4706 (class 0 OID 0)
-- Dependencies: 256
-- Name: schedule_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.schedule_templates_id_seq', 8, true);


--
-- TOC entry 4707 (class 0 OID 0)
-- Dependencies: 217
-- Name: states_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.states_id_seq', 413, true);


--
-- TOC entry 4708 (class 0 OID 0)
-- Dependencies: 228
-- Name: study_catalog_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.study_catalog_id_seq', 500, true);


--
-- TOC entry 4709 (class 0 OID 0)
-- Dependencies: 226
-- Name: study_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.study_categories_id_seq', 25, true);


--
-- TOC entry 4710 (class 0 OID 0)
-- Dependencies: 252
-- Name: vital_signs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.vital_signs_id_seq', 11, true);


--
-- TOC entry 4328 (class 2606 OID 27372)
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- TOC entry 4320 (class 2606 OID 27154)
-- Name: appointment_reminders appointment_reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_reminders
    ADD CONSTRAINT appointment_reminders_pkey PRIMARY KEY (id);


--
-- TOC entry 4285 (class 2606 OID 26714)
-- Name: appointment_types appointment_types_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_types
    ADD CONSTRAINT appointment_types_name_key UNIQUE (name);


--
-- TOC entry 4287 (class 2606 OID 26712)
-- Name: appointment_types appointment_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_types
    ADD CONSTRAINT appointment_types_pkey PRIMARY KEY (id);


--
-- TOC entry 4289 (class 2606 OID 26730)
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- TOC entry 4316 (class 2606 OID 26929)
-- Name: arco_requests arco_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arco_requests
    ADD CONSTRAINT arco_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 4304 (class 2606 OID 26876)
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- TOC entry 4291 (class 2606 OID 26773)
-- Name: clinical_studies clinical_studies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_studies
    ADD CONSTRAINT clinical_studies_pkey PRIMARY KEY (id);


--
-- TOC entry 4294 (class 2606 OID 26803)
-- Name: consultation_prescriptions consultation_prescriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_prescriptions
    ADD CONSTRAINT consultation_prescriptions_pkey PRIMARY KEY (id);


--
-- TOC entry 4298 (class 2606 OID 26830)
-- Name: consultation_vital_signs consultation_vital_signs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_vital_signs
    ADD CONSTRAINT consultation_vital_signs_pkey PRIMARY KEY (id);


--
-- TOC entry 4243 (class 2606 OID 26442)
-- Name: countries countries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_pkey PRIMARY KEY (id);


--
-- TOC entry 4318 (class 2606 OID 26948)
-- Name: data_retention_logs data_retention_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_retention_logs
    ADD CONSTRAINT data_retention_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 4269 (class 2606 OID 26562)
-- Name: diagnosis_catalog diagnosis_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnosis_catalog
    ADD CONSTRAINT diagnosis_catalog_pkey PRIMARY KEY (id);


--
-- TOC entry 4267 (class 2606 OID 26547)
-- Name: diagnosis_categories diagnosis_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnosis_categories
    ADD CONSTRAINT diagnosis_categories_pkey PRIMARY KEY (id);


--
-- TOC entry 4348 (class 2606 OID 27990)
-- Name: document_folio_sequences document_folio_sequences_doctor_type_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_folio_sequences
    ADD CONSTRAINT document_folio_sequences_doctor_type_unique UNIQUE (doctor_id, document_type);


--
-- TOC entry 4350 (class 2606 OID 27988)
-- Name: document_folio_sequences document_folio_sequences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_folio_sequences
    ADD CONSTRAINT document_folio_sequences_pkey PRIMARY KEY (id);


--
-- TOC entry 4353 (class 2606 OID 28006)
-- Name: document_folios document_folios_doctor_consultation_type_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_folios
    ADD CONSTRAINT document_folios_doctor_consultation_type_unique UNIQUE (doctor_id, consultation_id, document_type);


--
-- TOC entry 4355 (class 2606 OID 28004)
-- Name: document_folios document_folios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_folios
    ADD CONSTRAINT document_folios_pkey PRIMARY KEY (id);


--
-- TOC entry 4251 (class 2606 OID 26484)
-- Name: document_types document_types_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_types
    ADD CONSTRAINT document_types_name_key UNIQUE (name);


--
-- TOC entry 4253 (class 2606 OID 26482)
-- Name: document_types document_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_types
    ADD CONSTRAINT document_types_pkey PRIMARY KEY (id);


--
-- TOC entry 4255 (class 2606 OID 26494)
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- TOC entry 4247 (class 2606 OID 26463)
-- Name: emergency_relationships emergency_relationships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency_relationships
    ADD CONSTRAINT emergency_relationships_pkey PRIMARY KEY (code);


--
-- TOC entry 4342 (class 2606 OID 27944)
-- Name: google_calendar_event_mappings google_calendar_event_mappings_appointment_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_calendar_event_mappings
    ADD CONSTRAINT google_calendar_event_mappings_appointment_id_key UNIQUE (appointment_id);


--
-- TOC entry 4344 (class 2606 OID 27946)
-- Name: google_calendar_event_mappings google_calendar_event_mappings_google_event_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_calendar_event_mappings
    ADD CONSTRAINT google_calendar_event_mappings_google_event_id_key UNIQUE (google_event_id);


--
-- TOC entry 4346 (class 2606 OID 27942)
-- Name: google_calendar_event_mappings google_calendar_event_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_calendar_event_mappings
    ADD CONSTRAINT google_calendar_event_mappings_pkey PRIMARY KEY (id);


--
-- TOC entry 4338 (class 2606 OID 27928)
-- Name: google_calendar_tokens google_calendar_tokens_doctor_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_calendar_tokens
    ADD CONSTRAINT google_calendar_tokens_doctor_id_key UNIQUE (doctor_id);


--
-- TOC entry 4340 (class 2606 OID 27926)
-- Name: google_calendar_tokens google_calendar_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_calendar_tokens
    ADD CONSTRAINT google_calendar_tokens_pkey PRIMARY KEY (id);


--
-- TOC entry 4334 (class 2606 OID 27899)
-- Name: licenses licenses_doctor_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licenses
    ADD CONSTRAINT licenses_doctor_id_key UNIQUE (doctor_id);


--
-- TOC entry 4336 (class 2606 OID 27897)
-- Name: licenses licenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licenses
    ADD CONSTRAINT licenses_pkey PRIMARY KEY (id);


--
-- TOC entry 4283 (class 2606 OID 26688)
-- Name: medical_records medical_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT medical_records_pkey PRIMARY KEY (id);


--
-- TOC entry 4249 (class 2606 OID 26472)
-- Name: medical_specialties medical_specialties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_specialties
    ADD CONSTRAINT medical_specialties_pkey PRIMARY KEY (id);


--
-- TOC entry 4263 (class 2606 OID 27406)
-- Name: medications medications_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medications
    ADD CONSTRAINT medications_name_key UNIQUE (name);


--
-- TOC entry 4265 (class 2606 OID 26536)
-- Name: medications medications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medications
    ADD CONSTRAINT medications_pkey PRIMARY KEY (id);


--
-- TOC entry 4280 (class 2606 OID 26659)
-- Name: offices offices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offices
    ADD CONSTRAINT offices_pkey PRIMARY KEY (id);


--
-- TOC entry 4278 (class 2606 OID 26630)
-- Name: person_documents person_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_documents
    ADD CONSTRAINT person_documents_pkey PRIMARY KEY (id);


--
-- TOC entry 4274 (class 2606 OID 26585)
-- Name: persons persons_person_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_person_code_key UNIQUE (person_code);


--
-- TOC entry 4276 (class 2606 OID 26583)
-- Name: persons persons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_pkey PRIMARY KEY (id);


--
-- TOC entry 4314 (class 2606 OID 26907)
-- Name: privacy_consents privacy_consents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.privacy_consents
    ADD CONSTRAINT privacy_consents_pkey PRIMARY KEY (id);


--
-- TOC entry 4306 (class 2606 OID 26897)
-- Name: privacy_notices privacy_notices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.privacy_notices
    ADD CONSTRAINT privacy_notices_pkey PRIMARY KEY (id);


--
-- TOC entry 4308 (class 2606 OID 27288)
-- Name: privacy_notices privacy_notices_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.privacy_notices
    ADD CONSTRAINT privacy_notices_version_key UNIQUE (version);


--
-- TOC entry 4310 (class 2606 OID 27352)
-- Name: privacy_notices privacy_notices_version_key1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.privacy_notices
    ADD CONSTRAINT privacy_notices_version_key1 UNIQUE (version);


--
-- TOC entry 4312 (class 2606 OID 27413)
-- Name: privacy_notices privacy_notices_version_key2; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.privacy_notices
    ADD CONSTRAINT privacy_notices_version_key2 UNIQUE (version);


--
-- TOC entry 4302 (class 2606 OID 26854)
-- Name: schedule_templates schedule_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_templates
    ADD CONSTRAINT schedule_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 4245 (class 2606 OID 26451)
-- Name: states states_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.states
    ADD CONSTRAINT states_pkey PRIMARY KEY (id);


--
-- TOC entry 4261 (class 2606 OID 26520)
-- Name: study_catalog study_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_catalog
    ADD CONSTRAINT study_catalog_pkey PRIMARY KEY (id);


--
-- TOC entry 4258 (class 2606 OID 26510)
-- Name: study_categories study_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_categories
    ADD CONSTRAINT study_categories_pkey PRIMARY KEY (id);


--
-- TOC entry 4326 (class 2606 OID 27233)
-- Name: appointment_reminders unique_appointment_reminder_number; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_reminders
    ADD CONSTRAINT unique_appointment_reminder_number UNIQUE (appointment_id, reminder_number);


--
-- TOC entry 4296 (class 2606 OID 26821)
-- Name: vital_signs vital_signs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vital_signs
    ADD CONSTRAINT vital_signs_pkey PRIMARY KEY (id);


--
-- TOC entry 4321 (class 1259 OID 27429)
-- Name: idx_appointment_reminders_appointment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointment_reminders_appointment_id ON public.appointment_reminders USING btree (appointment_id);


--
-- TOC entry 4322 (class 1259 OID 27430)
-- Name: idx_appointment_reminders_appointment_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointment_reminders_appointment_status ON public.appointment_reminders USING btree (appointment_id) WHERE ((enabled = true) AND (sent = false));


--
-- TOC entry 4323 (class 1259 OID 27431)
-- Name: idx_appointment_reminders_enabled_sent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointment_reminders_enabled_sent ON public.appointment_reminders USING btree (enabled, sent) WHERE ((enabled = true) AND (sent = false));


--
-- TOC entry 4324 (class 1259 OID 27432)
-- Name: idx_appointment_reminders_whatsapp_message_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointment_reminders_whatsapp_message_id ON public.appointment_reminders USING btree (whatsapp_message_id);


--
-- TOC entry 4351 (class 1259 OID 27996)
-- Name: idx_document_folio_sequences_doctor_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_folio_sequences_doctor_type ON public.document_folio_sequences USING btree (doctor_id, document_type);


--
-- TOC entry 4356 (class 1259 OID 28017)
-- Name: idx_document_folios_doctor_type_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_folios_doctor_type_number ON public.document_folios USING btree (doctor_id, document_type, folio_number);


--
-- TOC entry 4357 (class 1259 OID 28018)
-- Name: idx_document_folios_unique_consultation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_folios_unique_consultation ON public.document_folios USING btree (doctor_id, consultation_id, document_type);


--
-- TOC entry 4329 (class 1259 OID 27910)
-- Name: idx_licenses_doctor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_licenses_doctor_id ON public.licenses USING btree (doctor_id);


--
-- TOC entry 4330 (class 1259 OID 27912)
-- Name: idx_licenses_expiration_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_licenses_expiration_date ON public.licenses USING btree (expiration_date);


--
-- TOC entry 4331 (class 1259 OID 27913)
-- Name: idx_licenses_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_licenses_is_active ON public.licenses USING btree (is_active);


--
-- TOC entry 4332 (class 1259 OID 27911)
-- Name: idx_licenses_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_licenses_status ON public.licenses USING btree (status);


--
-- TOC entry 4281 (class 1259 OID 27976)
-- Name: idx_medical_records_patient_document; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_medical_records_patient_document ON public.medical_records USING btree (patient_document_id);


--
-- TOC entry 4299 (class 1259 OID 27958)
-- Name: idx_schedule_templates_time_blocks; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schedule_templates_time_blocks ON public.schedule_templates USING gin (time_blocks);


--
-- TOC entry 4292 (class 1259 OID 27259)
-- Name: ix_clinical_studies_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_clinical_studies_id ON public.clinical_studies USING btree (id);


--
-- TOC entry 4270 (class 1259 OID 27277)
-- Name: ix_diagnosis_catalog_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_diagnosis_catalog_code ON public.diagnosis_catalog USING btree (code);


--
-- TOC entry 4271 (class 1259 OID 27278)
-- Name: ix_diagnosis_catalog_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_diagnosis_catalog_created_by ON public.diagnosis_catalog USING btree (created_by);


--
-- TOC entry 4272 (class 1259 OID 27279)
-- Name: ix_diagnosis_catalog_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_diagnosis_catalog_id ON public.diagnosis_catalog USING btree (id);


--
-- TOC entry 4300 (class 1259 OID 27289)
-- Name: ix_schedule_templates_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_schedule_templates_id ON public.schedule_templates USING btree (id);


--
-- TOC entry 4259 (class 1259 OID 27305)
-- Name: ix_study_catalog_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_study_catalog_id ON public.study_catalog USING btree (id);


--
-- TOC entry 4256 (class 1259 OID 27306)
-- Name: ix_study_categories_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_study_categories_id ON public.study_categories USING btree (id);


--
-- TOC entry 4380 (class 2606 OID 26741)
-- Name: appointments appointments_appointment_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_appointment_type_id_fkey FOREIGN KEY (appointment_type_id) REFERENCES public.appointment_types(id);


--
-- TOC entry 4381 (class 2606 OID 27234)
-- Name: appointments appointments_appointment_type_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_appointment_type_id_fkey1 FOREIGN KEY (appointment_type_id) REFERENCES public.appointment_types(id);


--
-- TOC entry 4382 (class 2606 OID 27316)
-- Name: appointments appointments_appointment_type_id_fkey2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_appointment_type_id_fkey2 FOREIGN KEY (appointment_type_id) REFERENCES public.appointment_types(id);


--
-- TOC entry 4383 (class 2606 OID 27377)
-- Name: appointments appointments_appointment_type_id_fkey3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_appointment_type_id_fkey3 FOREIGN KEY (appointment_type_id) REFERENCES public.appointment_types(id);


--
-- TOC entry 4384 (class 2606 OID 26751)
-- Name: appointments appointments_cancelled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES public.persons(id);


--
-- TOC entry 4385 (class 2606 OID 26756)
-- Name: appointments appointments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.persons(id);


--
-- TOC entry 4386 (class 2606 OID 26736)
-- Name: appointments appointments_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.persons(id);


--
-- TOC entry 4387 (class 2606 OID 26746)
-- Name: appointments appointments_office_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_office_id_fkey FOREIGN KEY (office_id) REFERENCES public.offices(id);


--
-- TOC entry 4388 (class 2606 OID 27239)
-- Name: appointments appointments_office_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_office_id_fkey1 FOREIGN KEY (office_id) REFERENCES public.offices(id);


--
-- TOC entry 4389 (class 2606 OID 27321)
-- Name: appointments appointments_office_id_fkey2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_office_id_fkey2 FOREIGN KEY (office_id) REFERENCES public.offices(id);


--
-- TOC entry 4390 (class 2606 OID 27382)
-- Name: appointments appointments_office_id_fkey3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_office_id_fkey3 FOREIGN KEY (office_id) REFERENCES public.offices(id);


--
-- TOC entry 4391 (class 2606 OID 26731)
-- Name: appointments appointments_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.persons(id);


--
-- TOC entry 4406 (class 2606 OID 26930)
-- Name: arco_requests arco_requests_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arco_requests
    ADD CONSTRAINT arco_requests_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.persons(id) ON DELETE CASCADE;


--
-- TOC entry 4407 (class 2606 OID 26935)
-- Name: arco_requests arco_requests_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arco_requests
    ADD CONSTRAINT arco_requests_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.persons(id);


--
-- TOC entry 4402 (class 2606 OID 26882)
-- Name: audit_log audit_log_affected_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_affected_patient_id_fkey FOREIGN KEY (affected_patient_id) REFERENCES public.persons(id) ON DELETE SET NULL;


--
-- TOC entry 4403 (class 2606 OID 26877)
-- Name: audit_log audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.persons(id) ON DELETE SET NULL;


--
-- TOC entry 4392 (class 2606 OID 27388)
-- Name: clinical_studies clinical_studies_consultation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_studies
    ADD CONSTRAINT clinical_studies_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.medical_records(id);


--
-- TOC entry 4393 (class 2606 OID 26789)
-- Name: clinical_studies clinical_studies_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_studies
    ADD CONSTRAINT clinical_studies_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.persons(id);


--
-- TOC entry 4394 (class 2606 OID 26784)
-- Name: clinical_studies clinical_studies_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_studies
    ADD CONSTRAINT clinical_studies_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.persons(id);


--
-- TOC entry 4395 (class 2606 OID 26779)
-- Name: clinical_studies clinical_studies_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_studies
    ADD CONSTRAINT clinical_studies_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.persons(id);


--
-- TOC entry 4396 (class 2606 OID 27393)
-- Name: consultation_prescriptions consultation_prescriptions_consultation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_prescriptions
    ADD CONSTRAINT consultation_prescriptions_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.medical_records(id);


--
-- TOC entry 4397 (class 2606 OID 26809)
-- Name: consultation_prescriptions consultation_prescriptions_medication_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_prescriptions
    ADD CONSTRAINT consultation_prescriptions_medication_id_fkey FOREIGN KEY (medication_id) REFERENCES public.medications(id);


--
-- TOC entry 4398 (class 2606 OID 27398)
-- Name: consultation_vital_signs consultation_vital_signs_consultation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_vital_signs
    ADD CONSTRAINT consultation_vital_signs_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.medical_records(id);


--
-- TOC entry 4399 (class 2606 OID 26836)
-- Name: consultation_vital_signs consultation_vital_signs_vital_sign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_vital_signs
    ADD CONSTRAINT consultation_vital_signs_vital_sign_id_fkey FOREIGN KEY (vital_sign_id) REFERENCES public.vital_signs(id);


--
-- TOC entry 4364 (class 2606 OID 26565)
-- Name: diagnosis_catalog diagnosis_catalog_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnosis_catalog
    ADD CONSTRAINT diagnosis_catalog_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.diagnosis_categories(id);


--
-- TOC entry 4413 (class 2606 OID 27991)
-- Name: document_folio_sequences document_folio_sequences_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_folio_sequences
    ADD CONSTRAINT document_folio_sequences_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.persons(id) ON DELETE CASCADE;


--
-- TOC entry 4414 (class 2606 OID 28012)
-- Name: document_folios document_folios_consultation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_folios
    ADD CONSTRAINT document_folios_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.medical_records(id) ON DELETE CASCADE;


--
-- TOC entry 4415 (class 2606 OID 28007)
-- Name: document_folios document_folios_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_folios
    ADD CONSTRAINT document_folios_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.persons(id) ON DELETE CASCADE;


--
-- TOC entry 4359 (class 2606 OID 26497)
-- Name: documents documents_document_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_document_type_id_fkey FOREIGN KEY (document_type_id) REFERENCES public.document_types(id) ON DELETE CASCADE;


--
-- TOC entry 4411 (class 2606 OID 27947)
-- Name: google_calendar_event_mappings google_calendar_event_mappings_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_calendar_event_mappings
    ADD CONSTRAINT google_calendar_event_mappings_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE CASCADE;


--
-- TOC entry 4412 (class 2606 OID 27952)
-- Name: google_calendar_event_mappings google_calendar_event_mappings_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_calendar_event_mappings
    ADD CONSTRAINT google_calendar_event_mappings_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.persons(id) ON DELETE CASCADE;


--
-- TOC entry 4410 (class 2606 OID 27929)
-- Name: google_calendar_tokens google_calendar_tokens_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_calendar_tokens
    ADD CONSTRAINT google_calendar_tokens_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.persons(id) ON DELETE CASCADE;


--
-- TOC entry 4408 (class 2606 OID 27905)
-- Name: licenses licenses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licenses
    ADD CONSTRAINT licenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.persons(id);


--
-- TOC entry 4409 (class 2606 OID 27900)
-- Name: licenses licenses_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licenses
    ADD CONSTRAINT licenses_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.persons(id) ON DELETE CASCADE;


--
-- TOC entry 4376 (class 2606 OID 26699)
-- Name: medical_records medical_records_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT medical_records_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.persons(id);


--
-- TOC entry 4377 (class 2606 OID 26694)
-- Name: medical_records medical_records_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT medical_records_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.persons(id);


--
-- TOC entry 4378 (class 2606 OID 27971)
-- Name: medical_records medical_records_patient_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT medical_records_patient_document_id_fkey FOREIGN KEY (patient_document_id) REFERENCES public.documents(id);


--
-- TOC entry 4379 (class 2606 OID 26689)
-- Name: medical_records medical_records_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT medical_records_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.persons(id);


--
-- TOC entry 4361 (class 2606 OID 27282)
-- Name: medications medications_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medications
    ADD CONSTRAINT medications_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.persons(id);


--
-- TOC entry 4362 (class 2606 OID 27346)
-- Name: medications medications_created_by_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medications
    ADD CONSTRAINT medications_created_by_fkey1 FOREIGN KEY (created_by) REFERENCES public.persons(id);


--
-- TOC entry 4363 (class 2606 OID 27407)
-- Name: medications medications_created_by_fkey2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medications
    ADD CONSTRAINT medications_created_by_fkey2 FOREIGN KEY (created_by) REFERENCES public.persons(id);


--
-- TOC entry 4373 (class 2606 OID 26670)
-- Name: offices offices_country_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offices
    ADD CONSTRAINT offices_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.countries(id);


--
-- TOC entry 4374 (class 2606 OID 26660)
-- Name: offices offices_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offices
    ADD CONSTRAINT offices_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.persons(id);


--
-- TOC entry 4375 (class 2606 OID 26665)
-- Name: offices offices_state_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offices
    ADD CONSTRAINT offices_state_id_fkey FOREIGN KEY (state_id) REFERENCES public.states(id);


--
-- TOC entry 4371 (class 2606 OID 26638)
-- Name: person_documents person_documents_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_documents
    ADD CONSTRAINT person_documents_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- TOC entry 4372 (class 2606 OID 26633)
-- Name: person_documents person_documents_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_documents
    ADD CONSTRAINT person_documents_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.persons(id) ON DELETE CASCADE;


--
-- TOC entry 4365 (class 2606 OID 26601)
-- Name: persons persons_address_country_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_address_country_id_fkey FOREIGN KEY (address_country_id) REFERENCES public.countries(id);


--
-- TOC entry 4366 (class 2606 OID 26596)
-- Name: persons persons_address_state_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_address_state_id_fkey FOREIGN KEY (address_state_id) REFERENCES public.states(id);


--
-- TOC entry 4367 (class 2606 OID 26591)
-- Name: persons persons_birth_country_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_birth_country_id_fkey FOREIGN KEY (birth_country_id) REFERENCES public.countries(id);


--
-- TOC entry 4368 (class 2606 OID 26586)
-- Name: persons persons_birth_state_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_birth_state_id_fkey FOREIGN KEY (birth_state_id) REFERENCES public.states(id);


--
-- TOC entry 4369 (class 2606 OID 26616)
-- Name: persons persons_emergency_contact_relationship_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_emergency_contact_relationship_fkey FOREIGN KEY (emergency_contact_relationship) REFERENCES public.emergency_relationships(code);


--
-- TOC entry 4370 (class 2606 OID 26611)
-- Name: persons persons_specialty_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_specialty_id_fkey FOREIGN KEY (specialty_id) REFERENCES public.medical_specialties(id);


--
-- TOC entry 4404 (class 2606 OID 26913)
-- Name: privacy_consents privacy_consents_notice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.privacy_consents
    ADD CONSTRAINT privacy_consents_notice_id_fkey FOREIGN KEY (notice_id) REFERENCES public.privacy_notices(id);


--
-- TOC entry 4405 (class 2606 OID 26908)
-- Name: privacy_consents privacy_consents_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.privacy_consents
    ADD CONSTRAINT privacy_consents_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.persons(id) ON DELETE CASCADE;


--
-- TOC entry 4400 (class 2606 OID 27414)
-- Name: schedule_templates schedule_templates_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_templates
    ADD CONSTRAINT schedule_templates_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.persons(id);


--
-- TOC entry 4401 (class 2606 OID 27419)
-- Name: schedule_templates schedule_templates_office_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_templates
    ADD CONSTRAINT schedule_templates_office_id_fkey FOREIGN KEY (office_id) REFERENCES public.offices(id);


--
-- TOC entry 4358 (class 2606 OID 27424)
-- Name: states states_country_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.states
    ADD CONSTRAINT states_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.countries(id);


--
-- TOC entry 4360 (class 2606 OID 26521)
-- Name: study_catalog study_catalog_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_catalog
    ADD CONSTRAINT study_catalog_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.study_categories(id);


-- Completed on 2025-12-19 12:55:49 CST

--
-- PostgreSQL database dump complete
--

\unrestrict BkRX0kd70X85zRng37HyimugXvyIjhRTRYnfapYvzVWKqlYxPCypoPkJnBHfTmq

