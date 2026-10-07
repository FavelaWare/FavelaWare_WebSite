import { describe, expect, it, vi } from 'vitest';

vi.mock('./supabase', () => import('../testes/supabaseFalso'));

import {
  agruparIntegrantes,
  arrumar,
  FORMATO_INDIVIDUAL,
  linhasDeEntrega,
  rotuloDoFormato,
  resumoNaTurma,
  paraCorrigir,
  servicoAtividades,
  situacaoDoAluno,
  tentativasDe,
  tentativasDoAluno,
  type Atividade,
  type GrupoDaAtividade,
  type GrupoDoAluno,
  type Tentativa,
} from './atividades';
import { SEM_REGRAS } from './entregas';

const tentativa = (
  participante: number,
  status: Tentativa['status'],
  numero = 1,
  grupo: number | null = null,
): Tentativa => ({
  id: participante * 10 + numero,
  participante_id: participante,
  grupo_id: grupo,
  numero,
  comentario: null,
  link: null,
  arquivo_caminho: null,
  arquivo_nome: null,
  arquivo_id: null,
  arquivo: null,
  enviada_em: '2026-03-01T12:00:00Z',
  status,
  feedback: null,
  nota: null,
  avaliada_em: null,
  avaliada_por_nome: null,
});

const atividade = (prazo: string | null, tentativas: Tentativa[], id = 1): Atividade => ({
  id,
  turma_id: 1,
  trilha_id: 1,
  titulo: 'Atividade',
  enunciado: 'Faça',
  link_enunciado: null,
  prazo,
  trilha: null,
  tentativas,
  exige_texto: false,
  exige_link: false,
  tipo_link: 'qualquer',
  exige_arquivo: false,
  formatos: [],
  ...FORMATO_INDIVIDUAL,
});

describe('resumo da atividade na turma', () => {
  // Aluno 99 saiu da turma: as entregas dele não contam
  const a = atividade('2000-01-01T00:00:00Z', [
    tentativa(1, 'refazer', 1),
    tentativa(1, 'aguardando', 2),
    tentativa(2, 'concluida'),
    tentativa(99, 'aguardando'),
  ]);
  const naTurma = new Set([1, 2, 3]);

  it('conta entregas para corrigir e quem entregou, só da turma', () => {
    expect(resumoNaTurma(a, naTurma)).toEqual({ aguardando: 1, entregaram: 2, encerrada: true });
  });

  it('soma as entregas para corrigir de várias atividades', () => {
    expect(paraCorrigir([a, a], naTurma)).toBe(2);
  });
});

