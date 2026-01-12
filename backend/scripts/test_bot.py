#!/usr/bin/env python3
"""
Script para probar el Appointment Agent localmente
"""
import sys
import os
import asyncio
from pathlib import Path

# Agregar el directorio backend al path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from database import SessionLocal
from agents.appointment_agent import AppointmentAgent
from config import settings


async def test_bot_interactive():
    """Prueba interactiva del bot con modo conversación"""
    print("=" * 60)
    print("🤖 PRUEBA DEL APPOINTMENT AGENT")
    print("=" * 60)
    print()
    
    # Verificar configuración
    if not settings.GCP_PROJECT_ID:
        print("❌ GCP_PROJECT_ID no configurado")
        print("   Configura GCP_PROJECT_ID en .env o variables de entorno")
        return
    
    if not settings.GEMINI_BOT_ENABLED:
        print("⚠️  GEMINI_BOT_ENABLED está deshabilitado")
        print("   El bot no procesará mensajes")
        return
    
    print(f"✅ Configuración:")
    print(f"   - GCP Project: {settings.GCP_PROJECT_ID}")
    print(f"   - Model: {settings.GEMINI_MODEL}")
    print(f"   - Bot habilitado: {settings.GEMINI_BOT_ENABLED}")
    print()
    
    # Crear sesión de base de datos
    db = SessionLocal()
    
    try:
        # Inicializar agente
        print("🔄 Inicializando agente...")
        agent = AppointmentAgent(db)
        print("✅ Agente inicializado correctamente")
        print()
        
        # Número de teléfono de prueba
        test_phone = "+521234567890"
        
        # Preguntar modo
        print("Modos disponibles:")
        print("  1. Ejecutar casos de prueba predefinidos")
        print("  2. Modo conversación interactiva (escribe mensajes)")
        print()
        mode = input("Selecciona modo (1 o 2, default: 1): ").strip() or "1"
        
        if mode == "2":
            # Modo conversación interactiva
            print("\n" + "=" * 60)
            print("💬 MODO CONVERSACIÓN INTERACTIVA")
            print("=" * 60)
            print("Escribe mensajes para probar el agente.")
            print("Comandos: 'exit' o 'quit' para salir, 'reset' para limpiar sesión")
            print("-" * 60)
            
            while True:
                try:
                    message = input("\n👤 Tú: ").strip()
                    
                    if not message:
                        continue
                    
                    if message.lower() in ['exit', 'quit', 'salir']:
                        print("👋 ¡Hasta luego!")
                        break
                    
                    if message.lower() == 'reset':
                        agent.session_state.reset_session(test_phone)
                        print("🔄 Sesión reseteada")
                        continue
                    
                    print("🤖 Bot: ", end="", flush=True)
                    response = await agent.process_message(test_phone, message)
                    print(response)
                    
                except KeyboardInterrupt:
                    print("\n👋 ¡Hasta luego!")
                    break
                except Exception as e:
                    print(f"❌ Error: {e}")
                    import traceback
                    traceback.print_exc()
        else:
            # Modo casos de prueba predefinidos
            test_cases = [
                "Hola",
                "Quiero agendar una cita",
                "¿Qué doctores hay disponibles?",
                "cancelar"
            ]
            
            print("📝 Ejecutando casos de prueba...")
            print("-" * 60)
            
            for i, message in enumerate(test_cases, 1):
                print(f"\n{i}. Usuario: {message}")
                print("-" * 60)
                
                try:
                    response = await agent.process_message(test_phone, message)
                    print(f"   Bot: {response[:200]}..." if len(response) > 200 else f"   Bot: {response}")
                except Exception as e:
                    print(f"   ❌ Error: {e}")
                    import traceback
                    traceback.print_exc()
            
            print()
            print("-" * 60)
            print("✅ Pruebas completadas")
        
        print()
        print("💡 Para probar con WhatsApp real:")
        print("   1. Asegúrate de que el webhook esté configurado")
        print("   2. Envía un mensaje a tu número de WhatsApp Business")
        print("   3. Revisa los logs en Cloud Logging")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


async def test_single_message(phone: str, message: str):
    """Prueba un mensaje específico"""
    db = SessionLocal()
    try:
        agent = AppointmentAgent(db)
        response = await agent.process_message(phone, message)
        print(f"Usuario: {message}")
        print(f"Bot: {response}")
        return response
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Modo: probar mensaje específico
        phone = sys.argv[1] if len(sys.argv) > 1 else "+521234567890"
        message = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else "Hola"
        asyncio.run(test_single_message(phone, message))
    else:
        # Modo interactivo
        asyncio.run(test_bot_interactive())

