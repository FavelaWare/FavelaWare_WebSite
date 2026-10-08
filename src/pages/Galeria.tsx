/**
 * ============================================
 * PÁGINA GALERIA
 * ============================================
 *
 * Mostra as fotos dos eventos, aulas e premiações do FavelaWare,
 * separadas por edição (da mais recente para a mais antiga). Cada edição
 * é um carrossel (CarrosselDeFotos).
 *
 * Clicar numa foto abre ela em tela cheia (componente Lightbox).
 *
 * Conceitos importantes:
 * - useState: guarda qual foto está aberta em tela cheia (null = nenhuma)
 */

import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Lightbox, { type FotoLightbox } from '../components/Lightbox';
import CabecalhoDaPagina from '../components/CabecalhoDaPagina';
import CarrosselDeFotos from '../components/CarrosselDeFotos';
import { surgirDeBaixo } from '../components/animacoes';

import { edicoesDaGaleria, enderecoDaFoto, type FotoDaGaleria } from '../data/galeria';

const Galeria: React.FC = () => {
  // ============================================
  // ESTADO DO LIGHTBOX
  // ============================================

  // Foto aberta em tela cheia. null significa "nenhuma aberta".
  const [fotoAberta, setFotoAberta] = useState<FotoLightbox | null>(null);

  // useCallback mantém a mesma função entre renders: o Lightbox usa aoFechar
  // como dependência do useEffect da tecla Esc
  const fecharFoto = useCallback(() => setFotoAberta(null), []);

  const abrirFoto = useCallback(
    (foto: FotoDaGaleria) => setFotoAberta({ src: enderecoDaFoto(foto, 'ampliada'), legenda: foto.legenda }),
    [],
  );

  // ============================================
  // RENDERIZAÇÃO
  // ============================================

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Navbar />

      <CabecalhoDaPagina titulo="GALERIA" subtitulo="Momentos especiais do FavelaWare" />

      {/* Conteúdo: uma seção por edição. O título fica na coluna do site; o carrossel
          usa a largura toda da tela, para caber mais fotos por fileira */}
      <div className="py-16">
        {edicoesDaGaleria.map((edicao) => (
          <motion.section key={edicao.titulo} {...surgirDeBaixo} className="mb-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{edicao.titulo}</h2>
              <div className="w-24 h-1 bg-gradient-to-r from-favela-green-500 to-favela-blue-500 rounded-full mb-8" />
            </div>

            <CarrosselDeFotos
              titulo={`Fotos da ${edicao.titulo}`}
              fotos={edicao.fotos}
              pausado={fotoAberta !== null}
              aoAbrir={abrirFoto}
            />
          </motion.section>
        ))}
      </div>

      {/* Lightbox: a foto em tela cheia */}
      <Lightbox foto={fotoAberta} aoFechar={fecharFoto} />

      <Footer />
    </div>
  );
};

export default Galeria;
