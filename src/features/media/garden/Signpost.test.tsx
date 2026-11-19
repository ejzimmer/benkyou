import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Signpost } from './Signpost';

describe('Signpost', () => {
  it('shows the name on its board', () => {
    render(
      <Signpost name="Les Misérables" placement={{ side: 'right', offset: 16 }}>
        <button type="button">Update</button>
      </Signpost>,
    );

    expect(screen.getByText('Les Misérables')).toBeInTheDocument();
  });

  it('hangs its signs beneath the board', () => {
    render(
      <Signpost name="Les Misérables" placement={{ side: 'right', offset: 16 }}>
        <button type="button">Update</button>
      </Signpost>,
    );

    expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument();
  });
});