describe('atividade em grupo', () => {
  // Dupla: grupo 7 (alunos 1 e 2) entregou duas vezes, sempre pelo aluno 1;
  // grupo 8 (3 e 4) não entregou; aluno 5 sem grupo; grupo 9 só tem quem saiu da turma (99)
  const dupla = (grupos: GrupoDaAtividade[]): Atividade => ({
    ...atividade('2999-01-01T00:00:00Z', [
      tentativa(1, 'refazer', 1, 7),
      tentativa(1, 'aguardando', 2, 7),
      tentativa(99, 'aguardando', 1, 9),
    ]),
    grupo_min: 2,
    grupo_max: 2,
    grupos_montados_por: 'alunos',
    grupos,
  });
  const a = dupla([
    { id: 7, integrantes: [1, 2] },
    { id: 8, integrantes: [3, 4] },
    { id: 9, integrantes: [99] },
  ]);
  const naTurma = new Set([1, 2, 3, 4, 5]);
  const alunos = [1, 2, 3, 4, 5].map((id) => ({ id, nome: `Aluno ${id}` }));
  const grupoDe = (participante: number): GrupoDoAluno[] =>
    participante <= 2 ? [{ atividade_id: 1, grupo_id: 7, integrantes: [] }] : [];

  it('o integrante vê como dele a entrega que o colega enviou', () => {
    expect(tentativasDoAluno(a, 1, grupoDe(1)).map((t) => t.numero)).toEqual([1, 2]);
    expect(tentativasDoAluno(a, 2, grupoDe(2)).map((t) => t.numero)).toEqual([1, 2]);
    expect(situacaoDoAluno(tentativasDoAluno(a, 1, grupoDe(1)), a.prazo)).toBe('aguardando');
  });

  it('sem grupo, o aluno não tem entrega (nem a que ele mesmo enviou para um grupo de que saiu)', () => {
    expect(tentativasDoAluno(a, 5, [])).toEqual([]);
    expect(tentativasDoAluno(a, 1, [])).toEqual([]);
  });

  it('individual continua só com as tentativas do próprio aluno', () => {
    const individual = atividade(null, [tentativa(1, 'aguardando'), tentativa(2, 'concluida')]);
    expect(tentativasDoAluno(individual, 1, [])).toEqual(tentativasDe(individual, 1));
  });

  it('conta uma entrega para corrigir por grupo e todos do grupo como entregues', () => {
    expect(resumoNaTurma(a, naTurma)).toEqual({ aguardando: 1, entregaram: 2, encerrada: false });
  });

  it('soma grupo e individual nas entregas para corrigir', () => {
    const individual = atividade(null, [tentativa(3, 'aguardando')], 2);
    expect(paraCorrigir([a, individual], naTurma)).toBe(2);
  });

  it('uma linha por grupo, sem o grupo de fora da turma, e quem está sem grupo', () => {
    const { grupos, semGrupo } = linhasDeEntrega(a, alunos);
    expect(grupos.map((g) => [g.id, g.integrantes.map((i) => i.nome), g.tentativas.length])).toEqual([
      [7, ['Aluno 1', 'Aluno 2'], 2],
      [8, ['Aluno 3', 'Aluno 4'], 0],
    ]);
    expect(semGrupo.map((s) => s.id)).toEqual([5]);
  });

  it('aluno tirado do grupo volta a pendente e deixa de contar como entregue', () => {
    const semOAluno2 = dupla([
      { id: 7, integrantes: [1] },
      { id: 8, integrantes: [3, 4] },
    ]);
    expect(situacaoDoAluno(tentativasDoAluno(semOAluno2, 2, []), semOAluno2.prazo)).toBe('pendente');
    expect(resumoNaTurma(semOAluno2, naTurma).entregaram).toBe(1);
    expect(linhasDeEntrega(semOAluno2, alunos).semGrupo.map((s) => s.id)).toEqual([2, 5]);
  });

  it('junta os integrantes de cada grupo do aluno', () => {
    expect(
      agruparIntegrantes([
        { atividade_id: 1, grupo_id: 7, participante_id: 1, nome: 'Ana' },
        { atividade_id: 1, grupo_id: 7, participante_id: 2, nome: 'Bia' },
        { atividade_id: 3, grupo_id: 9, participante_id: 1, nome: 'Ana' },
      ]),
    ).toEqual([
      {
        atividade_id: 1,
        grupo_id: 7,
        integrantes: [
          { id: 1, nome: 'Ana' },
          { id: 2, nome: 'Bia' },
        ],
      },
      { atividade_id: 3, grupo_id: 9, integrantes: [{ id: 1, nome: 'Ana' }] },
    ]);
  });
});

describe('situação do aluno', () => {
  it('sem entrega: pendente antes do prazo e encerrada depois', () => {
    expect(situacaoDoAluno([], '2999-01-01T00:00:00Z')).toBe('pendente');
    expect(situacaoDoAluno([], '2000-01-01T00:00:00Z')).toBe('encerrada');
  });

  it('sem prazo: nunca encerra (o 1º envio fica aberto)', () => {
    expect(situacaoDoAluno([], null)).toBe('pendente');
    expect(resumoNaTurma(atividade(null, []), new Set([1])).encerrada).toBe(false);
  });

  it('com entrega: a situação da última tentativa', () => {
    expect(situacaoDoAluno([tentativa(1, 'refazer', 1), tentativa(1, 'concluida', 2)], '2000-01-01T00:00:00Z')).toBe(
      'concluida',
    );
  });
});

describe('formato da atividade', () => {
  it('dá nome a individual, dupla, trio e grupo', () => {
    const formato = (grupo_min: number, grupo_max: number) => ({ ...FORMATO_INDIVIDUAL, grupo_min, grupo_max });
    expect(rotuloDoFormato(formato(1, 1))).toBe('Individual');
    expect(rotuloDoFormato(formato(2, 2))).toBe('Em dupla');
    expect(rotuloDoFormato(formato(3, 3))).toBe('Em trio');
    expect(rotuloDoFormato(formato(4, 4))).toBe('Em grupo de 4');
    expect(rotuloDoFormato(formato(2, 4))).toBe('Em grupo de 2 a 4');
  });
});

