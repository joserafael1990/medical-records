#!/usr/bin/env python3
"""
Script para probar si el token de WhatsApp de Meta funciona correctamente
"""
import os
import sys
import requests
from typing import Dict, Any

def test_whatsapp_token() -> Dict[str, Any]:
    """
    Prueba el token de WhatsApp haciendo una petición a la API de Meta
    """
    phone_id = os.getenv('META_WHATSAPP_PHONE_ID')
    access_token = os.getenv('META_WHATSAPP_TOKEN')
    api_version = os.getenv('META_WHATSAPP_API_VERSION', 'v24.0')
    
    result = {
        'phone_id_configured': bool(phone_id),
        'token_configured': bool(access_token),
        'api_version': api_version,
        'test_passed': False,
        'error': None,
        'details': {}
    }
    
    # Verificar que las credenciales estén configuradas
    if not phone_id:
        result['error'] = 'META_WHATSAPP_PHONE_ID no está configurado'
        return result
    
    if not access_token:
        result['error'] = 'META_WHATSAPP_TOKEN no está configurado'
        return result
    
    # Intentar obtener información del número de teléfono
    base_url = f'https://graph.facebook.com/{api_version}'
    url = f'{base_url}/{phone_id}'
    
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    
    try:
        print(f"🔍 Probando token de WhatsApp...")
        print(f"   Phone ID: {phone_id[:10]}...{phone_id[-4:] if len(phone_id) > 14 else phone_id}")
        print(f"   API Version: {api_version}")
        print(f"   URL: {url}")
        print()
        
        response = requests.get(url, headers=headers, timeout=10)
        
        result['details']['status_code'] = response.status_code
        result['details']['response'] = response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text[:200]
        
        if response.status_code == 200:
            result['test_passed'] = True
            print("✅ Token válido - La conexión con WhatsApp funciona correctamente")
            print(f"   Respuesta: {response.json()}")
        elif response.status_code == 401:
            result['error'] = 'Token inválido o expirado (401 Unauthorized)'
            print("❌ Token inválido o expirado")
            print("   Necesitas renovar el token en: https://developers.facebook.com/")
            print(f"   Respuesta: {response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text[:200]}")
        elif response.status_code == 403:
            result['error'] = 'Permisos insuficientes (403 Forbidden)'
            print("❌ Permisos insuficientes")
            print("   Verifica que tu aplicación tenga permisos de WhatsApp Business API")
            print(f"   Respuesta: {response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text[:200]}")
        else:
            result['error'] = f'Error HTTP {response.status_code}'
            print(f"❌ Error HTTP {response.status_code}")
            print(f"   Respuesta: {response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text[:200]}")
            
    except requests.exceptions.Timeout:
        result['error'] = 'Timeout al conectar con la API de Meta'
        print("❌ Timeout - No se pudo conectar con la API de Meta")
    except requests.exceptions.ConnectionError:
        result['error'] = 'Error de conexión con la API de Meta'
        print("❌ Error de conexión - Verifica tu conexión a internet")
    except Exception as e:
        result['error'] = str(e)
        print(f"❌ Error inesperado: {e}")
    
    return result

if __name__ == '__main__':
    # Cargar variables de entorno desde .env si existe
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass
    
    result = test_whatsapp_token()
    
    print()
    print("=" * 60)
    print("RESUMEN:")
    print("=" * 60)
    print(f"Phone ID configurado: {'✅' if result['phone_id_configured'] else '❌'}")
    print(f"Token configurado: {'✅' if result['token_configured'] else '❌'}")
    print(f"Prueba exitosa: {'✅' if result['test_passed'] else '❌'}")
    if result['error']:
        print(f"Error: {result['error']}")
    
    sys.exit(0 if result['test_passed'] else 1)


