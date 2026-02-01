"""
Script maestro que ejecuta todas las pruebas de verificación.
"""

import sys
import os
import subprocess

def run_script(script_name, description):
    """Ejecuta un script de prueba y retorna el resultado"""
    print("\n" + "=" * 80)
    print(f"EJECUTANDO: {description}")
    print("=" * 80)
    
    script_path = os.path.join(os.path.dirname(__file__), script_name)
    
    try:
        result = subprocess.run(
            [sys.executable, script_path],
            capture_output=False,
            text=True
        )
        return result.returncode == 0
    except Exception as e:
        print(f"❌ Error ejecutando {script_name}: {e}")
        return False

def main():
    print("=" * 80)
    print("SUITE DE PRUEBAS DE VERIFICACIÓN")
    print("=" * 80)
    print()
    print("Este script ejecutará todas las pruebas de verificación:")
    print("1. Verificación rápida de estructura de BD")
    print("2. Verificación de alineación de modelos SQLAlchemy")
    print("3. Verificación de endpoints del backend")
    print("4. Prueba de integración completa")
    print()
    
    results = {}
    
    # Ejecutar pruebas
    results['quick_check'] = run_script("quick_db_check.py", "Verificación Rápida de BD")
    results['models'] = run_script("verify_models_alignment.py", "Verificación de Modelos SQLAlchemy")
    results['endpoints'] = run_script("verify_endpoints.py", "Verificación de Endpoints")
    results['integration'] = run_script("integration_test.py", "Prueba de Integración")
    
    # Resumen final
    print("\n" + "=" * 80)
    print("RESUMEN FINAL")
    print("=" * 80)
    
    for test_name, passed in results.items():
        status = "✅ PASÓ" if passed else "❌ FALLÓ"
        print(f"{test_name.upper()}: {status}")
    
    all_passed = all(results.values())
    
    print()
    if all_passed:
        print("✅ TODAS LAS PRUEBAS PASARON")
        return 0
    else:
        print("❌ ALGUNAS PRUEBAS FALLARON")
        return 1

if __name__ == "__main__":
    sys.exit(main())

