/**
 * ============================================
 * PEDIDOS DE PARCERIA ("SEJA UM PARCEIRO")
 * ============================================
 *
 * - visitante (sem login): envia o pedido pelo formulário de /seja-parceiro;
 * - gestor: lê os pedidos recebidos em /dashboard/parcerias (só leitura).
 * Quem pode gravar e ler é conferido no banco (função de envio e RLS).
 *
 * O envio usa fetch direto (como lib/sitePublico.ts) e a leitura importa o
 * cliente do Supabase só na hora: a página pública não baixa o Supabase.
 * Por isso este arquivo não importa ./supabase, ./banco nem ./sessao no topo.
 *
 * Nome, e-mail e telefone são dados pessoais: nunca vão para o log.
 */
import { CHAVE_PUBLICAVEL_SUPABASE, URL_SUPABASE } from '../config';
import { excecaoDeNegocio, excecaoDeSistema, sucesso, type ResultadoOperacao } from '../types';
import { emailValido } from '../utils/texto';

/** Os mesmos limites do banco */
export const TAMANHO_MAXIMO_NOME = 120;
export const TAMANHO_MAXIMO_EMAIL = 254;
export const TAMANHO_MAXIMO_EMPRESA = 120;
export const TAMANHO_MAXIMO_CONTRIBUICAO = 2000;

/** Recusa por regra do banco (o mesmo código de lib/banco.ts, que não entra aqui por trazer o Supabase) */
const CODIGO_REGRA_DO_BANCO = '22023';

/** O que a pessoa preenche no formulário */
export interface DadosDoPedidoDeParceria {
  nome: string;
  email: string;
  telefone: string;
  empresa: string;
  contribuicao: string;
}

/** Como o gestor vê o pedido (telefone só com dígitos, e-mail em minúsculas) */
export interface PedidoDeParceria extends DadosDoPedidoDeParceria {
  id: number;
  criado_em: string;
}

/** Chave do cache (ver lib/cache.ts) */
export const CHAVE_PEDIDOS_DE_PARCERIA = 'parcerias:pedidos';

const FALHA_AO_ENVIAR = 'Não foi possível enviar agora. Tente de novo.';
const PRAZO_DO_ENVIO_MS = 15_000;

export class ServicoParcerias {
  /**
   * Visitante: envia o pedido. `armadilha` é o campo escondido do formulário,
   * que pessoa nenhuma preenche: se vier com texto, é robô, e o pedido é
   * descartado sem avisar (devolve sucesso e não chama o banco).
   */
  async enviar(dados: DadosDoPedidoDeParceria, armadilha = ''): Promise<ResultadoOperacao> {
    const invalido = this.validar(dados);
    if (invalido) return excecaoDeNegocio(invalido);
    if (armadilha.trim()) {
      console.warn('[parcerias] pedido descartado pelo campo escondido');
      return sucesso();
    }
    if (!URL_SUPABASE || !CHAVE_PUBLICAVEL_SUPABASE) {
      console.error('[parcerias] envio sem configuração do banco');
      return excecaoDeSistema(FALHA_AO_ENVIAR);
    }

    try {
      const resposta = await fetch(`${URL_SUPABASE}/rest/v1/rpc/enviar_pedido_de_parceria`, {
        method: 'POST',
        headers: {
          apikey: CHAVE_PUBLICAVEL_SUPABASE,
          Authorization: `Bearer ${CHAVE_PUBLICAVEL_SUPABASE}`,
          'Content-Type': 'application/json',
        },
        // Conexão pendurada não deixa o botão em "Enviando..." para sempre
        signal: AbortSignal.timeout(PRAZO_DO_ENVIO_MS),
        body: JSON.stringify({
          p_nome: dados.nome.trim(),
          p_email: dados.email.trim(),
          p_telefone: this.soDigitos(dados.telefone),
          p_empresa: dados.empresa.trim(),
          p_contribuicao: dados.contribuicao.trim(),
        }),
      });
      if (resposta.ok) return sucesso();

      const recusa = await this.recusaDoBanco(resposta);
      console.error('[parcerias] falha ao enviar', resposta.status, recusa?.code);
      // Regra do banco (teto de envios) tem texto pronto para a pessoa; o resto é falha técnica
      return recusa?.code === CODIGO_REGRA_DO_BANCO && recusa.message
        ? excecaoDeNegocio(recusa.message)
        : excecaoDeSistema(FALHA_AO_ENVIAR);
    } catch (erro) {
      console.error('[parcerias] falha de rede ao enviar', erro instanceof Error ? erro.name : 'erro');
      return excecaoDeSistema(FALHA_AO_ENVIAR);
    }
  }

  /** Gestor: os pedidos recebidos, do mais novo para o mais antigo */
  async carregar(): Promise<PedidoDeParceria[]> {
    const { supabase } = await import('./supabase');
    const { data, error } = await supabase
      .from('pedidos_de_parceria')
      .select('id, nome, email, telefone, empresa, contribuicao, criado_em')
      .order('criado_em', { ascending: false });
    if (error) throw error;
    return data as PedidoDeParceria[];
  }

  /** Mensagem do primeiro campo com problema, ou null se está tudo certo (o banco confere de novo) */
  private validar(dados: DadosDoPedidoDeParceria): string | null {
    const nome = dados.nome.trim();
    const email = dados.email.trim();
    const empresa = dados.empresa.trim();
    const contribuicao = dados.contribuicao.trim();
    if (nome.length < 2) return 'Informe seu nome.';
    if (nome.length > TAMANHO_MAXIMO_NOME) return `O nome passa de ${TAMANHO_MAXIMO_NOME} caracteres.`;
    if (!emailValido(email) || email.length > TAMANHO_MAXIMO_EMAIL) return 'Informe um e-mail válido.';
    if (!/^\d{10,11}$/.test(this.soDigitos(dados.telefone))) return 'Informe o telefone com DDD.';
    if (empresa.length < 2) return 'Informe a empresa.';
    if (empresa.length > TAMANHO_MAXIMO_EMPRESA) return `A empresa passa de ${TAMANHO_MAXIMO_EMPRESA} caracteres.`;
    if (!contribuicao) return 'Conte como deseja contribuir.';
    if (contribuicao.length > TAMANHO_MAXIMO_CONTRIBUICAO)
      return `O texto passa de ${TAMANHO_MAXIMO_CONTRIBUICAO} caracteres.`;
    return null;
  }

  /**
   * "(31) 99999-0000" -> "31999990000". O código do país some ("+55 31 99999-0000"
   * também vira "31999990000"): o preenchimento automático do navegador costuma trazê-lo.
   */
  private soDigitos(valor: string): string {
    const digitos = valor.replace(/\D/g, '');
    return /^55\d{10,11}$/.test(digitos) ? digitos.slice(2) : digitos;
  }

  /** Corpo de erro do banco ({ code, message }); null se a resposta não for JSON */
  private async recusaDoBanco(resposta: Response): Promise<{ code?: string; message?: string } | null> {
    try {
      const corpo: unknown = await resposta.json();
      return typeof corpo === 'object' && corpo !== null ? corpo : null;
    } catch {
      return null;
    }
  }
}

export const servicoParcerias = new ServicoParcerias();
