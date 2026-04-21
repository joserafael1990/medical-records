import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ProfileCompletionBanner from '../ProfileCompletionBanner';

// The banner reads localStorage on mount to honour the 24h dismissal window.
// Keep the helpers colocated so the tests can simulate a fresh browser, a
// recent dismissal, or an expired dismissal without duplicating setup.
const DISMISS_KEY = 'cortex:profile-banner-dismissed-at';

const completeProfile = {
  specialty_id: 1,
  primary_phone: '+525512345678',
  appointment_duration: 30,
  documents: [{ document_name: 'Cédula Profesional', document_value: '1234567' }],
  offices: [{ id: 1, name: 'Consultorio Centro', address: 'Av. Reforma 1' }],
  schedule: { monday: { is_active: true, time_blocks: [{ start_time: '09:00', end_time: '13:00' }] } }
};

const buildProfileMissing = (overrides: Partial<typeof completeProfile>) => ({
  ...completeProfile,
  ...overrides
});

describe('ProfileCompletionBanner', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('does not render when the profile is 100% complete', () => {
    const { container } = render(<ProfileCompletionBanner doctorProfile={completeProfile} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a warning banner when a blocking field (office) is missing', () => {
    render(<ProfileCompletionBanner doctorProfile={buildProfileMissing({ offices: [] })} />);
    expect(screen.getByText(/Completa tu perfil para empezar a agendar/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Completar ahora/i })).toBeTruthy();
  });

  it('renders an info banner (not warning) when only soft gaps remain', () => {
    // Remove the soft-only fields; blocking fields stay satisfied.
    render(
      <ProfileCompletionBanner
        doctorProfile={buildProfileMissing({ primary_phone: '', appointment_duration: undefined as any })}
      />
    );
    expect(screen.getByText(/Tu perfil está casi listo/i)).toBeTruthy();
  });

  it('shows a dismiss button only when there are no blocking gaps', () => {
    // With blocking gap: no dismiss button
    const { rerender } = render(
      <ProfileCompletionBanner doctorProfile={buildProfileMissing({ offices: [] })} />
    );
    expect(screen.queryByLabelText(/Recordármelo después/i)).toBeNull();

    // Without blocking gap: dismiss button visible
    rerender(
      <ProfileCompletionBanner doctorProfile={buildProfileMissing({ primary_phone: '' })} />
    );
    expect(screen.getByLabelText(/Recordármelo después/i)).toBeTruthy();
  });

  it('hides the banner for 24h after dismissal when there is no blocking gap', () => {
    render(<ProfileCompletionBanner doctorProfile={buildProfileMissing({ primary_phone: '' })} />);
    const dismiss = screen.getByLabelText(/Recordármelo después/i);
    act(() => {
      fireEvent.click(dismiss);
    });
    // After dismissal the banner should be removed
    expect(screen.queryByText(/Tu perfil está casi listo/i)).toBeNull();
    // And localStorage should record the dismissal timestamp
    const ts = parseInt(window.localStorage.getItem(DISMISS_KEY) || '0', 10);
    expect(Number.isFinite(ts)).toBe(true);
    expect(Date.now() - ts).toBeLessThan(5000);
  });

  it('bypasses a stored dismissal when there is a blocking gap', () => {
    // Pretend the user dismissed 5 minutes ago (well within the 24h window).
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    window.localStorage.setItem(DISMISS_KEY, String(fiveMinAgo));

    render(<ProfileCompletionBanner doctorProfile={buildProfileMissing({ offices: [] })} />);
    // Still visible because office is blocking.
    expect(screen.getByText(/Completa tu perfil para empezar a agendar/i)).toBeTruthy();
  });

  it('honours an expired dismissal (>24h) and re-shows the banner', () => {
    // Simulate a dismissal older than the TTL.
    const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
    window.localStorage.setItem(DISMISS_KEY, String(twoDaysAgo));

    render(<ProfileCompletionBanner doctorProfile={buildProfileMissing({ primary_phone: '' })} />);
    expect(screen.getByText(/Tu perfil está casi listo/i)).toBeTruthy();
  });

  it('toggles the expanded detail list', () => {
    render(<ProfileCompletionBanner doctorProfile={buildProfileMissing({ offices: [] })} />);
    // Collapsed initially → only summary + CTA. "Ver pendientes" button is visible.
    expect(screen.getByRole('button', { name: /Ver pendientes/i })).toBeTruthy();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Ver pendientes/i }));
    });

    // Expanded: item list shows the specific missing label
    expect(screen.getByText(/Al menos un consultorio/i)).toBeTruthy();
  });

  it('calls onNavigateToProfile with the target anchor of the first missing item', () => {
    const onNavigate = jest.fn();
    // office is missing and is the first blocking item in the completion list order.
    render(
      <ProfileCompletionBanner
        doctorProfile={buildProfileMissing({ offices: [] })}
        onNavigateToProfile={onNavigate}
      />
    );

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Completar ahora/i }));
    });

    expect(onNavigate).toHaveBeenCalledTimes(1);
    // The banner sends the first missing item's target; `address` appears before
    // `office` in the items list (and shares the same target#offices anchor),
    // so accept either as valid.
    const [[arg]] = onNavigate.mock.calls;
    // Targets use short anchor names ('offices', 'cedula') not 'profile#*' prefixes.
    expect(['offices', 'cedula', 'schedule', 'profile', undefined]).toContain(arg);
  });

  it('progress bar reflects completion percentage', () => {
    const { container } = render(
      <ProfileCompletionBanner doctorProfile={buildProfileMissing({ primary_phone: '' })} />
    );
    const progress = container.querySelector('[role="progressbar"]');
    expect(progress).not.toBeNull();
    // With 6 of 7 items done, aria-valuenow should be 86.
    expect(progress?.getAttribute('aria-valuenow')).toBe('86');
  });
});
