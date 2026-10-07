/**
 * Entregas de uma atividade: a situação e o botão de corrigir.
 * - Individual: uma linha por aluno da turma.
 * - Em grupo: uma linha por grupo (integrantes e quem enviou) e, no fim, quem está sem grupo.
 */
import { Botao, Vazio } from '../admin/Ui';
import { selo, texto } from '../admin/designSystem';
import type { QuemEntregou } from './tipos';
import {
  emGrupo,
  linhasDeEntrega,
  situacaoDoAluno,
  tentativasDe,
  type AlunoDaTurma,
  type Atividade,
  type Situacao,
  type Tentativa,
} from '../../lib/atividades';

const SITUACAO_NA_EQUIPE: Record<Situacao, { rotulo: string; cor: string }> = {
  pendente: { rotulo: 'Sem entrega', cor: selo.neutro },
  encerrada: { rotulo: 'Não entregou', cor: selo.erro },
  aguardando: { rotulo: 'Aguardando', cor: selo.informacao },
  refazer: { rotulo: 'Refazendo', cor: selo.atencao },
  concluida: { rotulo: 'Concluída', cor: selo.sucesso },
};

/** Tentativa, nota, situação e o botão de corrigir (o mesmo no aluno e no grupo) */
const SituacaoDaEntrega: React.FC<{ tentativas: Tentativa[]; prazo: string | null; aoCorrigir: () => void }> = ({
  tentativas,
  prazo,
  aoCorrigir,
}) => {
  const situacao = situacaoDoAluno(tentativas, prazo);
  const ultima = tentativas[tentativas.length - 1];
  const estilo = SITUACAO_NA_EQUIPE[situacao];
  return (
    <span className="flex items-center gap-2">
      {ultima && <span className={texto.apoio}>{ultima.numero}ª tentativa</span>}
      {situacao === 'concluida' && ultima?.nota != null && (
        <span className={`${texto.destaque} tabular-nums`}>{ultima.nota} / 100</span>
      )}
      <span className={`${selo.base} ${estilo.cor}`}>{estilo.rotulo}</span>
      {ultima && (
        <Botao
          tamanho="pequeno"
          variante={ultima.status === 'aguardando' ? 'primario' : 'secundario'}
          onClick={aoCorrigir}
        >
          {ultima.status === 'aguardando' ? 'Corrigir' : 'Ver entrega'}
        </Botao>
      )}
    </span>
  );
};

const ListaDeEntregas: React.FC<{
  atividade: Atividade;
  alunos: AlunoDaTurma[];
  aoCorrigir: (quem: QuemEntregou) => void;
}> = ({ atividade, alunos, aoCorrigir }) => (
  <div className="space-y-4">
    {atividade.enunciado && (
      <p className={`whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-3 ${texto.corpo}`}>
        {atividade.enunciado}
      </p>
    )}
    {!alunos.length ? (
      <Vazio>Nenhum aluno nesta turma.</Vazio>
    ) : emGrupo(atividade) ? (
      <EntregasDosGrupos atividade={atividade} alunos={alunos} aoCorrigir={aoCorrigir} />
    ) : (
      <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
        {alunos.map((aluno) => (
          <li key={aluno.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
            <span className={texto.destaque}>{aluno.nome}</span>
            <SituacaoDaEntrega
              tentativas={tentativasDe(atividade, aluno.id)}
              prazo={atividade.prazo}
              aoCorrigir={() => aoCorrigir({ aluno })}
            />
          </li>
        ))}
      </ul>
    )}
  </div>
);

const EntregasDosGrupos: React.FC<{
  atividade: Atividade;
  alunos: AlunoDaTurma[];
  aoCorrigir: (quem: QuemEntregou) => void;
}> = ({ atividade, alunos, aoCorrigir }) => {
  const { grupos, semGrupo } = linhasDeEntrega(atividade, alunos);
  const nomeDe = (id: number) => alunos.find((a) => a.id === id)?.nome ?? 'ex-integrante';

  return (
    <>
      {grupos.length === 0 ? (
        <Vazio>
          {atividade.grupos_montados_por === 'professor'
            ? 'Nenhum grupo montado ainda. Use "Montar grupos" no cartão da atividade.'
            : 'Nenhum grupo ainda: o grupo se forma quando um aluno envia e escolhe os colegas.'}
        </Vazio>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
          {grupos.map((g, indice) => {
            const ultima = g.tentativas[g.tentativas.length - 1];
            return (
              <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <span className="min-w-0">
                  <span className={`block ${texto.destaque}`}>
                    Grupo {indice + 1}: {g.integrantes.map((a) => a.nome).join(', ')}
                  </span>
                  {ultima && (
                    <span className={`block ${texto.apoio}`}>Enviado por {nomeDe(ultima.participante_id)}</span>
                  )}
                </span>
                <SituacaoDaEntrega
                  tentativas={g.tentativas}
                  prazo={atividade.prazo}
                  aoCorrigir={() => aoCorrigir({ grupoId: g.id })}
                />
              </li>
            );
          })}
        </ul>
      )}

      {semGrupo.length > 0 && (
        <div>
          <p className={`mb-2 ${texto.titulo}`}>Sem grupo ({semGrupo.length})</p>
          <p className={texto.corpo}>{semGrupo.map((a) => a.nome).join(', ')}</p>
        </div>
      )}
    </>
  );
};

export default ListaDeEntregas;
