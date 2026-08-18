import { League_Spartan, Space_Grotesk } from 'next/font/google';

/** Titres et grands nombres. Charte §06: 700–900, tracking −2%. */
export const leagueSpartan = League_Spartan({
  subsets: ['latin'],
  weight: ['700', '800', '900'],
  variable: '--font-display',
  display: 'swap',
});

/** Texte, interface, axes. Charte §06: 400–600. */
export const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
});
