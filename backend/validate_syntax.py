#!/usr/bin/env python3
"""
Script para validar la sintaxis de todos los archivos Python antes de iniciar el servidor
"""
import sys
import py_compile
import os
from pathlib import Path

def validate_python_file(file_path: Path) -> tuple[bool, str]:
    """Valida la sintaxis de un archivo Python"""
    try:
        py_compile.compile(str(file_path), doraise=True)
        return True, ""
    except py_compile.PyCompileError as e:
        return False, str(e)
    except Exception as e:
        return False, f"Error validating {file_path}: {e}"

def main():
    """Valida todos los archivos Python en el directorio"""
    backend_dir = Path(__file__).parent
    errors = []
    
    # Archivos Python principales a validar (en orden de importancia)
    critical_files = [
        "main_clean_english.py",
        "auth.py",
        "config.py",
        "database.py",
        "email_service.py",
        "appointment_service.py",
        "consultation_service.py",
        "crud.py",
    ]
    
    print("🔍 Validando archivos Python críticos...")
    
    # Validar archivos críticos primero
    for filename in critical_files:
        file_path = backend_dir / filename
        if file_path.exists():
            is_valid, error = validate_python_file(file_path)
            if not is_valid:
                errors.append(f"❌ {filename}: {error.split('(')[0].strip()}")
            else:
                print(f"  ✅ {filename}")
    
    # Validar otros archivos Python en el directorio
    print("\n🔍 Validando otros archivos Python...")
    other_files = []
    for py_file in backend_dir.rglob("*.py"):
        # Omitir venv, __pycache__, y archivos ya validados
        if any(skip in str(py_file) for skip in ["venv", "__pycache__", ".venv"]):
            continue
        if py_file.name in critical_files:
            continue
        other_files.append(py_file)
    
    for py_file in other_files:
        is_valid, error = validate_python_file(py_file)
        if not is_valid:
            relative_path = py_file.relative_to(backend_dir)
            error_msg = error.split('\n')[0] if '\n' in error else error
            errors.append(f"❌ {relative_path}: {error_msg}")
    
    if errors:
        print("\n⚠️ Errores de sintaxis encontrados:")
        for error in errors:
            print(f"  {error}")
        print("\n❌ Validación fallida. Corrige los errores antes de continuar.")
        sys.exit(1)
    else:
        print(f"\n✅ Todos los archivos Python tienen sintaxis válida ({len(critical_files)} críticos + {len(other_files)} otros)")
        sys.exit(0)

if __name__ == "__main__":
    main()

