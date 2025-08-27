#!/usr/bin/env python3
"""
Script de arranque directo del servidor FastAPI
"""
import uvicorn
from main import app

if __name__ == "__main__":
    print("🚀 Arrancando servidor FastAPI...")
    print("📋 Configuración:")
    print("   - Host: 127.0.0.1")
    print("   - Puerto: 8000")
    print("   - Reload: True")
    print("   - Workers: 1")
    
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        workers=1,
        log_level="info"
    )