// Rodar: npx --yes deno@2.9.6 test supabase/functions/_shared/ssoFavelab.test.ts
import { assinarTokenDoFavelab, nomeDeExibicao, NOME_MAXIMO, AUDIENCE_FAVELAB, decidirAcessoAoFavelab, ISSUER_PADRAO, lerChaveDoAmbiente, VIDA_DO_TOKEN_S, type PerfilParaOFavelab } from './ssoFavelab.ts';

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
  const token = await assinarTokenDoFavelab(USUARIO, 'student', { privada, kid: 'k1' }, { agoraS: 1_800_000_000 });
  const [c, p, s] = token.split('.');
  const cabecalho = JSON.parse(new TextDecoder().decode(doBase64Url(c)));
  const carga = JSON.parse(new TextDecoder().decode(doBase64Url(p)));
  igual(cabecalho.alg, 'EdDSA', 'alg');
  igual(cabecalho.kid, 'k1', 'kid');
  igual(carga.iss, ISSUER_PADRAO, 'iss');
  igual(carga.aud, AUDIENCE_FAVELAB, 'aud');
  igual(carga.sub, USUARIO, 'sub');
  igual(carga.role, 'student', 'role');
  igual(carga.exp - carga.iat, VIDA_DO_TOKEN_S, 'vida');
  igual(Object.keys(carga).sort().join(','), 'aud,exp,iat,iss,jti,nbf,role,sub', 'sem nome, só id e papel');
  const chave = await crypto.subtle.importKey('jwk', publica, { name: 'Ed25519' }, false, ['verify']);
  igual(await crypto.subtle.verify('Ed25519', chave, doBase64Url(s), new TextEncoder().encode(`${c}.${p}`)), true, 'assinatura');
});

