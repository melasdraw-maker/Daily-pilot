import { DailyHadith } from '../types';

export const AUTHENTIC_HADITHS: DailyHadith[] = [
  {
    id: 'h1',
    textFrench: '« Les actions ne valent que par leurs intentions, et chacun ne recevra la rétribution que de ce qu\'il a eu l\'intention d\'accomplir. » (Traduction)',
    collection: 'Sahîh al-Bukhârî & Sahîh Muslim',
    hadithNumber: 'Bukhârî n°1, Muslim n°1907',
    authenticity: 'Sahîh (Authentique - Unanimement reconnu)',
    shortExplanation: 'Fondement de toute action humaine : la sincérité dans le travail, l\'effort et les relations détermine la valeur réelle de ce que l\'on accomplit.',
    theme: 'Intention & Sincérité',
  },
  {
    id: 'h2',
    textFrench: '« Certes, Dieu aime que lorsque l\'un de vous accomplit une œuvre, il la parfait avec excellence (itqân). » (Traduction)',
    collection: 'Al-Mu\'jam al-Awsat (at-Tabarânî) & Al-Bayhaqî',
    hadithNumber: 'Rapporté par Aïcha, classé Hassan/Sahîh par al-Albânî (Silsila Sahîha n°1113)',
    authenticity: 'Hassan / Sahîh',
    shortExplanation: 'L\'éthique de l\'excellence professionnelle : l\'application rigoureuse et le sens du détail dans chaque tâche accomplie pour autrui.',
    theme: 'Excellence professionnelle (Itqân)',
  },
  {
    id: 'h3',
    textFrench: '« Le meilleur d\'entre vous est celui qui est le plus utile aux gens. » (Traduction)',
    collection: 'Al-Mu\'jam al-Awsat d\'at-Tabarânî',
    hadithNumber: 'n°5787, authentifié par al-Albânî dans Sahîh al-Jâmi\' n°3289',
    authenticity: 'Hassan / Sahîh',
    shortExplanation: 'La grandeur réside dans le service rendu, la transmission pédagogique et l\'impact positif sur la vie et la sécurité des autres.',
    theme: 'Service & Utilité aux autres',
  },
  {
    id: 'h4',
    textFrench: '« Celui qui emprunte un chemin à la recherche d\'une science, Dieu lui facilite par cela un chemin vers le Paradis. » (Traduction)',
    collection: 'Sahîh Muslim',
    hadithNumber: 'Muslim n°2699',
    authenticity: 'Sahîh (Authentique)',
    shortExplanation: 'Valorisation de l\'apprentissage continu, de la pédagogie et des déplacements pour acquérir et transmettre le savoir utile.',
    theme: 'Savoir & Apprentissage',
  },
  {
    id: 'h5',
    textFrench: '« La patience est une lumière resplendissante. » (Traduction)',
    collection: 'Sahîh Muslim',
    hadithNumber: 'Extrait du hadith de Muslim n°223',
    authenticity: 'Sahîh (Authentique)',
    shortExplanation: 'La patience (sabr) est une source de lucidité face aux imprévus de la route, aux retards ou aux défis de l\'enseignement.',
    theme: 'Patience & Maîtrise de soi',
  },
  {
    id: 'h6',
    textFrench: '« Ne causez ni préjudice, ni préjudice en retour (Lâ darar wa lâ dirâr). » (Traduction)',
    collection: 'Sunan Ibn Mâjah & Al-Muwatta (Mâlik)',
    hadithNumber: 'Ibn Mâjah n°2340, validé par an-Nawawî (Hadith 32 des 40)',
    authenticity: 'Sahîh / Hassan',
    shortExplanation: 'Principe juridique et universel de la prévention des risques, de la sécurité des personnes sur les chantiers et au travail.',
    theme: 'Prévention & Sécurité',
  },
  {
    id: 'h7',
    textFrench: '« Celui qui ne remercie pas les gens ne remercie pas Dieu. » (Traduction)',
    collection: 'Sunan Abû Dâwûd & Sunan at-Tirmidhî',
    hadithNumber: 'Abû Dâwûd n°4811, at-Tirmidhî n°1954 (Sahîh)',
    authenticity: 'Sahîh (Authentique)',
    shortExplanation: 'La reconnaissance envers les collègues, les clients, les stagiaires et les proches est une condition fondamentale de la gratitude.',
    theme: 'Gratitude & Reconnaissance',
  },
];

export function getTodayHadith(): DailyHadith {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24
  );
  return AUTHENTIC_HADITHS[dayOfYear % AUTHENTIC_HADITHS.length];
}
