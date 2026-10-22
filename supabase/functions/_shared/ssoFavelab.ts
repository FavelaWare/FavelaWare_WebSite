/**
 * Token de SSO do portal para o Favelab (JWT EdDSA / Ed25519, WebCrypto nativo).
 *
 * O portal só assina; quem valida é a função `sso-portal` do Favelab, que guarda
 * apenas a chave pública. Vida de 60 s e `jti` único: o Favelab consome cada
 * `jti` uma vez. Dado pessoal no token só o mínimo: o id do usuário (`sub`), o papel e o nome de
 * exibição (primeiro nome e inicial do sobrenome, sem e-mail, turma ou foto).
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
 * - gestor e a conta que alterna papéis (ver como) = administrador, seja qual for a visão do momento;
 * - professor, colaborador e banca = professor;
 * - aluno só com área (participante ligado);
 * - parceiro não entra;
 * - quem ainda deve trocar a senha conclui o primeiro acesso no portal antes.
 */
export function decidirAcessoAoFavelab(perfil: PerfilParaOFavelab | null): DecisaoDeAcesso {
  if (!perfil?.papel) return { recusa: 'sem-acesso' };
  if (perfil.precisa_trocar_senha) return { recusa: 'primeiro-acesso' };
  if (perfil.pode_alternar_papel || perfil.papel === 'gestor') return { papel: 'admin' };
  if (['professor', 'colaborador', 'banca'].includes(perfil.papel)) return { papel: 'teacher' };
  if (perfil.papel === 'aluno' && perfil.participante_id) return { papel: 'student' };
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

/**
 * Nome que o Favelab mostra (ranking, cabeçalho): primeiro nome e inicial do sobrenome, como
 * manda docs/gamificacao.md para menores ("Maria da Silva Santos" vira "Maria S."). Nome de uma
 * palavra só fica como está. Sem nome no portal, devolve undefined e o token vai sem a claim.
 */
export function nomeDeExibicao(nome: string | null | undefined): string | undefined {
  // deno-lint-ignore no-control-regex
  const partes = (nome ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return undefined;
  const maiuscula = (t: string) => t.charAt(0).toLocaleUpperCase('pt-BR');
  const primeiro = maiuscula(partes[0]) + partes[0].slice(1).toLocaleLowerCase('pt-BR');
  if (partes.length === 1) return primeiro.slice(0, NOME_MAXIMO);
  const ultimo = partes[partes.length - 1];
  return `${primeiro.slice(0, NOME_MAXIMO - 3)} ${maiuscula(ultimo)}.`;
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
