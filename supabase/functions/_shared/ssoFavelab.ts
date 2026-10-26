/**
 * Token de SSO do portal para o Favelab (JWT EdDSA / Ed25519, WebCrypto nativo).
 *
 * O portal só assina; quem valida é a função `sso-portal` do Favelab, que guarda
 * apenas a chave pública. Vida de 60 s e `jti` único: o Favelab consome cada
 * `jti` uma vez. Dado pessoal no token só o mínimo: o id do usuário (`sub`), o papel, o nome de
 * exibição (o nome do cadastro, sem e-mail ou foto) e, só para aluno com participante ligado, a
 * turma (`turma_id` e `turma_nome`). Sem turma o token não leva nenhuma das duas claims.
 */

export const ISSUER_PADRAO = 'favelaware-portal';
export const AUDIENCE_FAVELAB = 'favelab';
export const VIDA_DO_TOKEN_S = 60;

const base64Url = (dados: Uint8Array | string): string => {
  const bytes = typeof dados === 'string' ? new TextEncoder().encode(dados) : dados;
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

/** Papel no Favelab: aluno, professor ou administrador (o Favelab aplica a cada acesso) */
export type PapelNoFavelab = 'student' | 'teacher' | 'admin';

export interface PerfilParaOFavelab {
  papel: string | null;
  nome?: string | null;
  participante_id: number | string | null;
  precisa_trocar_senha: boolean | null;
  pode_alternar_papel: boolean | null;
}

export type DecisaoDeAcesso =
  | { papel: PapelNoFavelab }
  | { recusa: 'sem-acesso' | 'primeiro-acesso' };

/**
 * Quem entra no Favelab e com que papel. Na dúvida, recusa (falha fechada).
 * - o papel segue a visão do momento (quem usa "ver como" muda o papel salvo no perfil):
 *   gestor = administrador, professor, colaborador e banca = professor, aluno = aluno;
 * - aluno só com área (participante ligado) ou conta que alterna papéis (aluno demonstração);
 * - parceiro não entra;
 * - quem ainda deve trocar a senha conclui o primeiro acesso no portal antes.
 */
export function decidirAcessoAoFavelab(perfil: PerfilParaOFavelab | null): DecisaoDeAcesso {
  if (!perfil?.papel) return { recusa: 'sem-acesso' };
  if (perfil.precisa_trocar_senha) return { recusa: 'primeiro-acesso' };
  if (perfil.papel === 'gestor') return { papel: 'admin' };
  if (['professor', 'colaborador', 'banca'].includes(perfil.papel)) return { papel: 'teacher' };
  if (perfil.papel === 'aluno' && (perfil.participante_id || perfil.pode_alternar_papel)) return { papel: 'student' };
  return { recusa: 'sem-acesso' };
}

export interface ChaveDeAssinatura {
  /** Chave privada Ed25519 em JWK (secret FAVELAB_SSO_CHAVE_PRIVADA) */
  privada: JsonWebKey;
  /** Identificador da chave, para o Favelab achar a pública certa (rotação) */
  kid: string;
  issuer?: string;
}

/** Lê a chave dos secrets; null se faltar ou estiver malformada (a função responde 503) */
export const lerChaveDoAmbiente = (): ChaveDeAssinatura | null => {
  try {
    const privada = JSON.parse(Deno.env.get('FAVELAB_SSO_CHAVE_PRIVADA') ?? '');
    const kid = Deno.env.get('FAVELAB_SSO_KID');
    if (!privada || privada.kty !== 'OKP' || privada.crv !== 'Ed25519' || !privada.d || !kid) return null;
    return { privada, kid, issuer: Deno.env.get('FAVELAB_SSO_ISSUER') ?? ISSUER_PADRAO };
  } catch {
    return null;
  }
};

/** Maior nome de exibição (o mesmo limite do apelido no Favelab) */
export const NOME_MAXIMO = 30;

/** Partículas que ficam em minúscula quando o nome é reescrito em caixa de título */
const PARTICULAS = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);

