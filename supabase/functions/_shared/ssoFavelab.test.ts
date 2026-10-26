// Rodar: npx --yes deno@2.9.6 test supabase/functions/_shared/ssoFavelab.test.ts
import { assinarTokenDoFavelab, nomeDaTurma, nomeDeExibicao, NOME_MAXIMO, AUDIENCE_FAVELAB, decidirAcessoAoFavelab, ISSUER_PADRAO, lerChaveDoAmbiente, turmaParaOFavelab, VIDA_DO_TOKEN_S, type ParticipanteComTurma, type PerfilParaOFavelab } from './ssoFavelab.ts';

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
  igual(Object.keys(carga).sort().join(','), 'aud,exp,iat,iss,jti,nbf,role,sub', 'sem nome e sem turma, só id e papel');
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

Deno.test('decidirAcessoAoFavelab: conta que alterna papel entra com o papel da visão atual', () => {
  const alterna = { pode_alternar_papel: true, participante_id: null };
  igual(decide({ ...alterna, papel: 'aluno' }), '{"papel":"student"}', 'ver como aluno');
  igual(decide({ ...alterna, papel: 'professor' }), '{"papel":"teacher"}', 'ver como professor');
  igual(decide({ ...alterna, papel: 'gestor' }), '{"papel":"admin"}', 'ver como gestor');
  igual(decide({ ...alterna, papel: 'parceiro' }), '{"recusa":"sem-acesso"}', 'ver como parceiro');
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
  const token = await assinarTokenDoFavelab(USUARIO, 'teacher', { privada, kid: 'k1' }, { nome: 'Lucelho Silva', agoraS: 1_800_000_000 });
  const [c, p, s] = token.split('.');
  const carga = JSON.parse(new TextDecoder().decode(doBase64Url(p)));
  igual(carga.name, 'Lucelho Silva', 'name');
  igual(Object.keys(carga).sort().join(','), 'aud,exp,iat,iss,jti,name,nbf,role,sub', 'sem e-mail, foto ou turma (nome sem turma)');
  const chave = await crypto.subtle.importKey('jwk', publica, { name: 'Ed25519' }, false, ['verify']);
  igual(await crypto.subtle.verify('Ed25519', chave, doBase64Url(s), new TextEncoder().encode(`${c}.${p}`)), true, 'assinatura');
});

const pontos = (t: string | undefined) => Array.from(t ?? '').length;
const semParSolto = (t: string | undefined) => (t ?? '').isWellFormed();

Deno.test('nomeDeExibicao: nome completo do cadastro, grafia mantida', () => {
  igual(nomeDeExibicao('Lucelho Silva'), 'Lucelho Silva', 'dois nomes');
  igual(nomeDeExibicao('  Maria   da  Silva  Santos '), 'Maria da Silva Santos', 'espaços repetidos');
  igual(nomeDeExibicao('Ana'), 'Ana', 'uma palavra só');
  igual(nomeDeExibicao('Ana\nSilva'), 'Ana Silva', 'quebra de linha vira espaço');
  igual(nomeDeExibicao('Ana\u0000Silva'), 'Ana Silva', 'caractere nulo vira espaço');
  igual(nomeDeExibicao('João de McDonald'), 'João de McDonald', 'caixa mista é respeitada');
});

Deno.test('nomeDeExibicao: tudo em maiúsculas ou minúsculas vira caixa de título', () => {
  igual(nomeDeExibicao('LUCELHO SILVA'), 'Lucelho Silva', 'maiúsculas');
  igual(nomeDeExibicao('maria da silva'), 'Maria da Silva', 'minúsculas e partícula');
  igual(nomeDeExibicao('JOÃO PEDRO DOS SANTOS'), 'João Pedro dos Santos', 'acento e partícula');
  igual(nomeDeExibicao('иван петров'), 'Иван Петров', 'cirílico');
});

Deno.test('nomeDeExibicao: sem nome devolve undefined e nunca passa do limite', () => {
  for (const vazio of [undefined, null, '', '   ', '\n\t']) igual(nomeDeExibicao(vazio), undefined, JSON.stringify(vazio));
  igual(nomeDeExibicao('Ana Paula de Souza Oliveira Pereira Santos'), 'Ana Santos', 'longo vira primeiro e último');
  const longo = nomeDeExibicao('A'.repeat(80) + ' Silva');
  igual(pontos(longo) <= NOME_MAXIMO, true, 'limite com sobrenome');
  igual(longo?.endsWith(' Silva'), true, 'mantém o último nome');
  igual(pontos(nomeDeExibicao('B'.repeat(80))), NOME_MAXIMO, 'uma palavra longa é cortada no limite');
  igual(pontos(nomeDeExibicao('Ana ' + 'C'.repeat(60))), NOME_MAXIMO, 'último nome enorme também respeita o limite');
});

