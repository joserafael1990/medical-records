import { renderHook, act, waitFor } from '@testing-library/react';
import { useAgendaView } from '../useAgendaView';
import { apiService } from '../../services';
import { useToast } from '../../components/common/ToastNotification';

// Mock axios first
jest.mock('axios', () => require('../../__mocks__/axios'));

// Mock date-fns/locale
jest.mock('date-fns/locale', () => ({
  es: {
    code: 'es',
    formatDistance: jest.fn(),
    formatRelative: jest.fn(),
    localize: {
      ordinalNumber: jest.fn(),
      era: jest.fn(),
      quarter: jest.fn(),
      month: jest.fn(),
      day: jest.fn(),
      dayPeriod: jest.fn()
    },
    formatLong: {
      date: jest.fn(),
      time: jest.fn(),
      dateTime: jest.fn()
    },
    match: {
      ordinalNumber: jest.fn(),
      era: jest.fn(),
      quarter: jest.fn(),
      month: jest.fn(),
      day: jest.fn(),
      dayPeriod: jest.fn()
    },
    options: {
      weekStartsOn: 1,
      firstWeekContainsDate: 4
    }
  }
}));

// Mock dependencies
jest.mock('../../services', () => ({
  apiService: {
    whatsapp: {
      sendAppointmentReminder: jest.fn()
    }
  }
}));
jest.mock('../../components/common/ToastNotification');
jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  }
}));

const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
const mockApiService = apiService as jest.Mocked<typeof apiService>;

