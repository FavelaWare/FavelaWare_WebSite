/**
 * Conteúdo da janela "Montar grupos" de uma atividade: busca os grupos gravados,
 * mostra a tela de distribuição e grava o que o professor montou.
 */
import { useEffect, useState } from 'react';

import { Aviso } from '../admin/Ui';
import { texto } from '../admin/designSystem';
import MontarGrupos from './MontarGrupos';
import type { AlunoDaTurma, Atividade } from '../../lib/atividades';
import { codigoDoErro } from '../../lib/banco';
import { servicoGrupos, type GrupoEmEdicao } from '../../lib/grupos';

const GruposDaAtividade: React.FC<{
  atividade: Atividade;
  alunos: AlunoDaTurma[];
  /** Depois de gravar: a página recarrega as atividades (entregas e contadores usam os grupos) */
  aoSalvo: () => Promise<void>;
}> = ({ atividade, alunos, aoSalvo }) => {
  const salvar = async (distribuicao: number[][]) => {
    const falha = await servicoGrupos.definir(atividade.id, distribuicao);
    if (falha) return falha;
    try {
      await aoSalvo();
    } catch (e) {
      // Os grupos foram gravados: só a lista da página ficou para trás
      console.error('[grupos] salvou, mas falhou ao atualizar as atividades', codigoDoErro(e));
    }
    return null;
  };
  // undefined = carregando; null = falhou
  const [grupos, setGrupos] = useState<GrupoEmEdicao[] | null | undefined>(undefined);

  useEffect(() => {
    let montado = true;
    servicoGrupos
      .carregar(atividade.id)
      .then((lista) => montado && setGrupos(lista))
      .catch((e) => {
        console.error('[grupos] falha ao carregar os grupos', codigoDoErro(e));
        if (montado) setGrupos(null);
      });
    return () => {
      montado = false;
    };
  }, [atividade.id]);

  if (grupos === null)
    return (
      <Aviso
        mensagem={{ tipo: 'erro', texto: 'Não foi possível carregar os grupos. Feche e abra de novo.' }}
        className=""
      />
    );
  if (grupos === undefined) return <p className={texto.corpo}>Carregando os grupos…</p>;

  return (
    <MontarGrupos
      alunos={alunos}
      minimo={atividade.grupo_min}
      maximo={atividade.grupo_max}
      gruposIniciais={grupos}
      aoSalvar={salvar}
    />
  );
};

export default GruposDaAtividade;