describe('ordem das atividades', () => {
  it('por prazo, as sem prazo no fim e, no empate, pela ordem de criação', () => {
    const lista = [
      atividade(null, [], 5),
      atividade('2030-01-01T00:00:00Z', [], 4),
      atividade(null, [], 2),
      atividade('2029-01-01T00:00:00Z', [], 3),
      atividade('2030-01-01T00:00:00Z', [], 1),
    ];
    expect(arrumar(lista).map((a) => a.id)).toEqual([3, 1, 4, 2, 5]);
  });
});

describe('atividade: conferência antes de gravar', () => {
  const salvar = (link_enunciado: string, formato = FORMATO_INDIVIDUAL) =>
    servicoAtividades.salvar(
      { trilha_id: 1, titulo: 'A', link_enunciado, prazo: null, ...SEM_REGRAS, ...formato },
      { turmaId: 1 },
    );
  const LINK = 'https://favelaware.gitbook.io/favelaware/6-html';
  const grupo = (grupo_min: number, grupo_max: number) => ({ ...FORMATO_INDIVIDUAL, grupo_min, grupo_max });

  it('recusa tamanho de grupo que o banco também recusa', async () => {
    const aviso = {
      falha: 'Confira o tamanho do grupo: o mínimo é pelo menos 1 e o máximo não pode ser menor que o mínimo.',
    };
    expect(await salvar(LINK, grupo(0, 2))).toEqual(aviso);
    expect(await salvar(LINK, grupo(3, 2))).toEqual(aviso);
    expect(await salvar(LINK, grupo(2, 2.5))).toEqual(aviso);
    expect(await salvar(LINK, grupo(2, 51))).toEqual({ falha: 'O grupo pode ter até 50 integrantes.' });
  });

  it('aceita dupla e grupo dentro do limite (chega ao banco, que o falso recusa)', async () => {
    await expect(salvar(LINK, grupo(2, 2))).rejects.toThrow('Teste não deveria chegar ao banco');
    await expect(salvar(LINK, grupo(2, 50))).rejects.toThrow('Teste não deveria chegar ao banco');
  });

  it('recusa link do enunciado que não seja https', async () => {
    const aviso = { falha: 'O link do enunciado precisa começar com https://' };
    expect(await salvar('http://favelaware.gitbook.io/x')).toEqual(aviso);
    expect(await salvar('javascript:alert(1)')).toEqual(aviso);
    expect(await salvar('https://com espaço')).toEqual(aviso);
  });

  it('exige o link do enunciado', async () => {
    const aviso = { falha: 'Informe o link do enunciado no GitBook.' };
    expect(await salvar('')).toEqual(aviso);
    expect(await salvar('   ')).toEqual(aviso);
  });

  it('aceita link https, sem prazo (chega ao banco, que o falso recusa)', async () => {
    await expect(salvar('https://favelaware.gitbook.io/favelaware/6-html')).rejects.toThrow(
      'Teste não deveria chegar ao banco',
    );
  });
});

describe('correção: conferência antes de gravar', () => {
  const corrigir = (notaDigitada: string, feedback = 'Bom trabalho', status: 'concluida' | 'refazer' = 'concluida') =>
    servicoAtividades.avaliar(1, { status, feedback, notaDigitada });

  it('recusa nota fora de 0 a 100 ou com vírgula', async () => {
    expect(await corrigir('101')).toBe('A nota vai de 0 a 100, sem vírgula.');
    expect(await corrigir('-1')).toBe('A nota vai de 0 a 100, sem vírgula.');
    expect(await corrigir('7.5')).toBe('A nota vai de 0 a 100, sem vírgula.');
  });

  it('exige feedback', async () => {
    expect(await corrigir('80', '   ')).toBe('Escreva o feedback para o aluno.');
  });

  it('exige nota para concluir, mas não para pedir refazer', async () => {
    expect(await corrigir('', 'Falta a parte 2')).toBe('Dê a nota (0 a 100) para concluir.');
    // Refazer sem nota passa da conferência e chega ao banco (que o falso recusa)
    await expect(corrigir('', 'Falta a parte 2', 'refazer')).rejects.toThrow('Teste não deveria chegar ao banco');
  });
});
