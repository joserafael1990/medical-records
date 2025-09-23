#!/usr/bin/env python3
"""
Script de arranque directo del servidor FastAPI
"""
import uvicorn
from main_clean_english import app

if __name__ == "__main__":
    print("🚀 Arrancando servidor FastAPI...")
    print("📋 Configuración:")
    print("   - Host: 0.0.0.0")
    print("   - Puerto: 8000")
    print("   - Reload: True")
    print("   - Workers: 1")
    
    uvicorn.run(
        "main_clean_english:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        workers=1,
        log_level="info"
    )