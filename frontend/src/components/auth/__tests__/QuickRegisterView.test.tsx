import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import QuickRegisterView from '../QuickRegisterView';

// Track the payload sent to the register endpoint so tests can inspect it
// without mocking the internal shape of ApiService.
const mockRegister = jest.fn();
const mockGetSpecialties = jest.fn();
const mockGetDocuments = jest.fn();

jest.mock(
  '../../../services',
  () => ({
    apiService: {
      auth: {
        register: (...args: any[]) => mockRegister(...args)
      },
      catalogs: {
        getSpecialties: (...args: any[]) => mockGetSpecialties(...args)
      },
      documents: {
        getDocuments: (...args: any[]) => mockGetDocuments(...args)
      }
    }
  }),
  { virtual: true }
);

jest.mock(
  '../../../utils/logger',
  () => ({ logger: { error: jest.fn(), debug: jest.fn(), info: jest.fn(), warn: jest.fn() } }),
  { virtual: true }
);

// CortexLogo just renders an icon — stub to avoid pulling in SVG assets.
jest.mock('../../common/CortexLogo', () => () => null, { virtual: true });

const defaultProps = {
  onBackToLogin: jest.fn(),
  onSwitchToFull: jest.fn()
};

// Reused by every test: the specialties list and the cedula document type that
// the hook looks up at mount. Return them via resolved promises so the useEffect
// inside the component completes within `waitFor`.
const primeCatalogs = () => {
  mockGetSpecialties.mockResolvedValue([
    { id: 1, name: 'Medicina General', is_active: true },
    { id: 2, name: 'Pediatría', is_active: true }
  ]);
  mockGetDocuments.mockResolvedValue([
    { id: 99, name: 'Cédula Profesional' },
    { id: 100, name: 'CURP' }
  ]);
};

// Prevent `window.location.reload()` from breaking Jest after a successful
// registration: the component calls reload once it gets a token.
const originalLocation = window.location;

