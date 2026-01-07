#!/usr/bin/env python3
"""
Script para diagnosticar por qué el bot no está siendo usado
"""
import os
import sys

# Agregar el directorio backend al path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from config import settings
    import vertexai
    from logger import get_logger
    
    logger = get_logger("bot_diagnostic")
    
    def check_bot_status():
        print("=" * 60)
        print("🔍 DIAGNÓSTICO DEL BOT DE WHATSAPP")
        print("=" * 60)
        print()
        
        issues = []
        warnings = []
        
        # 1. Verificar si está habilitado
        print("1️⃣ Verificando si el bot está habilitado...")
        if not settings.GEMINI_BOT_ENABLED:
            print("   ❌ Bot está DESHABILITADO")
            print("      Solución: GEMINI_BOT_ENABLED=true en .env")
            issues.append("Bot deshabilitado")
        else:
            print("   ✅ Bot está habilitado")
        print()
        
        # 2. Verificar credenciales de GCP
        print("2️⃣ Verificando credenciales de Google Cloud...")
        if not settings.GCP_PROJECT_ID:
            print("   ❌ GCP_PROJECT_ID no configurado")
            issues.append("GCP_PROJECT_ID faltante")
        else:
            print(f"   ✅ GCP_PROJECT_ID: {settings.GCP_PROJECT_ID}")
        
        if not settings.GCP_REGION:
            print("   ⚠️  GCP_REGION no configurado (usando default)")
            warnings.append("GCP_REGION no configurado")
        else:
            print(f"   ✅ GCP_REGION: {settings.GCP_REGION}")
        print()
        
        # 3. Verificar Vertex AI
        print("3️⃣ Verificando conexión con Vertex AI...")
        try:
            vertexai.init(
                project=settings.GCP_PROJECT_ID,
                location=settings.GCP_REGION
            )
            print("   ✅ Vertex AI configurado correctamente")
        except Exception as e:
            print(f"   ❌ Error en Vertex AI: {e}")
            issues.append(f"Error Vertex AI: {str(e)}")
        print()
        
        # 4. Verificar modelo
        print("4️⃣ Verificando modelo configurado...")
        print(f"   📋 Modelo: {settings.GEMINI_MODEL}")
        print()
        
        # 5. Verificar configuración de WhatsApp
        print("5️⃣ Verificando configuración de WhatsApp...")
        whatsapp_token = os.getenv("META_WHATSAPP_TOKEN", "")
        whatsapp_phone_id = os.getenv("META_WHATSAPP_PHONE_ID", "")
        
        if not whatsapp_token:
            print("   ⚠️  META_WHATSAPP_TOKEN no configurado")
            warnings.append("Token de WhatsApp faltante")
        else:
            print("   ✅ Token de WhatsApp configurado")
        
        if not whatsapp_phone_id:
            print("   ⚠️  META_WHATSAPP_PHONE_ID no configurado")
            warnings.append("Phone ID de WhatsApp faltante")
        else:
            print(f"   ✅ Phone ID: {whatsapp_phone_id}")
        print()
        
        # Resumen
        print("=" * 60)
        print("📊 RESUMEN")
        print("=" * 60)
        
        if not issues and not warnings:
            print("✅ Todo está configurado correctamente")
            print()
            print("💡 Si el bot no se está usando, puede ser:")
            print("   - Los usuarios no saben que existe")
            print("   - Falta promoción en la UI")
            print("   - Problemas con el webhook de WhatsApp")
            print("   - Los usuarios prefieren otros métodos")
            print()
            print("📝 Revisa el documento: docs/DIAGNOSTICO_BOT_NO_USADO.md")
        else:
            if issues:
                print("❌ PROBLEMAS ENCONTRADOS:")
                for issue in issues:
                    print(f"   - {issue}")
                print()
            
            if warnings:
                print("⚠️  ADVERTENCIAS:")
                for warning in warnings:
                    print(f"   - {warning}")
                print()
            
            print("🔧 SOLUCIONES:")
            if "Bot deshabilitado" in issues:
                print("   1. Agregar GEMINI_BOT_ENABLED=true en .env")
            if "GCP_PROJECT_ID faltante" in issues:
                print("   2. Configurar GCP_PROJECT_ID en .env")
            if any("Vertex AI" in i for i in issues):
                print("   3. Verificar credenciales de GCP")
                print("   4. Verificar que Vertex AI API esté habilitada")
        
        print()
        print("=" * 60)
        
        return len(issues) == 0
    
    if __name__ == "__main__":
        try:
            is_ok = check_bot_status()
            sys.exit(0 if is_ok else 1)
        except Exception as e:
            print(f"❌ Error ejecutando diagnóstico: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)

except ImportError as e:
    print(f"❌ Error importando módulos: {e}")
    print("   Asegúrate de ejecutar desde el directorio backend/")
    print("   o tener las dependencias instaladas")
    sys.exit(1)

