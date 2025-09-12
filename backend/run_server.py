#!/usr/bin/env python3
"""
Script para ejecutar el servidor de desarrollo de la API de Historias Clínicas
Ejecuta main_clean_english.py - versión limpia y actualizada
"""
import os
import sys

def main():
    """Función principal para ejecutar el servidor"""
    # Cambiar al directorio del script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    print("🚀 Iniciando servidor de Historias Clínicas...")
    print(f"📁 Directorio: {script_dir}")
    print("🌐 Servidor: http://localhost:8000")
    print("📚 Documentación: http://localhost:8000/docs")
    print("📝 Usando: main_clean_english.py (versión actualizada)")
    print("-" * 50)
    
    # Ejecutar uvicorn con main_clean_english.py
    exit_code = os.system("python -m uvicorn main_clean_english:app --reload --host 0.0.0.0 --port 8000")
    
    return exit_code

if __name__ == "__main__":
    sys.exit(main())