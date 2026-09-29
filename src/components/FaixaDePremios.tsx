/**
 * ============================================
 * FAIXA DE PRÊMIOS — PÁGINA INICIAL
 * ============================================
 *
 * Cita de forma curta os prêmios e artigos do FavelaWare, com link para a
 * página Reconhecimentos (que tem as fotos e os textos completos).
 * Dados em src/data/reconhecimentos.ts, os mesmos da página.
 */
import { motion } from 'framer-motion';

import { MotionLink } from './MotionLink';
import { cascata, surgirDeBaixo } from './animacoes';
import { artigos, premios } from '../data/reconhecimentos';

/** Selos da faixa: primeiro os prêmios, depois os artigos */
const selos = [
  ...premios.map((premio) => ({
    icone: premio.icone,
    texto: premio.concedidoPor ? `${premio.titulo} · ${premio.concedidoPor}` : premio.titulo,
  })),
  ...artigos.map((artigo) => ({ icone: artigo.icone, texto: `Artigo científico ${artigo.ano}` })),
];

const FaixaDePremios: React.FC = () => {
  return (
    <section aria-label="Prêmios e reconhecimentos" className="bg-[#2d2a5f] border-y-4 border-favela-green-500">
      <motion.div
        variants={cascata(0.15)}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-wrap items-center justify-center gap-3 md:gap-4"
      >
        {selos.map((selo) => (
          <motion.span
            key={selo.texto}
            variants={surgirDeBaixo}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white font-semibold text-sm md:text-base"
          >
            <span aria-hidden="true">{selo.icone}</span>
            {selo.texto}
          </motion.span>
        ))}

        <motion.span variants={surgirDeBaixo}>
          <MotionLink
            to="/reconhecimentos"
            className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-favela-green-500 font-bold text-sm md:text-base hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#2d2a5f]"
            whileHover={{ x: 4 }}
          >
            ver reconhecimentos
            <span aria-hidden="true">→</span>
          </MotionLink>
        </motion.span>
      </motion.div>
    </section>
  );
};

export default FaixaDePremios;
