/**
 * Itens de menu usados em mais de uma área (ver MenuLateral).
 * A avaliação da banca aparece na área da banca e no menu de quem é da equipe
 * (gestor, instrutor, parceiro) e foi posto na banca avaliadora.
 */
import { URL_FAVELAB } from '../../config';
import { IconeAvaliacao, IconeJogo } from './Icones';
import type { ItemMenu } from './MenuLateral';

/** Favelab (a gamificação): app à parte, abre em nova aba. Sem a URL configurada não aparece */
export const ITENS_FAVELAB: ItemMenu[] = URL_FAVELAB
  ? [{ caminho: URL_FAVELAB, rotulo: 'Favelab', Icone: IconeJogo, externo: true }]
  : [];

export const ITEM_BANCA: ItemMenu = { caminho: '/banca', rotulo: 'Banca avaliadora', Icone: IconeAvaliacao };
