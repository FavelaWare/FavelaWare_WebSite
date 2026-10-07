/**
 * ============================================
 * MANIFESTO + CAMISETA — PÁGINA INICIAL
 * ============================================
 *
 * O lema da camiseta do FavelaWare ("Sonho+ Transformação+ Desenvolvimento+
 * Tecnologia"), palavra por palavra nas cores da camiseta, ao lado da camiseta
 * girando: a frente mostra o lema e as costas mostram os parceiros.
 *
 * A camiseta tem duas versões:
 * - 3D (CamisetaEm3D, three.js): a camiseta com volume, como se alguém a vestisse.
 *   Só é baixada com WebGL2, sem "reduzir movimento", depois que a página
 *   carregou e quando a seção chega perto da tela.
 * - CSS (CamisetaGirando): frente e costas de um cartão girando. Aparece enquanto
 *   o 3D carrega e fica de vez se o 3D não puder ou falhar.
 * Nas duas, gira sem parar enquanto está na tela; com "reduzir movimento", fica
 * parada, de frente.
 *
 * Conceitos importantes:
 * - React.lazy + Suspense: o three.js só é baixado quando vai ser usado
 * - useMotionValue + useAnimationFrame: o ângulo muda a cada quadro sem re-render
 * - backface-visibility: cada lado do cartão só aparece quando está de frente
 */
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { motion, useAnimationFrame, useInView, useMotionValue, useReducedMotion } from 'framer-motion';

import { cascata, surgirDeBaixo } from './animacoes';
import { CREDITO_DO_MODELO, deveUsar3D, proximoAngulo } from './camiseta3d';

/** Se o pedaço do 3D não baixar (deploy novo, rede caiu), avisa em vez de derrubar a Home */
const FalhaAoCarregar: React.FC<{ aoFalhar: () => void }> = ({ aoFalhar }) => {
  useEffect(() => {
    console.warn('[camiseta 3D] o pedaço do 3D não carregou, usando a versão em CSS');
    aoFalhar();
  }, [aoFalhar]);
  return null;
};

const CamisetaEm3D = lazy(() =>
  import('./CamisetaEm3D').catch(() => ({
    default: ({ aoFalhar }: { aoFalhar: () => void; aoFicarPronta: () => void }) => (
      <FalhaAoCarregar aoFalhar={aoFalhar} />
    ),
  })),
);

/** O lema, com a cor de cada palavra na camiseta */
const lema = [
  { palavra: 'Sonho', cor: 'text-[#2d2a5f]' },
  { palavra: 'Transformação', cor: 'text-favela-green-500' },
  { palavra: 'Desenvolvimento', cor: 'text-favela-blue-500' },
  { palavra: 'Tecnologia', cor: 'text-favela-pink-500' },
];

/** Camiseta girando em CSS: frente e costas são os dois lados de um cartão (ocupa o quadro do pai) */
const CamisetaGirando: React.FC = () => {
  const areaRef = useRef<HTMLDivElement>(null);
  const naTela = useInView(areaRef, { margin: '100px' });
  const reduzirMovimento = useReducedMotion() ?? false;

  // Ângulo do giro em graus, em [0, 360); começa de frente
  const angulo = useMotionValue(0);

  useAnimationFrame((_, intervalo) => {
    if (!naTela || reduzirMovimento) return;
    angulo.set(proximoAngulo(angulo.get(), intervalo));
  });

  // "Reduzir movimento" ligado no meio do giro: volta para a frente
  useEffect(() => {
    if (reduzirMovimento) angulo.set(0);
  }, [reduzirMovimento, angulo]);

  // Os dois lados ocupam o mesmo quadro; o de trás já começa virado 180°
  const classeLado = 'absolute inset-0 w-full h-full object-contain [backface-visibility:hidden]';

  return (
    <div ref={areaRef} className="absolute inset-0 [perspective:1200px]">
      <motion.div style={{ rotateY: angulo }} className="relative w-full h-full [transform-style:preserve-3d]">
        <img src="/imgs/graficos/camiseta-frente.webp" alt="" loading="lazy" decoding="async" className={classeLado} />
        <img
          src="/imgs/graficos/camiseta-costas.webp"
          alt=""
          loading="lazy"
          decoding="async"
          className={`${classeLado} [transform:rotateY(180deg)]`}
        />
      </motion.div>
    </div>
  );
};

