/**
 * ============================================
 * ACESSO AO FAVELAB (SSO)
 * ============================================
 *
 * Quem está logado no portal entra no Favelab (a gamificação, app e banco à parte)
 * sem novo login: a Edge Function `favelab-acesso` confere o login e devolve um
 * token de 60 s; ele viaja no fragmento (#sso=...) da URL do Favelab, que nunca
 * é enviado a servidor nem entra no Referer, e é trocado lá por uma sessão.
 */
import { URL_FAVELAB } from '../config';
import { excecaoDeNegocio, sucesso, type ResultadoOperacao } from '../types';
import { resultadoDaFuncao } from './banco';
import { supabase } from './supabase';

/** O pedaço de uma aba que o serviço usa (a janela do navegador, ou um falso nos testes) */
export interface AbaDoFavelab {
  opener: unknown;
  location: { href: string };
  close(): void;
}

export interface JanelaDoFavelab {
  /** Abre uma aba em branco (precisa ser chamada dentro do clique, senão o navegador bloqueia) */
  abrirAba(): AbaDoFavelab | null;
  /** Plano B quando o navegador bloqueia a aba: segue na mesma aba */
  irPara(url: string): void;
}

const janelaDoNavegador = (): JanelaDoFavelab => ({
  abrirAba: () => window.open('about:blank', '_blank') as AbaDoFavelab | null,
  irPara: (url) => window.location.assign(url),
});

/** URL do Favelab com o token no fragmento (o que já houver no fragmento é trocado) */
export const urlDeAcesso = (base: string, token: string): string => {
  const url = new URL(base);
  url.hash = `sso=${token}`;
  return url.toString();
};

class ServicoFavelab {
  /**
   * Abre o Favelab já logado (a conta que pode entrar e o papel dela são decididos no servidor). Chame direto do clique: a aba é aberta antes de
   * pedir o token (senão o bloqueador de pop-up barra) e recebe o endereço depois.
   * O token nunca é logado.
   */
  async abrir(janela: JanelaDoFavelab = janelaDoNavegador()): Promise<ResultadoOperacao> {
    if (!URL_FAVELAB) return excecaoDeNegocio('O Favelab ainda não está disponível.');
    const aba = janela.abrirAba();

    const { data, error } = await supabase.functions.invoke('favelab-acesso', { method: 'POST' });
    const token = (data as { token?: unknown } | null)?.token;
    if (error || typeof token !== 'string' || !token) {
      aba?.close();
      if (error) {
        console.error('[favelab] falha ao pedir o acesso', error.message);
        return resultadoDaFuncao(error, 'Não foi possível abrir o Favelab. Tente de novo.');
      }
      console.error('[favelab] resposta sem token');
      return excecaoDeNegocio('Não foi possível abrir o Favelab. Tente de novo.');
    }

    const destino = urlDeAcesso(URL_FAVELAB, token);
    if (aba) {
      aba.opener = null;
      aba.location.href = destino;
    } else {
      janela.irPara(destino);
    }
    return sucesso();
  }
}

export const servicoFavelab = new ServicoFavelab();
