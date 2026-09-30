import { describe, expect, it, vi } from 'vitest';

vi.mock('./supabase', () => import('../testes/supabaseFalso'));

import {
  arrumar,
  resumoNaTurma,
  paraCorrigir,
  servicoAtividades,
  situacaoDoAluno,
  type Atividade,
  type Tentativa,
} from './atividades';
import { SEM_REGRAS } from './entregas';

const tentativa = (participante: number, status: Tentativa['status'], numero = 1): Tentativa => ({
  id: participante * 10 + numero,
  participante_id: participante,
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
  const salvar = (link_enunciado: string) =>
    servicoAtividades.salvar(
      { trilha_id: 1, titulo: 'A', enunciado: 'B', link_enunciado, prazo: null, ...SEM_REGRAS },
      { turmaId: 1 },
    );

  it('recusa link do enunciado que não seja https', async () => {
    const aviso = 'O link do enunciado precisa começar com https://';
    expect(await salvar('http://favelaware.gitbook.io/x')).toBe(aviso);
    expect(await salvar('javascript:alert(1)')).toBe(aviso);
    expect(await salvar('https://com espaço')).toBe(aviso);
  });

  it('aceita link https ou vazio, sem prazo (chega ao banco, que o falso recusa)', async () => {
    await expect(salvar('https://favelaware.gitbook.io/favelaware/6-html')).rejects.toThrow(
      'Teste não deveria chegar ao banco',
    );
    await expect(salvar('   ')).rejects.toThrow('Teste não deveria chegar ao banco');
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
