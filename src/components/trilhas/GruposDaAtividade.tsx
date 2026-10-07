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

const GruposDaAtividade: React.FC<{ atividade: Atividade; alunos: AlunoDaTurma[] }> = ({ atividade, alunos }) => {
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
      aoSalvar={(distribuicao) => servicoGrupos.definir(atividade.id, distribuicao)}
    />
  );
};

export default GruposDaAtividade;