/** A camiseta da Home: 3D quando dá, CSS enquanto isso ou no lugar dele */
const Camiseta: React.FC = () => {
  const areaRef = useRef<HTMLDivElement>(null);
  const perto = useInView(areaRef, { once: true, margin: '200px' });
  const reduzirMovimento = useReducedMotion() ?? false;

  // O 3D só começa a baixar depois que a página inteira carregou (não disputa rede com o Hero)
  const [paginaCarregada, setPaginaCarregada] = useState(() => document.readyState === 'complete');
  useEffect(() => {
    if (paginaCarregada) return;
    const aoCarregar = () => setPaginaCarregada(true);
    window.addEventListener('load', aoCarregar);
    return () => window.removeEventListener('load', aoCarregar);
  }, [paginaCarregada]);

  const [falhou, setFalhou] = useState(false);
  const [pronta, setPronta] = useState(false);
  const aoFicarPronta = useCallback(() => setPronta(true), []);
  const aoFalhar = useCallback(() => setFalhou(true), []);

  const usar3D =
    perto &&
    paginaCarregada &&
    !falhou &&
    deveUsar3D({ reduzirMovimento, temWebGL2: typeof window !== 'undefined' && 'WebGL2RenderingContext' in window });
  // Se o 3D sair (reduzir movimento ligado, falha), o CSS volta; se voltar depois,
  // espera o primeiro quadro de novo (senão a área ficaria vazia enquanto carrega)
  useEffect(() => {
    if (!usar3D) setPronta(false);
  }, [usar3D]);
  const mostrando3D = usar3D && pronta;

  // Troca cruzada: o CSS esmaece enquanto o 3D aparece e só sai depois (sem vão entre os dois)
  const [cssSaiu, setCssSaiu] = useState(false);
  useEffect(() => {
    if (!mostrando3D) return;
    const temporizador = window.setTimeout(() => setCssSaiu(true), 700);
    return () => {
      window.clearTimeout(temporizador);
      setCssSaiu(false);
    };
  }, [mostrando3D]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        ref={areaRef}
        role="img"
        aria-label="Camiseta azul do FavelaWare girando: na frente o lema Sonho, Transformação, Desenvolvimento e Tecnologia com o logo; nas costas o logo e os parceiros"
        className="relative w-64 sm:w-80 lg:w-96 aspect-[616/744]"
      >
        {/* Sombra no chão: fica parada enquanto a camiseta gira */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-6 rounded-[50%] bg-[#2d2a5f]/20 blur-md" />

        {!cssSaiu && (
          <div
            className={`absolute inset-0 transition-opacity duration-700 ${mostrando3D ? 'opacity-0' : 'opacity-100'}`}
          >
            <CamisetaGirando />
          </div>
        )}

        {usar3D && (
          <div
            className={`absolute inset-0 transition-opacity duration-700 ${mostrando3D ? 'opacity-100' : 'opacity-0'}`}
          >
            <Suspense fallback={null}>
              <CamisetaEm3D aoFicarPronta={aoFicarPronta} aoFalhar={aoFalhar} />
            </Suspense>
          </div>
        )}
      </div>

      {/* Crédito do modelo 3D (a licença CC BY exige), só quando o 3D está na tela */}
      {mostrando3D && (
        <p className="text-xs text-gray-500 text-center max-w-xs">
          Modelo 3D:{' '}
          <a
            href={CREDITO_DO_MODELO.fonte}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-favela-green-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-favela-green-500 rounded"
          >
            “{CREDITO_DO_MODELO.titulo}” de {CREDITO_DO_MODELO.autor}
          </a>
          ,{' '}
          <a
            href={CREDITO_DO_MODELO.linkDaLicenca}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-favela-green-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-favela-green-500 rounded"
          >
            {CREDITO_DO_MODELO.licenca}
          </a>
          , {CREDITO_DO_MODELO.modificacao}.
        </p>
      )}
    </div>
  );
};

const Manifesto: React.FC = () => {
  return (
    <section className="relative py-20 bg-gradient-to-br from-gray-50 via-white to-favela-green-50 overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
        {/* O lema, uma palavra de cada vez */}
        <div className="text-center lg:text-left">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-sm font-bold uppercase tracking-widest text-gray-600 mb-4"
          >
            O que a gente veste
          </motion.p>

          <motion.h2
            variants={cascata(0.2)}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="text-4xl text-xl md:text-6xl font-black leading-tight"
          >
            {lema.map(({ palavra, cor }, indice) => (
              <motion.span key={palavra} variants={surgirDeBaixo} className={`block ${cor}`}>
                {palavra}
                {indice < lema.length - 1 && <span className="text-gray-400">+</span>}
              </motion.span>
            ))}
          </motion.h2>
        </div>

        <Camiseta />
      </div>
    </section>
  );
};

export default Manifesto;
