import { API_CONFIG } from '../../constants';
import { DoctorInfo, OfficeInfo } from '../../types/pdf';

export const formatDateToDDMMYYYY = (dateString: string): string => {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return dateString; // Return original if invalid
        }

        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();

        return `${day}-${month}-${year}`;
    } catch (error) {
        console.warn('Error formatting date:', error);
        return dateString;
    }
};

export const calculateAge = (dateOfBirth: string): string => {
    try {
        const birthDate = new Date(dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        return `${age} años`;
    } catch (error) {
        return 'No especificada';
    }
};

export const selectBestOfficeForPDF = (offices: any[]): OfficeInfo | null => {
    if (!offices || offices.length === 0) return null;

    // Helper function to check if office is virtual (handles boolean, string, number)
    const isVirtualOffice = (office: any): boolean => {
        const isVirtual = office.is_virtual;
        if (isVirtual === true || isVirtual === 'true' || isVirtual === 1 || isVirtual === '1') {
            return true;
        }
        return false;
    };

    // ALWAYS prefer physical (non-virtual) offices for PDF address display
    const physicalOffices = offices.filter(office => !isVirtualOffice(office));

    // CRITICAL: Always select physical office if available, NEVER select virtual if physical exists
    let selectedOffice;
    if (physicalOffices.length > 0) {
        selectedOffice = physicalOffices[0];
    } else {
        selectedOffice = offices[0];
    }

    // Map to OfficeInfo format
    const mappedOffice: OfficeInfo = {
        id: selectedOffice.id,
        name: selectedOffice.name,
        address: selectedOffice.address,
        city: selectedOffice.city,
        state: selectedOffice.state,
        state_name: selectedOffice.state_name,
        country: selectedOffice.country,
        country_name: selectedOffice.country_name,
        phone: selectedOffice.phone,
        mapsUrl: selectedOffice.maps_url || selectedOffice.mapsUrl,
        is_virtual: isVirtualOffice(selectedOffice),
        virtual_url: selectedOffice.virtual_url
    };

    // Final safety check: if somehow a virtual office was selected but physical exists
    if (mappedOffice.is_virtual && physicalOffices.length > 0) {
        const physicalOffice = physicalOffices[0];
        return {
            id: physicalOffice.id,
            name: physicalOffice.name,
            address: physicalOffice.address,
            city: physicalOffice.city,
            state: physicalOffice.state,
            state_name: physicalOffice.state_name,
            country: physicalOffice.country,
            country_name: physicalOffice.country_name,
            phone: physicalOffice.phone,
            mapsUrl: physicalOffice.maps_url || physicalOffice.mapsUrl,
            is_virtual: false,
            virtual_url: physicalOffice.virtual_url
        };
    }

    return mappedOffice;
};

export const getDoctorInitialsForPdf = (doctor: DoctorInfo): string => {
    const nameSource = doctor?.name?.trim();
    if (!nameSource) {
        return 'DR';
    }

    const initials = nameSource
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase();

    return initials || 'DR';
};

export const resolveDoctorAvatarUrl = (doctor: DoctorInfo): string | undefined => {
    // If avatar type is 'initials', don't try to load an image
    const avatarType = doctor.avatarType || doctor.avatar?.type || 'initials';
    if (avatarType === 'initials') {
        return undefined;
    }

    // Try to get URL from various possible locations
    const url =
        doctor.avatar?.url ||
        doctor.avatar?.avatar_url ||
        doctor.avatarUrl ||
        doctor.avatar_url;

    if (!url) {
        return undefined;
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }

    const normalizedPath = url.startsWith('/') ? url : `/${url}`;

    // Convert static file URLs to API endpoints for CORS support
    if (normalizedPath.startsWith('/static/doctor_avatars/preloaded/')) {
        const filename = normalizedPath.replace('/static/doctor_avatars/preloaded/', '');
        return `${API_CONFIG.BASE_URL}/api/avatars/preloaded/${filename}`;
    }

    if (normalizedPath.startsWith('/uploads/doctor_avatars/')) {
        const pathAfterUploads = normalizedPath.replace('/uploads/doctor_avatars/', '');
        return `${API_CONFIG.BASE_URL}/api/avatars/custom/${pathAfterUploads}`;
    }

    return `${API_CONFIG.BASE_URL}${normalizedPath}`;
};

export const convertBlobToDataUrl = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};
