/**
 * ============================================
 * ADMIN · PARCERIAS
 * ============================================
 *
 * Pedidos do formulário público "Seja um parceiro" (/seja-parceiro), do mais
 * novo para o mais antigo, um cartão por pedido. Clicar no cartão abre a
 * janela com todas as informações. Só leitura e só do gestor: o contato segue
 * por e-mail ou telefone, fora do painel. Não depende da edição do topo.
 */
import { useCallback, useState } from 'react';

import { useDadosEmCache } from '../../hooks/useDadosEmCache';
import { formatarDataHora } from '../../utils/datas';

import { useCarregamentoCompleto } from '../../components/admin/Carregamento';
import Janela from '../../components/admin/Janela';
import { Carregando } from '../../components/admin/Moldura';
import { Aviso, Introducao, Vazio } from '../../components/admin/Ui';
import { foco, superficie, texto } from '../../components/admin/designSystem';
import { mascaraTelefone } from '../../lib/dadosInstrutor';
import { CHAVE_PEDIDOS_DE_PARCERIA, servicoParcerias } from '../../lib/parcerias';

const Parcerias: React.FC = () => {
  const { dados: pedidos, erro } = useDadosEmCache(CHAVE_PEDIDOS_DE_PARCERIA, () => servicoParcerias.carregar());
  const [idAberto, setIdAberto] = useState<number | null>(null);
  const fechar = useCallback(() => setIdAberto(null), []);

  const mostrarCarregando = useCarregamentoCompleto(pedidos === undefined && !erro, 0);
  if (erro && pedidos === undefined)
    return <Aviso mensagem={{ tipo: 'erro', texto: 'Não foi possível carregar os pedidos de parceria.' }} />;
  if (mostrarCarregando || pedidos === undefined) return <Carregando texto="Carregando pedidos de parceria" />;

  const pedidoAberto = pedidos.find((pedido) => pedido.id === idAberto);

  return (
    <>
      <Introducao>
        Pedidos enviados pelo formulário "Seja um parceiro" do site. Clique em um pedido para ver tudo.
      </Introducao>

      {!pedidos.length ? (
        <Vazio>Nenhum pedido de parceria por aqui.</Vazio>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {pedidos.map((pedido) => (
            <li key={pedido.id}>
              <button
                type="button"
                onClick={() => setIdAberto(pedido.id)}
                className={`${superficie.cartao} flex h-full w-full flex-col p-5 text-left transition hover:border-favela-green-500 hover:shadow-md ${foco}`}
              >
                <span className={`break-words ${texto.destaque}`}>{pedido.nome}</span>
                <span className={`break-words ${texto.apoio}`}>{pedido.empresa}</span>
                <span className={`mt-3 line-clamp-3 break-words ${texto.corpo}`}>{pedido.contribuicao}</span>
                <span className={`mt-auto pt-3 ${texto.apoio}`}>{formatarDataHora(pedido.criado_em)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Janela
        titulo={pedidoAberto?.nome ?? ''}
        subtitulo={pedidoAberto?.empresa}
        aberta={pedidoAberto !== undefined}
        onFechar={fechar}
        focoInicial="fechar"
      >
        {pedidoAberto && (
          <dl className="space-y-4">
            <div>
              <dt className={texto.apoio}>E-mail</dt>
              <dd className={texto.corpo}>
                {/* Endereço codificado: "?" e "&" vindos de fora não viram assunto, cópia ou corpo do e-mail.
                    O "@" volta ao normal (o banco garante um só) para nenhum programa de e-mail estranhar */}
                <a
                  href={`mailto:${encodeURIComponent(pedidoAberto.email).replace('%40', '@')}`}
                  className={`break-all underline hover:text-gray-900 ${foco}`}
                >
                  {pedidoAberto.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className={texto.apoio}>Telefone</dt>
              <dd className={texto.corpo}>{mascaraTelefone(pedidoAberto.telefone)}</dd>
            </div>
            <div>
              <dt className={texto.apoio}>Enviado em</dt>
              <dd className={texto.corpo}>{formatarDataHora(pedidoAberto.criado_em)}</dd>
            </div>
            <div>
              <dt className={texto.apoio}>Como deseja contribuir</dt>
              <dd className={`whitespace-pre-line break-words ${texto.corpo}`}>{pedidoAberto.contribuicao}</dd>
            </div>
          </dl>
        )}
      </Janela>
    </>
  );
};

export default Parcerias;
