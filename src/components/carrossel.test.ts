import { describe, expect, it } from 'vitest';

import {
  dividirEmFileiras,
  escolherParParaTrocar,
  escolherParesParaTrocar,
  normalizarDeslocamento,
  quadrosDaTroca,
  soAsQueAparecemUmaVez,
  trocarEntreFileiras,
} from './carrossel';

describe('carrossel de fotos', () => {
  it('divide alternando entre cima e baixo, sem perder foto', () => {
    expect(dividirEmFileiras([1, 2, 3, 4, 5])).toEqual([
      [1, 3, 5],
      [2, 4],
    ]);
    expect(dividirEmFileiras([1])).toEqual([[1], []]);
  });

  it('dá a volta no deslocamento, para os dois sentidos', () => {
    expect(normalizarDeslocamento(0, 100)).toBe(-100);
    expect(normalizarDeslocamento(30, 100)).toBe(-70);
    expect(normalizarDeslocamento(-30, 100)).toBe(-30);
    expect(normalizarDeslocamento(-130, 100)).toBe(-30);
    expect(normalizarDeslocamento(250, 100)).toBe(-50);
    // Antes de medir a largura, fica parado
    expect(normalizarDeslocamento(42, 0)).toBe(0);
  });

  it('troca uma foto de cima com uma de baixo, sem mexer no resto', () => {
    const cima = ['a', 'b', 'c'];
    const baixo = ['x', 'y'];
    expect(trocarEntreFileiras(cima, baixo, 2, 0)).toEqual([
      ['a', 'b', 'x'],
      ['c', 'y'],
    ]);
    // Os arrays originais continuam iguais (o estado do React não é alterado no lugar)
    expect(cima).toEqual(['a', 'b', 'c']);
    expect(baixo).toEqual(['x', 'y']);
  });

  it('escolhe a foto de baixo mais alinhada com a sorteada em cima', () => {
    const cima = [
      { indice: 0, centro: 100 },
      { indice: 1, centro: 400 },
    ];
    const baixo = [
      { indice: 0, centro: 50 },
      { indice: 1, centro: 380 },
      { indice: 2, centro: 700 },
    ];
    // sorteio 0.9 cai na segunda de cima (centro 400): a mais perto embaixo é a de 380
    expect(escolherParParaTrocar(cima, baixo, () => 0.9)).toEqual([cima[1], baixo[1]]);
    expect(escolherParParaTrocar(cima, baixo, () => 0)).toEqual([cima[0], baixo[0]]);
  });

  it('só troca foto que aparece uma vez na tela (em evento pequeno ela se repete)', () => {
    const naTela = [
      { indice: 0, centro: 100 },
      { indice: 1, centro: 400 },
      { indice: 0, centro: 700 },
    ];
    expect(soAsQueAparecemUmaVez(naTela)).toEqual([{ indice: 1, centro: 400 }]);
    // Fileira de uma foto só, repetida: nenhuma pode trocar
    expect(
      soAsQueAparecemUmaVez([
        { indice: 0, centro: 100 },
        { indice: 0, centro: 330 },
      ]),
    ).toEqual([]);
  });

  it('a troca sai do lugar e termina exatamente no destino, que se afastou pela deriva', () => {
    const quadros = quadrosDaTroca(100, 200, -40, 4);
    expect(quadros[0]).toEqual({ x: 0, y: 0, escala: 1, giro: 0 });
    const ultimo = quadros[quadros.length - 1];
    expect(ultimo.x).toBeCloseTo(60);
    expect(ultimo.y).toBeCloseTo(200);
    expect(ultimo.escala).toBeCloseTo(1);
    expect(ultimo.giro).toBeCloseTo(0);
    // No meio ela está levantada: maior e girada
    // 24 intervalos (25 quadros): o do meio é o 12
    const meio = quadros[12];
    expect(meio.escala).toBeCloseTo(1.12);
    expect(meio.giro).toBeCloseTo(4);
  });

  it('escolhe dois pares longe um do outro, sem repetir foto', () => {
    const cima = [
      { indice: 0, centro: 100 },
      { indice: 1, centro: 400 },
      { indice: 2, centro: 900 },
    ];
    const baixo = [
      { indice: 0, centro: 120 },
      { indice: 1, centro: 420 },
      { indice: 2, centro: 880 },
    ];
    // 1º sorteio (0): par da esquerda; o do meio fica perto demais (< 400 px), sobra o da direita
    expect(escolherParesParaTrocar(cima, baixo, 2, 400, () => 0)).toEqual([
      [cima[0], baixo[0]],
      [cima[2], baixo[2]],
    ]);
  });

  it('mesmo com distância 0, nenhuma foto entra em dois pares', () => {
    const cima = [{ indice: 0, centro: 100 }];
    const baixo = [{ indice: 0, centro: 100 }];
    expect(escolherParesParaTrocar(cima, baixo, 2, 0, () => 0)).toHaveLength(1);
  });

  it('se só cabe um par na tela, troca um só', () => {
    const cima = [{ indice: 0, centro: 100 }];
    const baixo = [{ indice: 0, centro: 110 }];
    expect(escolherParesParaTrocar(cima, baixo, 2, 300, () => 0)).toHaveLength(1);
    expect(escolherParesParaTrocar([], baixo, 2, 300, () => 0)).toEqual([]);
  });

  it('sem foto visível em uma das fileiras, não troca', () => {
    expect(escolherParParaTrocar([], [{ indice: 0, centro: 0 }], () => 0)).toBeNull();
    expect(escolherParParaTrocar([{ indice: 0, centro: 0 }], [], () => 0)).toBeNull();
  });
});
