/**
 * Artigos científicos e prêmios do FavelaWare: a página Reconhecimentos mostra
 * tudo; a Home cita de forma curta (FaixaDePremios).
 */
import type { ArtigoCientifico, Premio } from '../types';

// ============================================
// DADOS DOS ARTIGOS CIENTÍFICOS
// ============================================

export const artigos: ArtigoCientifico[] = [
  {
    id: 1,
    titulo:
      'Extension Project Based on Flipped Classroom to the Development of Hard and Soft Skills in Brazilian Outskirts: Case studies',
    descricao:
      'Artigo científico sobre o projeto de extensão baseado em sala de aula invertida para o desenvolvimento de habilidades técnicas e comportamentais em comunidades brasileiras.',
    doi: 'https://doi.org/10.33422/ijsfle.v2i2.464',
    ano: '2024',
    icone: '📄',
  },
];

// ============================================
// DADOS DOS PRÊMIOS
// ============================================

export const premios: Premio[] = [
  {
    id: 1,
    titulo: 'Prêmio Ser Humano 2023',
    descricao:
      'Reconhecimento pela ABRH-Brasil pelo impacto social e desenvolvimento humano através da capacitação de jovens programadores em comunidades de Belo Horizonte/MG.',
    ano: '2023',
    concedidoPor: 'ABRH-Brasil',
    link: 'https://www.abrhbrasil.org.br/psh/',
    imagens: ['/imgs/gallery/premiacao-01.webp', '/imgs/gallery/premiacao-02.webp', '/imgs/gallery/premiacao-03.webp'],
    icone: '🏆',
  },
];
