#!/usr/bin/env python3
"""
Script to insert countries and states data using Python
"""

import psycopg2

def run_insertion():
    """Run the insertion of countries and states data"""
    
    # Database connection parameters
    db_params = {
        'host': 'postgres-db',
        'port': 5432,
        'database': 'historias_clinicas',
        'user': 'historias_user',
        'password': 'historias_pass'
    }
    
    conn = None
    cursor = None
    try:
        # Connect to database
        print("🔗 Connecting to database...")
        conn = psycopg2.connect(**db_params)
        cursor = conn.cursor()
        
        # Countries data
        countries = [
            # Central America
            ('Guatemala', 'GT', True),
            ('Belice', 'BZ', True),
            ('El Salvador', 'SV', True),
            ('Honduras', 'HN', True),
            ('Nicaragua', 'NI', True),
            ('Costa Rica', 'CR', True),
            ('Panamá', 'PA', True),
            
            # South America
            ('Argentina', 'AR', True),
            ('Bolivia', 'BO', True),
            ('Brasil', 'BR', True),
            ('Chile', 'CL', True),
            ('Colombia', 'CO', True),
            ('Ecuador', 'EC', True),
            ('Guyana', 'GY', True),
            ('Paraguay', 'PY', True),
            ('Perú', 'PE', True),
            ('Surinam', 'SR', True),
            ('Uruguay', 'UY', True),
            ('Venezuela', 'VE', True),
            
            # Caribbean
            ('Cuba', 'CU', True),
            ('República Dominicana', 'DO', True),
            ('Haití', 'HT', True),
            ('Jamaica', 'JM', True),
            ('Puerto Rico', 'PR', True),
            ('Trinidad y Tobago', 'TT', True),
            
            # Europe
            ('España', 'ES', True),
            ('Francia', 'FR', True),
            ('Alemania', 'DE', True),
            ('Italia', 'IT', True),
            ('Reino Unido', 'GB', True),
            ('Portugal', 'PT', True),
            ('Países Bajos', 'NL', True),
            ('Bélgica', 'BE', True),
            ('Suiza', 'CH', True),
            ('Austria', 'AT', True),
            ('Suecia', 'SE', True),
            ('Noruega', 'NO', True),
            ('Dinamarca', 'DK', True),
            ('Finlandia', 'FI', True),
            ('Polonia', 'PL', True),
            ('Rusia', 'RU', True),
            ('Ucrania', 'UA', True),
            ('Grecia', 'GR', True),
            ('Turquía', 'TR', True),
            ('Irlanda', 'IE', True),
            
            # Asia
            ('China', 'CN', True),
            ('Japón', 'JP', True),
            ('India', 'IN', True),
            ('Corea del Sur', 'KR', True),
            ('Corea del Norte', 'KP', True),
            ('Tailandia', 'TH', True),
            ('Vietnam', 'VN', True),
            ('Filipinas', 'PH', True),
            ('Indonesia', 'ID', True),
            ('Malasia', 'MY', True),
            ('Singapur', 'SG', True),
            ('Pakistán', 'PK', True),
            ('Bangladesh', 'BD', True),
            ('Sri Lanka', 'LK', True),
            ('Myanmar', 'MM', True),
            ('Camboya', 'KH', True),
            ('Laos', 'LA', True),
            ('Mongolia', 'MN', True),
            ('Kazajistán', 'KZ', True),
            ('Uzbekistán', 'UZ', True),
            
            # Africa
            ('Egipto', 'EG', True),
            ('Nigeria', 'NG', True),
            ('Sudáfrica', 'ZA', True),
            ('Kenia', 'KE', True),
            ('Etiopía', 'ET', True),
            ('Ghana', 'GH', True),
            ('Marruecos', 'MA', True),
            ('Argelia', 'DZ', True),
            ('Túnez', 'TN', True),
            ('Libia', 'LY', True),
            ('Sudán', 'SD', True),
            ('Tanzania', 'TZ', True),
            ('Uganda', 'UG', True),
            ('Ruanda', 'RW', True),
            ('Senegal', 'SN', True),
            ('Costa de Marfil', 'CI', True),
            ('Mali', 'ML', True),
            ('Burkina Faso', 'BF', True),
            ('Níger', 'NE', True),
            ('Chad', 'TD', True),
            
            # Oceania
            ('Australia', 'AU', True),
            ('Nueva Zelanda', 'NZ', True),
            ('Fiji', 'FJ', True),
            ('Papúa Nueva Guinea', 'PG', True),
            ('Samoa', 'WS', True),
            ('Tonga', 'TO', True),
            
            # North America (excluding Mexico and USA)
            ('Canadá', 'CA', True),
            ('Groenlandia', 'GL', True),
            
            # Others
            ('Israel', 'IL', True),
            ('Irán', 'IR', True),
            ('Iraq', 'IQ', True),
            ('Afganistán', 'AF', True),
            ('Arabia Saudí', 'SA', True),
            ('Emiratos Árabes Unidos', 'AE', True),
            ('Qatar', 'QA', True),
            ('Kuwait', 'KW', True),
            ('Bahrein', 'BH', True),
            ('Omán', 'OM', True),
            ('Yemen', 'YE', True),
            ('Jordania', 'JO', True),
            ('Líbano', 'LB', True),
            ('Siria', 'SY', True),
            ('Palestina', 'PS', True),
        ]
        
        print("🌍 Inserting countries...")
        cursor.executemany(
            "INSERT INTO countries (name, active) VALUES (%s, %s)",
            [(name, active) for name, code, active in countries]
        )
        
        # Get country IDs for states insertion
        cursor.execute("SELECT id, name FROM countries WHERE active = true")
        country_map = {name: country_id for country_id, name in cursor.fetchall()}
        
        # States data for Hispanic American countries
        states_data = {
            'Guatemala': [  # Guatemala
                ('Guatemala', 'GT-GT'),
                ('Alta Verapaz', 'GT-AV'),
                ('Baja Verapaz', 'GT-BV'),
                ('Chimaltenango', 'GT-CM'),
                ('Chiquimula', 'GT-CQ'),
                ('Escuintla', 'GT-ES'),
                ('Huehuetenango', 'GT-HU'),
                ('Izabal', 'GT-IZ'),
                ('Jalapa', 'GT-JA'),
                ('Jutiapa', 'GT-JU'),
                ('Petén', 'GT-PE'),
                ('Quetzaltenango', 'GT-QZ'),
                ('Quiché', 'GT-QC'),
                ('Retalhuleu', 'GT-RE'),
                ('Sacatepéquez', 'GT-SA'),
                ('San Marcos', 'GT-SM'),
                ('Santa Rosa', 'GT-SR'),
                ('Sololá', 'GT-SO'),
                ('Suchitepéquez', 'GT-SU'),
                ('Totonicapán', 'GT-TO'),
                ('Zacapa', 'GT-ZA'),
            ],
            'El Salvador': [  # El Salvador
                ('Ahuachapán', 'SV-AH'),
                ('Cabañas', 'SV-CA'),
                ('Chalatenango', 'SV-CH'),
                ('Cuscatlán', 'SV-CU'),
                ('La Libertad', 'SV-LI'),
                ('La Paz', 'SV-PA'),
                ('La Unión', 'SV-UN'),
                ('Morazán', 'SV-MO'),
                ('San Miguel', 'SV-SM'),
                ('San Salvador', 'SV-SS'),
                ('San Vicente', 'SV-SV'),
                ('Santa Ana', 'SV-SA'),
                ('Sonsonate', 'SV-SO'),
                ('Usulután', 'SV-US'),
            ],
            'Honduras': [  # Honduras
                ('Atlántida', 'HN-AT'),
                ('Choluteca', 'HN-CH'),
                ('Colón', 'HN-CL'),
                ('Comayagua', 'HN-CM'),
                ('Copán', 'HN-CP'),
                ('Cortés', 'HN-CR'),
                ('El Paraíso', 'HN-EP'),
                ('Francisco Morazán', 'HN-FM'),
                ('Gracias a Dios', 'HN-GD'),
                ('Intibucá', 'HN-IN'),
                ('Islas de la Bahía', 'HN-IB'),
                ('La Paz', 'HN-LP'),
                ('Lempira', 'HN-LE'),
                ('Ocotepeque', 'HN-OC'),
                ('Olancho', 'HN-OL'),
                ('Santa Bárbara', 'HN-SB'),
                ('Valle', 'HN-VA'),
                ('Yoro', 'HN-YO'),
            ],
            'Nicaragua': [  # Nicaragua
                ('Boaco', 'NI-BO'),
                ('Carazo', 'NI-CA'),
                ('Chinandega', 'NI-CI'),
                ('Chontales', 'NI-CO'),
                ('Estelí', 'NI-ES'),
                ('Granada', 'NI-GR'),
                ('Jinotega', 'NI-JI'),
                ('León', 'NI-LE'),
                ('Madriz', 'NI-MD'),
                ('Managua', 'NI-MN'),
                ('Masaya', 'NI-MS'),
                ('Matagalpa', 'NI-MT'),
                ('Nueva Segovia', 'NI-NS'),
                ('Río San Juan', 'NI-RS'),
                ('Rivas', 'NI-RI'),
                ('Atlántico Norte', 'NI-AN'),
                ('Atlántico Sur', 'NI-AS'),
            ],
            'Costa Rica': [  # Costa Rica
                ('San José', 'CR-SJ'),
                ('Alajuela', 'CR-A'),
                ('Cartago', 'CR-C'),
                ('Heredia', 'CR-H'),
                ('Guanacaste', 'CR-G'),
                ('Puntarenas', 'CR-P'),
                ('Limón', 'CR-L'),
            ],
            'Panamá': [  # Panamá
                ('Bocas del Toro', 'PA-1'),
                ('Coclé', 'PA-2'),
                ('Colón', 'PA-3'),
                ('Chiriquí', 'PA-4'),
                ('Darién', 'PA-5'),
                ('Herrera', 'PA-6'),
                ('Los Santos', 'PA-7'),
                ('Panamá', 'PA-8'),
                ('Veraguas', 'PA-9'),
                ('Guna Yala', 'PA-KY'),
                ('Emberá-Wounaan', 'PA-EM'),
                ('Ngäbe-Buglé', 'PA-NB'),
            ],
            'Argentina': [  # Argentina
                ('Buenos Aires', 'AR-B'),
                ('Catamarca', 'AR-K'),
                ('Chaco', 'AR-H'),
                ('Chubut', 'AR-U'),
                ('Córdoba', 'AR-X'),
                ('Corrientes', 'AR-W'),
                ('Entre Ríos', 'AR-E'),
                ('Formosa', 'AR-P'),
                ('Jujuy', 'AR-Y'),
                ('La Pampa', 'AR-L'),
                ('La Rioja', 'AR-F'),
                ('Mendoza', 'AR-M'),
                ('Misiones', 'AR-N'),
                ('Neuquén', 'AR-Q'),
                ('Río Negro', 'AR-R'),
                ('Salta', 'AR-A'),
                ('San Juan', 'AR-J'),
                ('San Luis', 'AR-D'),
                ('Santa Cruz', 'AR-Z'),
                ('Santa Fe', 'AR-S'),
                ('Santiago del Estero', 'AR-G'),
                ('Tierra del Fuego', 'AR-V'),
                ('Tucumán', 'AR-T'),
            ],
            'Chile': [  # Chile
                ('Arica y Parinacota', 'CL-AP'),
                ('Tarapacá', 'CL-TA'),
                ('Antofagasta', 'CL-AN'),
                ('Atacama', 'CL-AT'),
                ('Coquimbo', 'CL-CO'),
                ('Valparaíso', 'CL-VS'),
                ('Región Metropolitana', 'CL-RM'),
                ('O\'Higgins', 'CL-LI'),
                ('Maule', 'CL-ML'),
                ('Ñuble', 'CL-NB'),
                ('Biobío', 'CL-BI'),
                ('La Araucanía', 'CL-AR'),
                ('Los Ríos', 'CL-LR'),
                ('Los Lagos', 'CL-LL'),
                ('Aysén', 'CL-AI'),
                ('Magallanes', 'CL-MA'),
            ],
            'Colombia': [  # Colombia
                ('Amazonas', 'CO-AMA'),
                ('Antioquia', 'CO-ANT'),
                ('Arauca', 'CO-ARA'),
                ('Atlántico', 'CO-ATL'),
                ('Bolívar', 'CO-BOL'),
                ('Boyacá', 'CO-BOY'),
                ('Caldas', 'CO-CAL'),
                ('Caquetá', 'CO-CAQ'),
                ('Casanare', 'CO-CAS'),
                ('Cauca', 'CO-CAU'),
                ('Cesar', 'CO-CES'),
                ('Chocó', 'CO-CHO'),
                ('Córdoba', 'CO-COR'),
                ('Cundinamarca', 'CO-CUN'),
                ('Guainía', 'CO-GUA'),
                ('Guaviare', 'CO-GUV'),
                ('Huila', 'CO-HUI'),
                ('La Guajira', 'CO-LAG'),
                ('Magdalena', 'CO-MAG'),
                ('Meta', 'CO-MET'),
                ('Nariño', 'CO-NAR'),
                ('Norte de Santander', 'CO-NSA'),
                ('Putumayo', 'CO-PUT'),
                ('Quindío', 'CO-QUI'),
                ('Risaralda', 'CO-RIS'),
                ('San Andrés y Providencia', 'CO-SAP'),
                ('Santander', 'CO-SAN'),
                ('Sucre', 'CO-SUC'),
                ('Tolima', 'CO-TOL'),
                ('Valle del Cauca', 'CO-VAC'),
                ('Vaupés', 'CO-VAU'),
                ('Vichada', 'CO-VID'),
            ],
            'Ecuador': [  # Ecuador
                ('Azuay', 'EC-A'),
                ('Bolívar', 'EC-B'),
                ('Cañar', 'EC-F'),
                ('Carchi', 'EC-C'),
                ('Chimborazo', 'EC-H'),
                ('Cotopaxi', 'EC-X'),
                ('El Oro', 'EC-O'),
                ('Esmeraldas', 'EC-E'),
                ('Galápagos', 'EC-W'),
                ('Guayas', 'EC-G'),
                ('Imbabura', 'EC-I'),
                ('Loja', 'EC-L'),
                ('Los Ríos', 'EC-R'),
                ('Manabí', 'EC-M'),
                ('Morona Santiago', 'EC-S'),
                ('Napo', 'EC-N'),
                ('Orellana', 'EC-D'),
                ('Pastaza', 'EC-Y'),
                ('Pichincha', 'EC-P'),
                ('Santa Elena', 'EC-SE'),
                ('Santo Domingo de los Tsáchilas', 'EC-SD'),
                ('Sucumbíos', 'EC-U'),
                ('Tungurahua', 'EC-T'),
                ('Zamora Chinchipe', 'EC-Z'),
            ],
            'Perú': [  # Perú
                ('Amazonas', 'PE-AMA'),
                ('Áncash', 'PE-ANC'),
                ('Apurímac', 'PE-APU'),
                ('Arequipa', 'PE-ARE'),
                ('Ayacucho', 'PE-AYA'),
                ('Cajamarca', 'PE-CAJ'),
                ('Callao', 'PE-CAL'),
                ('Cusco', 'PE-CUS'),
                ('Huancavelica', 'PE-HUV'),
                ('Huánuco', 'PE-HUC'),
                ('Ica', 'PE-ICA'),
                ('Junín', 'PE-JUN'),
                ('La Libertad', 'PE-LAL'),
                ('Lambayeque', 'PE-LAM'),
                ('Lima', 'PE-LIM'),
                ('Loreto', 'PE-LOR'),
                ('Madre de Dios', 'PE-MDD'),
                ('Moquegua', 'PE-MOQ'),
                ('Pasco', 'PE-PAS'),
                ('Piura', 'PE-PIU'),
                ('Puno', 'PE-PUN'),
                ('San Martín', 'PE-SAM'),
                ('Tacna', 'PE-TAC'),
                ('Tumbes', 'PE-TUM'),
                ('Ucayali', 'PE-UCA'),
            ],
            'Venezuela': [  # Venezuela
                ('Amazonas', 'VE-X'),
                ('Anzoátegui', 'VE-B'),
                ('Apure', 'VE-C'),
                ('Aragua', 'VE-D'),
                ('Barinas', 'VE-E'),
                ('Bolívar', 'VE-F'),
                ('Carabobo', 'VE-G'),
                ('Cojedes', 'VE-H'),
                ('Delta Amacuro', 'VE-Y'),
                ('Falcón', 'VE-I'),
                ('Guárico', 'VE-J'),
                ('Lara', 'VE-K'),
                ('Mérida', 'VE-L'),
                ('Miranda', 'VE-M'),
                ('Monagas', 'VE-N'),
                ('Nueva Esparta', 'VE-O'),
                ('Portuguesa', 'VE-P'),
                ('Sucre', 'VE-R'),
                ('Táchira', 'VE-S'),
                ('Trujillo', 'VE-T'),
                ('Vargas', 'VE-W'),
                ('Yaracuy', 'VE-U'),
                ('Zulia', 'VE-V'),
                ('Distrito Capital', 'VE-A'),
            ],
        }
        
        print("🏛️  Inserting states for Hispanic American countries...")
        for country_name, states in states_data.items():
            if country_name in country_map:
                country_id = country_map[country_name]
                for state_name, state_code in states:
                    cursor.execute(
                        "INSERT INTO states (name, country_id, active) VALUES (%s, %s, %s)",
                        (state_name, country_id, True)
                    )
        
        # Add "Otro" state for all non-Hispanic American countries
        print("📝 Adding 'Otro' state for non-Hispanic countries...")
        hispanic_countries = set(states_data.keys()) | {'México', 'Estados Unidos'}
        
        for country_name, country_id in country_map.items():
            if country_name not in hispanic_countries:
                cursor.execute(
                    "INSERT INTO states (name, country_id, active) VALUES (%s, %s, %s)",
                    ('Otro', country_id, True)
                )
        
        # Commit changes
        conn.commit()
        
        print("✅ Data insertion completed successfully!")
        
        # Verify results
        cursor.execute("SELECT COUNT(*) FROM countries WHERE active = true")
        countries_count = cursor.fetchone()[0]
        print(f"📊 Countries: {countries_count}")
        
        cursor.execute("SELECT COUNT(*) FROM states WHERE active = true")
        states_count = cursor.fetchone()[0]
        print(f"📊 States: {states_count}")
        
        # Show some examples
        cursor.execute("""
            SELECT c.name, COUNT(s.id) as state_count 
            FROM countries c 
            LEFT JOIN states s ON c.id = s.country_id AND s.active = true
            WHERE c.active = true 
            GROUP BY c.id, c.name 
            ORDER BY c.name 
            LIMIT 10
        """)
        
        print("\n📋 Sample countries and their states:")
        for row in cursor.fetchall():
            print(f"  {row[0]}: {row[1]} states")
        
    except Exception as e:
        print(f"❌ Insertion failed: {str(e)}")
        if conn:
            conn.rollback()
        raise
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
        print("🔌 Database connection closed")

if __name__ == "__main__":
    run_insertion()