Deno.test('nomeDeExibicao: emoji e caractere astral nunca são cortados ao meio', () => {
  const nome = nomeDeExibicao('😀'.repeat(60) + ' Silva');
  igual(semParSolto(nome), true, 'sem par solto');
  igual(pontos(nome) <= NOME_MAXIMO, true, 'limite em caracteres');
  const corte = nomeDeExibicao('B'.repeat(26) + '😀😀😀 Santos');
  igual(semParSolto(corte), true, 'corte no limite');
  igual(pontos(corte) <= NOME_MAXIMO, true, 'limite no corte');
});

Deno.test('nomeDeExibicao: acento decomposto conta como um caractere e caracteres de formato somem', () => {
  igual(nomeDeExibicao('Jose\u0301 Silva'), 'José Silva', 'normaliza para NFC');
  const longoDecomposto = nomeDeExibicao('e\u0301'.repeat(28) + ' Silva');
  igual(pontos(longoDecomposto) <= NOME_MAXIMO, true, 'NFD não estoura o limite');
  igual(nomeDeExibicao('Ana\u202ESilva'), 'Ana Silva', 'inversão de direção vira espaço');
  igual(nomeDeExibicao('Ana\u200BSilva'), 'Ana Silva', 'largura zero vira espaço');
  igual(nomeDeExibicao('\u202E\u200B'), undefined, 'só formato vira vazio');
});

const cargaDe = async (opcoes: Parameters<typeof assinarTokenDoFavelab>[3], papel: 'student' | 'teacher' = 'student') => {
  const { privada } = await par();
  const token = await assinarTokenDoFavelab(USUARIO, papel, { privada, kid: 'k1' }, { agoraS: 1_800_000_000, ...opcoes });
  return JSON.parse(new TextDecoder().decode(doBase64Url(token.split('.')[1])));
};

Deno.test('token com turma leva turma_id e turma_nome planos e corretos', async () => {
  const carga = await cargaDe({ nome: 'Ana Silva', turma: { id: 42, nome: 'Edição 4 (2027) · Turma 1' } });
  igual(carga.turma_id, 42, 'turma_id');
  igual(typeof carga.turma_id, 'number', 'turma_id é inteiro');
  igual(carga.turma_nome, 'Edição 4 (2027) · Turma 1', 'turma_nome');
  igual(Object.keys(carga).sort().join(','), 'aud,exp,iat,iss,jti,name,nbf,role,sub,turma_id,turma_nome', 'só as claims esperadas');
});

Deno.test('token sem turma mantém as chaves antigas e nunca leva turma_id nulo', async () => {
  igual(Object.keys(await cargaDe({})).sort().join(','), 'aud,exp,iat,iss,jti,nbf,role,sub', 'sem nada');
  igual(Object.keys(await cargaDe({ nome: 'Ana' }, 'teacher')).sort().join(','), 'aud,exp,iat,iss,jti,name,nbf,role,sub', 'só nome');
  igual('turma_id' in (await cargaDe({ turma: undefined })), false, 'turma undefined');
});

Deno.test('nomeDaTurma: edição e turma, grafia mantida', () => {
  igual(nomeDaTurma('Edição 4 (2027)', 'Turma 1'), 'Edição 4 (2027) · Turma 1', 'formato');
  igual(nomeDaTurma('  EDIÇÃO   4 ', ' TURMA\n1 '), 'EDIÇÃO 4 · TURMA 1', 'espaços colapsados, sem caixa de título');
  igual(nomeDaTurma('Edição 4', null), undefined, 'sem turma');
  igual(nomeDaTurma(undefined, 'Turma 1'), undefined, 'sem edição');
  igual(nomeDaTurma('‮​', 'Turma 1'), undefined, 'só formato vira vazio');
});

