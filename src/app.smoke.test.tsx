import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('App smoke', () => {
  it('renders a basic react surface with RTL + Vitest', () => {
    render(<div>SiteProof smoke</div>);
    expect(screen.getByText(/siteproof/i)).toBeInTheDocument();
  });
});
