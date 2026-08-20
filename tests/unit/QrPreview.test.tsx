import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { QrPreview } from '@/components/molecules/QrPreview';

describe('QrPreview', () => {
  it('is an image with a name, not a decorative blob', () => {
    render(<QrPreview url="https://cupdom.fr/s/demo-rex-club" />);
    expect(screen.getByRole('img', { name: 'QR code de la campagne : https://cupdom.fr/s/demo-rex-club' })).toBeInTheDocument();
  });

  it('draws with charte colours, never a raw hex', () => {
    const { container } = render(<QrPreview url="https://cupdom.fr/s/demo-rex-club" />);
    const svg = container.querySelector('svg');
    expect(svg?.querySelector('g')?.getAttribute('fill')).toBe('#111110');
    expect(svg?.querySelector('rect')?.getAttribute('fill')).toBe('#FFFFFF');
  });
});
