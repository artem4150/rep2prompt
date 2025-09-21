import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JobProgress from '@/components/JobProgress';
import { renderWithProviders } from '../utils';

const { refetch } = vi.hoisted(() => ({
  refetch: vi.fn(),
}));
vi.mock('@/hooks/useJobPolling', () => ({
  useJobPolling: () => ({ data: { state: 'running', progress: 60 }, refetch }),
}));

const { push } = vi.hoisted(() => ({
  push: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: push }),
}));

const { cancelJob } = vi.hoisted(() => ({
  cancelJob: vi.fn(),
}));
vi.mock('@/api/endpoints', () => ({
  endpoints: {
    cancelJob,
  },
}));

describe('JobProgress', () => {
  it('renders stages and allows cancel', async () => {
    const user = userEvent.setup();
    renderWithProviders(<JobProgress jobId="job-1" />, { withToaster: true });
    expect(screen.getByText(/60%/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /отменить/i }));
    expect(cancelJob).toHaveBeenCalledWith('job-1');
  });
});
