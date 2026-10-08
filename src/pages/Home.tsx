/**
 * ============================================
 * PÁGINA HOME (PÁGINA INICIAL)
 * ============================================
 *
 * Esta é a página principal do site FavelaWare.
 * Combina vários componentes para criar a experiência inicial.
 *
 * Estrutura da página (de cima para baixo):
 * 1. Navbar - Barra de navegação
 * 2. Hero - Seção principal com logo e título
 * 3. Manifesto - O lema da camiseta, com a camiseta girando
 * 4. FaixaDePremios - Prêmios e artigos, citados de forma curta
 * 5. GaleriaInicial - Prévia da galeria (carrossel da edição mais recente)
 * 6. Parceiros - Parceiros e idealizadores
 * 7. Footer - Rodapé com informações de contato
 */

// Importa todos os componentes que formam a página inicial
import { lazy, Suspense } from 'react';
import Navbar from '../components/Navbar'; // Barra de navegação
import Hero from '../components/Hero'; // Seção principal/banner
import Manifesto from '../components/Manifesto'; // Lema + camiseta girando
import FaixaDePremios from '../components/FaixaDePremios'; // Prêmios e artigos
import Parceiros from '../components/Parceiros'; // Parceiros do projeto
import Footer from '../components/Footer'; // Rodapé

// A prévia da galeria fica abaixo do Hero e traz o carrossel e a lista de fotos
// (~8 KB gzip): carrega à parte para não pesar a abertura da Home
const GaleriaInicial = lazy(() => import('../components/GaleriaInicial'));

/**
 * COMPONENTE HOME (TypeScript)
 * React.FC indica que é um Functional Component
 * Não recebe props, então não precisamos definir interface
 */
const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <Manifesto />
      <FaixaDePremios />
      {/* Enquanto a galeria carrega, um espaço da mesma altura evita a página pular */}
      <Suspense fallback={<div className="min-h-[750px] lg:min-h-[890px] bg-gray-50" aria-hidden="true" />}>
        <GaleriaInicial />
      </Suspense>
      <Parceiros />
      <Footer />
    </div>
  );
};

export default Home;
