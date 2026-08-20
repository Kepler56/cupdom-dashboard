/**
 * Active / Inactive, in one place.
 *
 * Extracted from CampaignsTable because the detail header needs the same pill,
 * and two hand-rolled copies of a status colour are how a product ends up with
 * two slightly different greens.
 *
 * Contrast, measured rather than assumed: the inactive pill sits on Crème
 * (#F4EFE3). --text-muted #8A8478 against it is **3.24:1** — below AA's 4.5:1,
 * at 12 px. --text-body #4A4741 is **8.07:1**. The table shipped the muted
 * version in stage 2B; extracting the component is the moment to correct it.
 *
 * This is a LOCAL swap between two existing tokens, not a palette change: the
 * open question about --text-muted app-wide is the product owner's and is left
 * exactly where it is.
 */
export function StateBadge({ active }: { active: boolean }) {
  return (
    <span
      className={[
        'inline-block rounded-[var(--radius-pill)] px-2.5 py-0.5 text-xs',
        active ? 'bg-signal text-ink' : 'border border-border bg-canvas text-text-body',
      ].join(' ')}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}
