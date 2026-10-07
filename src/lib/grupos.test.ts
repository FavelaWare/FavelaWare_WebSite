import { describe, expect, it, vi } from 'vitest';

vi.mock('./supabase', () => import('../testes/supabaseFalso'));

import { embaralhar, problemaNoTamanho, sortearGrupos, tamanhoDoGrupo } from './grupos';

const turma = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
const tamanhos = (grupos: number[][]) => grupos.map((g) => g.length).sort((a, b) => b - a);
const todos = (r: { grupos: number[][]; semGrupo: number[] }) =>
  [...r.grupos.flat(), ...r.semGrupo].sort((a, b) => a - b);

describe('tamanho do grupo', () => {
  it('diz se está abaixo do mínimo, acima do máximo ou certo', () => {
    expect(tamanhoDoGrupo(1, 2, 3)).toBe('abaixo');
    expect(tamanhoDoGrupo(2, 2, 3)).toBe('certo');
    expect(tamanhoDoGrupo(3, 2, 3)).toBe('certo');
    expect(tamanhoDoGrupo(4, 2, 3)).toBe('acima');
  });
});

describe('tamanho antes de enviar', () => {
  it('avisa o aluno quando o grupo, com ele, está fora do tamanho', () => {
    expect(problemaNoTamanho(1, 2, 3)).toBe('O grupo precisa ter de 2 a 3 integrantes, contando com você.');
    expect(problemaNoTamanho(3, 2, 2)).toBe('O grupo precisa ter 2 integrantes, contando com você.');
    expect(problemaNoTamanho(2, 2, 3)).toBeNull();
  });
});

describe('embaralhar', () => {
  it('mantém os mesmos itens e não mexe na lista original', () => {
    const original = turma(10);
    const resultado = embaralhar(original, () => 0.3);
    expect([...resultado].sort((a, b) => a - b)).toEqual(turma(10));
    expect(original).toEqual(turma(10));
    expect(resultado).not.toEqual(original);
  });
});

describe('sortear grupos', () => {
  it('30 alunos em trios: 10 grupos de 3, ninguém de fora', () => {
    const r = sortearGrupos(turma(30), 3, 3);
    expect(tamanhos(r.grupos)).toEqual(Array(10).fill(3));
    expect(r.semGrupo).toEqual([]);
    expect(todos(r)).toEqual(turma(30));
  });

  it('31 alunos em grupos de 2 a 3: todos entram, em grupos de tamanho parecido', () => {
    const r = sortearGrupos(turma(31), 2, 3);
    expect(tamanhos(r.grupos)).toEqual([3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2]);
    expect(r.semGrupo).toEqual([]);
    expect(todos(r)).toEqual(turma(31));
  });

  it('5 alunos em duplas: a conta não fecha, e quem sobra fica sem grupo', () => {
    const r = sortearGrupos(turma(5), 2, 2);
    expect(tamanhos(r.grupos)).toEqual([2, 2]);
    expect(r.semGrupo).toHaveLength(1);
    expect(todos(r)).toEqual(turma(5));
  });

  it('31 alunos em trios exatos: 10 trios e 1 sem grupo', () => {
    const r = sortearGrupos(turma(31), 3, 3);
    expect(tamanhos(r.grupos)).toEqual(Array(10).fill(3));
    expect(r.semGrupo).toHaveLength(1);
  });

  it('menos alunos que o mínimo: nenhum grupo', () => {
    expect(sortearGrupos([7], 2, 3)).toEqual({ grupos: [], semGrupo: [7] });
    expect(sortearGrupos([], 2, 3)).toEqual({ grupos: [], semGrupo: [] });
  });

  it('nenhum grupo passa do máximo nem fica abaixo do mínimo, em qualquer tamanho de turma', () => {
    for (let n = 0; n <= 40; n++) {
      for (const [minimo, maximo] of [
        [2, 2],
        [2, 3],
        [3, 3],
        [3, 5],
        [4, 6],
      ] as const) {
        const r = sortearGrupos(turma(n), minimo, maximo);
        expect(r.grupos.every((g) => g.length >= minimo && g.length <= maximo)).toBe(true);
        expect(todos(r)).toEqual(turma(n));
      }
    }
  });
});
