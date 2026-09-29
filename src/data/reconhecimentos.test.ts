import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { artigos, premios } from './reconhecimentos';

const existeEmPublic = (caminho: string) => existsSync(join(process.cwd(), 'public', caminho));

describe('reconhecimentos (página Reconhecimentos e faixa da Home)', () => {
  it('tem prêmio e artigo para a faixa da Home citar', () => {
    expect(premios.length).toBeGreaterThan(0);
    expect(artigos.length).toBeGreaterThan(0);
    for (const premio of premios) expect(premio.titulo.trim()).not.toBe('');
    for (const artigo of artigos) expect(artigo.ano).toMatch(/^\d{4}$/);
  });

  it('toda foto de prêmio existe em public', () => {
    const faltando = premios.flatMap((premio) => premio.imagens).filter((imagem) => !existeEmPublic(imagem));
    expect(faltando).toEqual([]);
  });

  it('a camiseta da Home tem frente e costas', () => {
    expect(existeEmPublic('imgs/graficos/camiseta-frente.webp')).toBe(true);
    expect(existeEmPublic('imgs/graficos/camiseta-costas.webp')).toBe(true);
  });
});
