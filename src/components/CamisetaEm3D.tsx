/**
 * ============================================
 * CAMISETA 3D (three.js) — PÁGINA INICIAL
 * ============================================
 *
 * A camiseta do FavelaWare em 3D, girando sem parar, no efeito "manequim
 * invisível": só a roupa, com volume. Dá para girar arrastando (mouse ou dedo);
 * ao soltar, ela segue no embalo e volta ao giro automático. O modelo é o "T Shirt" do funlab117
 * (Sketchfab, CC BY 4.0), feito no CLO3D com as peças do molde separadas
 * (Body_Front, Body_Back, Sleeves, Ribbing). A frente e as costas recebem uma
 * textura do tamanho da peça, já com a estampa; mangas e gola ficam lisas.
 *
 * Único arquivo que importa three: a Home carrega ele sob demanda (React.lazy),
 * e o Vite põe o three num pedaço separado (vite.config.ts).
 * Nunca lança erro no render: qualquer falha chama `aoFalhar`, e a Home fica
 * com o giro em CSS.
 *
 * Conceitos importantes:
 * - useEffect: monta a cena uma vez e desmonta tudo (dispose) ao sair
 * - IntersectionObserver: para de desenhar fora da tela
 */
import { useEffect, useRef } from 'react';
import {
  Box3,
  Color,
  DirectionalLight,
  DoubleSide,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector3,
  WebGLRenderer,
  type Material,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

import {
  amortecerEmbalo,
  ARQUIVOS_DA_CAMISETA,
  COR_DO_TECIDO,
  encaixeDaTextura,
  GRAUS_POR_PIXEL,
  normalizarAngulo,
  proximoAngulo,
} from './camiseta3d';

interface CamisetaEm3DProps {
  /** Chamado quando o primeiro quadro da camiseta foi desenhado */
  aoFicarPronta: () => void;
  /** Chamado em qualquer falha (sem WebGL, arquivo que não baixa, contexto perdido) */
  aoFalhar: () => void;
}

/** Altura da camiseta na cena e margem em volta dela no quadro */
const ALTURA = 1;
const MARGEM = 1.18;
const CAMPO_DE_VISAO = 30;

const log = (mensagem: string) => {
  if (import.meta.env.DEV) console.info(`[camiseta 3D] ${mensagem}`);
};

/** A peça do molde a que um mesh pertence (o GLTFLoader põe o nome no mesh ou no pai) */
const pecaDo = (mesh: Mesh) => `${mesh.name} ${mesh.parent?.name ?? ''}`;

/** Faixa de UV (mm do molde) de um mesh */
const caixaDeUv = (mesh: Mesh) => {
  const uv = mesh.geometry.getAttribute('uv');
  let uMin = Infinity,
    uMax = -Infinity,
    vMin = Infinity,
    vMax = -Infinity;
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i),
      v = uv.getY(i);
    uMin = Math.min(uMin, u);
    uMax = Math.max(uMax, u);
    vMin = Math.min(vMin, v);
    vMax = Math.max(vMax, v);
  }
  return { uMin, uMax, vMin, vMax };
};

