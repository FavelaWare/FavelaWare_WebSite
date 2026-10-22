import { describe, expect, it } from 'vitest';
import { aplicarModoTv, CHAVE_MODO_TV, modoTvAtivo } from './modoTv';

const armazenamentoFalso = (inicial: Record<string, string> = {}) => {
  const dados = { ...inicial };
  return {
    dados,
    getItem: (k: string) => dados[k] ?? null,
    setItem: (k: string, v: string) => void (dados[k] = v),
    removeItem: (k: string) => void delete dados[k],
  };
};

describe('modoTvAtivo', () => {
  it('desligado por padrão', () => {
    expect(modoTvAtivo('', armazenamentoFalso())).toBe(false);
  });

  it('?tv=1 liga e guarda para as próximas visitas', () => {
    const arm = armazenamentoFalso();
    expect(modoTvAtivo('?tv=1', arm)).toBe(true);
    expect(arm.dados[CHAVE_MODO_TV]).toBe('1');
    expect(modoTvAtivo('', arm)).toBe(true);
  });

  it('?tv=0 desliga e esquece', () => {
    const arm = armazenamentoFalso({ [CHAVE_MODO_TV]: '1' });
    expect(modoTvAtivo('?tv=0', arm)).toBe(false);
    expect(modoTvAtivo('', arm)).toBe(false);
  });

  it('valor estranho em tv= não muda o que estava guardado', () => {
    expect(modoTvAtivo('?tv=talvez', armazenamentoFalso({ [CHAVE_MODO_TV]: '1' }))).toBe(true);
  });

  it('sem armazenamento, ou com ele quebrado, vale só o endereço', () => {
    const quebrado = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('bloqueado');
      },
      removeItem: () => {
        throw new Error('bloqueado');
      },
    };
    expect(modoTvAtivo('?tv=1', null)).toBe(true);
    expect(modoTvAtivo('?tv=1', quebrado)).toBe(true);
    expect(modoTvAtivo('', quebrado)).toBe(false);
  });
});

describe('aplicarModoTv', () => {
  it('põe e tira o atributo data-tv do elemento', () => {
    const atributos = new Set<string>();
    const raiz = {
      toggleAttribute: (nome: string, ligado?: boolean) => {
        if (ligado) atributos.add(nome);
        else atributos.delete(nome);
        return !!ligado;
      },
    };
    const arm = armazenamentoFalso();
    aplicarModoTv(raiz, '?tv=1', arm);
    expect(atributos.has('data-tv')).toBe(true);
    aplicarModoTv(raiz, '?tv=0', arm);
    expect(atributos.has('data-tv')).toBe(false);
  });
});
