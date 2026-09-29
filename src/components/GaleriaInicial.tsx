/**
 * ============================================
 * GALERIA DA PÁGINA INICIAL
 * ============================================
 *
 * Prévia da página Galeria: o mesmo carrossel dela, com as fotos mais
 * recentes da edição mais nova, e o botão para ver todas.
 *
 * Funcionalidades:
 * - Carrossel de duas fileiras (CarrosselDeFotos), na largura toda da tela
 * - Clicar numa foto abre ela em tela cheia (Lightbox)
 * - Animações de entrada
 */

import { useCallback, useState } from 'react';
// Importa ferramentas de animação
import { motion } from 'framer-motion';
// Link do React Router que aceita animações do Framer Motion
import { MotionLink } from './MotionLink';
import CarrosselDeFotos from './CarrosselDeFotos';
import Lightbox, { type FotoLightbox } from './Lightbox';
import { edicoesDaGaleria, enderecoDaFoto, previaDaEdicao, type FotoDaGaleria } from '../data/galeria';

/** Quantas fotos a prévia mostra (o resto fica na página Galeria) */
const FOTOS_NA_PREVIA = 16;

// A primeira edição da lista é a mais recente; a prévia mistura os eventos dela
const edicaoMaisRecente = edicoesDaGaleria[0];
const fotosDaPrevia = previaDaEdicao(edicaoMaisRecente.fotos, FOTOS_NA_PREVIA);

const GaleriaInicial: React.FC = () => {
  // Foto aberta em tela cheia. null significa "nenhuma aberta".
  const [fotoAberta, setFotoAberta] = useState<FotoLightbox | null>(null);

  // useCallback mantém a mesma função entre renders: o Lightbox usa aoFechar
  // como dependência do useEffect da tecla Esc
  const fecharFoto = useCallback(() => setFotoAberta(null), []);
  const abrirFoto = useCallback(
    (foto: FotoDaGaleria) => setFotoAberta({ src: enderecoDaFoto(foto, 'ampliada'), legenda: foto.legenda }),
    [],
  );

  return (
    <section id="galeria" className="relative py-20 bg-gradient-to-br from-white via-gray-50 to-white overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-96 h-96 bg-favela-green-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-favela-blue-500/20 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-gradient from-favela-green-500 via-favela-blue-500 to-favela-green-500 text-4xl md:text-6xl font-black mb-4">
            Galeria
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Momentos mais recentes da {edicaoMaisRecente.titulo} do{' '}
            <span className="font-bold text-favela-green-500">FavelaWare</span>
          </p>
        </motion.div>
      </div>

      {/* Carrossel: usa a largura toda da tela, como na página Galeria */}
      <div className="relative z-10">
        <CarrosselDeFotos
          titulo={`Prévia das fotos da ${edicaoMaisRecente.titulo}`}
          fotos={fotosDaPrevia}
          pausado={fotoAberta !== null}
          aoAbrir={abrirFoto}
          semControles
        />
      </div>

      {/* CTA Button */}
      <motion.div
        className="relative z-10 mt-12 text-center"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <MotionLink
          to="/galeria"
          className="group relative inline-block px-8 py-4 bg-gradient-to-r from-favela-green-500 to-favela-blue-500 text-white font-bold text-lg rounded-full overflow-hidden shadow-lg"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="relative z-10 flex items-center gap-2">
            Ver Mais Fotos
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        </MotionLink>
      </motion.div>

      {/* Lightbox: a foto em tela cheia */}
      <Lightbox foto={fotoAberta} aoFechar={fecharFoto} />
    </section>
  );
};

export default GaleriaInicial;
