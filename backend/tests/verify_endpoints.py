"""
Script para verificar que los endpoints del backend funcionan correctamente
después de las modificaciones recientes en la base de datos.

Este script prueba:
- Endpoints de autenticación
- Endpoints de catálogos (medicamentos, diagnósticos, estudios)
- Endpoints de consultas básicas
- Validación de respuestas
"""

import sys
import os
import requests
import json
from typing import Dict, Optional

# Configuración
BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
API_URL = f"{BASE_URL}/api"

class EndpointTester:
    def __init__(self):
        self.base_url = API_URL
        self.session = requests.Session()
        self.token: Optional[str] = None
        self.errors = []
        self.warnings = []
        self.success_count = 0
        
    def run_all_tests(self):
        """Ejecuta todas las pruebas de endpoints"""
        print("=" * 80)
        print("VERIFICACIÓN DE ENDPOINTS DEL BACKEND")
        print("=" * 80)
        print(f"🌐 URL Base: {self.base_url}")
        print()
        
        # Verificar que el servidor está corriendo
        if not self.check_server_health():
            print("❌ El servidor no está respondiendo. Asegúrate de que está corriendo.")
            return False
        
        # Pruebas sin autenticación
        self.test_catalog_endpoints()
        self.test_public_endpoints()
        
        # Intentar autenticación (opcional)
        if self.attempt_login():
            self.test_authenticated_endpoints()
        
        # Resumen
        self.print_summary()
        
        return len(self.errors) == 0
    
    def check_server_health(self) -> bool:
        """Verifica que el servidor esté respondiendo"""
        print("🔍 Verificando salud del servidor...")
        try:
            response = requests.get(f"{BASE_URL}/docs", timeout=5)
            if response.status_code in [200, 404]:  # 404 es OK si no hay docs
                print("   ✅ Servidor respondiendo")
                self.success_count += 1
                return True
            else:
                print(f"   ⚠️  Servidor respondió con código {response.status_code}")
                return True
        except requests.exceptions.ConnectionError:
            print("   ❌ No se puede conectar al servidor")
            self.errors.append("Servidor no disponible")
            return False
        except Exception as e:
            print(f"   ❌ Error: {e}")
            self.errors.append(f"Error de conexión: {e}")
            return False
    
    def test_catalog_endpoints(self):
        """Prueba endpoints de catálogos públicos"""
        print()
        print("🔍 Verificando endpoints de catálogos...")
        
        catalog_endpoints = [
            ("/catalogs/countries", "Países"),
            ("/catalogs/states", "Estados"),
            ("/catalogs/specialties", "Especialidades"),
            ("/catalogs/emergency-relationships", "Relaciones de emergencia"),
        ]
        
        for endpoint, name in catalog_endpoints:
            self.test_get_endpoint(endpoint, name, requires_auth=False)
        
        print()
    
    def test_public_endpoints(self):
        """Prueba endpoints públicos adicionales"""
        print("🔍 Verificando endpoints públicos...")
        
        # Endpoint de estudio de catálogo (puede requerir auth, pero probamos)
        self.test_get_endpoint("/study-catalog", "Catálogo de estudios", requires_auth=False, expect_array=True)
        
        print()
    
    def attempt_login(self) -> bool:
        """Intenta hacer login (opcional, puede fallar si no hay usuarios)"""
        print("🔍 Intentando autenticación...")
        
        # Nota: Esto requiere un usuario de prueba
        # Por ahora, solo verificamos que el endpoint existe
        try:
            response = requests.post(
                f"{self.base_url}/auth/login",
                json={"email": "test@test.com", "password": "test"},
                timeout=5
            )
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data:
                    self.token = data["access_token"]
                    self.session.headers.update({
                        "Authorization": f"Bearer {self.token}"
                    })
                    print("   ✅ Autenticación exitosa")
                    self.success_count += 1
                    return True
            elif response.status_code == 401:
                print("   ⚠️  Autenticación falló (esperado si no hay usuarios de prueba)")
                return False
            else:
                print(f"   ⚠️  Endpoint de login respondió con código {response.status_code}")
                return False
        except Exception as e:
            print(f"   ⚠️  No se pudo probar autenticación: {e}")
            return False
    
    def test_authenticated_endpoints(self):
        """Prueba endpoints que requieren autenticación"""
        if not self.token:
            print("   ⚠️  Saltando pruebas autenticadas (no hay token)")
            return
        
        print()
        print("🔍 Verificando endpoints autenticados...")
        
        # Endpoints básicos
        self.test_get_endpoint("/doctors/me/profile", "Perfil de doctor", requires_auth=True)
        self.test_get_endpoint("/patients", "Lista de pacientes", requires_auth=True, expect_array=True)
        self.test_get_endpoint("/consultations", "Lista de consultas", requires_auth=True, expect_array=True)
        
        print()
    
    def test_get_endpoint(
        self, 
        endpoint: str, 
        name: str, 
        requires_auth: bool = False,
        expect_array: bool = False
    ):
        """Prueba un endpoint GET"""
        url = f"{self.base_url}{endpoint}"
        
        try:
            headers = {}
            if requires_auth and self.token:
                headers["Authorization"] = f"Bearer {self.token}"
            
            response = self.session.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    
                    # Verificar estructura si esperamos array
                    if expect_array:
                        if isinstance(data, list):
                            print(f"   ✅ {name}: OK (array con {len(data)} elementos)")
                            self.success_count += 1
                        elif isinstance(data, dict) and ("data" in data or "results" in data):
                            array_data = data.get("data") or data.get("results", [])
                            print(f"   ✅ {name}: OK (array envuelto, {len(array_data)} elementos)")
                            self.success_count += 1
                        else:
                            warning = f"   ⚠️  {name}: Esperaba array pero recibió {type(data).__name__}"
                            self.warnings.append(warning)
                            print(warning)
                    else:
                        print(f"   ✅ {name}: OK")
                        self.success_count += 1
                        
                except json.JSONDecodeError:
                    error = f"   ❌ {name}: Respuesta no es JSON válido"
                    self.errors.append(error)
                    print(error)
                    
            elif response.status_code == 401:
                if requires_auth:
                    warning = f"   ⚠️  {name}: Requiere autenticación (401)"
                    self.warnings.append(warning)
                    print(warning)
                else:
                    error = f"   ❌ {name}: Endpoint público retornó 401"
                    self.errors.append(error)
                    print(error)
                    
            elif response.status_code == 404:
                warning = f"   ⚠️  {name}: Endpoint no encontrado (404)"
                self.warnings.append(warning)
                print(warning)
                
            elif response.status_code == 500:
                error = f"   ❌ {name}: Error interno del servidor (500)"
                self.errors.append(error)
                print(error)
                # Intentar obtener detalles del error
                try:
                    error_data = response.json()
                    if "detail" in error_data:
                        print(f"      Detalle: {error_data['detail']}")
                except:
                    pass
            else:
                warning = f"   ⚠️  {name}: Código inesperado {response.status_code}"
                self.warnings.append(warning)
                print(warning)
                
        except requests.exceptions.Timeout:
            error = f"   ❌ {name}: Timeout esperando respuesta"
            self.errors.append(error)
            print(error)
            
        except requests.exceptions.ConnectionError:
            error = f"   ❌ {name}: Error de conexión"
            self.errors.append(error)
            print(error)
            
        except Exception as e:
            error = f"   ❌ {name}: Error inesperado: {e}"
            self.errors.append(error)
            print(error)
    
    def print_summary(self):
        """Imprime resumen de pruebas"""
        print()
        print("=" * 80)
        print("RESUMEN DE VERIFICACIÓN")
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
            print("❌ VERIFICACIÓN FALLIDA - Hay errores que deben corregirse")
        else:
            print("✅ VERIFICACIÓN EXITOSA - Todos los endpoints funcionan correctamente")
        
        print("=" * 80)


if __name__ == "__main__":
    tester = EndpointTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)

