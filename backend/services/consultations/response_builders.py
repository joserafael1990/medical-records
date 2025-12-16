"""
Response building utilities for consultation service
"""
from typing import Dict, Any, List
from datetime import timedelta
from database import MedicalRecord

def build_consultation_response(
    consultation: MedicalRecord,
    decrypted_consultation: Dict[str, str],
    patient_name: str,
    doctor_name: str,
    vital_signs: List[Dict[str, Any]],
    prescriptions: List[Dict[str, Any]],
    clinical_studies: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Build consultation response object
    """
    consultation_date_iso = consultation.consultation_date.isoformat()
    consultation_end_time = consultation.consultation_date + timedelta(minutes=30)
    
    # Get doctor's office information
    doctor_office = None
    if consultation.doctor and hasattr(consultation.doctor, 'offices') and consultation.doctor.offices:
        # Get the first active PHYSICAL office
        active_offices = [
            o for o in consultation.doctor.offices 
            if getattr(o, 'is_active', True) and not getattr(o, 'is_virtual', False)
        ]
        if active_offices:
            office = active_offices[0]
            doctor_office = {
                "id": office.id,
                "name": office.name,
                "address": office.address,
                "phone": office.phone,
                "email": getattr(office, 'email', None)
            }
    
    # Get document folios (handle case where table might not exist)
    folios = {}
    try:
        if hasattr(consultation, 'document_folios'):
            # Use getattr with default to avoid lazy loading if table doesn't exist
            document_folios = getattr(consultation, 'document_folios', None)
            if document_folios:
                # Try to access, but catch if table doesn't exist
                try:
                    folios_list = list(document_folios) if document_folios else []
                    for folio in folios_list:
                        folios[folio.document_type] = {
                            "folio_number": folio.folio_number,
                            "formatted_folio": folio.formatted_folio
                        }
                except Exception:
                    # Table doesn't exist or other error - just use empty dict
                    folios = {}
    except Exception:
        # If document_folios table doesn't exist, just use empty dict
        folios = {}
    
    return {
        "id": consultation.id,
        "patient_id": consultation.patient_id,
        "consultation_date": consultation_date_iso,
        "end_time": consultation_end_time.isoformat(),
        "patient_document_id": consultation.patient_document_id,
        "patient_document_value": consultation.patient_document_value,
        "patient_document_name": consultation.patient_document.name if consultation.patient_document else None,
        "chief_complaint": decrypted_consultation.get("chief_complaint", ""),
        "history_present_illness": decrypted_consultation.get("history_present_illness", ""),
        "family_history": decrypted_consultation.get("family_history", ""),
        "perinatal_history": decrypted_consultation.get("perinatal_history", ""),
        "gynecological_and_obstetric_history": decrypted_consultation.get("gynecological_and_obstetric_history", ""),
        "personal_pathological_history": decrypted_consultation.get("personal_pathological_history", ""),
        "personal_non_pathological_history": decrypted_consultation.get("personal_non_pathological_history", ""),
        "physical_examination": decrypted_consultation.get("physical_examination", ""),
        "primary_diagnosis": decrypted_consultation.get("primary_diagnosis", ""),
        "secondary_diagnoses": decrypted_consultation.get("secondary_diagnoses", ""),
        "treatment_plan": decrypted_consultation.get("treatment_plan", ""),
        "follow_up_instructions": decrypted_consultation.get("follow_up_instructions", ""),
        "therapeutic_plan": decrypted_consultation.get("treatment_plan", ""),
        "laboratory_results": decrypted_consultation.get("laboratory_results", ""),
        "notes": decrypted_consultation.get("notes", ""),
        "patient_name": patient_name,
        "doctor_name": doctor_name,
        "doctor_office": doctor_office,
        "folios": folios,
        "vital_signs": vital_signs,
        "prescribed_medications": prescriptions,
        "clinical_studies": clinical_studies
    }


def build_create_consultation_response(
    medical_record: MedicalRecord,
    patient_name: str,
    doctor_name: str,
    digital_signature: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Build response for create consultation
    """
    consultation_end_time = medical_record.consultation_date + timedelta(minutes=30)
    
    return {
        "id": medical_record.id,
        "patient_id": medical_record.patient_id,
        "patient_document_id": medical_record.patient_document_id,
        "patient_document_value": medical_record.patient_document_value,
        "patient_document_name": medical_record.patient_document.name if medical_record.patient_document else None,
        "consultation_date": medical_record.consultation_date.isoformat(),
        "end_time": consultation_end_time.isoformat(),
        "chief_complaint": medical_record.chief_complaint,
        "history_present_illness": medical_record.history_present_illness,
        "family_history": medical_record.family_history,
        "perinatal_history": medical_record.perinatal_history,
        "gynecological_and_obstetric_history": medical_record.gynecological_and_obstetric_history,
        "personal_pathological_history": medical_record.personal_pathological_history,
        "personal_non_pathological_history": medical_record.personal_non_pathological_history,
        "physical_examination": medical_record.physical_examination,
        "primary_diagnosis": medical_record.primary_diagnosis,
        "secondary_diagnoses": medical_record.secondary_diagnoses,
        "treatment_plan": medical_record.treatment_plan,
        "follow_up_instructions": medical_record.follow_up_instructions,
        "therapeutic_plan": medical_record.treatment_plan,
        "laboratory_results": medical_record.laboratory_results,
        "imaging_studies": medical_record.laboratory_results,
        "notes": medical_record.notes,
        "interconsultations": medical_record.notes,
        "consultation_type": medical_record.consultation_type,
        "created_by": medical_record.created_by,
        "created_at": medical_record.created_at.isoformat(),
        "patient_name": patient_name,
        "doctor_name": doctor_name,
        "date": medical_record.consultation_date.isoformat(),
        "digital_signature": digital_signature,
        "security_features": {
            "encrypted": True,
            "digitally_signed": True,
            "signature_id": digital_signature["signatures"][0]["signature_id"],
            "signature_timestamp": digital_signature["last_signature_timestamp"]
        }
    }
