import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { edicoesDaGaleria, enderecoDaFoto, previaDaEdicao, type FotoDaGaleria } from './galeria';

const fotosDa = (titulo: string) => edicoesDaGaleria.find((edicao) => edicao.titulo === titulo)?.fotos ?? [];
const todasAsFotos = edicoesDaGaleria.flatMap((edicao) => edicao.fotos);
const chave = (foto: FotoDaGaleria) => foto.drive ?? foto.arquivo;

describe('fotos da Galeria por edição', () => {
  it('edições da mais recente para a mais antiga', () => {
    expect(edicoesDaGaleria.map((edicao) => edicao.titulo)).toEqual(['3ª Edição', '2ª Edição', '1ª Edição']);
  });

  it('1ª e 2ª edição continuam com as mesmas fotos do site', () => {
    expect(fotosDa('2ª Edição')).toHaveLength(28);
    // Sem o convite do encerramento da trilha Cultura e Encantamento, tirado a pedido do dono
    expect(fotosDa('1ª Edição')).toHaveLength(11);
    for (const foto of [...fotosDa('2ª Edição'), ...fotosDa('1ª Edição')]) expect(foto.arquivo).toBeTruthy();
  });

  it('3ª edição mistura Drive e fotos do site; toda foto do Drive tem id válido', () => {
    const terceira = fotosDa('3ª Edição');
    expect(terceira.some((foto) => foto.drive)).toBe(true);
    expect(terceira.some((foto) => foto.arquivo)).toBe(true);
    for (const foto of todasAsFotos.filter((f) => f.drive !== undefined)) expect(foto.drive).toMatch(/^[\w-]{33}$/);
  });

  it('fotos do mesmo evento ficam juntas no carrossel', () => {
    for (const edicao of edicoesDaGaleria) {
      const blocos = edicao.fotos.map((foto) => foto.evento).filter((evento, i, lista) => evento !== lista[i - 1]);
      expect(new Set(blocos).size).toBe(blocos.length);
    }
  });

  it('nenhuma foto repetida e toda foto tem evento e legenda', () => {
    expect(new Set(todasAsFotos.map(chave)).size).toBe(todasAsFotos.length);
    for (const foto of todasAsFotos) {
      expect(foto.evento.trim()).not.toBe('');
      expect(foto.legenda.trim()).not.toBe('');
    }
  });

  it('toda foto local existe em public/imgs/gallery', () => {
    const faltando = todasAsFotos.filter(
      (foto) => foto.arquivo && !existsSync(join(process.cwd(), 'public', 'imgs', 'gallery', foto.arquivo)),
    );
    expect(faltando).toEqual([]);
  });
});

describe('prévia da edição (página inicial)', () => {
  const foto = (evento: string, n: number): FotoDaGaleria => ({
    arquivo: `${evento}-${n}.webp`,
    evento,
    legenda: evento,
  });

  it('mistura os eventos, na ordem da edição, uma foto de cada por rodada', () => {
    const fotos = [foto('A', 1), foto('A', 2), foto('A', 3), foto('B', 1), foto('C', 1), foto('C', 2)];
    expect(previaDaEdicao(fotos, 5).map((f) => f.arquivo)).toEqual([
      'A-1.webp',
      'B-1.webp',
      'C-1.webp',
      'A-2.webp',
      'C-2.webp',
    ]);
  });

  it('para quando acabam as fotos', () => {
    expect(previaDaEdicao([foto('A', 1)], 16)).toHaveLength(1);
  });

  it('a prévia real da edição mais recente tem 16 fotos e mais de um evento', () => {
    const previa = previaDaEdicao(edicoesDaGaleria[0].fotos, 16);
    expect(previa).toHaveLength(16);
    expect(new Set(previa.map((f) => f.evento)).size).toBeGreaterThan(1);
  });
});

describe('endereço da foto', () => {
  it('foto do site usa o arquivo, em qualquer tamanho', () => {
    const foto: FotoDaGaleria = { arquivo: 'a.webp', evento: 'E', legenda: 'A' };
    expect(enderecoDaFoto(foto, 'miniatura')).toBe('/imgs/gallery/a.webp');
    expect(enderecoDaFoto(foto, 'ampliada')).toBe('/imgs/gallery/a.webp');
  });

  it('foto do Drive vem pequena no carrossel e grande ampliada, em WebP', () => {
    const foto: FotoDaGaleria = { drive: 'abc', evento: 'E', legenda: 'A' };
    expect(enderecoDaFoto(foto, 'miniatura')).toBe('https://lh3.googleusercontent.com/d/abc=w400-rw');
    expect(enderecoDaFoto(foto, 'ampliada')).toBe('https://lh3.googleusercontent.com/d/abc=w1600-rw');
  });
});
