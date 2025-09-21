import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import MaskEditor from '@/components/MaskEditor';
import { renderWithProviders } from '../utils';

const presets = [
  { key: 'demo', label: 'Demo', include: ['src/**'], exclude: ['node_modules/**'] },
];

describe('MaskEditor', () => {
  it('adds include mask', async () => {
    const onInclude = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <MaskEditor
        includeGlobs={[]}
        excludeGlobs={[]}
        presets={presets}
        onChangeInclude={onInclude}
        onChangeExclude={vi.fn()}
      />
    );
    const input = screen.getAllByPlaceholderText(/pattern/)[0];
    await user.type(input, 'src/**/*.ts{enter}');
    expect(onInclude).toHaveBeenCalledWith(['src/**/*.ts']);
  });

  it('removes exclude mask', async () => {
    const onExclude = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <MaskEditor
        includeGlobs={[]}
        excludeGlobs={['node_modules/**']}
        presets={presets}
        onChangeInclude={vi.fn()}
        onChangeExclude={onExclude}
      />
    );
    await user.click(screen.getByRole('button', { name: /удалить node_modules/i }));
    expect(onExclude).toHaveBeenCalledWith([]);
  });

  it('applies preset', async () => {
    const onInclude = vi.fn();
    const onExclude = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <MaskEditor
        includeGlobs={[]}
        excludeGlobs={[]}
        presets={presets}
        onChangeInclude={onInclude}
        onChangeExclude={onExclude}
      />
    );
    await user.click(screen.getByRole('button', { name: /пресеты/i }));
    await user.click(screen.getByRole('menuitem', { name: /demo/i }));
    expect(onInclude).toHaveBeenCalledWith(presets[0].include);
    expect(onExclude).toHaveBeenCalledWith(presets[0].exclude);
  });
});
