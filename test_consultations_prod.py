#!/usr/bin/env python3
"""
Script para probar el endpoint de consultas en producción
"""
import requests
import json
import sys

# Configuración
PROD_API_URL = "https://api.cortexclinico.com"  # Ajusta si es diferente
ENDPOINT = "/api/consultations"

def test_consultations_endpoint(token=None):
    """Prueba el endpoint de consultas"""
    url = f"{PROD_API_URL}{ENDPOINT}"
    
    headers = {
        "Content-Type": "application/json"
    }
    
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    print(f"🔍 Probando: {url}")
    print(f"📋 Headers: {json.dumps(headers, indent=2)}")
    print("-" * 60)
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        
        print(f"✅ Status Code: {response.status_code}")
        print(f"📊 Response Headers: {dict(response.headers)}")
        print("-" * 60)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Éxito! Se encontraron {len(data)} consultas")
            if len(data) > 0:
                print(f"\n📋 Primera consulta:")
                print(json.dumps(data[0], indent=2, default=str))
            else:
                print("⚠️  La respuesta está vacía (no hay consultas o hay un problema)")
        elif response.status_code == 401:
            print("❌ Error de autenticación. Necesitas un token válido.")
            print("💡 Obtén un token desde el frontend (Network tab) o desde el login")
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"📄 Response: {response.text}")
            
        return response.status_code == 200 and len(response.json()) > 0
        
    except requests.exceptions.Timeout:
        print("❌ Timeout: El servidor no respondió en 30 segundos")
        return False
    except requests.exceptions.ConnectionError:
        print("❌ Error de conexión: No se pudo conectar al servidor")
        return False
    except Exception as e:
        print(f"❌ Error inesperado: {str(e)}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("🧪 Test de Endpoint de Consultas en Producción")
    print("=" * 60)
    print()
    
    # Si se pasa un token como argumento
    token = sys.argv[1] if len(sys.argv) > 1 else None
    
    if not token:
        print("💡 Uso: python test_consultations_prod.py <TOKEN>")
        print("💡 Obtén el token desde:")
        print("   1. Frontend: DevTools > Network > Headers > Authorization")
        print("   2. O haz login y copia el token de la respuesta")
        print()
        print("⚠️  Probando sin token (probablemente fallará por autenticación)...")
        print()
    
    success = test_consultations_endpoint(token)
    
    print()
    print("=" * 60)
    if success:
        print("✅ TEST PASADO: Las consultas se están devolviendo correctamente")
    else:
        print("❌ TEST FALLIDO: Hay un problema con el endpoint")
    print("=" * 60)






