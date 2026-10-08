/**
 * ============================================
 * AJUSTAR O GRUPO (A PARTIR DA CORREÇÃO)
 * ============================================
 *
 * Atalho na janela de correção de uma entrega em grupo: tirar um integrante
 * (marcado por engano) ou incluir um aluno que está sem grupo (entrou depois).
 * Vale também para grupo que já entregou, por isso cada mudança pede confirmação:
 * - quem sai deixa de ver a entrega e a nota e volta a ficar pendente;
 * - quem entra passa a ver a entrega, o feedback e a nota como dele.
 * Quem pode ajustar e os limites (máximo do grupo, último integrante) o banco confere.
 */
import { useEffect, useRef, useState } from 'react';

import { Aviso, Botao, classeCampo, classeRotulo, type Mensagem } from '../admin/Ui';
import { estado, foco, texto } from '../admin/designSystem';
import { linhasDeEntrega, type AlunoDaTurma, type Atividade } from '../../lib/atividades';
import { servicoGrupos } from '../../lib/grupos';

type Mudanca = { tipo: 'tirar' | 'incluir'; aluno: AlunoDaTurma };

const AjustarGrupo: React.FC<{
  atividade: Atividade;
  grupoId: number;
  alunos: AlunoDaTurma[];
  /** Recarrega as atividades da turma depois de gravar */
  aoMudar: () => Promise<void>;
}> = ({ atividade, grupoId, alunos, aoMudar }) => {
  const { grupos, semGrupo } = linhasDeEntrega(atividade, alunos);
  const grupo = grupos.find((g) => g.id === grupoId);
  const [escolhido, setEscolhido] = useState('');
  const [confirmando, setConfirmando] = useState<Mudanca | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<Mensagem>(null);
  const pergunta = useRef<HTMLDivElement>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  const jaPerguntou = useRef(false);

  // A pergunta recebe o foco ao aparecer (o leitor de tela anuncia); ao sumir, o foco
  // volta para o título da seção, porque o botão que a abriu pode ter sumido junto
  useEffect(() => {
    if (confirmando) {
      jaPerguntou.current = true;
      pergunta.current?.focus();
    } else if (jaPerguntou.current) {
      titulo.current?.focus();
    }
  }, [confirmando]);

  if (!grupo) return null;
  const cheio = grupo.integrantes.length >= atividade.grupo_max;

  const confirmar = async () => {
    if (!confirmando) return;
    setSalvando(true);
    setMensagem(null);
    const { tipo, aluno } = confirmando;
    const falha =
      tipo === 'tirar'
        ? await servicoGrupos.tirar(atividade.id, aluno.id)
        : await servicoGrupos.incluir(atividade.id, aluno.id, grupoId);
    if (falha) {
      setSalvando(false);
      setConfirmando(null);
      return setMensagem({ tipo: 'erro', texto: falha });
    }
    try {
      await aoMudar();
      setMensagem({
        tipo: 'sucesso',
        texto: tipo === 'tirar' ? `${aluno.nome} saiu do grupo.` : `${aluno.nome} entrou no grupo.`,
      });
    } catch (e) {
      console.error('[grupos] ajustou o grupo, mas falhou ao atualizar', e);
      setMensagem({ tipo: 'sucesso', texto: 'Grupo ajustado. Recarregue a página para ver a lista nova.' });
    }
    setEscolhido('');
    setConfirmando(null);
    setSalvando(false);
  };

  return (
    <section aria-labelledby="titulo-ajustar-grupo" className="space-y-3 border-t border-gray-100 pt-5">
      <div>
        <h3 id="titulo-ajustar-grupo" ref={titulo} tabIndex={-1} className={`rounded ${texto.titulo} ${foco}`}>
          Integrantes do grupo
        </h3>
        <p className={texto.apoio}>Para corrigir quem foi marcado por engano ou incluir quem entrou depois.</p>
      </div>

      <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
        {grupo.integrantes.map((aluno) => (
          <li key={aluno.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
            <span className={texto.destaque}>{aluno.nome}</span>
            <Botao
              tamanho="pequeno"
              variante="perigo"
              disabled={salvando}
              onClick={() => setConfirmando({ tipo: 'tirar', aluno })}
            >
              Tirar do grupo
            </Botao>
          </li>
        ))}
      </ul>

      {semGrupo.length > 0 && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1 sm:max-w-xs">
            <label htmlFor="incluir-no-grupo" className={classeRotulo}>
              Incluir aluno sem grupo
            </label>
            <select
              id="incluir-no-grupo"
              value={escolhido}
              disabled={salvando || cheio}
              onChange={(e) => setEscolhido(e.target.value)}
              className={classeCampo}
            >
              <option value="">Escolha um aluno</option>
              {semGrupo.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </select>
          </div>
          <Botao
            disabled={salvando || cheio || !escolhido}
            onClick={() => {
              const aluno = semGrupo.find((a) => String(a.id) === escolhido);
              if (aluno) setConfirmando({ tipo: 'incluir', aluno });
            }}
          >
            Incluir
          </Botao>
          {cheio && <p className={`w-full ${texto.apoio}`}>O grupo já tem o máximo de {atividade.grupo_max}.</p>}
        </div>
      )}

      {confirmando && (
        <div
          ref={pergunta}
          tabIndex={-1}
          role="alertdialog"
          aria-labelledby="pergunta-ajuste"
          className={`rounded-lg border p-4 ${estado.atencao} ${foco}`}
        >
          <p id="pergunta-ajuste" className="text-sm font-semibold">
            {confirmando.tipo === 'tirar'
              ? `Tirar ${confirmando.aluno.nome} do grupo?`
              : `Incluir ${confirmando.aluno.nome} no grupo?`}
          </p>
          <p className="mt-1 text-sm">
            {confirmando.tipo === 'tirar'
              ? 'Quem sai deixa de ver a entrega e a nota do grupo e volta a ficar com a atividade pendente.'
              : 'Quem entra passa a ver a entrega, o feedback e a nota do grupo como suas.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Botao tamanho="pequeno" disabled={salvando} onClick={() => setConfirmando(null)}>
              Voltar
            </Botao>
            <Botao
              tamanho="pequeno"
              variante={confirmando.tipo === 'tirar' ? 'perigo' : 'primario'}
              disabled={salvando}
              onClick={() => void confirmar()}
            >
              {salvando ? 'Salvando…' : confirmando.tipo === 'tirar' ? 'Tirar do grupo' : 'Incluir no grupo'}
            </Botao>
          </div>
        </div>
      )}

      <Aviso mensagem={mensagem} className="" />
    </section>
  );
};

export default AjustarGrupo;