/**
 * Limpeza comum dos textos que vão no token: NFC (letra com acento decomposto conta como um
 * caractere só); controle, formato (inverte a direção do texto, largura zero) e separador de
 * linha viram espaço; espaços repetidos viram um. Devolve as palavras.
 */
const partesLimpas = (texto: string | null | undefined): string[] =>
  (texto ?? '')
    .normalize('NFC')
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, ' ')
    .trim()
    .split(/\s+/u)
    .filter(Boolean);

/**
 * Nome que o Favelab mostra (ranking, cabeçalho): o nome completo do cadastro do portal, como a
 * pessoa está registrada ("Lucelho Silva"). Espaços repetidos viram um; a grafia é mantida, e só
 * um nome todo em maiúsculas ou todo em minúsculas é reescrito em caixa de título (da, de, do,
 * das, dos e e ficam minúsculos). Acima de 30 caracteres vira primeiro e último nome,
 * cortado no limite. Sem nome no portal, devolve undefined e o token vai sem a claim.
 */
export function nomeDeExibicao(nome: string | null | undefined): string | undefined {
  const partes = partesLimpas(nome);
  if (partes.length === 0) return undefined;
  // Tudo por caractere (ponto de código), nunca por unidade UTF-16: não corta emoji ao meio
  const cortar = (t: string, n: number) => Array.from(t).slice(0, Math.max(n, 0)).join('');
  const capitalizar = (t: string, indice: number) => {
    const minuscula = t.toLocaleLowerCase('pt-BR');
    if (indice > 0 && PARTICULAS.has(minuscula)) return minuscula;
    const [inicio, ...resto] = Array.from(minuscula);
    return inicio.toLocaleUpperCase('pt-BR') + resto.join('');
  };
  const completo = partes.join(' ');
  const semMistura = completo === completo.toLocaleUpperCase('pt-BR') || completo === completo.toLocaleLowerCase('pt-BR');
  const grafado = semMistura ? partes.map(capitalizar) : partes;
  const inteiro = grafado.join(' ');
  if (Array.from(inteiro).length <= NOME_MAXIMO) return inteiro;
  if (grafado.length === 1) return cortar(inteiro, NOME_MAXIMO);
  const ultimo = grafado[grafado.length - 1];
  const sufixo = ` ${ultimo}`;
  if (Array.from(sufixo).length >= NOME_MAXIMO) return cortar(inteiro, NOME_MAXIMO);
  return cortar(grafado[0], NOME_MAXIMO - Array.from(sufixo).length) + sufixo;
}

/** Maior nome de turma no token (pontos de código) */
export const TURMA_NOME_MAXIMO = 60;

/**
 * Nome da turma que o Favelab mostra: "<edição> · <turma>" (ex.: "Edição 4 (2027) · Turma 1"),
 * porque o nome da turma sozinho se repete entre edições. Mesma limpeza do nomeDeExibicao, mas a
 * grafia é mantida (sem caixa de título). Corta em 60 pontos de código, nunca ao meio de um
 * emoji. Sem texto na edição ou na turma devolve undefined (o token vai sem turma).
 */
export function nomeDaTurma(edicaoNome: string | null | undefined, turmaNome: string | null | undefined): string | undefined {
  const edicao = partesLimpas(edicaoNome).join(' ');
  const turma = partesLimpas(turmaNome).join(' ');
  if (!edicao || !turma) return undefined;
  // Acima do limite quem encurta é a edição: a turma é o que diferencia (duas turmas não podem virar o mesmo texto)
  const separador = ' · ';
  const pontosDaTurma = Array.from(turma);
  if (pontosDaTurma.length >= TURMA_NOME_MAXIMO) return pontosDaTurma.slice(0, TURMA_NOME_MAXIMO).join('');
  const espacoDaEdicao = TURMA_NOME_MAXIMO - Array.from(separador).length - pontosDaTurma.length;
  const edicaoCortada = Array.from(edicao).slice(0, Math.max(espacoDaEdicao, 0)).join('').trim();
  return edicaoCortada ? `${edicaoCortada}${separador}${turma}` : turma;
}

