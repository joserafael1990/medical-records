export const PDF_CONSTANTS = {
    FONTS: {
        PRIMARY: 'helvetica',
    },
    COLORS: {
        PRIMARY: [37, 99, 235] as [number, number, number], // Blue-600
        SECONDARY: [75, 85, 99] as [number, number, number], // Gray-600
        TEXT_DARK: [0, 0, 0] as [number, number, number],
        TEXT_LIGHT: [107, 114, 128] as [number, number, number], // Gray-500
        TEXT_LIGHTER: [156, 163, 175] as [number, number, number], // Gray-400
        BORDER: [229, 231, 235] as [number, number, number], // Gray-200
        BACKGROUND_LIGHT: [249, 250, 251] as [number, number, number], // Gray-50
        WHITE: [255, 255, 255] as [number, number, number],
        BLUE_LIGHT: [239, 246, 255] as [number, number, number], // Blue-50
        BLUE_BORDER: [191, 219, 254] as [number, number, number], // Blue-200
    },
    LAYOUT: {
        MARGIN_X: 15,
        PAGE_WIDTH_A4: 210, // Approximate width of A4 in mm (jsPDF default)
        HEADER_HEIGHT: 20,
    }
};
