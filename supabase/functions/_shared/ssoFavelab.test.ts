// Rodar: npx --yes deno@2.9.6 test supabase/functions/_shared/ssoFavelab.test.ts
import { assinarTokenDoFavelab, AUDIENCE_FAVELAB, ISSUER_PADRAO, lerChaveDoAmbiente, VIDA_DO_TOKEN_S } from './ssoFavelab.ts';

const igual = (a: unknown, b: unknown, msg: string) => {
  if (a !== b) throw new Error(`${msg}: esperado ${String(b)}, veio ${String(a)}`);
};

const doBase64Url = (t: string) => {
  const b64 = t.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)), (c) => c.charCodeAt(0));
};

const par = async () => {
  const k = (await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])) as CryptoKeyPair;
  return {
    privada: await crypto.subtle.exportKey('jwk', k.privateKey),
    publica: await crypto.subtle.exportKey('jwk', k.publicKey),
  };
};

const USUARIO = '33333333-3333-4333-8333-333333333333';

Deno.test('token assinado tem as claims que o Favelab exige e assinatura válida', async () => {
  const { privada, publica } = await par();
  const token = await assinarTokenDoFavelab(USUARIO, { privada, kid: 'k1' }, 1_800_000_000);
  const [c, p, s] = token.split('.');
  const cabecalho = JSON.parse(new TextDecoder().decode(doBase64Url(c)));
  const carga = JSON.parse(new TextDecoder().decode(doBase64Url(p)));
  igual(cabecalho.alg, 'EdDSA', 'alg');
  igual(cabecalho.kid, 'k1', 'kid');
  igual(carga.iss, ISSUER_PADRAO, 'iss');
  igual(carga.aud, AUDIENCE_FAVELAB, 'aud');
  igual(carga.sub, USUARIO, 'sub');
  igual(carga.exp - carga.iat, VIDA_DO_TOKEN_S, 'vida');
  igual(Object.keys(carga).sort().join(','), 'aud,exp,iat,iss,jti,nbf,sub', 'sem dado pessoal além do sub');
  const chave = await crypto.subtle.importKey('jwk', publica, { name: 'Ed25519' }, false, ['verify']);
  igual(await crypto.subtle.verify('Ed25519', chave, doBase64Url(s), new TextEncoder().encode(`${c}.${p}`)), true, 'assinatura');
});

Deno.test('cada token leva um jti diferente', async () => {
  const { privada } = await par();
  const jti = async () => JSON.parse(new TextDecoder().decode(doBase64Url((await assinarTokenDoFavelab(USUARIO, { privada, kid: 'k1' })).split('.')[1]))).jti;
  igual((await jti()) === (await jti()), false, 'jti repetido');
});

Deno.test('lerChaveDoAmbiente: sem segredo, malformada ou não Ed25519 devolve null', async () => {
  const { privada } = await par();
  const lerCom = (chave: string | undefined, kid: string | undefined) => {
    for (const [nome, valor] of [['FAVELAB_SSO_CHAVE_PRIVADA', chave], ['FAVELAB_SSO_KID', kid]] as const) {
      if (valor === undefined) Deno.env.delete(nome);
      else Deno.env.set(nome, valor);
    }
    return lerChaveDoAmbiente();
  };
  igual(lerCom(undefined, undefined), null, 'sem segredo');
  igual(lerCom('não é json', 'k1'), null, 'malformada');
  igual(lerCom(JSON.stringify({ kty: 'RSA', d: 'x' }), 'k1'), null, 'tipo errado');
  igual(lerCom(JSON.stringify(privada), undefined), null, 'sem kid');
  igual(lerCom(JSON.stringify(privada), 'k1')?.kid, 'k1', 'válida');
  Deno.env.delete('FAVELAB_SSO_CHAVE_PRIVADA');
  Deno.env.delete('FAVELAB_SSO_KID');
});