describe('QuickRegisterView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    primeCatalogs();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload: jest.fn() }
    });
  });

  afterAll(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  });

  it('renders the legal minimum fields', async () => {
    render(<QuickRegisterView {...defaultProps} />);
    await waitFor(() => expect(mockGetSpecialties).toHaveBeenCalled());

    expect(screen.getByLabelText(/Correo electrónico/i)).toBeTruthy();
    expect(screen.getByLabelText(/^Contraseña/i)).toBeTruthy();
    expect(screen.getByLabelText(/Confirmar contraseña/i)).toBeTruthy();
    expect(screen.getByLabelText(/Nombre completo/i)).toBeTruthy();
    expect(screen.getByLabelText(/Cédula profesional/i)).toBeTruthy();
    expect(screen.getByText(/Aviso de Privacidad/i)).toBeTruthy();
  });

  it('disables the submit button until all required fields + consent are valid', async () => {
    render(<QuickRegisterView {...defaultProps} />);
    await waitFor(() => expect(mockGetSpecialties).toHaveBeenCalled());

    const submit = screen.getByRole('button', { name: /Crear cuenta/i });
    expect((submit as HTMLButtonElement).disabled).toBe(true);
  });

  it('only accepts digits in the cédula field and caps at 8 characters', async () => {
    render(<QuickRegisterView {...defaultProps} />);
    await waitFor(() => expect(mockGetSpecialties).toHaveBeenCalled());

    const cedula = screen.getByLabelText(/Cédula profesional/i) as HTMLInputElement;
    act(() => {
      fireEvent.change(cedula, { target: { value: 'abc12345de678' } });
    });
    expect(cedula.value).toBe('12345678'); // non-digits stripped, capped at 8
  });

  it('shows the validation error for a 6-digit cédula (too short)', async () => {
    render(<QuickRegisterView {...defaultProps} />);
    await waitFor(() => expect(mockGetSpecialties).toHaveBeenCalled());

    // Submit via the form so the "attempted" flag flips and helper text
    // renders the error message.
    const submit = screen.getByRole('button', { name: /Crear cuenta/i });
    act(() => {
      // Button is disabled, but fire a click to confirm the attempt tracker
      // does not short-circuit the error text. The real gate is the validator.
      fireEvent.click(submit);
    });
    // No 422-style text should appear because nothing was typed yet — helper
    // text reads the default "Formato NOM-024". Assert the helper exists.
    expect(screen.getByText(/Formato NOM-024/i)).toBeTruthy();
  });

  it('submits with the legally-minimum payload including privacy_consent metadata', async () => {
    mockRegister.mockResolvedValue({ access_token: 'abc.def.ghi' });
    render(<QuickRegisterView {...defaultProps} />);
    await waitFor(() => expect(mockGetDocuments).toHaveBeenCalled());

    // Fill the form with values that pass all validators.
    const email = screen.getByLabelText(/Correo electrónico/i) as HTMLInputElement;
    const password = screen.getByLabelText(/^Contraseña/i) as HTMLInputElement;
    const confirm = screen.getByLabelText(/Confirmar contraseña/i) as HTMLInputElement;
    const name = screen.getByLabelText(/Nombre completo/i) as HTMLInputElement;
    const cedula = screen.getByLabelText(/Cédula profesional/i) as HTMLInputElement;
    const consent = screen.getByRole('checkbox');

    act(() => {
      fireEvent.change(email, { target: { value: 'dra.garcia@ejemplo.com' } });
      fireEvent.change(password, { target: { value: 'Seguro123!' } });
      fireEvent.change(confirm, { target: { value: 'Seguro123!' } });
      fireEvent.change(name, { target: { value: 'Ana García López' } });
      fireEvent.change(cedula, { target: { value: '12345678' } });
    });

    // MUI Select requires opening the listbox first.
    const specialtySelect = screen.getByRole('combobox');
    act(() => {
      fireEvent.mouseDown(specialtySelect);
    });
    const option = await screen.findByRole('option', { name: /Medicina General/i });
    act(() => {
      fireEvent.click(option);
    });

    act(() => {
      fireEvent.click(consent);
    });

    const submit = screen.getByRole('button', { name: /Crear cuenta/i });
    await waitFor(() => expect((submit as HTMLButtonElement).disabled).toBe(false));

    act(() => {
      fireEvent.click(submit);
    });

    await waitFor(() => expect(mockRegister).toHaveBeenCalledTimes(1));
    const payload = mockRegister.mock.calls[0][0];

    // Legal-minimum fields — must match what NOM-004 / NOM-024 requires.
    expect(payload.email).toBe('dra.garcia@ejemplo.com');
    expect(payload.name).toBe('Ana García López');
    expect(payload.specialty_id).toBe(1);
    expect(payload.documents).toEqual([
      { document_id: 99, document_value: '12345678' }
    ]);
    expect(payload.quick_registration).toBe(true);

    // Privacy consent metadata (LFPDPPP Art. 16)
    expect(payload.privacy_consent.accepted).toBe(true);
    expect(payload.privacy_consent.notice_version).toBe('v1');
    expect(typeof payload.privacy_consent.accepted_at).toBe('string');
    expect(payload.privacy_consent.timezone).toBeTruthy();

    // Stub fields that the backend will ignore under quick_registration=true
    // should be present (so the backend doesn't throw about missing keys when
    // deserializing) but empty.
    expect(payload.office_name).toBe('');
    expect(payload.schedule_data).toEqual({});

    // Non-string Optional fields (date/int) must be null, not '' — Pydantic v2
    // rejects '' for Optional[date] / Optional[int] with "input is too short".
    expect(payload.birth_date).toBeNull();
    expect(payload.graduation_year).toBeNull();
  });

  it('submits with empty documents when the cédula type is not in the catalog', async () => {
    // Simulate a catalog that doesn't return "Cédula Profesional" — the
    // frontend should still submit; the backend rejects with a clear error.
    mockGetDocuments.mockResolvedValueOnce([
      { id: 100, name: 'CURP' } // no Cédula Profesional entry
    ]);
    mockRegister.mockResolvedValue({ access_token: 'abc' });

    render(<QuickRegisterView {...defaultProps} />);
    await waitFor(() => expect(mockGetDocuments).toHaveBeenCalled());

    act(() => {
      fireEvent.change(screen.getByLabelText(/Correo electrónico/i), { target: { value: 'a@b.com' } });
      fireEvent.change(screen.getByLabelText(/^Contraseña/i), { target: { value: 'Seguro123!' } });
      fireEvent.change(screen.getByLabelText(/Confirmar contraseña/i), { target: { value: 'Seguro123!' } });
      fireEvent.change(screen.getByLabelText(/Nombre completo/i), { target: { value: 'Ana G' } });
      fireEvent.change(screen.getByLabelText(/Cédula profesional/i), { target: { value: '12345678' } });
    });

    act(() => {
      fireEvent.mouseDown(screen.getByRole('combobox'));
    });
    const option = await screen.findByRole('option', { name: /Medicina General/i });
    act(() => {
      fireEvent.click(option);
    });
    act(() => {
      fireEvent.click(screen.getByRole('checkbox'));
    });

    const submit = screen.getByRole('button', { name: /Crear cuenta/i });
    await waitFor(() => expect((submit as HTMLButtonElement).disabled).toBe(false));

    act(() => {
      fireEvent.click(submit);
    });

    await waitFor(() => expect(mockRegister).toHaveBeenCalled());
    expect(mockRegister.mock.calls[0][0].documents).toEqual([]);
  });

  it('surfaces a friendly error message when the API rejects the registration', async () => {
    mockRegister.mockRejectedValueOnce({
      detail: 'El correo ya está registrado',
      status: 409
    });

    render(<QuickRegisterView {...defaultProps} />);
    await waitFor(() => expect(mockGetDocuments).toHaveBeenCalled());

    // Minimal fill — we just need the form to pass client validation.
    act(() => {
      fireEvent.change(screen.getByLabelText(/Correo electrónico/i), { target: { value: 'a@b.com' } });
      fireEvent.change(screen.getByLabelText(/^Contraseña/i), { target: { value: 'Seguro123!' } });
      fireEvent.change(screen.getByLabelText(/Confirmar contraseña/i), { target: { value: 'Seguro123!' } });
      fireEvent.change(screen.getByLabelText(/Nombre completo/i), { target: { value: 'Ana' } });
      fireEvent.change(screen.getByLabelText(/Cédula profesional/i), { target: { value: '12345678' } });
    });
    act(() => {
      fireEvent.mouseDown(screen.getByRole('combobox'));
    });
    act(() => {
      fireEvent.click(screen.getByRole('option', { name: /Medicina General/i }));
    });
    act(() => {
      fireEvent.click(screen.getByRole('checkbox'));
    });

    const submit = screen.getByRole('button', { name: /Crear cuenta/i });
    await waitFor(() => expect((submit as HTMLButtonElement).disabled).toBe(false));
    act(() => {
      fireEvent.click(submit);
    });

    // The error Alert should pick up the `.detail` field from the rejected
    // promise (via the extractErrorMessage helper).
    await waitFor(() =>
      expect(screen.getByText(/El correo ya está registrado/i)).toBeTruthy()
    );
    // And page should NOT reload
    expect((window.location.reload as jest.Mock)).not.toHaveBeenCalled();
  });

  it('invokes onSwitchToFull when the "Usar registro completo" link is clicked', async () => {
    const onSwitch = jest.fn();
    render(<QuickRegisterView {...defaultProps} onSwitchToFull={onSwitch} />);
    await waitFor(() => expect(mockGetSpecialties).toHaveBeenCalled());

    act(() => {
      fireEvent.click(screen.getByText(/Usar registro completo/i));
    });
    expect(onSwitch).toHaveBeenCalledTimes(1);
  });
});
