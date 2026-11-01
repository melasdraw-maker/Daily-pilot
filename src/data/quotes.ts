import { MotivationalQuote } from '../types';

export const MOTIVATIONAL_QUOTES: MotivationalQuote[] = [
  {
    id: 'q1',
    quote: 'La persévérance ne consiste pas à courir sans arrêt, mais à reprendre la route à chaque aube avec la même exigence.',
    theme: 'persévérance',
    author: 'Proverbe d\'action',
  },
  {
    id: 'q2',
    quote: 'Transmettre un savoir exige autant de rigueur dans sa préparation que d\'humilité dans son écoute.',
    theme: 'apprentissage',
    author: 'Pédagogie professionnelle',
  },
  {
    id: 'q3',
    quote: 'La discipline est le pont invisible mais solide entre l\'intention du départ et la réussite de la journée.',
    theme: 'discipline',
    author: 'Éthique du travail',
  },
  {
    id: 'q4',
    quote: 'Chaque route parcourue est une opportunité d\'apporter de la valeur, de la sécurité et du sens aux équipes que tu formes.',
    theme: 'responsabilité',
    author: 'Guide du formateur',
  },
  {
    id: 'q5',
    quote: 'La patience attentive transforme la complexité d\'un chantier en une leçon de maîtrise durable.',
    theme: 'patience',
    author: 'Sagesse pratique',
  },
  {
    id: 'q6',
    quote: 'La gratitude commence par reconnaître chaque nouvelle journée de route comme un terrain de progression personnelle.',
    theme: 'gratitude',
    author: 'Réflexion matinale',
  },
  {
    id: 'q7',
    quote: 'Former autrui, c\'est protéger des vies : la sécurité sur le terrain naît de la clarté de tes consignes.',
    theme: 'service',
    author: 'Sécurité & Prévention',
  },
  {
    id: 'q8',
    quote: 'La régularité des petits efforts quotidiens bâtit les compétences les plus inébranlables.',
    theme: 'progression',
    author: 'Maxime d\'artisan',
  },
];

export function getTodayQuote(favoriteThemes: string[] = []): MotivationalQuote {
  const filtered = favoriteThemes.length > 0
    ? MOTIVATIONAL_QUOTES.filter((q) => favoriteThemes.includes(q.theme))
    : MOTIVATIONAL_QUOTES;
  const list = filtered.length > 0 ? filtered : MOTIVATIONAL_QUOTES;
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24
  );
  return list[dayOfYear % list.length];
}
