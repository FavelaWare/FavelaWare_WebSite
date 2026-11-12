import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../config', () => ({
  URL_SUPABASE: 'https://banco.exemplo.invalid',
  CHAVE_PUBLICAVEL_SUPABASE: 'chave-publicavel',
}));

import { StatusProcessamento } from '../types';
import { servicoParcerias, type DadosDoPedidoDeParceria } from './parcerias';

const pedido = (mudancas: Partial<DadosDoPedidoDeParceria> = {}): DadosDoPedidoDeParceria => ({
  nome: '  Maria Lima ',
  email: ' maria@empresa.com ',
  telefone: '(31) 99999-0000',
  empresa: ' Empresa Teste ',
  contribuicao: ' Quero contratar formandos ',
  ...mudancas,
});

const resposta = (status: number, corpo?: unknown) =>
  new Response(corpo === undefined ? null : JSON.stringify(corpo), { status });

describe('parcerias: envio do formulário público', () => {
  const buscar = vi.fn<typeof fetch>();
  const erroNoConsole = vi.spyOn(console, 'error');

  beforeEach(() => {
    buscar.mockReset();
    erroNoConsole.mockReset().mockImplementation(() => {});
    vi.stubGlobal('fetch', buscar);
  });
  afterEach(() => vi.unstubAllGlobals());
  afterAll(() => erroNoConsole.mockRestore());

  it.each([
    [{ nome: ' ' }, 'Informe seu nome.'],
    [{ nome: 'a'.repeat(121) }, 'O nome passa de 120 caracteres.'],
    [{ email: 'sem-arroba' }, 'Informe um e-mail válido.'],
    [{ email: `${'a'.repeat(250)}@b.co` }, 'Informe um e-mail válido.'],
    [{ telefone: '99999-0000' }, 'Informe o telefone com DDD.'],
    [{ telefone: '+55 31 99999-00001' }, 'Informe o telefone com DDD.'],
    [{ empresa: '' }, 'Informe a empresa.'],
    [{ empresa: 'a'.repeat(121) }, 'A empresa passa de 120 caracteres.'],
    [{ contribuicao: '   ' }, 'Conte como deseja contribuir.'],
    [{ contribuicao: 'a'.repeat(2001) }, 'O texto passa de 2000 caracteres.'],
  ])('campo inválido %j não chega ao banco', async (mudancas, mensagem) => {
    const resultado = await servicoParcerias.enviar(pedido(mudancas));
    expect(resultado).toEqual({ status: StatusProcessamento.ExcecaoNegocio, mensagem });
    expect(buscar).not.toHaveBeenCalled();
  });

  it('campo escondido preenchido (robô) é descartado como se tivesse dado certo', async () => {
    const resultado = await servicoParcerias.enviar(pedido(), 'https://spam.exemplo.invalid');
    expect(resultado.status).toBe(StatusProcessamento.Sucesso);
    expect(buscar).not.toHaveBeenCalled();
  });

  it('pedido válido vai para a função do banco, sem espaços sobrando e com o telefone só em dígitos', async () => {
    buscar.mockResolvedValueOnce(resposta(204));
    const resultado = await servicoParcerias.enviar(pedido());
    expect(resultado.status).toBe(StatusProcessamento.Sucesso);
    const [endereco, opcoes] = buscar.mock.calls[0]!;
    expect(endereco).toBe('https://banco.exemplo.invalid/rest/v1/rpc/enviar_pedido_de_parceria');
    expect(opcoes?.method).toBe('POST');
    expect(opcoes?.headers).toMatchObject({ apikey: 'chave-publicavel', Authorization: 'Bearer chave-publicavel' });
    expect(JSON.parse(String(opcoes?.body))).toEqual({
      p_nome: 'Maria Lima',
      p_email: 'maria@empresa.com',
      p_telefone: '31999990000',
      p_empresa: 'Empresa Teste',
      p_contribuicao: 'Quero contratar formandos',
    });
  });

  it('telefone com o código do país (preenchimento automático) vai sem o 55', async () => {
    buscar.mockResolvedValueOnce(resposta(204));
    const resultado = await servicoParcerias.enviar(pedido({ telefone: '+55 31 99999-0000' }));
    expect(resultado.status).toBe(StatusProcessamento.Sucesso);
    expect(JSON.parse(String(buscar.mock.calls[0]![1]?.body)).p_telefone).toBe('31999990000');
  });

  it('campo escondido preenchido deixa rastro no console, sem dado do formulário', async () => {
    const avisoNoConsole = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await servicoParcerias.enviar(pedido(), 'robô');
    expect(avisoNoConsole).toHaveBeenCalledWith('[parcerias] pedido descartado pelo campo escondido');
    avisoNoConsole.mockRestore();
  });

  it('teto de envios do banco vira exceção de negócio com o texto do banco', async () => {
    buscar.mockResolvedValueOnce(resposta(400, { code: '22023', message: 'Recebemos muitos pedidos agora.' }));
    expect(await servicoParcerias.enviar(pedido())).toEqual({
      status: StatusProcessamento.ExcecaoNegocio,
      mensagem: 'Recebemos muitos pedidos agora.',
    });
  });

  it('outra recusa do banco, erro do servidor e queda de rede viram exceção de sistema genérica', async () => {
    buscar
      .mockResolvedValueOnce(resposta(400, { code: '23514', message: 'violates check constraint' }))
      .mockResolvedValueOnce(resposta(400, { code: '22023' }))
      .mockResolvedValueOnce(resposta(500))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));
    for (let tentativa = 0; tentativa < 4; tentativa++)
      expect(await servicoParcerias.enviar(pedido())).toEqual({
        status: StatusProcessamento.ExcecaoSistema,
        mensagem: 'Não foi possível enviar agora. Tente de novo.',
      });
  });

  it('o log da falha não leva nenhum dado do formulário', async () => {
    buscar.mockResolvedValueOnce(resposta(500)).mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await servicoParcerias.enviar(pedido());
    await servicoParcerias.enviar(pedido());
    const registrado = JSON.stringify(erroNoConsole.mock.calls);
    expect(erroNoConsole).toHaveBeenCalledTimes(2);
    for (const dado of ['Maria', 'maria@empresa.com', '99999', 'Empresa Teste', 'contratar'])
      expect(registrado).not.toContain(dado);
  });
});
