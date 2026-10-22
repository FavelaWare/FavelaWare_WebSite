/**
 * Modo TV: tela grande vista de longe, navegada pelo controle remoto.
 *
 * A TV não se distingue de um monitor pelo navegador, então o modo é ligado
 * por quem apresenta: abrir o site com `?tv=1` (e `?tv=0` para desligar). A
 * escolha fica guardada no aparelho. O CSS do modo está em `index.css`
 * (`html[data-tv]`): fonte maior e
 * anel de foco grosso para navegar só com as setas.
 */

export const CHAVE_MODO_TV = 'modo-tv';

type Armazenamento = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Diz se o modo TV está ligado e guarda o que o endereço pediu (`tv=1` liga, `tv=0` desliga) */
export const modoTvAtivo = (busca: string, armazenamento: Armazenamento | null): boolean => {
  const pedido = new URLSearchParams(busca).get('tv');
  try {
    if (pedido === '1') armazenamento?.setItem(CHAVE_MODO_TV, '1');
    else if (pedido === '0') armazenamento?.removeItem(CHAVE_MODO_TV);
    else return armazenamento?.getItem(CHAVE_MODO_TV) === '1';
  } catch {
    // Sem armazenamento (janela privada, bloqueio): vale só o pedido do endereço
  }
  return pedido === '1';
};

/** Liga ou desliga o modo TV no <html> conforme o endereço e o que ficou guardado */
export const aplicarModoTv = (
  raiz: Pick<HTMLElement, 'toggleAttribute'>,
  busca: string,
  armazenamento: Armazenamento | null,
): void => {
  raiz.toggleAttribute('data-tv', modoTvAtivo(busca, armazenamento));
};
