"""
Script para verificar que los modelos SQLAlchemy están alineados 
con la estructura actual de la base de datos PostgreSQL.

Este script compara:
- Tablas que existen en la BD vs modelos definidos
- Columnas de cada tabla vs atributos del modelo
- Tipos de datos
- Foreign keys y constraints
"""

import sys
import os

# Agregar el directorio backend al path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from sqlalchemy import inspect, text
from sqlalchemy.engine import create_engine
from database import Base, engine, DATABASE_URL
import database as db_module
from typing import Dict, List, Set, Tuple
import traceback

# Mapeo de tipos SQLAlchemy a tipos PostgreSQL
SQLALCHEMY_TO_PG_TYPE = {
    'Integer': 'integer',
    'String': 'varchar',
    'Text': 'text',
    'DateTime': 'timestamp',
    'Date': 'date',
    'Time': 'time',
    'Boolean': 'boolean',
    'DECIMAL': 'numeric',
    'Numeric': 'numeric',
    'JSON': 'jsonb',
}

class ModelAlignmentChecker:
    def __init__(self):
        self.engine = engine
        self.inspector = inspect(engine)
        self.errors = []
        self.warnings = []
        self.success_count = 0
        
    def run_all_checks(self):
        """Ejecuta todas las verificaciones"""
        print("=" * 80)
        print("VERIFICACIÓN DE ALINEACIÓN: MODELOS SQLALCHEMY vs BASE DE DATOS")
        print("=" * 80)
        print()
        
        # Obtener todas las tablas de la BD
        db_tables = set(self.inspector.get_table_names())
        print(f"📊 Tablas encontradas en la BD: {len(db_tables)}")
        print(f"   {', '.join(sorted(db_tables))}")
        print()
        
        # Obtener todos los modelos definidos
        models = self._get_all_models()
        model_tables = {model.__tablename__ for model in models}
        print(f"📊 Modelos definidos en SQLAlchemy: {len(model_tables)}")
        print(f"   {', '.join(sorted(model_tables))}")
        print()
        
        # Verificaciones
        self.check_table_existence(db_tables, model_tables)
        self.check_columns_alignment(db_tables, models)
        self.check_foreign_keys(models)
        self.check_removed_tables()
        
        # Resumen
        self.print_summary()
        
        return len(self.errors) == 0
    
    def _get_all_models(self) -> List:
        """Obtiene todos los modelos SQLAlchemy definidos"""
        models = []
        for name in dir(db_module):
            obj = getattr(db_module, name)
            if hasattr(obj, '__tablename__') and hasattr(obj, '__table__'):
                models.append(obj)
        return models
    
    def check_table_existence(self, db_tables: Set[str], model_tables: Set[str]):
        """Verifica que todas las tablas de modelos existan en la BD"""
        print("🔍 Verificando existencia de tablas...")
        
        missing_in_db = model_tables - db_tables
        if missing_in_db:
            for table in missing_in_db:
                error = f"❌ Tabla '{table}' definida en modelo pero NO existe en BD"
                self.errors.append(error)
                print(f"   {error}")
        
        # Tablas en BD que no tienen modelo (pueden ser vistas o tablas del sistema)
        missing_in_models = db_tables - model_tables
        if missing_in_models:
            # Filtrar tablas del sistema y vistas
            system_tables = {'pg_stat_statements', 'pg_stat_statements_info'}
            user_missing = missing_in_models - system_tables
            
            if user_missing:
                for table in user_missing:
                    warning = f"⚠️  Tabla '{table}' existe en BD pero NO tiene modelo definido"
                    self.warnings.append(warning)
                    print(f"   {warning}")
        
        if not missing_in_db and not (missing_in_models - system_tables):
            print("   ✅ Todas las tablas están alineadas")
            self.success_count += 1
        print()
    
    def check_columns_alignment(self, db_tables: Set[str], models: List):
        """Verifica que las columnas de los modelos coincidan con la BD"""
        print("🔍 Verificando columnas...")
        
        for model in models:
            table_name = model.__tablename__
            if table_name not in db_tables:
                continue
            
            print(f"   Verificando tabla: {table_name}")
            
            # Obtener columnas de la BD
            db_columns = {col['name']: col for col in self.inspector.get_columns(table_name)}
            
            # Obtener columnas del modelo
            model_columns = {}
            for col_name, col_obj in model.__table__.columns.items():
                model_columns[col_name] = col_obj
            
            # Verificar columnas faltantes
            missing_in_db = set(model_columns.keys()) - set(db_columns.keys())
            if missing_in_db:
                for col in missing_in_db:
                    error = f"      ❌ Columna '{col}' en modelo pero NO en BD"
                    self.errors.append(f"{table_name}.{col}: {error}")
                    print(error)
            
            # Verificar columnas extra en BD
            missing_in_model = set(db_columns.keys()) - set(model_columns.keys())
            if missing_in_model:
                for col in missing_in_model:
                    warning = f"      ⚠️  Columna '{col}' en BD pero NO en modelo"
                    self.warnings.append(f"{table_name}.{col}: {warning}")
                    print(warning)
            
            # Verificar tipos de datos (básico)
            for col_name in model_columns.keys():
                if col_name not in db_columns:
                    continue
                
                model_col = model_columns[col_name]
                db_col = db_columns[col_name]
                
                # Verificar nullable
                if model_col.nullable != db_col['nullable']:
                    warning = f"      ⚠️  Columna '{col_name}': nullable en modelo ({model_col.nullable}) != BD ({db_col['nullable']})"
                    self.warnings.append(f"{table_name}.{col_name}: {warning}")
                    print(warning)
            
            if not missing_in_db and not missing_in_model:
                print(f"      ✅ Columnas alineadas ({len(model_columns)} columnas)")
                self.success_count += 1
        
        print()
    
    def check_foreign_keys(self, models: List):
        """Verifica que las foreign keys estén correctas"""
        print("🔍 Verificando foreign keys...")
        
        for model in models:
            table_name = model.__tablename__
            
            try:
                # Obtener FKs de la BD
                db_fks = self.inspector.get_foreign_keys(table_name)
                db_fk_dict = {
                    fk['name']: {
                        'constrained_columns': fk['constrained_columns'],
                        'referred_table': fk['referred_table'],
                        'referred_columns': fk['referred_columns']
                    }
                    for fk in db_fks
                }
                
                # Obtener FKs del modelo
                model_fks = {}
                for fk in model.__table__.foreign_keys:
                    # Construir nombre de FK
                    fk_name = fk.constraint.name if fk.constraint.name else f"{table_name}_{fk.column.name}_fkey"
                    model_fks[fk_name] = {
                        'column': fk.parent.name,
                        'referred_table': fk.column.table.name,
                        'referred_column': fk.column.name
                    }
                
                # Verificar FKs faltantes
                missing_in_db = set(model_fks.keys()) - set(db_fk_dict.keys())
                if missing_in_db:
                    for fk_name in missing_in_db:
                        warning = f"      ⚠️  FK '{fk_name}' en modelo pero NO en BD"
                        self.warnings.append(f"{table_name}: {warning}")
                        print(warning)
                
                # Verificar FKs que apuntan a tablas eliminadas
                for fk_name, fk_info in model_fks.items():
                    referred_table = fk_info['referred_table']
                    if referred_table not in self.inspector.get_table_names():
                        error = f"      ❌ FK '{fk_name}' apunta a tabla '{referred_table}' que NO existe"
                        self.errors.append(f"{table_name}: {error}")
                        print(error)
                
                if not missing_in_db:
                    print(f"      ✅ Foreign keys verificadas para {table_name}")
                    self.success_count += 1
                    
            except Exception as e:
                warning = f"      ⚠️  Error verificando FKs de {table_name}: {str(e)}"
                self.warnings.append(warning)
                print(warning)
        
        print()
    
    def check_removed_tables(self):
        """Verifica que las tablas eliminadas no tengan referencias"""
        print("🔍 Verificando tablas eliminadas...")
        
        removed_tables = [
            'study_normal_values',
            'study_templates',
            'study_template_items',
            'diagnosis_differentials',
            'diagnosis_recommendations',
            'schedule_exceptions'
        ]
        
        db_tables = set(self.inspector.get_table_names())
        
        for table in removed_tables:
            if table in db_tables:
                error = f"❌ Tabla '{table}' debería estar eliminada pero existe en BD"
                self.errors.append(error)
                print(f"   {error}")
            else:
                print(f"   ✅ Tabla '{table}' correctamente eliminada")
                self.success_count += 1
        
        # Verificar que no hay modelos para estas tablas
        models = self._get_all_models()
        for model in models:
            if model.__tablename__ in removed_tables:
                error = f"❌ Modelo '{model.__name__}' existe para tabla eliminada '{model.__tablename__}'"
                self.errors.append(error)
                print(f"   {error}")
        
        print()
    
    def print_summary(self):
        """Imprime resumen de verificaciones"""
        print("=" * 80)
        print("RESUMEN DE VERIFICACIÓN")
        print("=" * 80)
        print(f"✅ Verificaciones exitosas: {self.success_count}")
        print(f"⚠️  Advertencias: {len(self.warnings)}")
        print(f"❌ Errores: {len(self.errors)}")
        print()
        
        if self.warnings:
            print("ADVERTENCIAS:")
            for warning in self.warnings[:10]:  # Mostrar solo las primeras 10
                print(f"  {warning}")
            if len(self.warnings) > 10:
                print(f"  ... y {len(self.warnings) - 10} advertencias más")
            print()
        
        if self.errors:
            print("ERRORES CRÍTICOS:")
            for error in self.errors:
                print(f"  {error}")
            print()
            print("❌ VERIFICACIÓN FALLIDA - Hay errores que deben corregirse")
        else:
            print("✅ VERIFICACIÓN EXITOSA - Todos los modelos están alineados con la BD")
        
        print("=" * 80)


if __name__ == "__main__":
    try:
        checker = ModelAlignmentChecker()
        success = checker.run_all_checks()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"❌ Error fatal ejecutando verificación: {e}")
        traceback.print_exc()
        sys.exit(1)

