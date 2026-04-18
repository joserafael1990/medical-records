import { renderHook, act, waitFor } from '@testing-library/react';
import { useConsultationManagement } from '../ConsultationManagement';

// Mock apiService — only the methods the hook actually touches in the paths
// under test. Importing the partial mock guarantees other surface-area changes
// don't silently compile in untested branches.
const mockDeleteConsultation = jest.fn();
const mockGetConsultations = jest.fn();

jest.mock(
  '../../../services',
  () => ({
    apiService: {
      deleteConsultation: (...args: any[]) => mockDeleteConsultation(...args),
      consultations: {
        getConsultations: (...args: any[]) => mockGetConsultations(...args),
        getConsultationById: jest.fn()
      }
    }
  }),
  { virtual: true }
);

// The Amplitude analytics module is loaded via a dynamic `import(...)` in the
// delete path, so we provide a static mock at the same specifier.
const mockAmplitudeTrack = jest.fn();
jest.mock(
  '../../../services/analytics/AmplitudeService',
  () => ({
    AmplitudeService: { track: (...args: any[]) => mockAmplitudeTrack(...args) }
  }),
  { virtual: true }
);

// The hook calls `submitConsultation` indirectly through other handlers we
// don't exercise, but the module is imported at the top level so we stub it.
jest.mock(
  '../../../utils/consultationHelpers',
  () => ({ submitConsultation: jest.fn() }),
  { virtual: true }
);

describe('useConsultationManagement.handleDeleteConsultation', () => {
  const doctorProfile = { id: 1, name: 'Dra. García' };
  const consultation = { id: 42 };
  const showSuccessMessage = jest.fn();
  const showErrorMessage = jest.fn();

  const originalConfirm = window.confirm;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset window.confirm between tests so the native-fallback branch starts
    // from a clean slate.
    window.confirm = jest.fn();
  });

  afterAll(() => {
    window.confirm = originalConfirm;
  });

  it('deletes the consultation when options.confirm resolves true', async () => {
    mockDeleteConsultation.mockResolvedValueOnce({});

    const { result } = renderHook(() =>
      useConsultationManagement(doctorProfile, showSuccessMessage, undefined, showErrorMessage)
    );

    const confirmCallback = jest.fn().mockResolvedValue(true);

    await act(async () => {
      await result.current.handleDeleteConsultation(consultation, { confirm: confirmCallback });
    });

    expect(confirmCallback).toHaveBeenCalledTimes(1);
    expect(confirmCallback).toHaveBeenCalledWith(expect.stringContaining('eliminar esta consulta'));
    expect(mockDeleteConsultation).toHaveBeenCalledWith('42');
    expect(showSuccessMessage).toHaveBeenCalledWith('Consulta eliminada exitosamente');
    // The native confirm must not be touched when the caller opts into a
    // MUI-backed confirmation dialog.
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it('does not delete when options.confirm resolves false', async () => {
    const { result } = renderHook(() =>
      useConsultationManagement(doctorProfile, showSuccessMessage, undefined, showErrorMessage)
    );

    const confirmCallback = jest.fn().mockResolvedValue(false);

    await act(async () => {
      await result.current.handleDeleteConsultation(consultation, { confirm: confirmCallback });
    });

    expect(confirmCallback).toHaveBeenCalledTimes(1);
    expect(mockDeleteConsultation).not.toHaveBeenCalled();
    expect(showSuccessMessage).not.toHaveBeenCalled();
    expect(mockAmplitudeTrack).not.toHaveBeenCalled();
  });

  it('falls back to window.confirm when no options are provided (backwards compat)', async () => {
    (window.confirm as jest.Mock).mockReturnValue(true);
    mockDeleteConsultation.mockResolvedValueOnce({});

    const { result } = renderHook(() =>
      useConsultationManagement(doctorProfile, showSuccessMessage, undefined, showErrorMessage)
    );

    await act(async () => {
      await result.current.handleDeleteConsultation(consultation);
    });

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('eliminar esta consulta'));
    expect(mockDeleteConsultation).toHaveBeenCalledWith('42');
  });

  it('skips deletion when window.confirm returns false in the fallback path', async () => {
    (window.confirm as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() =>
      useConsultationManagement(doctorProfile, showSuccessMessage, undefined, showErrorMessage)
    );

    await act(async () => {
      await result.current.handleDeleteConsultation(consultation);
    });

    expect(mockDeleteConsultation).not.toHaveBeenCalled();
    expect(showSuccessMessage).not.toHaveBeenCalled();
  });

  it('accepts a synchronous confirm callback (not only promises)', async () => {
    mockDeleteConsultation.mockResolvedValueOnce({});

    const { result } = renderHook(() =>
      useConsultationManagement(doctorProfile, showSuccessMessage, undefined, showErrorMessage)
    );

    const syncConfirm = jest.fn().mockReturnValue(true);

    await act(async () => {
      await result.current.handleDeleteConsultation(consultation, { confirm: syncConfirm });
    });

    expect(syncConfirm).toHaveBeenCalled();
    expect(mockDeleteConsultation).toHaveBeenCalledWith('42');
  });

  it('tracks deletion in Amplitude after a successful delete', async () => {
    mockDeleteConsultation.mockResolvedValueOnce({});

    const { result } = renderHook(() =>
      useConsultationManagement(doctorProfile, showSuccessMessage, undefined, showErrorMessage)
    );

    await act(async () => {
      await result.current.handleDeleteConsultation(consultation, { confirm: async () => true });
    });

    await waitFor(() => {
      expect(mockAmplitudeTrack).toHaveBeenCalledWith('consultation_deleted', {
        consultation_id: 42
      });
    });
  });

  it('removes the deleted consultation from the local list', async () => {
    mockDeleteConsultation.mockResolvedValueOnce({});

    const { result } = renderHook(() =>
      useConsultationManagement(doctorProfile, showSuccessMessage, undefined, showErrorMessage)
    );

    // Seed the local list so we can verify the filter on success.
    act(() => {
      result.current.setConsultations([{ id: 1 }, { id: 42 }, { id: 99 }]);
    });

    await act(async () => {
      await result.current.handleDeleteConsultation(consultation, { confirm: async () => true });
    });

    expect(result.current.consultations.map((c: any) => c.id)).toEqual([1, 99]);
  });

  it('keeps the local list intact when the delete API call fails', async () => {
    mockDeleteConsultation.mockRejectedValueOnce(new Error('boom'));

    const { result } = renderHook(() =>
      useConsultationManagement(doctorProfile, showSuccessMessage, undefined, showErrorMessage)
    );

    act(() => {
      result.current.setConsultations([{ id: 42 }]);
    });

    await act(async () => {
      await result.current.handleDeleteConsultation(consultation, { confirm: async () => true });
    });

    expect(result.current.consultations).toHaveLength(1);
    expect(showSuccessMessage).not.toHaveBeenCalled();
  });
});
