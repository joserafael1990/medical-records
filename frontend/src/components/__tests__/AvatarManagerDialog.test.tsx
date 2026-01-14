import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AvatarManagerDialog } from '../dialogs/AvatarManagerDialog';

const mockFetchAvatars = jest.fn();
const mockUploadAvatar = jest.fn();
const mockSelectAvatar = jest.fn().mockResolvedValue(true);
const mockDeleteCustomAvatar = jest.fn();

jest.mock('../../hooks/useAvatarManager', () => ({
  useAvatarManager: () => ({
    loading: false,
    error: null,
    preloaded: [
      {
        type: 'preloaded',
        key: 'demo',
        template_key: 'demo',
        templateKey: 'demo',
        filename: 'demo.png',
        url: '/static/doctor_avatars/preloaded/demo.png'
      }
    ],
    custom: [],
    current: {
      avatar_type: 'initials',
      avatar_template_key: null,
      avatar_file_path: null,
      url: null,
      avatar_url: null
    },
    fetchAvatars: mockFetchAvatars,
    uploadAvatar: mockUploadAvatar,
    selectAvatar: mockSelectAvatar,
    deleteCustomAvatar: mockDeleteCustomAvatar
  })
}));

describe('AvatarManagerDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders preloaded avatars when open', () => {
    render(
      <AvatarManagerDialog
        open
        onClose={() => {}}
      />
    );

    expect(screen.getByText('demo')).toBeInTheDocument();
    expect(mockFetchAvatars).toHaveBeenCalled();
  });

  it('calls selectAvatar when resetting to initials', async () => {
    render(
      <AvatarManagerDialog
        open
        onClose={() => {}}
      />
    );

    fireEvent.click(screen.getByText(/Usar iniciales/i));

    await waitFor(() => {
      expect(mockSelectAvatar).toHaveBeenCalledWith('initials', undefined);
    });
  });
});

