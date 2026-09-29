/**
 * ============================================
 * CARROSSEL DE FOTOS
 * ============================================
 *
 * Duas fileiras de fotos andando sem parar: a de cima para a direita e a de
 * baixo para a esquerda. De tempos em tempos uma foto de baixo sobe e a de
 * cima desce, trocando de lugar sem as fileiras pararem (dois pares de
 * cada vez, quando cabem na tela).
 *
 * - Para com o mouse em cima, com o foco do teclado dentro, pelo botão Pausar,
 *   com o Lightbox aberto e fora da tela. Com "reduzir movimento" ligado no
 *   sistema, fica parado.
 * - Setas (nos botões ou ← → do teclado) e arrastar/deslizar mexem as fileiras.
 *   Com o foco numa foto, ← → passam para a foto do lado.
 * - Passar o mouse numa foto mostra o evento dela; clicar chama `aoAbrir`
 *   (a página abre o Lightbox).
 *
 * Conceitos importantes:
 * - useMotionValue: guarda o deslocamento fora do React, sem re-render a cada quadro
 * - useAnimationFrame: roda uma função a cada quadro da tela
 * - useImperativeHandle: a fileira expõe ao carrossel o que ele pode pedir a ela
 */

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { flushSync } from 'react-dom';
import {
  animate,
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'framer-motion';
import { enderecoDaFoto, type FotoDaGaleria } from '../data/galeria';
import {
  dividirEmFileiras,
  escolherParesParaTrocar,
  normalizarDeslocamento,
  quadrosDaTroca,
  soAsQueAparecemUmaVez,
  trocarEntreFileiras,
  type CartaoVisivel,
  type QuadroDaTroca,
} from './carrossel';

/** Velocidade das fileiras, em pixels por segundo */
const VELOCIDADE = 120;
/** Intervalo entre uma troca e outra, em milissegundos (sorteado entre os dois) */
const TROCA_MINIMO = 2500;
const TROCA_MAXIMO = 4500;
/** Quantos pares trocam de lugar ao mesmo tempo (menos, se não couberem na tela) */
const TROCAS_DE_UMA_VEZ = 2;
/** Duração da troca, em milissegundos */
const TROCA_DURACAO = 700;
/** Quanto o dedo ou o mouse anda antes de virar arraste (e não clique) */
const LIMITE_DO_ARRASTE = 6;
/** Espaço entre as fotos, em pixels: é o `gap-4`/`pr-4` do grupo. Mudou um, mude o outro. */
const ESPACO = 16;

/** A legenda só aparece embaixo do evento quando diz algo a mais que ele */
const legendaExtra = (foto: FotoDaGaleria) => (foto.legenda.startsWith(foto.evento) ? '' : foto.legenda);

/** Quadros da troca no formato da Web Animations API */
const paraKeyframes = (quadros: QuadroDaTroca[]): Keyframe[] =>
  quadros.map(({ x, y, escala, giro }) => ({
    transform: `translate(${x}px, ${y}px) scale(${escala}) rotate(${giro}deg)`,
    boxShadow: `0 ${8 + 24 * (escala - 1) * 8}px ${16 + 40 * (escala - 1) * 8}px rgba(45, 42, 95, ${0.2 + (escala - 1) * 2.5})`,
  }));

// ============================================
// FILEIRA
// ============================================

/** Foto que aparece na tela, com o elemento dela */
type CartaoNaTela = CartaoVisivel & { elemento: HTMLElement };

/** O que o carrossel pode pedir a uma fileira */
interface ControleDaFileira {
  /** Anda uma foto: 1 no sentido da fileira, -1 no contrário */
  avancar: (passos: 1 | -1) => void;
  /** Fotos que podem trocar: aparecem uma vez só na tela e com o centro dentro dela */
  cartoesParaTrocar: () => CartaoNaTela[];
  /** Se o dedo ou o mouse está arrastando a fileira agora */
  arrastando: () => boolean;
  /** Traz para a tela a foto com o foco do teclado, se houver (usado no fim da troca) */
  mostrarFotoFocada: () => void;
  /** Volta o deslocamento para [-largura, 0) (no fim da troca; o salto não se vê) */
  normalizar: () => void;
  /** Bloqueia na hora, antes de medir a troca (a prop `bloqueada` só chega 1 ou 2 quadros depois) */
  bloquear: () => void;
}

interface FileiraProps {
  fotos: FotoDaGaleria[];
  /** 1 anda para a direita, -1 para a esquerda */
  sentido: 1 | -1;
  /** "de cima" ou "de baixo", para o leitor de tela */
  nome: string;
  emMovimento: boolean;
  /** Durante a troca, seta, arraste e foco esperam (senão a foto que cruza sai do lugar) */
  bloqueada: boolean;
  reduzirMovimento: boolean;
  aoAbrir: (foto: FotoDaGaleria) => void;
  controleRef: Ref<ControleDaFileira>;
}

const Fileira: React.FC<FileiraProps> = ({
  fotos,
  sentido,
  nome,
  emMovimento,
  bloqueada,
  reduzirMovimento,
  aoAbrir,
  controleRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const grupoRef = useRef<HTMLDivElement>(null);

  // Deslocamento da fileira, em [-largura, 0) enquanto ela anda sozinha
  const deslocamento = useMotionValue(0);
  // Largura de uma volta (todas as fotos da fileira mais o espaço entre elas)
  const largura = useMotionValue(0);
  // O trilho começa uma volta antes: a 2ª cópia (a focável) começa em `deslocamento`
  const posicaoDoTrilho = useTransform(() => deslocamento.get() - largura.get());

  // Quantas vezes a fileira se repete. Com uma volta antes e duas depois da tela,
  // a seta pode passar uma foto do intervalo normal sem abrir buraco nas bordas.
  const [copias, setCopias] = useState(4);

  const emMovimentoRef = useRef(emMovimento);
  const bloqueadaRef = useRef(bloqueada);
  const arrasteRef = useRef({ ativo: false, arrastou: false, inicioX: 0, deslocamentoInicial: 0 });
  // Solta o arraste em andamento: usado também se a página sair no meio dele
  const soltarRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    emMovimentoRef.current = emMovimento;
    bloqueadaRef.current = bloqueada;
  }, [emMovimento, bloqueada]);

  useEffect(() => () => soltarRef.current?.(), []);

  // Mede a volta e a tela sempre que o tamanho muda (celular girando, janela redimensionada)
  useEffect(() => {
    const grupo = grupoRef.current;
    const container = containerRef.current;
    if (!grupo || !container) return;

    const medir = () => {
      const volta = grupo.offsetWidth;
      largura.set(volta);
      // Entre -volta e volta o trilho cobre a tela: não mexe, para não tirar da
      // tela uma foto focada pelo teclado
      const atual = deslocamento.get();
      if (atual < -volta || atual > volta) deslocamento.set(normalizarDeslocamento(atual, volta));
      if (volta > 0) setCopias(Math.ceil(container.offsetWidth / volta) + 3);
    };
    medir();

    const observador = new ResizeObserver(medir);
    observador.observe(grupo);
    observador.observe(container);
    return () => observador.disconnect();
  }, [deslocamento, largura]);

  // Momento do último quadro em que a fileira andou (null = estava parada)
  const ultimoQuadroRef = useRef<number | null>(null);

  // A cada quadro, anda um pouco no sentido da fileira
  useAnimationFrame((agora) => {
    if (!emMovimentoRef.current || arrasteRef.current.ativo) {
      ultimoQuadroRef.current = null;
      return;
    }
    // Tempo real desde o último quadro (o intervalo do framer é limitado a 40 ms; num
    // quadro travado a fileira andaria menos do que a troca calculou). Fora da troca o
    // teto é 100 ms, para a fileira não dar um salto ao voltar de uma aba escondida.
    const teto = bloqueadaRef.current ? 1000 : 100;
    const intervalo = ultimoQuadroRef.current === null ? 0 : Math.min(agora - ultimoQuadroRef.current, teto);
    ultimoQuadroRef.current = agora;

    const proximo = deslocamento.get() + (sentido * VELOCIDADE * intervalo) / 1000;
    // Durante a troca não dá a volta: o salto de uma volta levaria junto a foto que
    // está cruzando. O trilho cobre de -2 voltas a +1, bem mais que o quanto a
    // fileira anda numa troca; o carrossel normaliza no fim dela.
    deslocamento.set(bloqueadaRef.current ? proximo : normalizarDeslocamento(proximo, largura.get()));
  });

  /** Largura de uma foto mais o espaço até a próxima */
  const larguraDoPasso = () => {
    const primeira = grupoRef.current?.firstElementChild;
    return primeira instanceof HTMLElement ? primeira.offsetWidth + ESPACO : 0;
  };

  /** Anima até o destino. Com `voltarAoNormal`, no fim volta para [-largura, 0) (o salto não se vê). */
  const irPara = (destino: number, voltarAoNormal: boolean) => {
    animate(deslocamento, destino, {
      duration: reduzirMovimento ? 0 : 0.5,
      ease: 'easeOut',
      onComplete: () => {
        if (voltarAoNormal) deslocamento.set(normalizarDeslocamento(deslocamento.get(), largura.get()));
      },
    });
  };

  /** Foto cortada ou fora da tela vem para dentro dela */
  const trazerParaTela = (cartao: HTMLElement) => {
    const container = containerRef.current;
    const grupo = cartao.parentElement;
    if (!container || !grupo) return;

    const tela = container.getBoundingClientRect();
    const caixa = cartao.getBoundingClientRect();
    // As bordas da área esmaecem (mask-image de 4%): a foto para depois delas
    const margem = Math.min(tela.width * 0.04 + ESPACO, largura.get());
    if (caixa.left >= tela.left + margem && caixa.right <= tela.right - margem) return;

    // A 2ª cópia começa em `deslocamento`. O destino fica entre -largura e
    // `margem`, que o trilho cobre; não volta ao normal, senão a foto focada
    // trocaria de lugar com a da cópia vizinha e sairia da tela.
    irPara(-(caixa.left - grupo.getBoundingClientRect().left) + margem, false);
  };

  useImperativeHandle(controleRef, () => ({
    avancar: (passos) => {
      if (bloqueadaRef.current) return;
      const atual = normalizarDeslocamento(deslocamento.get(), largura.get());
      deslocamento.set(atual);
      irPara(atual + sentido * passos * larguraDoPasso(), true);
    },
    cartoesParaTrocar: () => {
      const container = containerRef.current;
      if (!container) return [];
      const tela = container.getBoundingClientRect();

      const naTela = Array.from(container.querySelectorAll<HTMLElement>('[data-indice]')).flatMap((elemento) => {
        const caixa = elemento.getBoundingClientRect();
        if (caixa.right <= tela.left || caixa.left >= tela.right) return [];
        return [{ elemento, indice: Number(elemento.dataset.indice), centro: caixa.left + caixa.width / 2 }];
      });
      return soAsQueAparecemUmaVez(naTela).filter((cartao) => cartao.centro > tela.left && cartao.centro < tela.right);
    },
    arrastando: () => arrasteRef.current.ativo,
    mostrarFotoFocada: () => {
      const focada = document.activeElement;
      if (focada instanceof HTMLElement && containerRef.current?.contains(focada) && focada.matches(':focus-visible')) {
        trazerParaTela(focada);
      }
    },
    normalizar: () => deslocamento.set(normalizarDeslocamento(deslocamento.get(), largura.get())),
    bloquear: () => {
      bloqueadaRef.current = true;
    },
  }));

  // ============================================
  // ARRASTAR E DESLIZAR
  // ============================================

  const aoPressionar = (evento: React.PointerEvent) => {
    if (evento.button !== 0) return;
    if (bloqueadaRef.current) {
      // Não arrasta durante a troca, mas o toque vale como clique (não herda o arraste anterior)
      arrasteRef.current.arrastou = false;
      return;
    }
    arrasteRef.current = {
      ativo: true,
      arrastou: false,
      inicioX: evento.clientX,
      deslocamentoInicial: deslocamento.get(),
    };

    const aoMover = (movimento: PointerEvent) => {
      const arraste = arrasteRef.current;
      const distancia = movimento.clientX - arraste.inicioX;
      if (Math.abs(distancia) > LIMITE_DO_ARRASTE) arraste.arrastou = true;
      if (arraste.arrastou) {
        deslocamento.set(normalizarDeslocamento(arraste.deslocamentoInicial + distancia, largura.get()));
      }
    };
    const aoSoltar = () => {
      arrasteRef.current.ativo = false;
      soltarRef.current = null;
      window.removeEventListener('pointermove', aoMover);
      window.removeEventListener('pointerup', aoSoltar);
      window.removeEventListener('pointercancel', aoSoltar);
    };

    soltarRef.current = aoSoltar;
    window.addEventListener('pointermove', aoMover);
    window.addEventListener('pointerup', aoSoltar);
    window.addEventListener('pointercancel', aoSoltar);
  };

  // ============================================
  // TECLADO
  // ============================================

  /** Foto que recebe o foco pelo teclado vem para a tela (durante a troca, o carrossel faz isso no fim dela) */
  const aoFocar = (evento: React.FocusEvent<HTMLButtonElement>) => {
    if (!evento.currentTarget.matches(':focus-visible') || bloqueadaRef.current) return;
    trazerParaTela(evento.currentTarget);
  };

  /** Com o foco numa foto, ← → vão para a foto do lado (e dão a volta no fim) */
  const aoTeclarNaFoto = (evento: React.KeyboardEvent<HTMLButtonElement>) => {
    if (evento.key !== 'ArrowRight' && evento.key !== 'ArrowLeft') return;
    evento.preventDefault();
    evento.stopPropagation();

    const cartao = evento.currentTarget;
    const grupo = cartao.parentElement;
    if (!grupo) return;
    const vizinha =
      evento.key === 'ArrowRight'
        ? (cartao.nextElementSibling ?? grupo.firstElementChild)
        : (cartao.previousElementSibling ?? grupo.lastElementChild);
    if (vizinha instanceof HTMLElement) vizinha.focus();
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={aoPressionar}
      // Deixa a página rolar na vertical; o deslizar na horizontal fica com o carrossel
      className="touch-pan-y select-none"
    >
      <motion.div style={{ x: posicaoDoTrilho }} className="flex w-max">
        {Array.from({ length: copias }, (_, copia) => (
          <div
            key={copia}
            ref={copia === 0 ? grupoRef : undefined}
            // Só a segunda cópia (a que começa na tela) é lida e recebe o Tab; as outras são repetição
            aria-hidden={copia === 1 ? undefined : true}
            className="flex gap-4 pr-4"
          >
            {fotos.map((foto, indice) => (
              <button
                // A chave é a posição, não a foto: na troca, o mesmo cartão recebe a foto nova
                key={indice}
                type="button"
                data-indice={indice}
                tabIndex={copia === 1 ? undefined : -1}
                onFocus={copia === 1 ? aoFocar : undefined}
                onKeyDown={copia === 1 ? aoTeclarNaFoto : undefined}
                onClick={(evento) => {
                  // Soltar depois de arrastar não abre a foto. detail 0 é Enter/Espaço, que sempre abre.
                  if (evento.detail !== 0 && arrasteRef.current.arrastou) return;
                  aoAbrir(foto);
                }}
                aria-label={`Ampliar foto ${indice + 1} de ${fotos.length} da fileira ${nome}: ${foto.evento}${
                  legendaExtra(foto) ? ` — ${legendaExtra(foto)}` : ''
                }`}
                className="group relative h-28 sm:h-32 lg:h-36 aspect-[4/3] shrink-0 rounded-2xl overflow-hidden shadow-lg bg-gradient-to-br from-[#2d2a5f] to-favela-green-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-favela-green-500"
              >
                <img
                  src={enderecoDaFoto(foto, 'miniatura')}
                  alt=""
                  loading="lazy"
                  // Sem enviar o endereço do site ao Drive (e o Google às vezes recusa foto com referer de fora)
                  referrerPolicy="no-referrer"
                  draggable={false}
                  // Se a foto não carregar (Drive fora do ar, compartilhamento tirado), o cartão
                  // fica com o fundo da marca e o nome do evento visível, em vez de um cinza vazio
                  onError={(evento) => evento.currentTarget.parentElement?.setAttribute('data-falhou', '')}
                  onLoad={(evento) => evento.currentTarget.parentElement?.removeAttribute('data-falhou')}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 group-data-[falhou]:invisible"
                />

                {/* Evento: sempre visível no celular (não há mouse); do md para cima aparece no hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#2d2a5f]/90 via-[#2d2a5f]/20 to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100 md:group-data-[falhou]:opacity-100 transition-opacity duration-300 flex flex-col justify-end items-start p-3 text-left">
                  <span className="text-white font-bold leading-tight">{foto.evento}</span>
                  {legendaExtra(foto) && (
                    <span className="text-white/80 text-xs leading-tight mt-0.5">{legendaExtra(foto)}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        ))}
      </motion.div>
    </div>
  );
};

// ============================================
// CARROSSEL
// ============================================

interface CarrosselDeFotosProps {
  /** Rótulo do carrossel para o leitor de tela e para os botões */
  titulo: string;
  fotos: FotoDaGaleria[];
  /** A página pausa todos os carrosséis enquanto uma foto está ampliada */
  pausado: boolean;
  aoAbrir: (foto: FotoDaGaleria) => void;
}

/** Botão redondo das setas e do pausar */
const classeBotao =
  'w-10 h-10 flex items-center justify-center rounded-full bg-white text-[#2d2a5f] shadow-md border border-gray-200 hover:border-favela-green-500 hover:text-favela-green-600 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-favela-green-500';

const CarrosselDeFotos: React.FC<CarrosselDeFotosProps> = ({ titulo, fotos, pausado, aoAbrir }) => {
  // As fotos só são lidas na montagem: os dados da Galeria são fixos (src/data/galeria.ts)
  const [fileiras, setFileiras] = useState(() => dividirEmFileiras(fotos));
  const [pausadoPeloBotao, setPausadoPeloBotao] = useState(false);
  const [comMouse, setComMouse] = useState(false);
  const [comFoco, setComFoco] = useState(false);
  const [trocando, setTrocando] = useState(false);
  // Muda quando o sorteio não achou par, para agendar outra tentativa
  const [tentativa, setTentativa] = useState(0);

  const areaRef = useRef<HTMLDivElement>(null);
  const cimaRef = useRef<ControleDaFileira>(null);
  const baixoRef = useRef<ControleDaFileira>(null);

  const naTela = useInView(areaRef, { margin: '100px' });
  const reduzirMovimento = useReducedMotion() ?? false;

  const emMovimento = naTela && !reduzirMovimento && !pausado && !pausadoPeloBotao && !comMouse && !comFoco;
  const [cima, baixo] = fileiras;

  // Troca começada termina mesmo se o mouse entrar no meio; só não mexe no
  // estado se o carrossel saiu da página
  const montadoRef = useRef(true);
  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
    };
  }, []);

  // De tempos em tempos, uma foto de baixo sobe e a de cima desce
  useEffect(() => {
    if (!emMovimento || trocando || baixo.length === 0) return;

    const espera = TROCA_MINIMO + Math.random() * (TROCA_MAXIMO - TROCA_MINIMO);

    const temporizador = window.setTimeout(() => {
      // Com o dedo arrastando a fileira, a troca espera (no celular o toque não pausa o carrossel)
      if (cimaRef.current?.arrastando() || baixoRef.current?.arrastando()) {
        setTentativa((vezes) => vezes + 1);
        return;
      }

      const candidatosCima = cimaRef.current?.cartoesParaTrocar() ?? [];
      const candidatosBaixo = baixoRef.current?.cartoesParaTrocar() ?? [];
      // Os pares ficam a pelo menos uma foto de distância: cada foto anda quase na
      // vertical (vai para a mais alinhada da outra fileira), então não se trombam.
      // Mais que isso, numa tela de ~4 fotos o segundo par quase nunca cabia.
      const distancia = (candidatosCima[0]?.elemento.offsetWidth ?? 0) + ESPACO;
      const pares = escolherParesParaTrocar(candidatosCima, candidatosBaixo, TROCAS_DE_UMA_VEZ, distancia, Math.random);
      if (pares.length === 0) {
        // Nenhuma foto em posição de trocar agora: tenta de novo daqui a pouco
        setTentativa((vezes) => vezes + 1);
        return;
      }

      // Antes de medir: daqui em diante a fileira não dá a volta até a troca acabar
      cimaRef.current?.bloquear();
      baixoRef.current?.bloquear();

      // As fileiras continuam andando (em sentidos opostos) durante a troca: o
      // destino de cada foto se afasta 2 × velocidade × duração, e a trajetória já conta com isso
      const deriva = (2 * VELOCIDADE * TROCA_DURACAO) / 1000;
      // Web Animations: o cancel() tira o deslocamento na hora, no mesmo quadro da troca
      const movimento: KeyframeAnimationOptions = { duration: TROCA_DURACAO, easing: 'linear', fill: 'forwards' };

      setTrocando(true);
      const animacoes = pares.flatMap(([deCima, deBaixo]) => {
        const caixaCima = deCima.elemento.getBoundingClientRect();
        const caixaBaixo = deBaixo.elemento.getBoundingClientRect();
        const dx = caixaBaixo.left - caixaCima.left;
        const dy = caixaBaixo.top - caixaCima.top;
        deCima.elemento.style.zIndex = '10';
        deBaixo.elemento.style.zIndex = '20';
        return [
          deCima.elemento.animate(paraKeyframes(quadrosDaTroca(dx, dy, -deriva, -4)), movimento),
          deBaixo.elemento.animate(paraKeyframes(quadrosDaTroca(-dx, -dy, deriva, 4)), movimento),
        ];
      });

      Promise.all(animacoes.map((animacao) => animacao.finished))
        .catch(() => undefined)
        .then(() => {
          if (montadoRef.current) {
            // Troca as fotos nos dados e devolve os cartões ao lugar no mesmo quadro, sem
            // piscar. Os pares não repetem foto, então uma troca não desfaz a outra.
            flushSync(() =>
              setFileiras((fileirasAtuais) =>
                pares.reduce(
                  ([c, b], [deCima, deBaixo]) => trocarEntreFileiras(c, b, deCima.indice, deBaixo.indice),
                  fileirasAtuais,
                ),
              ),
            );
          }
          animacoes.forEach((animacao) => animacao.cancel());
          for (const [deCima, deBaixo] of pares) {
            deCima.elemento.style.zIndex = '';
            deBaixo.elemento.style.zIndex = '';
          }
          if (!montadoRef.current) return;
          // A volta que as fileiras não deram durante a troca, agora que ninguém está cruzando
          cimaRef.current?.normalizar();
          baixoRef.current?.normalizar();
          setTrocando(false);
          // Foco que chegou pelo teclado no meio da troca: agora dá para trazer a foto para a tela
          cimaRef.current?.mostrarFotoFocada();
          baixoRef.current?.mostrarFotoFocada();
        });
    }, espera);

    return () => window.clearTimeout(temporizador);
  }, [emMovimento, trocando, baixo.length, tentativa]);

  const avancar = (passos: 1 | -1) => {
    cimaRef.current?.avancar(passos);
    baixoRef.current?.avancar(passos);
  };

  // ← → fora das fotos (nos botões) mexem as fileiras; nas fotos, a Fileira trata antes
  const aoTeclar = (evento: React.KeyboardEvent) => {
    if (evento.key === 'ArrowRight') {
      evento.preventDefault();
      avancar(1);
    }
    if (evento.key === 'ArrowLeft') {
      evento.preventDefault();
      avancar(-1);
    }
  };

  // A troca começada vai até o fim com as fileiras andando, mesmo que o mouse
  // entre no meio: a trajetória das duas fotos foi calculada com elas em movimento
  const filasEmMovimento = emMovimento || trocando;

  return (
    <section aria-roledescription="carrossel" aria-label={titulo} onKeyDown={aoTeclar}>
      {/* Quantidade de fotos e controles, na coluna do site (o título da edição fica na
          página); as fileiras abaixo usam a largura toda */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-sm text-gray-600">{fotos.length} fotos</p>

        <div className="flex items-center gap-2">
          {!reduzirMovimento && (
            <button
              type="button"
              onClick={() => setPausadoPeloBotao((estavaPausado) => !estavaPausado)}
              aria-label={pausadoPeloBotao ? `Continuar o carrossel ${titulo}` : `Pausar o carrossel ${titulo}`}
              aria-pressed={pausadoPeloBotao}
              className={classeBotao}
            >
              <span aria-hidden="true">{pausadoPeloBotao ? '▶' : '❚❚'}</span>
            </button>
          )}
          <button type="button" onClick={() => avancar(-1)} aria-label="Fotos anteriores" className={classeBotao}>
            <span aria-hidden="true">←</span>
          </button>
          <button type="button" onClick={() => avancar(1)} aria-label="Próximas fotos" className={classeBotao}>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      {/* Fileiras: o corte é aqui, para a foto que troca poder cruzar de uma fileira para a outra */}
      <div
        ref={areaRef}
        // Só o mouse pausa: no celular o toque também dispara "entrar" e nunca "sair"
        onPointerEnter={(evento) => evento.pointerType === 'mouse' && setComMouse(true)}
        onPointerLeave={(evento) => evento.pointerType === 'mouse' && setComMouse(false)}
        // Só o foco do teclado pausa: o clique numa foto (e a volta do Lightbox) não
        onFocus={(evento) => evento.target.matches(':focus-visible') && setComFoco(true)}
        onBlur={(evento) => {
          if (!evento.currentTarget.contains(evento.relatedTarget)) setComFoco(false);
        }}
        className="overflow-clip py-3 space-y-4 [mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)]"
      >
        <Fileira
          fotos={cima}
          sentido={1}
          nome="de cima"
          emMovimento={filasEmMovimento}
          bloqueada={trocando}
          reduzirMovimento={reduzirMovimento}
          aoAbrir={aoAbrir}
          controleRef={cimaRef}
        />
        {baixo.length > 0 && (
          <Fileira
            fotos={baixo}
            sentido={-1}
            nome="de baixo"
            emMovimento={filasEmMovimento}
            bloqueada={trocando}
            reduzirMovimento={reduzirMovimento}
            aoAbrir={aoAbrir}
            controleRef={baixoRef}
          />
        )}
      </div>
    </section>
  );
};

export default CarrosselDeFotos;
