import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import ExportForm from '@/components/ExportForm';
import { renderWithProviders } from '../utils';
import { useStore } from '@/state/store';
import { endpoints } from '@/api/endpoints';

const { push } = vi.hoisted(() => ({
  push: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

describe('ExportForm', () => {
  beforeEach(() => {
    useStore.setState({
      owner: 'demo',
      repo: 'repo',
      ref: 'main',
      includeGlobs: [],
      excludeGlobs: ['node_modules/**'],
      filtersEnabled: true,
      selectedPaths: ['src/index.ts'],
      profile: 'short',
      format: 'md',
      secretScan: false,
      secretStrategy: 'REDACTED',
      tokenModel: 'openai',
      ttlHours: 24,
      maxBinarySizeMB: 50,
    });
    push.mockReset();
  });

  it('submits export request', async () => {
    const createExport = vi.spyOn(endpoints, 'createExport').mockResolvedValue({ jobId: 'job-1' });
    const user = userEvent.setup();
    renderWithProviders(
      <ExportForm
        stats={{ totalFiles: 1, selectedCount: 1, selectedSize: 1024, autoExcludedCount: 0, selectedFiles: ['src/index.ts'] }}
      />,
      { withToaster: true }
    );
    await user.click(screen.getByRole('button', { name: /создать экспорт/i }));
    expect(createExport).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith('/jobs/job-1');
  });
});
