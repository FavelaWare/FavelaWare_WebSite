/**
 * Itens de menu usados em mais de uma área (ver MenuLateral).
 * A avaliação da banca aparece na área da banca e no menu de quem é da equipe
 * (gestor, instrutor, parceiro) e foi posto na banca avaliadora.
 */
import { URL_FAVELAB } from '../../config';
import { servicoFavelab } from '../../lib/favelab';
import { IconeAvaliacao, IconeJogo } from './Icones';
import type { ItemMenu } from './MenuLateral';

/** Favelab (a gamificação): app à parte, abre em nova aba. Sem a URL configurada não aparece */
export const ITENS_FAVELAB: ItemMenu[] = URL_FAVELAB
  ? [{ caminho: URL_FAVELAB, rotulo: 'Favelab', Icone: IconeJogo, externo: true }]
  : [];

/**
 * Favelab para o aluno: em vez de link, o botão pede o acesso ao portal
 * (servicoFavelab) e abre o Favelab já logado, sem novo login.
 */
export const ITENS_FAVELAB_DO_ALUNO: ItemMenu[] = URL_FAVELAB
  ? [
      {
        caminho: URL_FAVELAB,
        rotulo: 'Favelab',
        Icone: IconeJogo,
        acao: async () => (await servicoFavelab.abrirComoAluno()).mensagem,
      },
    ]
  : [];

export const ITEM_BANCA: ItemMenu = { caminho: '/banca', rotulo: 'Banca avaliadora', Icone: IconeAvaliacao };
