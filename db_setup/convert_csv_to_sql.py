#!/usr/bin/env python3
"""
Script para convertir datos CSV a INSERT statements SQL
"""

import csv
import sys
from datetime import datetime

def escape_sql_string(value):
    """Escapa caracteres especiales para SQL"""
    if value is None or value == '':
        return 'NULL'
    return "'" + str(value).replace("'", "''") + "'"

def convert_csv_to_insert(csv_file, table_name, output_file):
    """Convierte un archivo CSV a INSERT statements"""
    
    with open(csv_file, 'r', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        
        with open(output_file, 'w', encoding='utf-8') as sqlfile:
            sqlfile.write(f"-- INSERT statements for {table_name}\n")
            sqlfile.write(f"-- Generated on {datetime.now()}\n\n")
            
            for row in reader:
                # Obtener columnas y valores
                columns = list(row.keys())
                values = []
                
                for col in columns:
                    value = row[col]
                    if value == '' or value is None:
                        values.append('NULL')
                    elif col in ['is_active', 'is_chronic', 'is_contagious']:
                        # Campos booleanos
                        if value.lower() in ['t', 'true', '1']:
                            values.append('TRUE')
                        elif value.lower() in ['f', 'false', '0']:
                            values.append('FALSE')
                        else:
                            values.append('NULL')
                    elif col in ['created_at', 'updated_at']:
                        # Campos de fecha
                        if value:
                            values.append(f"'{value}'")
                        else:
                            values.append('NOW()')
                    else:
                        # Campos de texto
                        values.append(escape_sql_string(value))
                
                # Crear INSERT statement
                columns_str = ', '.join(columns)
                values_str = ', '.join(values)
                
                sqlfile.write(f"INSERT INTO {table_name} ({columns_str}) VALUES ({values_str});\n")
            
            sqlfile.write(f"\n-- End of {table_name} data\n\n")

def main():
    """Función principal"""
    
    # Convertir estudios clínicos
    print("Converting study_catalog_data.csv...")
    convert_csv_to_insert('study_catalog_data.csv', 'study_catalog', 'study_catalog_inserts.sql')
    
    # Convertir medicamentos
    print("Converting medications_data.csv...")
    convert_csv_to_insert('medications_data.csv', 'medications', 'medications_inserts.sql')
    
    # Convertir diagnósticos
    print("Converting diagnosis_catalog_data.csv...")
    convert_csv_to_insert('diagnosis_catalog_data.csv', 'diagnosis_catalog', 'diagnosis_catalog_inserts.sql')
    
    print("Conversion completed!")

if __name__ == "__main__":
    main()

