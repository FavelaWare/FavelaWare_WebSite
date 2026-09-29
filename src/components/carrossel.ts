/**
 * ============================================
 * CONTAS DO CARROSSEL DE FOTOS
 * ============================================
 *
 * As partes do CarrosselDeFotos que não dependem da tela: separar as fotos
 * nas duas fileiras, dar a volta no deslocamento e sortear a troca.
 * Ficam aqui para serem testadas sem navegador.
 */

/** Separa as fotos alternando: 1ª em cima, 2ª embaixo, 3ª em cima... */
export function dividirEmFileiras<T>(fotos: T[]): [T[], T[]] {
  const cima = fotos.filter((_, indice) => indice % 2 === 0);
  const baixo = fotos.filter((_, indice) => indice % 2 === 1);
  return [cima, baixo];
}

/**
 * Traz o deslocamento para o intervalo [-largura, 0). As fotos da fileira se
 * repetem a cada `largura` pixels, então pular uma largura inteira não se vê:
 * é assim que a fileira anda sem fim.
 */
export function normalizarDeslocamento(deslocamento: number, largura: number): number {
  if (largura <= 0) return 0;
  const resto = deslocamento % largura;
  return resto >= 0 ? resto - largura : resto;
}

/** Troca a foto `indiceCima` da fileira de cima com a `indiceBaixo` da de baixo. */
export function trocarEntreFileiras<T>(cima: T[], baixo: T[], indiceCima: number, indiceBaixo: number): [T[], T[]] {
  const novaCima = [...cima];
  const novaBaixo = [...baixo];
  novaCima[indiceCima] = baixo[indiceBaixo];
  novaBaixo[indiceBaixo] = cima[indiceCima];
  return [novaCima, novaBaixo];
}

/** Um quadro da troca: quanto a foto andou a partir do lugar dela, o tamanho e o giro */
export interface QuadroDaTroca {
  x: number;
  y: number;
  escala: number;
  giro: number;
}

/** Começa devagar, acelera no meio e freia no fim */
const suavizar = (p: number) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2);

/**
 * Trajetória de uma foto na troca, com as fileiras andando. `dx`/`dy` é a
 * distância até o lugar de destino no começo; `deriva` é quanto esse destino
 * se afasta durante a troca (as duas fileiras andam em sentidos opostos).
 * No último quadro a foto está exatamente em cima do destino. No meio ela
 * cresce e gira um pouco, como se fosse levantada e posta no outro lugar.
 */
export function quadrosDaTroca(
  dx: number,
  dy: number,
  deriva: number,
  giroMaximo: number,
  total = 24,
): QuadroDaTroca[] {
  return Array.from({ length: total + 1 }, (_, k) => {
    const p = k / total;
    const andou = suavizar(p);
    const arco = Math.sin(Math.PI * p);
    return { x: andou * (dx + deriva * p), y: andou * dy, escala: 1 + 0.12 * arco, giro: giroMaximo * arco };
  });
}

/** Uma foto que está inteira na tela: a posição dela na fileira e o centro na horizontal */
export interface CartaoVisivel {
  indice: number;
  centro: number;
}

/**
 * Das fotos que aparecem na tela (mesmo que só um pedaço), fica com as que
 * aparecem uma vez só. Em evento com poucas fotos a mesma foto se repete lado
 * a lado; se ela trocasse, só uma das repetições andaria e as outras mudariam
 * de repente.
 */
export function soAsQueAparecemUmaVez<T extends CartaoVisivel>(cartoes: T[]): T[] {
  const vezes = new Map<number, number>();
  for (const cartao of cartoes) vezes.set(cartao.indice, (vezes.get(cartao.indice) ?? 0) + 1);
  return cartoes.filter((cartao) => vezes.get(cartao.indice) === 1);
}

/**
 * Sorteia uma foto de cima e escolhe a de baixo mais alinhada com ela, para a
 * troca parecer uma foto subindo e a outra descendo. `sortear` devolve um
 * número em [0, 1), como o Math.random.
 */
export function escolherParParaTrocar<T extends CartaoVisivel>(
  cima: T[],
  baixo: T[],
  sortear: () => number,
): [T, T] | null {
  if (cima.length === 0 || baixo.length === 0) return null;

  const deCima = cima[Math.floor(sortear() * cima.length)];
  const deBaixo = baixo.reduce((maisPerto, cartao) =>
    Math.abs(cartao.centro - deCima.centro) < Math.abs(maisPerto.centro - deCima.centro) ? cartao : maisPerto,
  );
  return [deCima, deBaixo];
}

/**
 * Até `quantos` pares para trocar ao mesmo tempo, sem repetir foto. Cada par
 * novo só usa fotos longe dos pares já escolhidos (pelo menos `distancia` px
 * entre os centros), para as fotos não se trombarem no caminho.
 */
export function escolherParesParaTrocar<T extends CartaoVisivel>(
  cima: T[],
  baixo: T[],
  quantos: number,
  distancia: number,
  sortear: () => number,
): [T, T][] {
  const pares: [T, T][] = [];
  // A própria foto já escolhida sai pela comparação direta, mesmo se `distancia` for 0:
  // repetir uma foto faria a segunda troca desfazer a primeira
  const longeDosEscolhidos = (cartao: T) =>
    pares.every(
      ([a, b]) =>
        cartao !== a &&
        cartao !== b &&
        Math.abs(cartao.centro - a.centro) >= distancia &&
        Math.abs(cartao.centro - b.centro) >= distancia,
    );

  while (pares.length < quantos) {
    const par = escolherParParaTrocar(cima.filter(longeDosEscolhidos), baixo.filter(longeDosEscolhidos), sortear);
    if (!par) break;
    pares.push(par);
  }
  return pares;
}