/** Participante do aluno com a turma e a edição (o que a Edge Function consulta) */
export interface ParticipanteComTurma {
  turma_id: number | string | null;
  turmas: EmbedDaTurma | EmbedDaTurma[] | null;
  edicoes: EmbedDaEdicao | EmbedDaEdicao[] | null;
}

type EmbedDaEdicao = { nome: string | null; demonstracao: boolean | null };
type EmbedDaTurma = { nome: string | null };

/** O PostgREST devolve a relação como objeto (FK muitos-para-um) ou, se a FK mudar, como lista: aceita as duas */
const primeiro = <T>(valor: T | T[] | null | undefined): T | null => (Array.isArray(valor) ? (valor[0] ?? null) : (valor ?? null));

/**
 * Turma que vai no token. Só aluno ("student") com participante ligado, turma e edição conhecidas,
 * e fora da edição de demonstração. Edição encerrada envia (a matrícula é um fato). Qualquer
 * dúvida devolve undefined: o token vai sem turma, nunca com turma nula.
 */
export function turmaParaOFavelab(
  papel: PapelNoFavelab,
  participante: ParticipanteComTurma | null | undefined,
): { id: number; nome: string } | undefined {
  if (papel !== 'student' || !participante) return undefined;
  const edicao = primeiro(participante.edicoes);
  if (!edicao || edicao.demonstracao !== false) return undefined;
  const bruto = participante.turma_id;
  const id = typeof bruto === 'string' ? (/^\d{1,15}$/.test(bruto) ? Number(bruto) : NaN) : bruto;
  if (typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0) return undefined;
  const nome = nomeDaTurma(edicao.nome, primeiro(participante.turmas)?.nome);
  return nome ? { id, nome } : undefined;
}

export interface OpcoesDoToken {
  /** Nome de exibição (ver nomeDeExibicao); sem ele o token vai sem a claim */
  nome?: string;
  /** Turma do aluno (ver turmaParaOFavelab); sem ela o token vai sem turma_id e turma_nome */
  turma?: { id: number; nome: string };
  /** Hora atual em segundos (injetável nos testes) */
  agoraS?: number;
}

/** Assina o token de quem entra no Favelab (`usuarioId` é o id da conta no portal) */
export async function assinarTokenDoFavelab(
  usuarioId: string,
  papel: PapelNoFavelab,
  chave: ChaveDeAssinatura,
  { nome, turma, agoraS = Math.floor(Date.now() / 1000) }: OpcoesDoToken = {},
): Promise<string> {
  const cabecalho = base64Url(JSON.stringify({ alg: 'EdDSA', typ: 'JWT', kid: chave.kid }));
  const carga = base64Url(
    JSON.stringify({
      iss: chave.issuer ?? ISSUER_PADRAO,
      aud: AUDIENCE_FAVELAB,
      sub: usuarioId,
      jti: crypto.randomUUID(),
      role: papel,
      ...(nome ? { name: nome } : {}),
      ...(turma ? { turma_id: turma.id, turma_nome: turma.nome } : {}),
      iat: agoraS,
      nbf: agoraS,
      exp: agoraS + VIDA_DO_TOKEN_S,
    }),
  );
  const privada = await crypto.subtle.importKey('jwk', chave.privada, { name: 'Ed25519' }, false, ['sign']);
  const assinatura = new Uint8Array(
    await crypto.subtle.sign('Ed25519', privada, new TextEncoder().encode(`${cabecalho}.${carga}`)),
  );
  return `${cabecalho}.${carga}.${base64Url(assinatura)}`;
}
