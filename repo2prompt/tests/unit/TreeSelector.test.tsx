import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import type { TreeItem } from '@/api/types';
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        key: index,
        start: index * 36,
        size: 36,
      })),
    getTotalSize: () => count * 36,
  }),
}));
import { TreeSelector } from '@/components/TreeSelector/TreeSelector';
import { renderWithProviders } from '../utils';

const items: TreeItem[] = [
  { path: 'src', type: 'dir', size: 0 },
  { path: 'src/index.ts', type: 'file', size: 100 },
  { path: 'src/utils', type: 'dir', size: 0 },
  { path: 'src/utils/helper.ts', type: 'file', size: 120 },
];

describe('TreeSelector', () => {
  it('selects nested files when directory is toggled', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <TreeSelector
        items={items}
        selectedPaths={[]}
        includeGlobs={[]}
        excludeGlobs={[]}
        onChangeSelection={onChange}
      />
    );
    const dirCheckbox = screen.getAllByRole('checkbox')[0];
    expect(dirCheckbox).toHaveAttribute('aria-label', 'src');
    await user.click(dirCheckbox);
    const selection = onChange.mock.calls[0][0] as string[];
    expect(selection).toHaveLength(2);
    expect(selection).toEqual(expect.arrayContaining(['src/index.ts', 'src/utils/helper.ts']));
  });
});
