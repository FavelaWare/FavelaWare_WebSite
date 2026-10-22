/**
 * Token de SSO do portal para o Favelab (JWT EdDSA / Ed25519, WebCrypto nativo).
 *
 * O portal só assina; quem valida é a função `sso-portal` do Favelab, que guarda
 * apenas a chave pública. Vida de 60 s e `jti` único: o Favelab consome cada
 * `jti` uma vez. Sem nenhum dado pessoal no token: só o id do usuário (`sub`).
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

/** Assina o token de quem entra no Favelab (`usuarioId` é o id da conta no portal) */
export async function assinarTokenDoFavelab(
  usuarioId: string,
  chave: ChaveDeAssinatura,
  agoraS = Math.floor(Date.now() / 1000),
): Promise<string> {
  const cabecalho = base64Url(JSON.stringify({ alg: 'EdDSA', typ: 'JWT', kid: chave.kid }));
  const carga = base64Url(
    JSON.stringify({
      iss: chave.issuer ?? ISSUER_PADRAO,
      aud: AUDIENCE_FAVELAB,
      sub: usuarioId,
      jti: crypto.randomUUID(),
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
