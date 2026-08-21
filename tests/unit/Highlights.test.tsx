import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Highlights } from '@/components/organisms/Highlights';
import type { Insight } from '@/lib/analytics/insights';

const insight = (over: Partial<Insight> = {}): Insight => ({
  id: 'pic',
  strength: 0.8,
  lead: 'Votre pic : ',
  emphasis: 'samedi 23 h',
  tail: ' — 34 % de vos scans sur la période.',
  ...over,
});

describe('Highlights', () => {
  it('renders one bullet per insight', () => {
    render(<Highlights insights={[insight(), insight({ id: 'villes', emphasis: 'Paris, Lyon' })]} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('emphasises the fragment the insight marked, and only that fragment', () => {
    render(<Highlights insights={[insight()]} />);
    const strong = screen.getByText('samedi 23 h');
    expect(strong.tagName).toBe('STRONG');
  });

  it('renders the whole sentence, not just the emphasis', () => {
    render(<Highlights insights={[insight()]} />);
    // The lead, the <strong> emphasis and the tail are three sibling nodes, so
    // RTL's default text matcher — which only ever looks at a node's own direct
    // text-node children — can never see the sentence as one string; that is
    // what "the text is broken up by multiple elements" means. A function
    // matcher gets the element itself as its second argument, so it can check
    // textContent directly, which does walk the nested <strong>.
    const sentence = screen.getByText((_, element) => {
      return (
        element?.tagName.toLowerCase() === 'p' &&
        /Votre pic : samedi 23 h — 34/.test(element.textContent ?? '')
      );
    });
    expect(sentence).toBeInTheDocument();
  });

  it('renders the scope caveat as a muted parenthetical when the insight carries one', () => {
    // Spec §4.9. dropoffInsight is the one insight that is not period-scoped
    // (client_funnel takes no date parameters), and says so via `note` rather
    // than folding it into `tail` — see lib/analytics/insights.ts.
    render(<Highlights insights={[insight({ note: 'depuis le début' })]} />);
    expect(screen.getByText('(depuis le début)')).toBeInTheDocument();
  });

  it('adds no caveat when the insight does not carry one', () => {
    render(<Highlights insights={[insight()]} />);
    const sentence = screen.getByText((_, element) => {
      return (
        element?.tagName.toLowerCase() === 'p' &&
        /Votre pic : samedi 23 h — 34/.test(element.textContent ?? '')
      );
    });
    expect(sentence.textContent).not.toContain('(');
  });

  it('says there is not enough data rather than rendering an empty card', () => {
    // Spec §4.6-3. A « Temps forts » card containing nothing reads as a broken
    // feature; saying why is the honest version and costs one sentence.
    render(<Highlights insights={[]} />);
    expect(screen.getByText('Pas encore assez de données')).toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('always renders its heading, so the strip does not vanish silently', () => {
    render(<Highlights insights={[]} />);
    expect(screen.getByRole('heading', { name: 'Temps forts' })).toBeInTheDocument();
  });
});
