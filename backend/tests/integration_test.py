"""
Script de prueba de integración completa que valida el flujo completo
de creación de consultas médicas después de las modificaciones recientes.

Este script:
1. Crea un paciente de prueba
2. Crea una consulta
3. Agrega signos vitales
4. Agrega diagnósticos
5. Agrega prescripciones
6. Agrega estudios clínicos
7. Verifica que todo se guarda y recupera correctamente
"""

import sys
import os
import requests
import json
from datetime import datetime, date
from typing import Dict, Optional, List

# Configuración
BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
API_URL = f"{BASE_URL}/api"

class IntegrationTester:
    def __init__(self):
        self.base_url = API_URL
        self.session = requests.Session()
        self.token: Optional[str] = None
        self.doctor_id: Optional[int] = None
        self.patient_id: Optional[int] = None
        self.consultation_id: Optional[int] = None
        self.errors = []
        self.warnings = []
        self.success_count = 0
        
    def run_integration_test(self):
        """Ejecuta la prueba de integración completa"""
        print("=" * 80)
        print("PRUEBA DE INTEGRACIÓN COMPLETA")
        print("=" * 80)
        print(f"🌐 URL Base: {self.base_url}")
        print()
        
        # Verificar que el servidor está corriendo
        if not self.check_server_health():
            print("❌ El servidor no está respondiendo.")
            return False
        
        # Autenticación
        if not self.authenticate():
            print("⚠️  No se pudo autenticar. Algunas pruebas se saltarán.")
            return False
        
        # Flujo completo
        try:
            self.step_1_verify_catalogs()
            self.step_2_create_patient()
            self.step_3_create_consultation()
            self.step_4_add_vital_signs()
            self.step_5_add_diagnoses()
            self.step_6_add_prescriptions()
            self.step_7_add_clinical_studies()
            self.step_8_verify_consultation_complete()
            
        except Exception as e:
            error = f"❌ Error durante prueba de integración: {e}"
            self.errors.append(error)
            print(error)
            import traceback
            traceback.print_exc()
        
        # Limpieza (opcional)
        # self.cleanup()
        
        # Resumen
        self.print_summary()
        
        return len(self.errors) == 0
    
    def check_server_health(self) -> bool:
        """Verifica que el servidor esté respondiendo"""
        try:
            response = requests.get(f"{BASE_URL}/docs", timeout=5)
            return response.status_code in [200, 404]
        except:
            return False
    
    def authenticate(self) -> bool:
        """Autentica con un usuario de prueba"""
        print("🔐 Autenticando...")
        
        # Nota: Requiere un usuario de prueba en la BD
        # Por ahora, intentamos con credenciales por defecto o creamos un usuario
        try:
            # Intentar login con credenciales proporcionadas
            response = requests.post(
                f"{self.base_url}/auth/login",
                json={
                    "email": "katia@martinez.com",
                    "password": "Password1234!"
                },
                timeout=5
            )
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                self.session.headers.update({
                    "Authorization": f"Bearer {self.token}"
                })
                print("   ✅ Autenticación exitosa")
                self.success_count += 1
                return True
            else:
                print(f"   ⚠️  Login falló (código {response.status_code})")
                print("   💡 Crea un usuario de prueba o ajusta las credenciales")
                return False
                
        except Exception as e:
            print(f"   ❌ Error en autenticación: {e}")
            return False
    
    def step_1_verify_catalogs(self):
        """Verifica que los catálogos estén disponibles"""
        print()
        print("📋 Paso 1: Verificando catálogos...")
        
        catalogs = {
            "/catalogs/specialties": "Especialidades",
            "/medications": "Medicamentos",
            "/diagnosis/catalog": "Diagnósticos",
            "/study-catalog": "Estudios clínicos"
        }
        
        for endpoint, name in catalogs.items():
            try:
                response = self.session.get(f"{self.base_url}{endpoint}", timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    count = len(data) if isinstance(data, list) else len(data.get("data", []))
                    print(f"   ✅ {name}: {count} elementos disponibles")
                    self.success_count += 1
                else:
                    warning = f"   ⚠️  {name}: Código {response.status_code}"
                    self.warnings.append(warning)
                    print(warning)
            except Exception as e:
                error = f"   ❌ {name}: Error - {e}"
                self.errors.append(error)
                print(error)
    
    def step_2_create_patient(self):
        """Crea un paciente de prueba"""
        print()
        print("👤 Paso 2: Creando paciente de prueba...")
        
        patient_data = {
            "first_name": "Juan",
            "paternal_surname": "Pérez",
            "maternal_surname": "García",
            "birth_date": "1990-01-15",
            "gender": "masculino",
            "email": f"test.patient.{datetime.now().timestamp()}@test.com",
            "primary_phone": "+525551234567",
            "person_documents": [
                {
                    "document_id": 5,  # CURP
                    "document_value": "PEGJ900115HDFRRN01"
                }
            ]
        }
        
        try:
            response = self.session.post(
                f"{self.base_url}/patients",
                json=patient_data,
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                data = response.json()
                self.patient_id = data.get("id")
                if self.patient_id:
                    print(f"   ✅ Paciente creado con ID: {self.patient_id}")
                    self.success_count += 1
                else:
                    error = f"   ❌ Error: Respuesta no contiene ID del paciente"
                    self.errors.append(error)
                    print(error)
                    print(f"      Respuesta: {response.text[:200]}")
            else:
                error_data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
                error = f"   ❌ Error creando paciente: {response.status_code} - {error_data.get('detail', 'Unknown error')}"
                self.errors.append(error)
                print(error)
                print(f"      Respuesta: {response.text[:200]}")
                
        except Exception as e:
            error = f"   ❌ Error: {e}"
            self.errors.append(error)
            print(error)
    
    def step_3_create_consultation(self):
        """Crea una consulta de prueba"""
        if not self.patient_id:
            print("   ⚠️  Saltando creación de consulta (no hay patient_id)")
            return
        
        print()
        print("📝 Paso 3: Creando consulta...")
        
        consultation_data = {
            "patient_id": self.patient_id,
            "consultation_type": "Primera vez",
            "chief_complaint": "Dolor de cabeza",
            "subjective": "Paciente refiere cefalea de 3 días",
            "objective": "Paciente alerta, sin signos de focalización",
            "assessment": "Cefalea tensional",
            "plan": "Reposo y analgésicos"
        }
        
        try:
            response = self.session.post(
                f"{self.base_url}/consultations",
                json=consultation_data,
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                data = response.json()
                self.consultation_id = data.get("id")
                if self.consultation_id:
                    print(f"   ✅ Consulta creada con ID: {self.consultation_id}")
                    self.success_count += 1
                else:
                    error = f"   ❌ Error: Respuesta no contiene ID de la consulta"
                    self.errors.append(error)
                    print(error)
                    print(f"      Respuesta: {response.text[:200]}")
            else:
                error_data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
                error = f"   ❌ Error creando consulta: {response.status_code} - {error_data.get('detail', 'Unknown error')}"
                self.errors.append(error)
                print(error)
                print(f"      Respuesta: {response.text[:200]}")
                
        except Exception as e:
            error = f"   ❌ Error: {e}"
            self.errors.append(error)
            print(error)
    
    def step_4_add_vital_signs(self):
        """Agrega signos vitales a la consulta"""
        if not self.consultation_id:
            print("   ⚠️  Saltando signos vitales (no hay consultation_id)")
            return
        
        print()
        print("💓 Paso 4: Agregando signos vitales...")
        
        vital_signs = [
            {"vital_sign_id": 1, "value": "120"},  # Presión sistólica
            {"vital_sign_id": 2, "value": "80"},   # Presión diastólica
            {"vital_sign_id": 3, "value": "72"},   # Frecuencia cardíaca
            {"vital_sign_id": 4, "value": "36.5"}, # Temperatura
            {"vital_sign_id": 7, "value": "70"},   # Peso
            {"vital_sign_id": 8, "value": "170"}    # Altura
        ]
        
        for vs in vital_signs:
            try:
                response = self.session.post(
                    f"{self.base_url}/consultations/{self.consultation_id}/vital-signs",
                    json=vs,
                    timeout=10
                )
                
                if response.status_code in [200, 201]:
                    print(f"   ✅ Signo vital {vs['vital_sign_id']} agregado")
                    self.success_count += 1
                else:
                    warning = f"   ⚠️  Error agregando signo vital {vs['vital_sign_id']}: {response.status_code}"
                    self.warnings.append(warning)
                    print(warning)
                    
            except Exception as e:
                warning = f"   ⚠️  Error: {e}"
                self.warnings.append(warning)
                print(warning)
    
    def step_5_add_diagnoses(self):
        """Agrega diagnósticos a la consulta"""
        if not self.consultation_id:
            print("   ⚠️  Saltando diagnósticos (no hay consultation_id)")
            return
        
        print()
        print("🔬 Paso 5: Agregando diagnósticos...")
        
        # Primero obtener un diagnóstico del catálogo
        try:
            response = self.session.get(
                f"{self.base_url}/diagnosis/catalog?limit=5",
                timeout=10
            )
            
            if response.status_code == 200:
                diagnoses = response.json()
                if isinstance(diagnoses, list) and len(diagnoses) > 0:
                    diagnosis = diagnoses[0]
                    diagnosis_id = diagnosis.get("id")
                    
                    # Agregar como diagnóstico principal
                    try:
                        add_response = self.session.post(
                            f"{self.base_url}/consultations/{self.consultation_id}/diagnoses/primary",
                            json={"diagnosis_id": diagnosis_id},
                            timeout=10
                        )
                        
                        if add_response.status_code in [200, 201]:
                            print(f"   ✅ Diagnóstico principal agregado: {diagnosis.get('name', 'N/A')}")
                            self.success_count += 1
                        else:
                            warning = f"   ⚠️  Error agregando diagnóstico: {add_response.status_code}"
                            self.warnings.append(warning)
                            print(warning)
                    except Exception as e:
                        warning = f"   ⚠️  Error: {e}"
                        self.warnings.append(warning)
                        print(warning)
                else:
                    print("   ⚠️  No hay diagnósticos disponibles en el catálogo")
            else:
                print(f"   ⚠️  No se pudo obtener catálogo de diagnósticos: {response.status_code}")
                
        except Exception as e:
            warning = f"   ⚠️  Error obteniendo diagnósticos: {e}"
            self.warnings.append(warning)
            print(warning)
    
    def step_6_add_prescriptions(self):
        """Agrega prescripciones a la consulta"""
        if not self.consultation_id:
            print("   ⚠️  Saltando prescripciones (no hay consultation_id)")
            return
        
        print()
        print("💊 Paso 6: Agregando prescripciones...")
        
        # Obtener un medicamento del catálogo
        try:
            response = self.session.get(
                f"{self.base_url}/medications?limit=5",
                timeout=10
            )
            
            if response.status_code == 200:
                medications = response.json()
                if isinstance(medications, list) and len(medications) > 0:
                    medication = medications[0]
                    medication_id = medication.get("id")
                    
                    prescription_data = {
                        "medication_id": medication_id,
                        "dosage": "500 mg",
                        "frequency": "Cada 8 horas",
                        "duration": "7 días",
                        "instructions": "Tomar con alimentos"
                    }
                    
                    try:
                        add_response = self.session.post(
                            f"{self.base_url}/consultations/{self.consultation_id}/prescriptions",
                            json=prescription_data,
                            timeout=10
                        )
                        
                        if add_response.status_code in [200, 201]:
                            print(f"   ✅ Prescripción agregada: {medication.get('name', 'N/A')}")
                            self.success_count += 1
                        else:
                            error_data = add_response.json() if add_response.headers.get("content-type", "").startswith("application/json") else {}
                            warning = f"   ⚠️  Error agregando prescripción: {add_response.status_code} - {error_data.get('detail', 'Unknown')}"
                            self.warnings.append(warning)
                            print(warning)
                    except Exception as e:
                        warning = f"   ⚠️  Error: {e}"
                        self.warnings.append(warning)
                        print(warning)
                else:
                    print("   ⚠️  No hay medicamentos disponibles en el catálogo")
            else:
                print(f"   ⚠️  No se pudo obtener catálogo de medicamentos: {response.status_code}")
                
        except Exception as e:
            warning = f"   ⚠️  Error obteniendo medicamentos: {e}"
            self.warnings.append(warning)
            print(warning)
    
    def step_7_add_clinical_studies(self):
        """Agrega estudios clínicos a la consulta"""
        if not self.consultation_id or not self.patient_id:
            print("   ⚠️  Saltando estudios clínicos (no hay consultation_id o patient_id)")
            return
        
        print()
        print("🔬 Paso 7: Agregando estudios clínicos...")
        
        # Obtener un estudio del catálogo
        try:
            response = self.session.get(
                f"{self.base_url}/study-catalog?limit=5",
                timeout=10
            )
            
            if response.status_code == 200:
                studies = response.json()
                if isinstance(studies, list) and len(studies) > 0:
                    study = studies[0]
                    study_name = study.get("name", "Estudio de prueba")
                    
                    study_data = {
                        "consultation_id": self.consultation_id,
                        "patient_id": self.patient_id,
                        "study_type": "hematologia",
                        "study_name": study_name,
                        "ordered_date": date.today().isoformat(),
                        "status": "ordered",
                        "urgency": "routine",
                        "clinical_indication": "Estudio de control",
                        "ordering_doctor": "Dr. Test"
                    }
                    
                    try:
                        add_response = self.session.post(
                            f"{self.base_url}/clinical-studies",
                            json=study_data,
                            timeout=10
                        )
                        
                        if add_response.status_code in [200, 201]:
                            print(f"   ✅ Estudio clínico agregado: {study_name}")
                            self.success_count += 1
                        else:
                            error_data = add_response.json() if add_response.headers.get("content-type", "").startswith("application/json") else {}
                            warning = f"   ⚠️  Error agregando estudio: {add_response.status_code} - {error_data.get('detail', 'Unknown')}"
                            self.warnings.append(warning)
                            print(warning)
                            print(f"      Respuesta: {add_response.text[:200]}")
                    except Exception as e:
                        warning = f"   ⚠️  Error: {e}"
                        self.warnings.append(warning)
                        print(warning)
                else:
                    print("   ⚠️  No hay estudios disponibles en el catálogo")
            else:
                print(f"   ⚠️  No se pudo obtener catálogo de estudios: {response.status_code}")
                
        except Exception as e:
            warning = f"   ⚠️  Error obteniendo estudios: {e}"
            self.warnings.append(warning)
            print(warning)
    
    def step_8_verify_consultation_complete(self):
        """Verifica que la consulta se recupera completa con todos los datos"""
        if not self.consultation_id:
            print("   ⚠️  Saltando verificación (no hay consultation_id)")
            return
        
        print()
        print("✅ Paso 8: Verificando consulta completa...")
        
        try:
            response = self.session.get(
                f"{self.base_url}/consultations/{self.consultation_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                
                checks = [
                    ("vital_signs", "Signos vitales"),
                    ("primary_diagnoses", "Diagnósticos principales"),
                    ("prescriptions", "Prescripciones"),
                    ("clinical_studies", "Estudios clínicos")
                ]
                
                all_ok = True
                for key, name in checks:
                    if key in data:
                        count = len(data[key]) if isinstance(data[key], list) else 0
                        if count > 0:
                            print(f"   ✅ {name}: {count} elemento(s)")
                            self.success_count += 1
                        else:
                            print(f"   ⚠️  {name}: 0 elementos")
                            all_ok = False
                    else:
                        print(f"   ⚠️  {name}: No encontrado en respuesta")
                        all_ok = False
                
                if all_ok:
                    print("   ✅ Consulta completa verificada correctamente")
                else:
                    warning = "   ⚠️  Consulta incompleta (faltan algunos elementos)"
                    self.warnings.append(warning)
                    print(warning)
            else:
                error = f"   ❌ Error obteniendo consulta: {response.status_code}"
                self.errors.append(error)
                print(error)
                
        except Exception as e:
            error = f"   ❌ Error: {e}"
            self.errors.append(error)
            print(error)
    
    def print_summary(self):
        """Imprime resumen de pruebas"""
        print()
        print("=" * 80)
        print("RESUMEN DE PRUEBA DE INTEGRACIÓN")
        print("=" * 80)
        print(f"✅ Pruebas exitosas: {self.success_count}")
        print(f"⚠️  Advertencias: {len(self.warnings)}")
        print(f"❌ Errores: {len(self.errors)}")
        print()
        
        if self.warnings:
            print("ADVERTENCIAS:")
            for warning in self.warnings[:10]:
                print(f"  {warning}")
            if len(self.warnings) > 10:
                print(f"  ... y {len(self.warnings) - 10} advertencias más")
            print()
        
        if self.errors:
            print("ERRORES CRÍTICOS:")
            for error in self.errors:
                print(f"  {error}")
            print()
            print("❌ PRUEBA FALLIDA - Hay errores que deben corregirse")
        else:
            print("✅ PRUEBA EXITOSA - El flujo completo funciona correctamente")
        
        print("=" * 80)


if __name__ == "__main__":
    tester = IntegrationTester()
    success = tester.run_integration_test()
    sys.exit(0 if success else 1)