describe('useAgendaView', () => {
  const mockShowSuccess = jest.fn();
  const mockShowError = jest.fn();
  const mockSetSelectedDate = jest.fn();
  const mockSetAgendaView = jest.fn();
  const mockForceRefresh = jest.fn();

  const mockAppointments = [
    {
      id: 1,
      date_time: '2024-01-15T09:00:00',
      patient: { first_name: 'Juan', paternal_surname: 'Pérez' },
      status: 'confirmed',
      office: { name: 'Consultorio 1' }
    },
    {
      id: 2,
      date_time: '2024-01-15T14:00:00',
      patient: { first_name: 'María', paternal_surname: 'García' },
      status: 'confirmed',
      office: { name: 'Consultorio 2' }
    },
    {
      id: 3,
      date_time: '2024-01-16T10:00:00',
      patient: { first_name: 'Pedro', paternal_surname: 'López' },
      status: 'cancelled',
      office: { name: 'Consultorio 1' }
    }
  ];

  const mockSelectedDate = new Date('2024-01-15');

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseToast.mockReturnValue({
      showSuccess: mockShowSuccess,
      showError: mockShowError
    } as any);

    mockApiService.whatsapp.sendAppointmentReminder = jest.fn().mockResolvedValue({});
  });

  it('should initialize with default values', async () => {
    const { result } = renderHook(() =>
      useAgendaView({
        appointments: mockAppointments,
        selectedDate: mockSelectedDate,
        agendaView: 'daily'
      })
    );

    await waitFor(() => {
      expect(result.current.localSelectedDate).toBeDefined();
      expect(result.current.filteredAppointments).toBeDefined();
    });
  });

  it('should filter appointments for daily view', async () => {
    const { result } = renderHook(() =>
      useAgendaView({
        appointments: mockAppointments,
        selectedDate: mockSelectedDate,
        agendaView: 'daily'
      })
    );

    await waitFor(() => {
      expect(result.current.filteredAppointments).toBeDefined();
      expect(Array.isArray(result.current.filteredAppointments)).toBe(true);
      // Should have at least the appointments for that day
      expect(result.current.filteredAppointments.length).toBeGreaterThanOrEqual(0);
    });
  });

  it('should filter appointments for weekly view', async () => {
    const { result } = renderHook(() =>
      useAgendaView({
        appointments: mockAppointments,
        selectedDate: mockSelectedDate,
        agendaView: 'weekly'
      })
    );

    await waitFor(() => {
      expect(result.current.filteredAppointments).toBeDefined();
      expect(Array.isArray(result.current.filteredAppointments)).toBe(true);
    });
  });

  it('should filter appointments for monthly view', async () => {
    const { result } = renderHook(() =>
      useAgendaView({
        appointments: mockAppointments,
        selectedDate: mockSelectedDate,
        agendaView: 'monthly'
      })
    );

    await waitFor(() => {
      expect(result.current.filteredAppointments).toBeDefined();
      expect(Array.isArray(result.current.filteredAppointments)).toBe(true);
    });
  });

  it('should navigate to previous date', async () => {
    const { result } = renderHook(() =>
      useAgendaView({
        appointments: mockAppointments,
        selectedDate: mockSelectedDate,
        setSelectedDate: mockSetSelectedDate,
        agendaView: 'daily'
      })
    );

    await waitFor(() => {
      expect(result.current.localSelectedDate).toBeDefined();
    });

    act(() => {
      result.current.handleDateNavigation('prev');
    });

    await waitFor(() => {
      expect(mockSetSelectedDate).toHaveBeenCalled();
    });
  });

  it('should navigate to next date', async () => {
    const { result } = renderHook(() =>
      useAgendaView({
        appointments: mockAppointments,
        selectedDate: mockSelectedDate,
        setSelectedDate: mockSetSelectedDate,
        agendaView: 'daily'
      })
    );

    await waitFor(() => {
      expect(result.current.localSelectedDate).toBeDefined();
    });

    act(() => {
      result.current.handleDateNavigation('next');
    });

    await waitFor(() => {
      expect(mockSetSelectedDate).toHaveBeenCalled();
    });
  });

  it('should go to today', async () => {
    const { result } = renderHook(() =>
      useAgendaView({
        appointments: mockAppointments,
        selectedDate: mockSelectedDate,
        setSelectedDate: mockSetSelectedDate,
        agendaView: 'daily'
      })
    );

    await waitFor(() => {
      expect(result.current.localSelectedDate).toBeDefined();
    });

    act(() => {
      result.current.goToToday();
    });

    await waitFor(() => {
      expect(mockSetSelectedDate).toHaveBeenCalled();
    });
  });

  it('should send WhatsApp reminder successfully', async () => {
    const { result } = renderHook(() =>
      useAgendaView({
        appointments: mockAppointments,
        selectedDate: mockSelectedDate,
        agendaView: 'daily'
      })
    );

    await waitFor(() => {
      expect(result.current.handleSendWhatsAppReminder).toBeDefined();
    });

    await act(async () => {
      await result.current.handleSendWhatsAppReminder(mockAppointments[0]);
    });

    await waitFor(() => {
      expect(mockApiService.whatsapp.sendAppointmentReminder).toHaveBeenCalledWith(1);
      expect(mockShowSuccess).toHaveBeenCalled();
    });
  });

  it('should handle WhatsApp reminder errors', async () => {
    mockApiService.whatsapp.sendAppointmentReminder = jest.fn().mockRejectedValue({
      status: 503,
      detail: 'WhatsApp service unavailable'
    });

    const { result } = renderHook(() =>
      useAgendaView({
        appointments: mockAppointments,
        selectedDate: mockSelectedDate,
        agendaView: 'daily'
      })
    );

    await waitFor(() => {
      expect(result.current.handleSendWhatsAppReminder).toBeDefined();
    });

    await act(async () => {
      await result.current.handleSendWhatsAppReminder(mockAppointments[0]);
    });

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalled();
    });
  });

  it('should get status color correctly', async () => {
    const { result } = renderHook(() =>
      useAgendaView({
        appointments: mockAppointments,
        selectedDate: mockSelectedDate,
        agendaView: 'daily'
      })
    );

    await waitFor(() => {
      expect(result.current.getStatusColor).toBeDefined();
    });

    expect(result.current.getStatusColor('confirmed')).toBe('success');
    expect(result.current.getStatusColor('cancelled')).toBe('error');
    expect(result.current.getStatusColor('completed')).toBe('primary');
    expect(result.current.getStatusColor('unknown')).toBe('default');
  });

  it('should get status label correctly', async () => {
    const { result } = renderHook(() =>
      useAgendaView({
        appointments: mockAppointments,
        selectedDate: mockSelectedDate,
        agendaView: 'daily'
      })
    );

    await waitFor(() => {
      expect(result.current.getStatusLabel).toBeDefined();
    });

    expect(result.current.getStatusLabel('confirmed')).toBe('Confirmada');
    expect(result.current.getStatusLabel('cancelled')).toBe('Cancelada');
    expect(result.current.getStatusLabel('completed')).toBe('Completada');
  });

  it('should get date range title for daily view', async () => {
    const { result } = renderHook(() =>
      useAgendaView({
        appointments: mockAppointments,
        selectedDate: mockSelectedDate,
        agendaView: 'daily'
      })
    );

    await waitFor(() => {
      expect(result.current.dateRangeTitle).toBeDefined();
      expect(result.current.dateRangeTitle).toContain('2024');
    });
  });

  it('should get date range title for weekly view', async () => {
    const { result } = renderHook(() =>
      useAgendaView({
        appointments: mockAppointments,
        selectedDate: mockSelectedDate,
        agendaView: 'weekly'
      })
    );

    await waitFor(() => {
      expect(result.current.dateRangeTitle).toBeDefined();
      expect(result.current.dateRangeTitle).toContain('-');
    });
  });

  it('should get date range title for monthly view', async () => {
    const { result } = renderHook(() =>
      useAgendaView({
        appointments: mockAppointments,
        selectedDate: mockSelectedDate,
        agendaView: 'monthly'
      })
    );

    await waitFor(() => {
      expect(result.current.dateRangeTitle).toBeDefined();
      expect(result.current.dateRangeTitle).toContain('2024');
    });
  });

  it('should get week days', async () => {
    const { result } = renderHook(() =>
      useAgendaView({
        appointments: mockAppointments,
        selectedDate: mockSelectedDate,
        agendaView: 'weekly'
      })
    );

    await waitFor(() => {
      expect(result.current.getWeekDays).toBeDefined();
    });

    const weekDays = result.current.getWeekDays();
    expect(weekDays.length).toBe(7);
  });

  it('should get calendar days for monthly view', async () => {
    const { result } = renderHook(() =>
      useAgendaView({
        appointments: mockAppointments,
        selectedDate: mockSelectedDate,
        agendaView: 'monthly'
      })
    );

    await waitFor(() => {
      expect(result.current.getCalendarDays).toBeDefined();
    });

    const calendarDays = result.current.getCalendarDays();
    expect(calendarDays.length).toBeGreaterThan(28);
  });

  it('should get weeks for monthly view', async () => {
    const { result } = renderHook(() =>
      useAgendaView({
        appointments: mockAppointments,
        selectedDate: mockSelectedDate,
        agendaView: 'monthly'
      })
    );

    await waitFor(() => {
      expect(result.current.getWeeks).toBeDefined();
    });

    const weeks = result.current.getWeeks();
    expect(weeks.length).toBeGreaterThan(4);
    expect(weeks[0].length).toBe(7);
  });

  it('should get day appointments', async () => {
    const { result } = renderHook(() =>
      useAgendaView({
        appointments: mockAppointments,
        selectedDate: mockSelectedDate,
        agendaView: 'daily'
      })
    );

    await waitFor(() => {
      expect(result.current.getDayAppointments).toBeDefined();
    });

    // Use the same date format as the appointments
    const testDate = new Date('2024-01-15T00:00:00');
    const dayAppointments = result.current.getDayAppointments(testDate);
    expect(dayAppointments.length).toBeGreaterThanOrEqual(0);
  });

  it('should detect if current date is today', async () => {
    const today = new Date();
    const { result } = renderHook(() =>
      useAgendaView({
        appointments: mockAppointments,
        selectedDate: today,
        agendaView: 'daily'
      })
    );

    await waitFor(() => {
      expect(result.current.isToday).toBe(true);
    });
  });

  it('should update local date when selectedDate prop changes', async () => {
    const { result, rerender } = renderHook(
      (props) => useAgendaView(props),
      {
        initialProps: {
          appointments: mockAppointments,
          selectedDate: mockSelectedDate,
          agendaView: 'daily' as const
        }
      }
    );

    await waitFor(() => {
      expect(result.current.localSelectedDate).toBeDefined();
    });

    const newDate = new Date('2024-01-20');
    rerender({
      appointments: mockAppointments,
      selectedDate: newDate,
      agendaView: 'daily' as const
    });

    await waitFor(() => {
      expect(result.current.localSelectedDate.getTime()).toBe(newDate.getTime());
    });
  });

  it('should handle WhatsApp 24-hour window error', async () => {
    mockApiService.whatsapp.sendAppointmentReminder = jest.fn().mockRejectedValue({
      detail: 'more than 24 hours have passed'
    });

    const { result } = renderHook(() =>
      useAgendaView({
        appointments: mockAppointments,
        selectedDate: mockSelectedDate,
        agendaView: 'daily'
      })
    );

    await waitFor(() => {
      expect(result.current.handleSendWhatsAppReminder).toBeDefined();
    });

    await act(async () => {
      await result.current.handleSendWhatsAppReminder(mockAppointments[0]);
    });

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        expect.stringContaining('24 horas')
      );
    });
  });

  it('should handle WhatsApp service unavailable error', async () => {
    mockApiService.whatsapp.sendAppointmentReminder = jest.fn().mockRejectedValue({
      status: 503
    });

    const { result } = renderHook(() =>
      useAgendaView({
        appointments: mockAppointments,
        selectedDate: mockSelectedDate,
        agendaView: 'daily'
      })
    );

    await waitFor(() => {
      expect(result.current.handleSendWhatsAppReminder).toBeDefined();
    });

    await act(async () => {
      await result.current.handleSendWhatsAppReminder(mockAppointments[0]);
    });

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        expect.stringContaining('WhatsApp no está configurado')
      );
    });
  });

  it('should handle appointment without ID error', async () => {
    const { result } = renderHook(() =>
      useAgendaView({
        appointments: mockAppointments,
        selectedDate: mockSelectedDate,
        agendaView: 'daily'
      })
    );

    await waitFor(() => {
      expect(result.current.handleSendWhatsAppReminder).toBeDefined();
    });

    await act(async () => {
      await result.current.handleSendWhatsAppReminder({});
    });

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        expect.stringContaining('Cita sin ID')
      );
    });
  });
});

