import { readdirSync } from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NAV, Sidebar } from '@/components/organisms/Sidebar';

/**
 * Every route the portal actually serves, read off the filesystem rather than
 * typed out here.
 *
 * A hand-written list would have to be kept in step with the app directory by
 * the same person who forgets to, which is how /contacts and /compte stayed in
 * the nav for two stages. Dynamic segments are skipped: `[slug]` is not a
 * destination a nav item can point at.
 */
function portalRoutes(dir = path.resolve(__dirname, '../../app/(portal)'), prefix = ''): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name === 'page.tsx') out.push(prefix === '' ? '/' : prefix);
    if (entry.isDirectory() && !entry.name.startsWith('[')) {
      out.push(...portalRoutes(path.join(dir, entry.name), `${prefix}/${entry.name}`));
    }
  }
  return out;
}

describe('Sidebar', () => {
  it('renders one link per nav entry', () => {
    render(<Sidebar pathname="/" />);
    expect(screen.getAllByRole('link')).toHaveLength(NAV.length);
  });

  it('marks the current section, matching a detail page to its section', () => {
    render(<Sidebar pathname="/campagnes/demo-rex-club" />);
    expect(screen.getByRole('link', { name: /Campagnes/ })).toHaveAttribute('aria-current', 'page');
  });

  it('does not mark « Vue d’ensemble » on every page just because its href is /', () => {
    render(<Sidebar pathname="/audience" />);
    expect(screen.getByRole('link', { name: /Vue d'ensemble/ })).not.toHaveAttribute('aria-current');
  });
});

// A dead link in a client-facing product is worse than an absent one —
// LeadsPreview states the same rule in this branch for its missing export link.
// The sidebar is on every portal page, so a nav entry pointing at nothing sends
// a paying sponsor to a 404 from anywhere in the product.
describe('Sidebar — every nav entry points at a route that exists', () => {
  it('has no dead destinations', () => {
    const routes = portalRoutes();
    // Sanity: if this ever came back empty the assertion below would pass
    // vacuously for a nav full of dead links.
    expect(routes).toContain('/campagnes');

    for (const item of NAV) {
      expect(routes, `${item.href} (« ${item.label} ») is in the nav`).toContain(item.href);
    }
  });

  it('does not link the stage-4 route before stage 4 ships it', () => {
    const hrefs = NAV.map((item) => item.href);
    expect(hrefs).not.toContain('/compte');
  });
});
