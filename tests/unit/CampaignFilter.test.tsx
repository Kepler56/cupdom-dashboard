import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CampaignFilter } from '@/components/molecules/CampaignFilter';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams('p=7j'),
}));

const campaigns = [
  { slug: 'nike-ete', name: 'Nike été' },
  { slug: 'nike-hiver', name: 'Nike hiver' },
];

describe('CampaignFilter', () => {
  it('offers an all-campaigns option', () => {
    render(<CampaignFilter campaigns={campaigns} current={null} />);
    expect(screen.getByRole('option', { name: 'Toutes les campagnes' })).toBeInTheDocument();
  });

  // Changing campaign must not silently reset the period the client chose.
  it('preserves the other URL parameters when the campaign changes', async () => {
    render(<CampaignFilter campaigns={campaigns} current={null} />);
    await userEvent.selectOptions(screen.getByRole('combobox'), 'nike-hiver');
    expect(push).toHaveBeenCalledWith(expect.stringContaining('p=7j'));
    expect(push).toHaveBeenCalledWith(expect.stringContaining('c=nike-hiver'));
  });

  // A dropdown with one real option is furniture, not a control.
  it('renders nothing when there is only one campaign', () => {
    const { container } = render(<CampaignFilter campaigns={[campaigns[0]]} current={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
