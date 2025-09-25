#!/usr/bin/env python3
"""
Script para ejecutar la migración de eliminación de duration_minutes
Este script elimina la columna duration_minutes de la tabla appointments
y actualiza la lógica para usar appointment_duration de la tabla persons
"""

import psycopg2
from psycopg2 import sql

def run_migration():
    """Ejecutar la migración de base de datos"""

    # Configuración de la base de datos
    DB_CONFIG = {
        "host": "localhost",
        "port": 5432,
        "database": "historias_clinicas",
        "user": "historias_user",
        "password": "historias_pass"
    }

    try:
        # Conectar a la base de datos
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()

        print("🔍 Verificando estructura actual de la tabla appointments...")

        # Verificar si la columna duration_minutes existe
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'appointments' AND column_name = 'duration_minutes'
        """)

        if not cursor.fetchone():
            print("✅ La columna duration_minutes ya no existe (ya migrada)")
            return True

        print("📋 Encontrada columna duration_minutes. Procediendo con la migración...")

        # Eliminar la columna duration_minutes
        cursor.execute("ALTER TABLE appointments DROP COLUMN duration_minutes")

        # Confirmar los cambios
        conn.commit()

        print("✅ Migración completada exitosamente!")
        print("📊 Verificando resultado...")

        # Verificar que la columna fue eliminada
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'appointments'
            AND column_name NOT IN ('id', 'appointment_code', 'patient_id', 'doctor_id', 'appointment_date', 'end_time', 'appointment_type', 'status', 'priority', 'reason', 'notes', 'preparation_instructions', 'follow_up_required', 'follow_up_date', 'room_number', 'estimated_cost', 'insurance_covered', 'confirmation_required', 'confirmed_at', 'reminder_sent', 'reminder_sent_at', 'cancelled_reason', 'cancelled_at', 'cancelled_by', 'created_at', 'updated_at', 'created_by')
            ORDER BY column_name
        """)

        columns = cursor.fetchall()
        print(f"✅ Columnas restantes en appointments: {len(columns)}")
        for col in columns:
            print(f"   - {col[0]}: {col[1]} (nullable: {col[2]})")

        # Mostrar estadísticas de citas
        cursor.execute("""
            SELECT
                COUNT(*) as total_appointments,
                COUNT(end_time) as appointments_with_end_time,
                MIN(appointment_date) as first_appointment,
                MAX(appointment_date) as last_appointment
            FROM appointments
        """)

        stats = cursor.fetchone()
        print("\n📈 Estadísticas de citas:")
        print(f"   - Total de citas: {stats[0]}")
        print(f"   - Citas con end_time: {stats[1]}")
        print(f"   - Primera cita: {stats[2]}")
        print(f"   - Última cita: {stats[3]}")

        # Verificar que appointment_duration existe en persons
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'persons' AND column_name = 'appointment_duration'
        """)

        duration_col = cursor.fetchone()
        if duration_col:
            print(f"\n✅ Campo appointment_duration encontrado en persons: {duration_col[1]}")

            # Mostrar algunos doctores con su duración de consulta
            cursor.execute("""
                SELECT id, first_name, paternal_surname, appointment_duration
                FROM persons
                WHERE person_type = 'doctor' AND appointment_duration IS NOT NULL
                ORDER BY appointment_duration DESC
                LIMIT 5
            """)

            doctors = cursor.fetchall()
            if doctors:
                print("\n👨‍⚕️ Duración de consulta de algunos doctores:")
                for doctor in doctors:
                    print(f"   - Doctor ID {doctor[0]}: {doctor[1]} {doctor[2]} - {doctor[3]} minutos")
        else:
            print("\n⚠️  Campo appointment_duration no encontrado en persons")

        cursor.close()
        conn.close()

    except psycopg2.Error as e:
        print(f"❌ Error en la migración: {e}")
        return False
    except Exception as e:
        print(f"❌ Error inesperado: {e}")
        return False

    return True

if __name__ == "__main__":
    print("🚀 Iniciando migración para eliminar duration_minutes...")
    print("=" * 60)

    success = run_migration()

    if success:
        print("\n🎉 ¡Migración completada exitosamente!")
        print("✅ El sistema ahora usa appointment_duration de la tabla persons")
        print("✅ Campo duration_minutes eliminado de appointments")
    else:
        print("\n❌ La migración falló. Revisa los errores arriba.")
