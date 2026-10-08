/**
 * ============================================
 * CAMISETA 3D — REGRAS SEM TELA
 * ============================================
 *
 * O que a camiseta 3D da Home decide sem precisar do three.js: velocidade do
 * giro, quando usar o 3D, como encaixar a textura no molde e o crédito do
 * modelo. Fica separado para ser testado e para o three não ir parar no
 * pacote principal (este arquivo é importado pela Home; o three, não).
 */

/** Graus por segundo: uma volta inteira a cada 12 s (vale para o 3D e para o giro em CSS) */
export const VELOCIDADE_DO_GIRO = 30;

/** Azul-marinho da camiseta do FavelaWare (é também o fundo das texturas da frente e das costas) */
export const COR_DO_TECIDO = '#161b64';

/** Arquivos da camiseta 3D, em public/modelos/ */
export const ARQUIVOS_DA_CAMISETA = {
  modelo: '/modelos/camiseta.glb',
  frente: '/modelos/camiseta-frente.webp',
  costas: '/modelos/camiseta-costas.webp',
};

/**
 * Crédito do modelo 3D. A licença CC BY 4.0 exige título, autor, link da fonte,
 * link da licença e dizer que o modelo foi modificado.
 */
export const CREDITO_DO_MODELO = {
  titulo: 'T Shirt',
  autor: 'funlab117',
  fonte: 'https://sketchfab.com/3d-models/t-shirt-c1a3e5eb9b5445f4b7d4be82f1127eba',
  licenca: 'CC BY 4.0',
  linkDaLicenca: 'https://creativecommons.org/licenses/by/4.0/',
  modificacao: 'simplificado, recolorido e com as estampas do FavelaWare',
};

/** Próximo ângulo do giro (graus, em [0, 360)) depois de `intervaloMs` milissegundos */
export function proximoAngulo(angulo: number, intervaloMs: number): number {
  return (angulo + (VELOCIDADE_DO_GIRO * Math.max(0, intervaloMs)) / 1000) % 360;
}

/** Arrastar a camiseta: quantos graus ela gira por pixel arrastado */
export const GRAUS_POR_PIXEL = 0.5;

/** Quanto do embalo sobra depois de 1 s (ao soltar, ela desacelera até parar em ~1 s) */
const EMBALO_QUE_SOBRA_EM_1S = 0.005;

/** Ângulo em [0, 360), inclusive vindo de arrasto para a esquerda (negativo) */
export function normalizarAngulo(angulo: number): number {
  return ((angulo % 360) + 360) % 360;
}

/** Embalo (graus por ms) que sobra depois de `intervaloMs`, perdendo força com o tempo */
export function amortecerEmbalo(embalo: number, intervaloMs: number): number {
  const restante = embalo * Math.pow(EMBALO_QUE_SOBRA_EM_1S, Math.max(0, intervaloMs) / 1000);
  // Abaixo de 1° por segundo já não se vê: zera
  return Math.abs(restante) < 0.001 ? 0 : restante;
}

/**
 * Usa o 3D só com WebGL2 (o three.js exige) e sem "reduzir movimento": nesse
 * caso a camiseta fica parada, e baixar o 3D para uma imagem parada não compensa.
 */
export function deveUsar3D({
  reduzirMovimento,
  temWebGL2,
}: {
  reduzirMovimento: boolean;
  temWebGL2: boolean;
}): boolean {
  return temWebGL2 && !reduzirMovimento;
}

/** Faixa de UV de uma peça do molde (as coordenadas vêm em milímetros do molde) */
export interface CaixaDoMolde {
  uMin: number;
  uMax: number;
  vMin: number;
  vMax: number;
}

/**
 * Como esticar a textura para cobrir a peça: a textura foi desenhada do tamanho
 * da peça inteira (borda a borda do molde), então UV (mm) vira [0, 1] por
 * uv × repeat + offset.
 */
export function encaixeDaTextura(caixa: CaixaDoMolde): { repeat: [number, number]; offset: [number, number] } {
  const largura = caixa.uMax - caixa.uMin;
  const altura = caixa.vMax - caixa.vMin;
  return {
    repeat: [1 / largura, 1 / altura],
    offset: [-caixa.uMin / largura, -caixa.vMin / altura],
  };
}