const CamisetaEm3D: React.FC<CamisetaEm3DProps> = ({ aoFicarPronta, aoFalhar }) => {
  const quadroRef = useRef<HTMLDivElement>(null);
  // As funções mudam a cada render da Home; a cena é montada uma vez só
  const avisosRef = useRef({ aoFicarPronta, aoFalhar });
  useEffect(() => {
    avisosRef.current = { aoFicarPronta, aoFalhar };
  }, [aoFicarPronta, aoFalhar]);

  useEffect(() => {
    const quadro = quadroRef.current;
    if (!quadro) return;

    // Se a Home sair antes do modelo chegar, o que chegar depois é descartado
    let cancelado = false;
    const falhar = (motivo: string) => {
      if (cancelado) return;
      console.warn(`[camiseta 3D] ${motivo}, usando a versão em CSS`);
      avisosRef.current.aoFalhar();
    };

    // ---------- renderizador ----------
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ alpha: true, antialias: true });
    } catch (erro) {
      falhar(`sem WebGL (${(erro as Error).message})`);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    quadro.appendChild(renderer.domElement);

    const aoPerderContexto = (evento: Event) => {
      evento.preventDefault();
      falhar('contexto WebGL perdido');
    };
    renderer.domElement.addEventListener('webglcontextlost', aoPerderContexto);

    // ---------- cena, câmera e luz ----------
    const cena = new Scene();
    const camera = new PerspectiveCamera(CAMPO_DE_VISAO, 1, 0.1, 20);
    camera.position.set(0, 0.04, (ALTURA / 2 / Math.tan(((CAMPO_DE_VISAO / 2) * Math.PI) / 180)) * MARGEM);
    camera.lookAt(0, 0, 0);

    cena.add(new HemisphereLight(0xffffff, 0x3a3a55, 1.6));
    const luzDaFrente = new DirectionalLight(0xffffff, 1.6);
    luzDaFrente.position.set(1.2, 1.5, 2.5);
    cena.add(luzDaFrente);
    const luzDeTras = new DirectionalLight(0xffffff, 0.7);
    luzDeTras.position.set(-1.5, 0.8, -2.5);
    cena.add(luzDeTras);

    // Grupo que gira; o modelo fica centrado dentro dele
    const giro = new Group();
    cena.add(giro);

    // ---------- tamanho ----------
    const ajustarTamanho = () => {
      const { width, height } = quadro.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    ajustarTamanho();
    const observadorDeTamanho = new ResizeObserver(ajustarTamanho);
    observadorDeTamanho.observe(quadro);

    // ---------- giro (só quando está na tela) ----------
    let angulo = 0;
    let ultimoQuadro: number | null = null;
    let primeiroQuadro = true;
    // Arrastar: enquanto segura, o ângulo segue o dedo/mouse; ao soltar, o embalo
    // (graus por ms) continua e perde força, e o giro automático segue por baixo
    let arrastando = false;
    let embalo = 0;
    const desenhar = (agora: number) => {
      const intervalo = ultimoQuadro === null ? 0 : agora - ultimoQuadro;
      if (!arrastando) {
        angulo = normalizarAngulo(proximoAngulo(angulo, intervalo) + embalo * intervalo);
        embalo = amortecerEmbalo(embalo, intervalo);
      }
      ultimoQuadro = agora;
      giro.rotation.y = (angulo * Math.PI) / 180;
      renderer.render(cena, camera);
      if (primeiroQuadro) {
        primeiroQuadro = false;
        log('primeiro quadro desenhado');
        avisosRef.current.aoFicarPronta();
      }
    };
    let modeloPronto = false;
    let naTela = false;
    const atualizarLaco = () => {
      // Ao voltar a girar, recomeça a contar o tempo (sem pulo)
      ultimoQuadro = null;
      renderer.setAnimationLoop(modeloPronto && naTela ? desenhar : null);
    };
    const observadorDaTela = new IntersectionObserver(([entrada]) => {
      naTela = entrada.isIntersecting;
      atualizarLaco();
    });
    observadorDaTela.observe(quadro);

    // ---------- arrastar para girar (mouse e toque) ----------
    let xAnterior = 0;
    let tempoAnterior = 0;
    const aoPressionar = (evento: PointerEvent) => {
      if (evento.pointerType === 'mouse' && evento.button !== 0) return;
      arrastando = true;
      embalo = 0;
      xAnterior = evento.clientX;
      tempoAnterior = evento.timeStamp;
      quadro.setPointerCapture(evento.pointerId);
      quadro.style.cursor = 'grabbing';
    };
    const aoMover = (evento: PointerEvent) => {
      if (!arrastando) return;
      const graus = (evento.clientX - xAnterior) * GRAUS_POR_PIXEL;
      const tempo = Math.max(1, evento.timeStamp - tempoAnterior);
      angulo = normalizarAngulo(angulo + graus);
      // Velocidade do fim do arrasto vira o embalo ao soltar (suavizada entre movimentos)
      // Teto de ±1,5°/ms: eventos agrupados depois de uma travada não viram 13 voltas
      embalo = Math.max(-1.5, Math.min(1.5, embalo * 0.5 + (graus / tempo) * 0.5));
      xAnterior = evento.clientX;
      tempoAnterior = evento.timeStamp;
    };
    const aoSoltar = (evento: PointerEvent) => {
      if (!arrastando) return;
      arrastando = false;
      // Parou antes de soltar, ou o navegador assumiu (rolagem no celular, troca de
      // janela): sem embalo, para não dar tranco
      if (evento.type !== 'pointerup' || evento.timeStamp - tempoAnterior > 80) embalo = 0;
      if (quadro.hasPointerCapture(evento.pointerId)) quadro.releasePointerCapture(evento.pointerId);
      quadro.style.cursor = 'grab';
    };
    quadro.addEventListener('pointerdown', aoPressionar);
    quadro.addEventListener('pointermove', aoMover);
    quadro.addEventListener('pointerup', aoSoltar);
    quadro.addEventListener('pointercancel', aoSoltar);
    // Soltar o botão fora da janela (Alt+Tab segurando) pode não mandar pointerup
    quadro.addEventListener('lostpointercapture', aoSoltar);

    // ---------- modelo e texturas ----------
    const texturas: Texture[] = [];
    const carregarTextura = (url: string) =>
      new TextureLoader().loadAsync(url).then((textura) => {
        textura.colorSpace = SRGBColorSpace;
        // UV do glTF já vem com o V para baixo, como a imagem
        textura.flipY = false;
        textura.anisotropy = renderer.capabilities.getMaxAnisotropy();
        texturas.push(textura);
        return textura;
      });

    const carregador = new GLTFLoader();
    carregador.setMeshoptDecoder(MeshoptDecoder);
    log('baixando modelo e texturas');

    Promise.all([
      carregador.loadAsync(ARQUIVOS_DA_CAMISETA.modelo),
      carregarTextura(ARQUIVOS_DA_CAMISETA.frente),
      carregarTextura(ARQUIVOS_DA_CAMISETA.costas),
    ])
      .then(([gltf, frente, costas]) => {
        if (cancelado) return;
        const modelo = gltf.scene;

        // Cada peça ganha um material próprio: frente e costas com a estampa, o resto liso
        modelo.traverse((objeto) => {
          if (!(objeto instanceof Mesh)) return;
          const peca = pecaDo(objeto);
          const estampa = peca.includes('Body_Front') ? frente : peca.includes('Body_Back') ? costas : null;
          let mapa: Texture | null = null;
          if (estampa) {
            // Frente e costas têm várias partes (lado de fora, de dentro, borda): cada uma
            // usa um clone da textura, com o encaixe calculado pelo próprio UV
            mapa = estampa.clone();
            const { repeat, offset } = encaixeDaTextura(caixaDeUv(objeto));
            mapa.repeat.set(...repeat);
            mapa.offset.set(...offset);
            mapa.needsUpdate = true;
            texturas.push(mapa);
          }
          (objeto.material as Material).dispose();
          objeto.material = new MeshStandardMaterial({
            color: mapa ? new Color(0xffffff) : new Color(COR_DO_TECIDO),
            map: mapa,
            roughness: 0.9,
            metalness: 0,
            side: DoubleSide,
          });
        });

        // Centraliza e ajusta a altura, para girar em volta do eixo do tronco
        const caixa = new Box3().setFromObject(modelo);
        const tamanho = caixa.getSize(new Vector3());
        const centro = caixa.getCenter(new Vector3());
        const escala = ALTURA / tamanho.y;
        modelo.scale.setScalar(escala);
        modelo.position.set(-centro.x * escala, -centro.y * escala, -centro.z * escala);
        giro.add(modelo);

        log('modelo pronto');
        modeloPronto = true;
        atualizarLaco();
      })
      .catch((erro: Error) => falhar(`não carregou o modelo (${erro.message})`));

    // ---------- desmontagem ----------
    return () => {
      cancelado = true;
      renderer.setAnimationLoop(null);
      observadorDaTela.disconnect();
      observadorDeTamanho.disconnect();
      quadro.removeEventListener('pointerdown', aoPressionar);
      quadro.removeEventListener('pointermove', aoMover);
      quadro.removeEventListener('pointerup', aoSoltar);
      quadro.removeEventListener('pointercancel', aoSoltar);
      quadro.removeEventListener('lostpointercapture', aoSoltar);
      renderer.domElement.removeEventListener('webglcontextlost', aoPerderContexto);
      cena.traverse((objeto) => {
        if (!(objeto instanceof Mesh)) return;
        objeto.geometry.dispose();
        (objeto.material as Material).dispose();
      });
      texturas.forEach((textura) => textura.dispose());
      renderer.dispose();
      // O Safari tem limite de contextos WebGL: devolve o deste já
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, []);

  // touch-pan-y: no celular, arrastar na vertical continua rolando a página
  return <div ref={quadroRef} className="absolute inset-0 cursor-grab touch-pan-y select-none" />;
};

export default CamisetaEm3D;
