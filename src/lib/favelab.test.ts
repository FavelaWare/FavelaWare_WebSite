import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./supabase', () => import('../testes/supabaseFalso'));
vi.mock('../config', async (importar) => ({
  ...(await importar<typeof import('../config')>()),
  URL_FAVELAB: 'https://favelab.vercel.app/',
}));

import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase as supabaseFalso } from '../testes/supabaseFalso';
import { StatusProcessamento } from '../types';
import { servicoFavelab, urlDeAcesso, type AbaDoFavelab, type JanelaDoFavelab } from './favelab';

const TOKEN = 'cabecalho.carga.assinatura';

const invocar = (resposta: { data?: unknown; error?: unknown }) => {
  const invoke = vi.fn(async () => ({ data: null, error: null, ...resposta }));
  Object.assign(supabaseFalso, { functions: { invoke } });
  return invoke;
};

const janelaFalsa = (comAba = true) => {
  const aba: AbaDoFavelab & { fechada: boolean } = {
    opener: 'portal',
    location: { href: 'about:blank' },
    fechada: false,
    close() {
      this.fechada = true;
    },
  };
  const irPara = vi.fn();
  const abrirAba = vi.fn(() => (comAba ? aba : null));
  const janela: JanelaDoFavelab = { abrirAba, irPara };
  return { aba, irPara, abrirAba, janela };
};

describe('urlDeAcesso', () => {
  it('põe o token no fragmento, nunca na query', () => {
    const url = urlDeAcesso('https://favelab.vercel.app/', TOKEN);
    expect(url).toBe(`https://favelab.vercel.app/#sso=${TOKEN}`);
    expect(new URL(url).search).toBe('');
  });

  it('troca o fragmento que já existia', () => {
    expect(urlDeAcesso('https://favelab.vercel.app/#x', TOKEN)).toBe(`https://favelab.vercel.app/#sso=${TOKEN}`);
  });
});

describe('servicoFavelab.abrir', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('abre a aba antes de pedir o token e a leva ao Favelab com o token no fragmento', async () => {
    const invoke = invocar({ data: { token: TOKEN } });
    const { aba, abrirAba, irPara, janela } = janelaFalsa();
    const resultado = await servicoFavelab.abrir(janela);
    expect(resultado.status).toBe(StatusProcessamento.Sucesso);
    expect(abrirAba.mock.invocationCallOrder[0]).toBeLessThan(invoke.mock.invocationCallOrder[0]);
    expect(invoke).toHaveBeenCalledWith('favelab-acesso', { method: 'POST' });
    expect(aba.location.href).toBe(`https://favelab.vercel.app/#sso=${TOKEN}`);
    expect(aba.opener).toBeNull();
    expect(irPara).not.toHaveBeenCalled();
  });

  it('se o navegador bloquear a aba, segue na mesma aba', async () => {
    invocar({ data: { token: TOKEN } });
    const { irPara, janela } = janelaFalsa(false);
    await servicoFavelab.abrir(janela);
    expect(irPara).toHaveBeenCalledWith(`https://favelab.vercel.app/#sso=${TOKEN}`);
  });

  it('recusa do servidor fecha a aba e devolve o texto dele, sem abrir o Favelab', async () => {
    const recusa = new Response(JSON.stringify({ erro: 'O Favelab é só para alunos.' }), { status: 403 });
    invocar({ error: new FunctionsHttpError(recusa) });
    const { aba, irPara, janela } = janelaFalsa();
    const resultado = await servicoFavelab.abrir(janela);
    expect(resultado.status).toBe(StatusProcessamento.ExcecaoNegocio);
    expect(resultado.mensagem).toBe('O Favelab é só para alunos.');
    expect(aba.fechada).toBe(true);
    expect(aba.location.href).toBe('about:blank');
    expect(irPara).not.toHaveBeenCalled();
  });

  it('falha de rede vira exceção de sistema com o texto padrão', async () => {
    invocar({ error: new Error('rede') });
    const { aba, janela } = janelaFalsa();
    const resultado = await servicoFavelab.abrir(janela);
    expect(resultado.status).toBe(StatusProcessamento.ExcecaoSistema);
    expect(resultado.mensagem).toBe('Não foi possível abrir o Favelab. Tente de novo.');
    expect(aba.fechada).toBe(true);
  });

  it('resposta sem token não abre o Favelab', async () => {
    invocar({ data: {} });
    const { aba, irPara, janela } = janelaFalsa();
    const resultado = await servicoFavelab.abrir(janela);
    expect(resultado.status).toBe(StatusProcessamento.ExcecaoNegocio);
    expect(aba.fechada).toBe(true);
    expect(irPara).not.toHaveBeenCalled();
  });

  it('não loga o token', async () => {
    invocar({ data: { token: TOKEN } });
    const log = vi.spyOn(console, 'log');
    const erro = vi.spyOn(console, 'error');
    await servicoFavelab.abrir(janelaFalsa().janela);
    expect(JSON.stringify([...log.mock.calls, ...erro.mock.calls])).not.toContain(TOKEN);
  });
});
