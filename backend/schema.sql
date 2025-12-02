--
-- PostgreSQL database dump
--

\restrict SslAbdavdWhgxWZ7lWCvXeO2ZcW3kqg16txpvzFso1YVahg0LYmqr5lzdpaIyxm

-- Dumped from database version 18.0 (Debian 18.0-1.pgdg13+3)
-- Dumped by pg_dump version 18.0 (Debian 18.0-1.pgdg13+3)

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
-- Name: audit_appointments_function(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_appointments_function() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    user_id_value INTEGER;
    user_email_value TEXT;
    user_name_value TEXT;
    user_type_value TEXT;
BEGIN
    -- Get doctor_id from the record
    IF TG_OP = 'DELETE' THEN
        user_id_value := OLD.doctor_id;
    ELSE
        user_id_value := NEW.doctor_id;
    END IF;

    -- Resolve user information when available
    IF user_id_value IS NOT NULL THEN
        SELECT email, name, person_type
        INTO user_email_value, user_name_value, user_type_value
        FROM persons
        WHERE id = user_id_value;
    END IF;

    -- Fallback to SYSTEM identity if any field is missing
    IF user_email_value IS NULL OR user_email_value = '' THEN
        user_email_value := 'SYSTEM';
    END IF;
    IF user_name_value IS NULL OR user_name_value = '' THEN
        user_name_value := 'SYSTEM';
    END IF;
    IF user_type_value IS NULL OR user_type_value = '' THEN
        user_type_value := 'system';
    END IF;

    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (
            user_id, user_email, user_name, user_type,
            action, table_name, record_id, old_values,
            changes_summary, timestamp
        ) VALUES (
            user_id_value, user_email_value, user_name_value, user_type_value,
            'DELETE', TG_TABLE_NAME, OLD.id, row_to_json(OLD),
            'Record deleted', NOW()
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (
            user_id, user_email, user_name, user_type,
            action, table_name, record_id, old_values, new_values,
            changes_summary, timestamp
        ) VALUES (
            user_id_value, user_email_value, user_name_value, user_type_value,
            'UPDATE', TG_TABLE_NAME, NEW.id, row_to_json(OLD), row_to_json(NEW),
            'Record updated', NOW()
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (
            user_id, user_email, user_name, user_type,
            action, table_name, record_id, new_values,
            changes_summary, timestamp
        ) VALUES (
            user_id_value, user_email_value, user_name_value, user_type_value,
            'INSERT', TG_TABLE_NAME, NEW.id, row_to_json(NEW),
            'Record created', NOW()
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;


--
-- Name: audit_trigger_function(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_trigger_function() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    user_id_value INTEGER;
    user_email_value TEXT;
    user_name_value TEXT;
    user_type_value TEXT;
    has_created_by BOOLEAN;
    has_doctor_id BOOLEAN;
BEGIN
    -- Check if created_by column exists in the table
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = TG_TABLE_NAME
          AND column_name = 'created_by'
          AND table_schema = TG_TABLE_SCHEMA
    ) INTO has_created_by;

    -- Check if doctor_id column exists (for appointments)
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = TG_TABLE_NAME
          AND column_name = 'doctor_id'
          AND table_schema = TG_TABLE_SCHEMA
    ) INTO has_doctor_id;

    -- Determine user_id based on available columns
    IF TG_OP = 'DELETE' THEN
        IF has_created_by THEN
            user_id_value := (OLD).created_by;
        ELSIF has_doctor_id THEN
            user_id_value := (OLD).doctor_id;
        ELSE
            user_id_value := NULL;
        END IF;
    ELSE
        IF has_created_by THEN
            user_id_value := (NEW).created_by;
        ELSIF has_doctor_id THEN
            user_id_value := (NEW).doctor_id;
        ELSE
            user_id_value := NULL;
        END IF;
    END IF;

    -- Resolve user information when available
    IF user_id_value IS NOT NULL THEN
        SELECT email, name, person_type
        INTO user_email_value, user_name_value, user_type_value
        FROM persons
        WHERE id = user_id_value;
    END IF;

    -- Fallback to SYSTEM identity if any field is missing
    IF user_email_value IS NULL OR user_email_value = '' THEN
        user_email_value := 'SYSTEM';
    END IF;
    IF user_name_value IS NULL OR user_name_value = '' THEN
        user_name_value := 'SYSTEM';
    END IF;
    IF user_type_value IS NULL OR user_type_value = '' THEN
        user_type_value := 'system';
    END IF;

    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (
            user_id, user_email, user_name, user_type,
            action, table_name, record_id, old_values,
            changes_summary, timestamp
        ) VALUES (
            user_id_value, user_email_value, user_name_value, user_type_value,
            'DELETE', TG_TABLE_NAME, OLD.id, row_to_json(OLD),
            'Record deleted', NOW()
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (
            user_id, user_email, user_name, user_type,
            action, table_name, record_id, old_values, new_values,
            changes_summary, timestamp
        ) VALUES (
            user_id_value, user_email_value, user_name_value, user_type_value,
            'UPDATE', TG_TABLE_NAME, NEW.id, row_to_json(OLD), row_to_json(NEW),
            'Record updated', NOW()
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (
            user_id, user_email, user_name, user_type,
            action, table_name, record_id, new_values,
            changes_summary, timestamp
        ) VALUES (
            user_id_value, user_email_value, user_name_value, user_type_value,
            'INSERT', TG_TABLE_NAME, NEW.id, row_to_json(NEW),
            'Record created', NOW()
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;


--
-- Name: calculate_age(date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_age(birth_date date) RETURNS integer
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF birth_date IS NULL THEN
        RETURN NULL;
    END IF;
    
    RETURN EXTRACT(YEAR FROM AGE(CURRENT_DATE, birth_date));
END;
$$;


--
-- Name: FUNCTION calculate_age(birth_date date); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.calculate_age(birth_date date) IS 'Calcula la edad basada en la fecha de nacimiento';


--
-- Name: format_full_name(text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.format_full_name(title text, first_name text, paternal_surname text, maternal_surname text) RETURNS text
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN TRIM(
        COALESCE(title || ' ', '') ||
        COALESCE(first_name || ' ', '') ||
        COALESCE(paternal_surname || ' ', '') ||
        COALESCE(maternal_surname, '')
    );
END;
$$;


--
-- Name: FUNCTION format_full_name(title text, first_name text, paternal_surname text, maternal_surname text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.format_full_name(title text, first_name text, paternal_surname text, maternal_surname text) IS 'Formatea el nombre completo de una persona';


--
-- Name: search_diagnoses(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_diagnoses(search_term text, specialty_filter text DEFAULT NULL::text) RETURNS TABLE(id integer, code character varying, name character varying, description text, category_name character varying, specialty character varying, rank real)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.code,
        d.name,
        d.description,
        dc.name as category_name,
        d.specialty,
        ts_rank(d.search_vector, plainto_tsquery('spanish', search_term)) as rank
    FROM diagnosis_search_view d
    WHERE d.search_vector @@ plainto_tsquery('spanish', search_term)
    AND (specialty_filter IS NULL OR d.specialty = specialty_filter)
    ORDER BY rank DESC, d.name ASC
    LIMIT 50;
END;
$$;


--
-- Name: FUNCTION search_diagnoses(search_term text, specialty_filter text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.search_diagnoses(search_term text, specialty_filter text) IS 'Función de búsqueda de diagnósticos con filtros de especialidad';


--
-- Name: update_consultation_diagnoses_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_consultation_diagnoses_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: validate_curp(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_curp(curp text) RETURNS boolean
    LANGUAGE plpgsql
    AS $_$
BEGIN
    IF curp IS NULL OR curp = '' THEN
        RETURN TRUE; -- CURP es opcional
    END IF;
    
    -- Validar formato básico de CURP (18 caracteres)
    IF LENGTH(curp) != 18 THEN
        RETURN FALSE;
    END IF;
    
    -- Validar que contenga solo letras y números
    IF NOT curp ~ '^[A-Z0-9]+$' THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$_$;


--
-- Name: FUNCTION validate_curp(curp text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.validate_curp(curp text) IS 'Valida el formato de CURP mexicano';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


--
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
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    whatsapp_message_id character varying(255),
    CONSTRAINT appointment_reminders_offset_minutes_check CHECK ((offset_minutes > 0)),
    CONSTRAINT appointment_reminders_reminder_number_check CHECK (((reminder_number >= 1) AND (reminder_number <= 3)))
);


--
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
-- Name: appointment_reminders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.appointment_reminders_id_seq OWNED BY public.appointment_reminders.id;


--
-- Name: appointment_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointment_types (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
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
-- Name: appointment_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.appointment_types_id_seq OWNED BY public.appointment_types.id;


--
-- Name: appointments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointments (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    doctor_id integer NOT NULL,
    appointment_date timestamp without time zone NOT NULL,
    status character varying(20) DEFAULT 'confirmed'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    end_time timestamp without time zone NOT NULL,
    consultation_type character varying(50) DEFAULT 'Seguimiento'::character varying,
    reminder_sent boolean DEFAULT false,
    reminder_sent_at timestamp without time zone,
    auto_reminder_enabled boolean DEFAULT false,
    auto_reminder_offset_minutes integer DEFAULT 360,
    cancelled_reason text,
    cancelled_at timestamp without time zone,
    cancelled_by integer,
    appointment_type_id integer DEFAULT 1 NOT NULL,
    office_id integer,
    CONSTRAINT chk_appointment_date CHECK ((appointment_date >= (CURRENT_DATE - '1 year'::interval))),
    CONSTRAINT chk_appointment_status CHECK (((status)::text = ANY ((ARRAY['por_confirmar'::character varying, 'confirmada'::character varying, 'cancelled'::character varying, 'completed'::character varying])::text[])))
);


--
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
-- Name: appointments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.appointments_id_seq OWNED BY public.appointments.id;


--
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
-- Name: arco_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.arco_requests_id_seq OWNED BY public.arco_requests.id;


--
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
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;


--
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
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT chk_study_status CHECK (((status)::text = ANY (ARRAY[('ordered'::character varying)::text, ('in_progress'::character varying)::text, ('completed'::character varying)::text, ('cancelled'::character varying)::text, ('failed'::character varying)::text]))),
    CONSTRAINT chk_study_urgency CHECK (((urgency)::text = ANY ((ARRAY['routine'::character varying, 'urgent'::character varying, 'stat'::character varying, 'emergency'::character varying])::text[])))
);


--
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
-- Name: clinical_studies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clinical_studies_id_seq OWNED BY public.clinical_studies.id;


--
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
-- Name: consultation_prescriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.consultation_prescriptions_id_seq OWNED BY public.consultation_prescriptions.id;


--
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
-- Name: consultation_vital_signs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.consultation_vital_signs_id_seq OWNED BY public.consultation_vital_signs.id;


--
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
-- Name: countries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.countries_id_seq OWNED BY public.countries.id;


--
-- Name: diagnosis_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.diagnosis_catalog (
    id integer NOT NULL,
    name character varying(500) NOT NULL,
    code character varying(10) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by integer DEFAULT 0 NOT NULL,
    CONSTRAINT check_created_by_non_negative CHECK ((created_by >= 0))
);


--
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
-- Name: diagnosis_catalog_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.diagnosis_catalog_id_seq OWNED BY public.diagnosis_catalog.id;


--
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
-- Name: document_folio_sequences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.document_folio_sequences_id_seq OWNED BY public.document_folio_sequences.id;


--
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
-- Name: document_folios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.document_folios_id_seq OWNED BY public.document_folios.id;


--
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
-- Name: document_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.document_types_id_seq OWNED BY public.document_types.id;


--
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
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;


--
-- Name: emergency_relationships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emergency_relationships (
    code character varying(20) NOT NULL,
    name character varying(50) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
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
-- Name: google_calendar_event_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.google_calendar_event_mappings_id_seq OWNED BY public.google_calendar_event_mappings.id;


--
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
-- Name: google_calendar_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.google_calendar_tokens_id_seq OWNED BY public.google_calendar_tokens.id;


--
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
-- Name: licenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.licenses_id_seq OWNED BY public.licenses.id;


--
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
    perinatal_history text NOT NULL,
    gynecological_and_obstetric_history text NOT NULL,
    patient_document_id integer,
    patient_document_value character varying(255),
    follow_up_instructions text DEFAULT ''::text NOT NULL
);


--
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
-- Name: medical_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.medical_records_id_seq OWNED BY public.medical_records.id;


--
-- Name: medical_specialties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medical_specialties (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
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
-- Name: medical_specialties_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.medical_specialties_id_seq OWNED BY public.medical_specialties.id;


--
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
-- Name: medications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.medications_id_seq OWNED BY public.medications.id;


--
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
-- Name: offices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.offices_id_seq OWNED BY public.offices.id;


--
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
-- Name: person_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.person_documents_id_seq OWNED BY public.person_documents.id;


--
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
    emergency_contact_name character varying(200),
    emergency_contact_phone character varying(20),
    emergency_contact_relationship character varying(20),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by integer,
    appointment_duration integer,
    insurance_provider character varying(100),
    insurance_number character varying(50),
    hashed_password character varying(255),
    last_login timestamp without time zone,
    university character varying(200),
    graduation_year integer,
    name character varying(300) NOT NULL,
    avatar_type character varying(20) DEFAULT 'initials'::character varying,
    avatar_template_key character varying(100),
    avatar_file_path character varying(255),
    CONSTRAINT chk_birth_date CHECK (((birth_date IS NULL) OR (birth_date <= CURRENT_DATE))),
    CONSTRAINT chk_person_type CHECK (((person_type)::text = ANY ((ARRAY['doctor'::character varying, 'patient'::character varying, 'admin'::character varying])::text[]))),
    CONSTRAINT persons_person_type_check CHECK (((person_type)::text = ANY ((ARRAY['doctor'::character varying, 'patient'::character varying, 'admin'::character varying])::text[])))
);


--
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
-- Name: persons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.persons_id_seq OWNED BY public.persons.id;


--
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
-- Name: privacy_consents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.privacy_consents_id_seq OWNED BY public.privacy_consents.id;


--
-- Name: privacy_notices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.privacy_notices (
    id integer NOT NULL,
    version character varying(20) NOT NULL,
    title character varying(200) NOT NULL,
    content text NOT NULL,
    effective_date date NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    short_summary text
);


--
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
-- Name: privacy_notices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.privacy_notices_id_seq OWNED BY public.privacy_notices.id;


--
-- Name: schedule_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schedule_templates (
    id integer NOT NULL,
    doctor_id integer,
    day_of_week integer NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    office_id integer NOT NULL,
    consultation_duration integer,
    break_duration integer,
    lunch_start time without time zone,
    lunch_end time without time zone,
    time_blocks jsonb DEFAULT '[]'::jsonb,
    CONSTRAINT schedule_templates_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6)))
);


--
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
-- Name: schedule_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.schedule_templates_id_seq OWNED BY public.schedule_templates.id;


--
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
-- Name: states_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.states_id_seq OWNED BY public.states.id;


--
-- Name: study_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.study_catalog (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    category_id integer NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
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
-- Name: study_catalog_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.study_catalog_id_seq OWNED BY public.study_catalog.id;


--
-- Name: study_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.study_categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
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
-- Name: study_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.study_categories_id_seq OWNED BY public.study_categories.id;


--
-- Name: vital_signs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vital_signs (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
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
-- Name: vital_signs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vital_signs_id_seq OWNED BY public.vital_signs.id;


--
-- Name: appointment_reminders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_reminders ALTER COLUMN id SET DEFAULT nextval('public.appointment_reminders_id_seq'::regclass);


--
-- Name: appointment_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_types ALTER COLUMN id SET DEFAULT nextval('public.appointment_types_id_seq'::regclass);


--
-- Name: appointments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments ALTER COLUMN id SET DEFAULT nextval('public.appointments_id_seq'::regclass);


--
-- Name: arco_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arco_requests ALTER COLUMN id SET DEFAULT nextval('public.arco_requests_id_seq'::regclass);


--
-- Name: audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);


--
-- Name: clinical_studies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_studies ALTER COLUMN id SET DEFAULT nextval('public.clinical_studies_id_seq'::regclass);


--
-- Name: consultation_prescriptions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_prescriptions ALTER COLUMN id SET DEFAULT nextval('public.consultation_prescriptions_id_seq'::regclass);


--
-- Name: consultation_vital_signs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_vital_signs ALTER COLUMN id SET DEFAULT nextval('public.consultation_vital_signs_id_seq'::regclass);


--
-- Name: countries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.countries ALTER COLUMN id SET DEFAULT nextval('public.countries_id_seq'::regclass);


--
-- Name: diagnosis_catalog id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnosis_catalog ALTER COLUMN id SET DEFAULT nextval('public.diagnosis_catalog_id_seq'::regclass);


--
-- Name: document_folio_sequences id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_folio_sequences ALTER COLUMN id SET DEFAULT nextval('public.document_folio_sequences_id_seq'::regclass);


--
-- Name: document_folios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_folios ALTER COLUMN id SET DEFAULT nextval('public.document_folios_id_seq'::regclass);


--
-- Name: document_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_types ALTER COLUMN id SET DEFAULT nextval('public.document_types_id_seq'::regclass);


--
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


--
-- Name: google_calendar_event_mappings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_calendar_event_mappings ALTER COLUMN id SET DEFAULT nextval('public.google_calendar_event_mappings_id_seq'::regclass);


--
-- Name: google_calendar_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_calendar_tokens ALTER COLUMN id SET DEFAULT nextval('public.google_calendar_tokens_id_seq'::regclass);


--
-- Name: licenses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licenses ALTER COLUMN id SET DEFAULT nextval('public.licenses_id_seq'::regclass);


--
-- Name: medical_records id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_records ALTER COLUMN id SET DEFAULT nextval('public.medical_records_id_seq'::regclass);


--
-- Name: medical_specialties id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_specialties ALTER COLUMN id SET DEFAULT nextval('public.medical_specialties_id_seq'::regclass);


--
-- Name: medications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medications ALTER COLUMN id SET DEFAULT nextval('public.medications_id_seq'::regclass);


--
-- Name: offices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offices ALTER COLUMN id SET DEFAULT nextval('public.offices_id_seq'::regclass);


--
-- Name: person_documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_documents ALTER COLUMN id SET DEFAULT nextval('public.person_documents_id_seq'::regclass);


--
-- Name: persons id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persons ALTER COLUMN id SET DEFAULT nextval('public.persons_id_seq'::regclass);


--
-- Name: privacy_consents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.privacy_consents ALTER COLUMN id SET DEFAULT nextval('public.privacy_consents_id_seq'::regclass);


--
-- Name: privacy_notices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.privacy_notices ALTER COLUMN id SET DEFAULT nextval('public.privacy_notices_id_seq'::regclass);


--
-- Name: schedule_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_templates ALTER COLUMN id SET DEFAULT nextval('public.schedule_templates_id_seq'::regclass);


--
-- Name: states id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.states ALTER COLUMN id SET DEFAULT nextval('public.states_id_seq'::regclass);


--
-- Name: study_catalog id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_catalog ALTER COLUMN id SET DEFAULT nextval('public.study_catalog_id_seq'::regclass);


--
-- Name: study_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_categories ALTER COLUMN id SET DEFAULT nextval('public.study_categories_id_seq'::regclass);


--
-- Name: vital_signs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vital_signs ALTER COLUMN id SET DEFAULT nextval('public.vital_signs_id_seq'::regclass);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: appointment_reminders appointment_reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_reminders
    ADD CONSTRAINT appointment_reminders_pkey PRIMARY KEY (id);


--
-- Name: appointment_types appointment_types_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_types
    ADD CONSTRAINT appointment_types_name_key UNIQUE (name);


--
-- Name: appointment_types appointment_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_types
    ADD CONSTRAINT appointment_types_pkey PRIMARY KEY (id);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: arco_requests arco_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arco_requests
    ADD CONSTRAINT arco_requests_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: clinical_studies clinical_studies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_studies
    ADD CONSTRAINT clinical_studies_pkey PRIMARY KEY (id);


--
-- Name: consultation_prescriptions consultation_prescriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_prescriptions
    ADD CONSTRAINT consultation_prescriptions_pkey PRIMARY KEY (id);


--
-- Name: consultation_vital_signs consultation_vital_signs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_vital_signs
    ADD CONSTRAINT consultation_vital_signs_pkey PRIMARY KEY (id);


--
-- Name: countries countries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_pkey PRIMARY KEY (id);


--
-- Name: diagnosis_catalog diagnosis_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnosis_catalog
    ADD CONSTRAINT diagnosis_catalog_pkey PRIMARY KEY (id);


--
-- Name: document_folio_sequences document_folio_sequences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_folio_sequences
    ADD CONSTRAINT document_folio_sequences_pkey PRIMARY KEY (id);


--
-- Name: document_folios document_folios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_folios
    ADD CONSTRAINT document_folios_pkey PRIMARY KEY (id);


--
-- Name: document_types document_types_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_types
    ADD CONSTRAINT document_types_name_key UNIQUE (name);


--
-- Name: document_types document_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_types
    ADD CONSTRAINT document_types_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: emergency_relationships emergency_relationships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency_relationships
    ADD CONSTRAINT emergency_relationships_pkey PRIMARY KEY (code);


--
-- Name: google_calendar_event_mappings google_calendar_event_mappings_appointment_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_calendar_event_mappings
    ADD CONSTRAINT google_calendar_event_mappings_appointment_id_key UNIQUE (appointment_id);


--
-- Name: google_calendar_event_mappings google_calendar_event_mappings_google_event_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_calendar_event_mappings
    ADD CONSTRAINT google_calendar_event_mappings_google_event_id_key UNIQUE (google_event_id);


--
-- Name: google_calendar_event_mappings google_calendar_event_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_calendar_event_mappings
    ADD CONSTRAINT google_calendar_event_mappings_pkey PRIMARY KEY (id);


--
-- Name: google_calendar_tokens google_calendar_tokens_doctor_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_calendar_tokens
    ADD CONSTRAINT google_calendar_tokens_doctor_id_key UNIQUE (doctor_id);


--
-- Name: google_calendar_tokens google_calendar_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_calendar_tokens
    ADD CONSTRAINT google_calendar_tokens_pkey PRIMARY KEY (id);


--
-- Name: licenses licenses_doctor_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licenses
    ADD CONSTRAINT licenses_doctor_id_key UNIQUE (doctor_id);


--
-- Name: licenses licenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licenses
    ADD CONSTRAINT licenses_pkey PRIMARY KEY (id);


--
-- Name: medical_records medical_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT medical_records_pkey PRIMARY KEY (id);


--
-- Name: medical_specialties medical_specialties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_specialties
    ADD CONSTRAINT medical_specialties_pkey PRIMARY KEY (id);


--
-- Name: medications medications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medications
    ADD CONSTRAINT medications_pkey PRIMARY KEY (id);


--
-- Name: offices offices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offices
    ADD CONSTRAINT offices_pkey PRIMARY KEY (id);


--
-- Name: person_documents person_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_documents
    ADD CONSTRAINT person_documents_pkey PRIMARY KEY (id);


--
-- Name: persons persons_person_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_person_code_key UNIQUE (person_code);


--
-- Name: persons persons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_pkey PRIMARY KEY (id);


--
-- Name: privacy_consents privacy_consents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.privacy_consents
    ADD CONSTRAINT privacy_consents_pkey PRIMARY KEY (id);


--
-- Name: privacy_notices privacy_notices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.privacy_notices
    ADD CONSTRAINT privacy_notices_pkey PRIMARY KEY (id);


--
-- Name: privacy_notices privacy_notices_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.privacy_notices
    ADD CONSTRAINT privacy_notices_version_key UNIQUE (version);


--
-- Name: schedule_templates schedule_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_templates
    ADD CONSTRAINT schedule_templates_pkey PRIMARY KEY (id);


--
-- Name: states states_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.states
    ADD CONSTRAINT states_pkey PRIMARY KEY (id);


--
-- Name: study_catalog study_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_catalog
    ADD CONSTRAINT study_catalog_pkey PRIMARY KEY (id);


--
-- Name: study_categories study_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_categories
    ADD CONSTRAINT study_categories_pkey PRIMARY KEY (id);


--
-- Name: appointment_reminders unique_appointment_reminder_number; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_reminders
    ADD CONSTRAINT unique_appointment_reminder_number UNIQUE (appointment_id, reminder_number);


--
-- Name: medications uq_medications_name_created_by; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medications
    ADD CONSTRAINT uq_medications_name_created_by UNIQUE (name, created_by);


--
-- Name: vital_signs vital_signs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vital_signs
    ADD CONSTRAINT vital_signs_pkey PRIMARY KEY (id);


--
-- Name: idx_licenses_doctor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_licenses_doctor_id ON public.licenses USING btree (doctor_id);


--
-- Name: idx_licenses_expiration_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_licenses_expiration_date ON public.licenses USING btree (expiration_date);


--
-- Name: idx_licenses_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_licenses_is_active ON public.licenses USING btree (is_active);


--
-- Name: idx_licenses_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_licenses_status ON public.licenses USING btree (status);


--
-- Name: idx_schedule_templates_time_blocks; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schedule_templates_time_blocks ON public.schedule_templates USING gin (time_blocks);


--
-- Name: ix_clinical_studies_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_clinical_studies_id ON public.clinical_studies USING btree (id);


--
-- Name: ix_diagnosis_catalog_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_diagnosis_catalog_code ON public.diagnosis_catalog USING btree (code);


--
-- Name: ix_diagnosis_catalog_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_diagnosis_catalog_created_by ON public.diagnosis_catalog USING btree (created_by);


--
-- Name: ix_diagnosis_catalog_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_diagnosis_catalog_id ON public.diagnosis_catalog USING btree (id);


--
-- Name: ix_schedule_templates_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_schedule_templates_id ON public.schedule_templates USING btree (id);


--
-- Name: ix_study_catalog_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_study_catalog_id ON public.study_catalog USING btree (id);


--
-- Name: ix_study_categories_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_study_categories_id ON public.study_categories USING btree (id);


--
-- Name: appointments audit_appointments; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_appointments AFTER INSERT OR DELETE OR UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.audit_appointments_function();


--
-- Name: clinical_studies audit_clinical_studies; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_clinical_studies AFTER INSERT OR DELETE OR UPDATE ON public.clinical_studies FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();


--
-- Name: medical_records audit_medical_records; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_medical_records AFTER INSERT OR DELETE OR UPDATE ON public.medical_records FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();


--
-- Name: appointment_reminders appointment_reminders_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_reminders
    ADD CONSTRAINT appointment_reminders_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE CASCADE;


--
-- Name: appointments appointments_appointment_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_appointment_type_id_fkey FOREIGN KEY (appointment_type_id) REFERENCES public.appointment_types(id);


--
-- Name: appointments appointments_cancelled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES public.persons(id);


--
-- Name: appointments appointments_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.persons(id);


--
-- Name: appointments appointments_office_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_office_id_fkey FOREIGN KEY (office_id) REFERENCES public.offices(id);


--
-- Name: appointments appointments_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.persons(id);


--
-- Name: arco_requests arco_requests_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arco_requests
    ADD CONSTRAINT arco_requests_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.persons(id) ON DELETE CASCADE;


--
-- Name: arco_requests arco_requests_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arco_requests
    ADD CONSTRAINT arco_requests_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.persons(id);


--
-- Name: audit_log audit_log_affected_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_affected_patient_id_fkey FOREIGN KEY (affected_patient_id) REFERENCES public.persons(id) ON DELETE SET NULL;


--
-- Name: audit_log audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.persons(id) ON DELETE SET NULL;


--
-- Name: clinical_studies clinical_studies_consultation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_studies
    ADD CONSTRAINT clinical_studies_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.medical_records(id);


--
-- Name: clinical_studies clinical_studies_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_studies
    ADD CONSTRAINT clinical_studies_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.persons(id);


--
-- Name: clinical_studies clinical_studies_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_studies
    ADD CONSTRAINT clinical_studies_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.persons(id);


--
-- Name: clinical_studies clinical_studies_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_studies
    ADD CONSTRAINT clinical_studies_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.persons(id);


--
-- Name: consultation_prescriptions consultation_prescriptions_consultation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_prescriptions
    ADD CONSTRAINT consultation_prescriptions_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.medical_records(id);


--
-- Name: consultation_prescriptions consultation_prescriptions_medication_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_prescriptions
    ADD CONSTRAINT consultation_prescriptions_medication_id_fkey FOREIGN KEY (medication_id) REFERENCES public.medications(id);


--
-- Name: consultation_vital_signs consultation_vital_signs_consultation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_vital_signs
    ADD CONSTRAINT consultation_vital_signs_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.medical_records(id);


--
-- Name: consultation_vital_signs consultation_vital_signs_vital_sign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_vital_signs
    ADD CONSTRAINT consultation_vital_signs_vital_sign_id_fkey FOREIGN KEY (vital_sign_id) REFERENCES public.vital_signs(id);


--
-- Name: document_folio_sequences document_folio_sequences_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_folio_sequences
    ADD CONSTRAINT document_folio_sequences_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.persons(id);


--
-- Name: document_folios document_folios_consultation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_folios
    ADD CONSTRAINT document_folios_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.medical_records(id);


--
-- Name: document_folios document_folios_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_folios
    ADD CONSTRAINT document_folios_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.persons(id);


--
-- Name: documents documents_document_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_document_type_id_fkey FOREIGN KEY (document_type_id) REFERENCES public.document_types(id) ON DELETE CASCADE;


--
-- Name: medical_records fk_medical_records_patient_document; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT fk_medical_records_patient_document FOREIGN KEY (patient_document_id) REFERENCES public.documents(id);


--
-- Name: google_calendar_event_mappings google_calendar_event_mappings_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_calendar_event_mappings
    ADD CONSTRAINT google_calendar_event_mappings_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE CASCADE;


--
-- Name: google_calendar_event_mappings google_calendar_event_mappings_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_calendar_event_mappings
    ADD CONSTRAINT google_calendar_event_mappings_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.persons(id) ON DELETE CASCADE;


--
-- Name: google_calendar_tokens google_calendar_tokens_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_calendar_tokens
    ADD CONSTRAINT google_calendar_tokens_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.persons(id) ON DELETE CASCADE;


--
-- Name: licenses licenses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licenses
    ADD CONSTRAINT licenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.persons(id);


--
-- Name: licenses licenses_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licenses
    ADD CONSTRAINT licenses_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.persons(id) ON DELETE CASCADE;


--
-- Name: medical_records medical_records_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT medical_records_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.persons(id);


--
-- Name: medical_records medical_records_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT medical_records_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.persons(id);


--
-- Name: medical_records medical_records_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT medical_records_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.persons(id);


--
-- Name: medications medications_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medications
    ADD CONSTRAINT medications_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.persons(id);


--
-- Name: offices offices_country_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offices
    ADD CONSTRAINT offices_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.countries(id);


--
-- Name: offices offices_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offices
    ADD CONSTRAINT offices_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.persons(id);


--
-- Name: offices offices_state_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offices
    ADD CONSTRAINT offices_state_id_fkey FOREIGN KEY (state_id) REFERENCES public.states(id);


--
-- Name: person_documents person_documents_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_documents
    ADD CONSTRAINT person_documents_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: person_documents person_documents_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_documents
    ADD CONSTRAINT person_documents_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.persons(id) ON DELETE CASCADE;


--
-- Name: persons persons_address_country_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_address_country_id_fkey FOREIGN KEY (address_country_id) REFERENCES public.countries(id);


--
-- Name: persons persons_address_state_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_address_state_id_fkey FOREIGN KEY (address_state_id) REFERENCES public.states(id);


--
-- Name: persons persons_birth_country_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_birth_country_id_fkey FOREIGN KEY (birth_country_id) REFERENCES public.countries(id);


--
-- Name: persons persons_birth_state_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_birth_state_id_fkey FOREIGN KEY (birth_state_id) REFERENCES public.states(id);


--
-- Name: persons persons_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.persons(id);


--
-- Name: persons persons_emergency_contact_relationship_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_emergency_contact_relationship_fkey FOREIGN KEY (emergency_contact_relationship) REFERENCES public.emergency_relationships(code);


--
-- Name: persons persons_specialty_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_specialty_id_fkey FOREIGN KEY (specialty_id) REFERENCES public.medical_specialties(id);


--
-- Name: privacy_consents privacy_consents_notice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.privacy_consents
    ADD CONSTRAINT privacy_consents_notice_id_fkey FOREIGN KEY (notice_id) REFERENCES public.privacy_notices(id);


--
-- Name: privacy_consents privacy_consents_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.privacy_consents
    ADD CONSTRAINT privacy_consents_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.persons(id) ON DELETE CASCADE;


--
-- Name: schedule_templates schedule_templates_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_templates
    ADD CONSTRAINT schedule_templates_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.persons(id);


--
-- Name: schedule_templates schedule_templates_office_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_templates
    ADD CONSTRAINT schedule_templates_office_id_fkey FOREIGN KEY (office_id) REFERENCES public.offices(id);


--
-- Name: states states_country_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.states
    ADD CONSTRAINT states_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.countries(id);


--
-- Name: study_catalog study_catalog_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_catalog
    ADD CONSTRAINT study_catalog_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.study_categories(id);


--
-- PostgreSQL database dump complete
--

\unrestrict SslAbdavdWhgxWZ7lWCvXeO2ZcW3kqg16txpvzFso1YVahg0LYmqr5lzdpaIyxm

