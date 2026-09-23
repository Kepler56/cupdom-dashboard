import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CampaignHeader } from '@/components/organisms/CampaignHeader';
import type { CampaignHeaderView } from '@/lib/analytics/campaign';

const header: CampaignHeaderView = {
  name: 'Rex Club — Été',
  active: true,
  product: 'Couvercle 40 cl',
  venue: 'Rex Club',
  destination: { href: 'https://demo-nightlife.test/rex?utm_source=cupdom', host: 'demo-nightlife.test' },
  createdLabel: '17 mai 2026',
  productImage: null,
};

const url = 'https://cupdom.fr/s/demo-rex-club';

describe('CampaignHeader', () => {
  it('names the campaign as the page heading', () => {
    render(<CampaignHeader header={header} scanUrl={url} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Rex Club — Été' })).toBeInTheDocument();
  });

  it('shows the destination by host and links to the whole URL', () => {
    render(<CampaignHeader header={header} scanUrl={url} />);
    const link = screen.getByRole('link', { name: 'demo-nightlife.test' });
    expect(link).toHaveAttribute('href', 'https://demo-nightlife.test/rex?utm_source=cupdom');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('renders the scan URL as text beside the code, so the two can be compared', () => {
    render(<CampaignHeader header={header} scanUrl={url} />);
    expect(screen.getByText(url, { exact: true })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: `QR code de la campagne : ${url}` })).toBeInTheDocument();
  });

  it('omits a field rather than printing an empty one', () => {
    render(
      <CampaignHeader
        header={{ ...header, product: null, venue: null, destination: null, createdLabel: null }}
        scanUrl={url}
      />,
    );
    expect(screen.queryByText('Produit')).not.toBeInTheDocument();
    expect(screen.queryByText('Lieu')).not.toBeInTheDocument();
    expect(screen.queryByText('Destination')).not.toBeInTheDocument();
    expect(screen.queryByText('Lancée le')).not.toBeInTheDocument();
  });

  it('carries the state as a badge', () => {
    render(<CampaignHeader header={{ ...header, active: false }} scanUrl={url} />);
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('renders the product photo when the CRM set one (#8)', () => {
    render(
      <CampaignHeader
        header={{ ...header, productImage: 'https://uqkbvwyspeqwlbulgzkj.supabase.co/storage/v1/object/public/sponsor-media/products/rex/p.jpg' }}
        scanUrl={url}
      />,
    );
    const photo = screen.getByRole('img', { name: 'Photo du produit — Rex Club — Été' });
    expect(photo).toHaveAttribute('src', expect.stringContaining('/sponsor-media/products/rex/p.jpg'));
  });

  it('shows NO product image when none is set — a real no-photo layout, not a broken frame', () => {
    render(<CampaignHeader header={{ ...header, productImage: null }} scanUrl={url} />);
    // The only image on the header is then the QR; no product photo alt appears.
    expect(screen.queryByRole('img', { name: /Photo du produit/ })).not.toBeInTheDocument();
  });
});