Deno.test('cada token leva um jti diferente', async () => {
  const { privada } = await par();
  const jti = async () => JSON.parse(new TextDecoder().decode(doBase64Url((await assinarTokenDoFavelab(USUARIO, 'student', { privada, kid: 'k1' })).split('.')[1]))).jti;
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

const perfil = (p: Partial<PerfilParaOFavelab>): PerfilParaOFavelab => ({
  papel: 'aluno',
  participante_id: 7,
  precisa_trocar_senha: false,
  pode_alternar_papel: false,
  ...p,
});
const decide = (p: Partial<PerfilParaOFavelab>) => JSON.stringify(decidirAcessoAoFavelab(perfil(p)));

Deno.test('decidirAcessoAoFavelab: papel de cada perfil', () => {
  igual(decide({}), '{"papel":"student"}', 'aluno com área');
  igual(decide({ papel: 'professor', participante_id: null }), '{"papel":"teacher"}', 'professor');
  igual(decide({ papel: 'colaborador', participante_id: null }), '{"papel":"teacher"}', 'colaborador');
  igual(decide({ papel: 'banca', participante_id: null }), '{"papel":"teacher"}', 'banca');
  igual(decide({ papel: 'gestor', participante_id: null }), '{"papel":"admin"}', 'gestor');
});

Deno.test('decidirAcessoAoFavelab: conta que alterna papel é administrador em qualquer visão', () => {
  for (const papel of ['aluno', 'professor', 'gestor']) {
    igual(decide({ papel, pode_alternar_papel: true, participante_id: null }), '{"papel":"admin"}', papel);
  }
});

Deno.test('decidirAcessoAoFavelab: recusas', () => {
  igual(decidirAcessoAoFavelab(null).hasOwnProperty('recusa'), true, 'sem perfil');
  igual(decide({ papel: 'parceiro', participante_id: null }), '{"recusa":"sem-acesso"}', 'parceiro');
  igual(decide({ participante_id: null }), '{"recusa":"sem-acesso"}', 'aluno sem turma');
  igual(decide({ papel: null }), '{"recusa":"sem-acesso"}', 'sem papel');
  igual(decide({ papel: 'papel-novo' }), '{"recusa":"sem-acesso"}', 'papel desconhecido');
  igual(decide({ papel: 'gestor', precisa_trocar_senha: true }), '{"recusa":"primeiro-acesso"}', 'primeiro acesso');
});

Deno.test('token com nome leva a claim name e nada além de id, papel e nome', async () => {
  const { privada, publica } = await par();
  const token = await assinarTokenDoFavelab(USUARIO, 'teacher', { privada, kid: 'k1' }, { nome: 'Lucelho S.', agoraS: 1_800_000_000 });
  const [c, p, s] = token.split('.');
  const carga = JSON.parse(new TextDecoder().decode(doBase64Url(p)));
  igual(carga.name, 'Lucelho S.', 'name');
  igual(Object.keys(carga).sort().join(','), 'aud,exp,iat,iss,jti,name,nbf,role,sub', 'sem e-mail, turma ou foto');
  const chave = await crypto.subtle.importKey('jwk', publica, { name: 'Ed25519' }, false, ['verify']);
  igual(await crypto.subtle.verify('Ed25519', chave, doBase64Url(s), new TextEncoder().encode(`${c}.${p}`)), true, 'assinatura');
});

Deno.test('nomeDeExibicao: primeiro nome e inicial do sobrenome', () => {
  igual(nomeDeExibicao('Lucelho Silva'), 'Lucelho S.', 'dois nomes');
  igual(nomeDeExibicao('  maria   da  silva  santos '), 'Maria S.', 'vários nomes e espaços');
  igual(nomeDeExibicao('JOÃO PEDRO'), 'João P.', 'caixa alta e acento');
  igual(nomeDeExibicao('ana'), 'Ana', 'uma palavra só');
  igual(nomeDeExibicao('Ana\nSilva'), 'Ana S.', 'quebra de linha vira espaço');
  igual(nomeDeExibicao('Ana\u0000Silva'), 'Ana S.', 'caractere nulo vira espaço');
});

Deno.test('nomeDeExibicao: sem nome devolve undefined e nunca passa do limite', () => {
  for (const vazio of [undefined, null, '', '   ', '\n\t']) igual(nomeDeExibicao(vazio), undefined, JSON.stringify(vazio));
  const longo = nomeDeExibicao('A'.repeat(80) + ' Silva');
  igual((longo ?? '').length <= NOME_MAXIMO, true, 'limite com sobrenome');
  igual(longo?.endsWith(' S.'), true, 'mantém a inicial');
  igual((nomeDeExibicao('B'.repeat(80)) ?? '').length, NOME_MAXIMO, 'uma palavra longa é cortada no limite');
});

const pontos = (t: string | undefined) => Array.from(t ?? '').length;
const semParSolto = (t: string | undefined) => (t ?? '').isWellFormed();

Deno.test('nomeDeExibicao: inicial que vira duas letras (ß) nunca passa do limite', () => {
  const nome = nomeDeExibicao('A'.repeat(40) + ' ßilva');
  igual(pontos(nome) <= NOME_MAXIMO, true, 'limite');
  igual(nome?.endsWith(' SS.'), true, 'inicial SS');
  igual(nomeDeExibicao('Ana ßilva'), 'Ana SS.', 'nome curto com ß');
});

Deno.test('nomeDeExibicao: emoji e caractere astral nunca são cortados ao meio', () => {
  const nome = nomeDeExibicao('😀'.repeat(60) + ' Silva');
  igual(semParSolto(nome), true, 'sem par solto');
  igual(pontos(nome) <= NOME_MAXIMO, true, 'limite em caracteres');
  igual(nome?.endsWith(' S.'), true, 'mantém a inicial');
  // posição exata do corte caindo no meio de um emoji (primeiro nome de 26 letras + emoji)
  const corte = nomeDeExibicao('B'.repeat(26) + '😀😀😀 Santos');
  igual(semParSolto(corte), true, 'corte no limite');
  igual(pontos(corte) <= NOME_MAXIMO, true, 'limite no corte');
  // sobrenome que começa com caractere fora do plano básico
  const astral = nomeDeExibicao('Ana \u{1D49C}lfa');
  igual(semParSolto(astral), true, 'inicial astral inteira');
  igual(astral, 'Ana \u{1D49C}.', 'inicial astral');
});

Deno.test('nomeDeExibicao: acento decomposto conta como um caractere e caracteres de formato somem', () => {
  const decomposto = 'Jose\u0301 Silva'; // é escrito como e + acento
  igual(nomeDeExibicao(decomposto), 'José S.', 'normaliza para NFC');
  const longoDecomposto = nomeDeExibicao('e\u0301'.repeat(28) + ' Silva');
  igual(pontos(longoDecomposto) <= NOME_MAXIMO, true, 'NFD não estoura o limite');
  igual(nomeDeExibicao('Ana\u202ESilva'), 'Ana S.', 'inversão de direção vira espaço');
  igual(nomeDeExibicao('Ana\u200BSilva'), 'Ana S.', 'largura zero vira espaço');
  igual(nomeDeExibicao('\u202E\u200B'), undefined, 'só formato vira vazio');
});

Deno.test('nomeDeExibicao: letras de outros alfabetos funcionam', () => {
  igual(nomeDeExibicao('иван петров'), 'Иван П.', 'cirílico');
  igual(nomeDeExibicao('李 明'), '李 明.', 'chinês');
});
