import { renderHook, act, waitFor } from '@testing-library/react';
import { useScheduleConfigForm } from '../useScheduleConfigForm';
import { apiService } from '../../services';
import { useToast } from '../../components/common/ToastNotification';

// Mock axios first
jest.mock('axios', () => require('../../__mocks__/axios'));

// Mock dependencies
jest.mock('../../services', () => ({
  apiService: {
    appointments: {
      api: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn()
      }
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

describe('useScheduleConfigForm', () => {
  const mockShowSuccess = jest.fn();
  const mockShowError = jest.fn();
  const mockOnScheduleUpdated = jest.fn();

  const mockWeeklySchedule = {
    monday: {
      id: 1,
      day_of_week: 0,
      time_blocks: [
        { id: 1, start_time: '09:00', end_time: '18:00' }
      ],
      is_active: true
    },
    tuesday: {
      id: 2,
      day_of_week: 1,
      time_blocks: [
        { id: 2, start_time: '09:00', end_time: '18:00' }
      ],
      is_active: true
    },
    wednesday: {
      day_of_week: 2,
      time_blocks: [],
      is_active: false
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseToast.mockReturnValue({
      showSuccess: mockShowSuccess,
      showError: mockShowError
    } as any);

    // Mock API services
    mockApiService.appointments.api.get = jest.fn().mockResolvedValue({
      data: mockWeeklySchedule
    });
    mockApiService.appointments.api.post = jest.fn().mockResolvedValue({
      data: mockWeeklySchedule.monday
    });
    mockApiService.appointments.api.put = jest.fn().mockResolvedValue({
      data: mockWeeklySchedule.monday
    });
  });

  it('should initialize with default schedule', async () => {
    const { result } = renderHook(() =>
      useScheduleConfigForm({
        open: true,
        onScheduleUpdated: mockOnScheduleUpdated
      })
    );

    await waitFor(() => {
      expect(result.current.weeklySchedule).toBeDefined();
      expect(result.current.weeklySchedule.monday).toBeDefined();
      expect(result.current.weeklySchedule.monday?.day_of_week).toBe(0);
    });
  });

  it('should load weekly schedule when dialog opens', async () => {
    const { result } = renderHook(() =>
      useScheduleConfigForm({
        open: true,
        onScheduleUpdated: mockOnScheduleUpdated
      })
    );

    await waitFor(() => {
      expect(mockApiService.appointments.api.get).toHaveBeenCalledWith('/api/schedule/templates/weekly');
    });

    await waitFor(() => {
      expect(result.current.weeklySchedule.monday?.is_active).toBe(true);
      expect(result.current.hasExistingSchedule).toBe(true);
    });
  });

  it('should generate default schedule', async () => {
    const { result } = renderHook(() =>
      useScheduleConfigForm({
        open: true,
        onScheduleUpdated: mockOnScheduleUpdated
      })
    );

    await waitFor(() => {
      expect(result.current.weeklySchedule).toBeDefined();
    });

    await act(async () => {
      await result.current.generateDefaultSchedule();
    });

    await waitFor(() => {
      expect(mockApiService.appointments.api.post).toHaveBeenCalledWith('/api/schedule/generate-weekly-template');
      expect(mockShowSuccess).toHaveBeenCalled();
    });
  });

  it('should add time block to a day', async () => {
    const { result } = renderHook(() =>
      useScheduleConfigForm({
        open: true,
        onScheduleUpdated: mockOnScheduleUpdated
      })
    );

    await waitFor(() => {
      expect(result.current.weeklySchedule).toBeDefined();
    });

    // Set up a day with existing schedule
    act(() => {
      result.current.weeklySchedule.monday = {
        id: 1,
        day_of_week: 0,
        time_blocks: [{ id: 1, start_time: '09:00', end_time: '12:00' }],
        is_active: true
      };
    });

    await act(async () => {
      await result.current.addTimeBlock(0); // Monday
    });

    await waitFor(() => {
      expect(mockApiService.appointments.api.put).toHaveBeenCalled();
    });
  });

  it('should remove time block from a day', async () => {
    const { result } = renderHook(() =>
      useScheduleConfigForm({
        open: true,
        onScheduleUpdated: mockOnScheduleUpdated
      })
    );

    await waitFor(() => {
      expect(result.current.weeklySchedule).toBeDefined();
    });

    // Set up a day with multiple time blocks
    act(() => {
      result.current.weeklySchedule.monday = {
        id: 1,
        day_of_week: 0,
        time_blocks: [
          { id: 1, start_time: '09:00', end_time: '12:00' },
          { id: 2, start_time: '14:00', end_time: '18:00' }
        ],
        is_active: true
      };
    });

    await act(async () => {
      await result.current.removeTimeBlock(0, 0); // Monday, first block
    });

    await waitFor(() => {
      expect(mockApiService.appointments.api.put).toHaveBeenCalled();
    });
  });

  it('should update time block', async () => {
    const { result } = renderHook(() =>
      useScheduleConfigForm({
        open: true,
        onScheduleUpdated: mockOnScheduleUpdated
      })
    );

    await waitFor(() => {
      expect(result.current.weeklySchedule).toBeDefined();
    });

    // Set up a day with time blocks
    act(() => {
      result.current.weeklySchedule.monday = {
        id: 1,
        day_of_week: 0,
        time_blocks: [
          { id: 1, start_time: '09:00', end_time: '12:00' }
        ],
        is_active: true
      };
    });

    act(() => {
      result.current.updateTimeBlock(0, 0, 'start_time', '10:00');
    });

    await waitFor(() => {
      expect(result.current.weeklySchedule.monday?.time_blocks[0].start_time).toBe('10:00');
    });
  });

  it('should toggle day active state', async () => {
    const { result } = renderHook(() =>
      useScheduleConfigForm({
        open: true,
        onScheduleUpdated: mockOnScheduleUpdated
      })
    );

    await waitFor(() => {
      expect(result.current.weeklySchedule).toBeDefined();
    });

    // Set up a day
    act(() => {
      result.current.weeklySchedule.monday = {
        id: 1,
        day_of_week: 0,
        time_blocks: [{ id: 1, start_time: '09:00', end_time: '18:00' }],
        is_active: false
      };
    });

    await act(async () => {
      await result.current.toggleDayActive(0, true); // Monday, activate
    });

    await waitFor(() => {
      expect(mockApiService.appointments.api.put).toHaveBeenCalled();
      expect(mockShowSuccess).toHaveBeenCalled();
    });
  });

  it('should format time string to Date', async () => {
    const { result } = renderHook(() =>
      useScheduleConfigForm({
        open: true,
        onScheduleUpdated: mockOnScheduleUpdated
      })
    );

    await waitFor(() => {
      expect(result.current.formatTime).toBeDefined();
    });

    const date = result.current.formatTime('14:30');
    expect(date).toBeInstanceOf(Date);
    expect(date?.getHours()).toBe(14);
    expect(date?.getMinutes()).toBe(30);
  });

  it('should format Date to time string', async () => {
    const { result } = renderHook(() =>
      useScheduleConfigForm({
        open: true,
        onScheduleUpdated: mockOnScheduleUpdated
      })
    );

    await waitFor(() => {
      expect(result.current.formatTimeToString).toBeDefined();
    });

    const testDate = new Date();
    testDate.setHours(14, 30, 0, 0);
    const timeString = result.current.formatTimeToString(testDate);
    expect(timeString).toBe('14:30');
  });

  it('should handle save all schedules', async () => {
    const { result } = renderHook(() =>
      useScheduleConfigForm({
        open: true,
        onScheduleUpdated: mockOnScheduleUpdated
      })
    );

    await waitFor(() => {
      expect(result.current.weeklySchedule).toBeDefined();
    });

    // Set up active schedules
    act(() => {
      result.current.weeklySchedule.monday = {
        id: 1,
        day_of_week: 0,
        time_blocks: [{ id: 1, start_time: '09:00', end_time: '18:00' }],
        is_active: true
      };
      result.current.weeklySchedule.tuesday = {
        id: 2,
        day_of_week: 1,
        time_blocks: [{ id: 2, start_time: '09:00', end_time: '18:00' }],
        is_active: true
      };
    });

    await act(async () => {
      await result.current.handleSave();
    });

    await waitFor(() => {
      expect(mockShowSuccess).toHaveBeenCalled();
    });
  });

  it('should handle errors when loading schedule fails', async () => {
    mockApiService.appointments.api.get = jest.fn().mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() =>
      useScheduleConfigForm({
        open: true,
        onScheduleUpdated: mockOnScheduleUpdated
      })
    );

    await waitFor(() => {
      expect(result.current.error).toBe('Error cargando configuración de horarios');
      expect(mockShowError).toHaveBeenCalled();
    });
  });

  it('should clear error and success on close', async () => {
    const { result } = renderHook(() =>
      useScheduleConfigForm({
        open: true,
        onScheduleUpdated: mockOnScheduleUpdated
      })
    );

    await waitFor(() => {
      expect(result.current.weeklySchedule).toBeDefined();
    });

    // Set error and success
    act(() => {
      result.current.error = 'Test error';
      result.current.success = 'Test success';
    });

    act(() => {
      result.current.handleClose();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.success).toBeNull();
  });

  it('should call onScheduleUpdated when schedule is updated', async () => {
    const { result } = renderHook(() =>
      useScheduleConfigForm({
        open: true,
        onScheduleUpdated: mockOnScheduleUpdated
      })
    );

    await waitFor(() => {
      expect(result.current.weeklySchedule).toBeDefined();
    });

    // Set up a day
    act(() => {
      result.current.weeklySchedule.monday = {
        id: 1,
        day_of_week: 0,
        time_blocks: [{ id: 1, start_time: '09:00', end_time: '18:00' }],
        is_active: true
      };
    });

    await act(async () => {
      await result.current.updateDaySchedule(0, {
        day_of_week: 0,
        time_blocks: [{ id: 1, start_time: '10:00', end_time: '19:00' }],
        is_active: true
      });
    });

    await waitFor(() => {
      expect(mockOnScheduleUpdated).toHaveBeenCalled();
    });
  });
});

