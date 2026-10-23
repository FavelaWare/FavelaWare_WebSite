/**
 * Token de SSO do portal para o Favelab (JWT EdDSA / Ed25519, WebCrypto nativo).
 *
 * O portal só assina; quem valida é a função `sso-portal` do Favelab, que guarda
 * apenas a chave pública. Vida de 60 s e `jti` único: o Favelab consome cada
 * `jti` uma vez. Dado pessoal no token só o mínimo: o id do usuário (`sub`), o papel e o nome de
 * exibição (o nome do cadastro, sem e-mail, turma ou foto).
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
 * Nome que o Favelab mostra (ranking, cabeçalho): o nome completo do cadastro do portal, como a
 * pessoa está registrada ("Lucelho Silva"). Espaços repetidos viram um; a grafia é mantida, e só
 * um nome todo em maiúsculas ou todo em minúsculas é reescrito em caixa de título (da, de, do,
 * das, dos e e ficam minúsculos). Acima de 30 caracteres vira primeiro e último nome,
 * cortado no limite. Sem nome no portal, devolve undefined e o token vai sem a claim.
 */
export function nomeDeExibicao(nome: string | null | undefined): string | undefined {
  // NFC: letra com acento decomposto conta como um caractere só. Controle, formato (inverte a direção do
  // texto, largura zero) e separador de linha viram espaço.
  const partes = (nome ?? '')
    .normalize('NFC')
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, ' ')
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
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

export interface OpcoesDoToken {
  /** Nome de exibição (ver nomeDeExibicao); sem ele o token vai sem a claim */
  nome?: string;
  /** Hora atual em segundos (injetável nos testes) */
  agoraS?: number;
}

/** Assina o token de quem entra no Favelab (`usuarioId` é o id da conta no portal) */
export async function assinarTokenDoFavelab(
  usuarioId: string,
  papel: PapelNoFavelab,
  chave: ChaveDeAssinatura,
  { nome, agoraS = Math.floor(Date.now() / 1000) }: OpcoesDoToken = {},
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