Deno.test('nomeDaTurma: sanitização e limite de 60 pontos de código', () => {
  igual(nomeDaTurma('Edição\u0000 4', 'Tur‮ma​1'), 'Edição 4 · Tur ma 1', 'controle, direção e largura zero viram espaço');
  igual(nomeDaTurma('Edição', 'Turma 1'), 'Edição · Turma 1', 'NFD vira NFC');
  igual(pontos(nomeDaTurma('E'.repeat(40), 'T'.repeat(80))), 60, 'corta em 60');
  const emoji = nomeDaTurma('Edição 4', '😀'.repeat(80));
  igual(pontos(emoji), 60, 'emoji conta como um ponto');
  igual(semParSolto(emoji), true, 'sem par solto');
  const decomposto = nomeDaTurma('Edição', 'é'.repeat(80));
  igual(pontos(decomposto) <= 60, true, 'NFD não estoura');
  igual(decomposto === decomposto?.normalize('NFC'), true, 'saída em NFC');
});

const matricula = (p: Partial<ParticipanteComTurma> = {}): ParticipanteComTurma => ({
  turma_id: 42,
  turmas: { nome: 'Turma 1' },
  edicoes: { nome: 'Edição 4 (2027)', demonstracao: false },
  ...p,
});
const turmaJson = (papel: 'student' | 'teacher' | 'admin', p: ParticipanteComTurma | null | undefined) =>
  JSON.stringify(turmaParaOFavelab(papel, p) ?? null);

Deno.test('turmaParaOFavelab: aluno matriculado leva a turma', () => {
  igual(turmaJson('student', matricula()), '{"id":42,"nome":"Edição 4 (2027) · Turma 1"}', 'aluno');
  igual(turmaJson('student', matricula({ turma_id: '42' })), '{"id":42,"nome":"Edição 4 (2027) · Turma 1"}', 'id como texto');
});

Deno.test('turmaParaOFavelab: edição encerrada envia mesmo assim (só a demonstração é excluída)', () => {
  igual(turmaJson('student', matricula({ edicoes: { nome: 'Edição 1 (2022)', demonstracao: false } })), '{"id":42,"nome":"Edição 1 (2022) · Turma 1"}', 'encerrada');
});

Deno.test('turmaParaOFavelab: sem turma para professor, gestor, ver-como-aluno, demonstração e dado incompleto', () => {
  igual(turmaJson('teacher', matricula()), 'null', 'professor');
  igual(turmaJson('admin', matricula()), 'null', 'gestor');
  igual(turmaJson('student', null), 'null', 'ver como aluno (participante nulo)');
  igual(turmaJson('student', undefined), 'null', 'participante ausente');
  igual(turmaJson('student', matricula({ edicoes: { nome: 'Edição de demonstração', demonstracao: true } })), 'null', 'demonstração');
  igual(turmaJson('student', matricula({ edicoes: { nome: 'X', demonstracao: null } })), 'null', 'demonstração desconhecida (falha fechada)');
  igual(turmaJson('student', matricula({ edicoes: null })), 'null', 'sem edição');
  igual(turmaJson('student', matricula({ turmas: null })), 'null', 'sem turma');
  igual(turmaJson('student', matricula({ turma_id: null })), 'null', 'turma_id nulo');
  igual(turmaJson('student', matricula({ turma_id: 0 })), 'null', 'turma_id zero');
  igual(turmaJson('student', matricula({ turma_id: 'abc' })), 'null', 'turma_id inválido');
});

Deno.test('nomeDeExibicao segue igual depois da extração da limpeza comum', () => {
  igual(nomeDeExibicao('  maria   da silva​ '), 'Maria da Silva', 'limpeza e caixa de título');
  igual(nomeDeExibicao('José Silva'), 'José Silva', 'NFC');
  igual(nomeDeExibicao('‮​'), undefined, 'vazio');
});

Deno.test('nomeDaTurma: acima do limite encurta a edição e preserva a turma', () => {
  const edicaoLonga = 'Edição de nome extremamente longo para o limite do campo ' + 'x'.repeat(40);
  const a = nomeDaTurma(edicaoLonga, 'Turma 1');
  const b = nomeDaTurma(edicaoLonga, 'Turma 2');
  igual(a !== undefined && b !== undefined, true, 'as duas viram texto');
  igual(Array.from(a!).length <= 60, true, 'respeita o limite de 60');
  igual(a!.endsWith(' · Turma 1'), true, 'preserva a turma 1');
  igual(b!.endsWith(' · Turma 2'), true, 'preserva a turma 2');
  igual(a !== b, true, 'turmas diferentes continuam diferentes');
  igual(nomeDaTurma('Edição 4 (2027)', 'Turma Única'), 'Edição 4 (2027) · Turma Única', 'nome curto não muda');
});
