#!/usr/bin/env python3
"""
Script para generar datos maestros médicos reales
- 1000 medicamentos comunes
- 500 diagnósticos CIE-10 con categorías
- 500 estudios clínicos con categorías
"""

import json

# ============================================================================
# MEDICAMENTOS - 1000 más comunes
# ============================================================================
medications = [
    # Analgésicos y Antipiréticos (150)
    {'name': 'Paracetamol', 'code': 'PAR001', 'generic': 'Acetaminofén', 'form': 'Tableta', 'strength': '500 mg'},
    {'name': 'Ibuprofeno', 'code': 'IBU001', 'generic': 'Ibuprofeno', 'form': 'Tableta', 'strength': '400 mg'},
    {'name': 'Naproxeno', 'code': 'NAP001', 'generic': 'Naproxeno', 'form': 'Tableta', 'strength': '250 mg'},
    # ... (continuará con más datos reales)
]

# Este script se expandirá con datos médicos reales completos

if __name__ == '__main__':
    print("Generando datos maestros...")
    print(f"Total medicamentos preparados: {len(medications)}")

