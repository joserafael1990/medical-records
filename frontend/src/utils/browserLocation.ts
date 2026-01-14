import { logger } from './logger';

export interface BrowserLocation {
  country?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  locale?: string;
}

/**
 * Obtener ubicación del navegador del usuario
 * Usa Geolocation API y geocodificación inversa para obtener país/ciudad
 */
export async function getBrowserLocation(): Promise<BrowserLocation | null> {
  const location: BrowserLocation = {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: navigator.language || navigator.languages?.[0] || 'es-MX'
  };

  // Intentar obtener geolocalización del navegador
  if ('geolocation' in navigator) {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: false,
            timeout: 5000,
            maximumAge: 300000 // Cache por 5 minutos
          }
        );
      });

      location.latitude = position.coords.latitude;
      location.longitude = position.coords.longitude;

      // Usar geocodificación inversa para obtener país/ciudad
      try {
        const geocodeResponse = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.latitude}&lon=${location.longitude}&zoom=10&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'MedicalRecordsApp/1.0' // Requerido por Nominatim
            }
          }
        );

        if (geocodeResponse.ok) {
          const geocodeData = await geocodeResponse.json();
          const address = geocodeData.address || {};

          location.country = address.country || address.country_code?.toUpperCase();
          location.city = address.city || address.town || address.village || address.municipality;
          location.state = address.state || address.region || address.province;

          logger.debug('Browser location obtained from geolocation', {
            country: location.country,
            city: location.city,
            state: location.state
          }, 'system');
        }
      } catch (geocodeError) {
        logger.debug('Geocoding failed, using timezone/locale fallback', geocodeError, 'system');
      }
    } catch (geoError: any) {
      // Usuario denegó permiso o geolocalización no disponible
      logger.debug('Geolocation not available or denied', {
        code: geoError.code,
        message: geoError.message
      }, 'system');
    }
  }

  // Fallback: usar información del timezone y locale
  if (!location.country) {
    // Intentar inferir país del timezone
    if (location.timezone?.includes('America/Mexico')) {
      location.country = 'México';
    } else if (location.timezone?.includes('America/')) {
      // Intentar inferir de otros timezones de América
      const timezoneCountryMap: Record<string, string> = {
        'America/New_York': 'Estados Unidos',
        'America/Chicago': 'Estados Unidos',
        'America/Denver': 'Estados Unidos',
        'America/Los_Angeles': 'Estados Unidos',
        'America/Bogota': 'Colombia',
        'America/Buenos_Aires': 'Argentina',
        'America/Santiago': 'Chile',
        'America/Lima': 'Perú'
      };
      location.country = timezoneCountryMap[location.timezone] || 'Unknown';
    }

    // Intentar inferir país del locale
    if (!location.country || location.country === 'Unknown') {
      const localeCountryMap: Record<string, string> = {
        'es-MX': 'México',
        'es-ES': 'España',
        'es-AR': 'Argentina',
        'es-CO': 'Colombia',
        'es-CL': 'Chile',
        'es-PE': 'Perú',
        'en-US': 'Estados Unidos',
        'en-GB': 'Reino Unido'
      };
      location.country = localeCountryMap[location.locale || ''] || location.country || 'Unknown';
    }
  }

  // Si tenemos al menos timezone, retornar la ubicación
  if (location.timezone) {
    return location;
  }

  return null;
}

/**
 * Obtener ubicación basada en IP como último recurso
 * Usa un servicio gratuito de geolocalización por IP
 */
export async function getLocationFromIP(): Promise<BrowserLocation | null> {
  try {
    // Usar un servicio gratuito de geolocalización por IP
    // Usar AbortController para timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch('https://ipapi.co/json/', {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return {
        country: data.country_name || data.country,
        city: data.city,
        state: data.region || data.region_code,
        timezone: data.timezone,
        latitude: data.latitude,
        longitude: data.longitude
      };
    }
  } catch (error) {
    logger.debug('IP geolocation failed', error, 'system');
  }

  return null;
}

