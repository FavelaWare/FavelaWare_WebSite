/**
 * ============================================
 * MONTAR GRUPOS (ATIVIDADE EM GRUPO)
 * ============================================
 *
 * O professor distribui os alunos da turma nos grupos da atividade:
 * - "Distribuir aleatoriamente" sorteia a turma respeitando o mínimo e o máximo;
 * - cada aluno tem um "Mover para", para ajustar à mão (funciona no teclado e no celular);
 * - grupo que já entregou fica travado: nem o sorteio nem o ajuste mexem nele.
 *
 * Tudo tem tamanho fixo, para a janela não mudar enquanto se monta: os dois painéis
 * têm a mesma altura e rolam por dentro, toda linha de aluno tem a mesma altura e todo
 * cartão de grupo reserva as vagas até o máximo.
 *
 * A tela só monta a distribuição. Quem grava recebe os grupos prontos em `aoSalvar`
 * (os que já entregaram ficam de fora: no banco eles continuam como estão).
 */
import { useId, useState } from 'react';

import { Botao, classeCampo, type Mensagem } from '../admin/Ui';
import { estado, selo, superficie, texto } from '../admin/designSystem';
import { sortearGrupos, tamanhoDoGrupo, type GrupoEmEdicao } from '../../lib/grupos';

export interface AlunoDoGrupo {
  id: number;
  nome: string;
}

interface Props {
  alunos: AlunoDoGrupo[];
  minimo: number;
  maximo: number;
  gruposIniciais: GrupoEmEdicao[];
  /** Recebe os grupos que ainda não entregaram. Devolve null se gravou, ou o texto do erro. */
  aoSalvar: (grupos: number[][]) => Promise<string | null>;
}

const SEM_GRUPO = 'sem-grupo';
const NOVO_GRUPO = 'novo-grupo';
/** Até este máximo o cartão mostra as vagas livres (acima disso, ficaria alto demais) */
const MAXIMO_COM_VAGAS = 6;

// Medidas que se repetem: painel, cabeçalho de painel e linha de aluno
const painel = `flex min-h-0 flex-col ${superficie.cartao} lg:h-[min(34rem,calc(90vh_-_19rem))]`;
const cabecalhoDoPainel = 'flex h-11 shrink-0 items-center justify-between gap-2 border-b border-gray-100 px-4';
const linhaDoAluno = 'flex h-11 items-center justify-between gap-3';
const botaoDeAcao = 'sm:w-52';

const MontarGrupos: React.FC<Props> = ({ alunos, minimo, maximo, gruposIniciais, aoSalvar }) => {
  const [grupos, setGrupos] = useState<GrupoEmEdicao[]>(gruposIniciais);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<Mensagem>(null);
  // Lido pelo leitor de tela depois de cada mudança (sorteio, aluno movido)
  const [anuncio, setAnuncio] = useState('');
  const prefixo = useId();

  const nomeDe = new Map(alunos.map((a) => [a.id, a.nome]));
  const emGrupo = new Set(grupos.flatMap((g) => g.integrantes));
  const semGrupo = alunos.filter((a) => !emGrupo.has(a.id));
  const foraDoTamanho = grupos.filter((g) => tamanhoDoGrupo(g.integrantes.length, minimo, maximo) !== 'certo');
  const acimaDoMaximo = foraDoTamanho.some((g) => g.integrantes.length > maximo);
  const semAlunos = alunos.length === 0;

  const novaChave = () => `${prefixo}-${crypto.randomUUID()}`;

  // Tira o aluno de onde está e põe no destino; grupo que fica vazio some
  const mover = (alunoId: number, destino: string) => {
    setMensagem(null);
    setGrupos((atual) => {
      const semOAluno = atual.map((g) =>
        g.entregou ? g : { ...g, integrantes: g.integrantes.filter((id) => id !== alunoId) },
      );
      const comOAluno =
        destino === NOVO_GRUPO
          ? [...semOAluno, { chave: novaChave(), integrantes: [alunoId], entregou: false }]
          : semOAluno.map((g) => (g.chave === destino ? { ...g, integrantes: [...g.integrantes, alunoId] } : g));
      return comOAluno.filter((g) => g.entregou || g.integrantes.length > 0);
    });
    setAnuncio(`${nomeDe.get(alunoId) ?? 'Aluno'} movido.`);
  };

  // Sorteia quem não está em grupo que já entregou
  const sortear = () => {
    setMensagem(null);
    const travados = grupos.filter((g) => g.entregou);
    const presos = new Set(travados.flatMap((g) => g.integrantes));
    const resultado = sortearGrupos(
      alunos.filter((a) => !presos.has(a.id)).map((a) => a.id),
      minimo,
      maximo,
    );
    setGrupos([
      ...travados,
      ...resultado.grupos.map((integrantes) => ({ chave: novaChave(), integrantes, entregou: false })),
    ]);
    setAnuncio(
      `Turma distribuída em ${resultado.grupos.length} grupos.` +
        (resultado.semGrupo.length ? ` ${resultado.semGrupo.length} sem grupo.` : ''),
    );
  };

  const desfazer = () => {
    setMensagem(null);
    setGrupos((atual) => atual.filter((g) => g.entregou));
    setAnuncio('Grupos desfeitos.');
  };

  const salvar = async () => {
    setMensagem(null);
    setSalvando(true);
    const falha = await aoSalvar(grupos.filter((g) => !g.entregou).map((g) => g.integrantes));
    setSalvando(false);
    setMensagem(falha ? { tipo: 'erro', texto: falha } : { tipo: 'sucesso', texto: 'Grupos salvos.' });
  };

  // Lista "Mover para" de um aluno: os grupos abertos com vaga, um grupo novo e "sem grupo"
  const seletor = (aluno: AlunoDoGrupo, atual: string) => (
    // Largura fixa: o nome do aluno fica com o resto da linha
    <div className="w-36 shrink-0">
      <select
        aria-label={`Mover ${aluno.nome} para`}
        value={atual}
        disabled={salvando}
        onChange={(e) => mover(aluno.id, e.target.value)}
        className={`${classeCampo} h-9 py-1`}
      >
        <option value={SEM_GRUPO}>Sem grupo</option>
        {grupos.map(
          (g, i) =>
            !g.entregou && (
              <option key={g.chave} value={g.chave} disabled={g.chave !== atual && g.integrantes.length >= maximo}>
                Grupo {i + 1}
                {g.chave !== atual && g.integrantes.length >= maximo ? ' (cheio)' : ''}
              </option>
            ),
        )}
        <option value={NOVO_GRUPO}>Novo grupo</option>
      </select>
    </div>
  );

  // Uma linha de aviso por vez, no rodapé: o resultado de salvar ou o que falta ajustar
  const aviso: { classe: string; texto: string } | null = mensagem
    ? { classe: mensagem.tipo === 'erro' ? estado.erro : estado.sucesso, texto: mensagem.texto }
    : semAlunos
      ? { classe: estado.atencao, texto: 'Esta turma ainda não tem alunos: cadastre os alunos para montar os grupos.' }
      : acimaDoMaximo
        ? { classe: estado.atencao, texto: `Há grupo com mais de ${maximo} integrantes: tire alguém antes de salvar.` }
        : foraDoTamanho.length > 0
          ? {
              classe: estado.atencao,
              texto: `${foraDoTamanho.length === 1 ? 'Um grupo está' : `${foraDoTamanho.length} grupos estão`} abaixo do mínimo de ${minimo} e só ${foraDoTamanho.length === 1 ? 'entrega' : 'entregam'} depois de completar.`,
            }
          : null;

  return (
    <div className="space-y-4">
      {/* Resumo e ações */}
      <div className="flex flex-col gap-3 sm:min-h-[2.5rem] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className={texto.corpo}>
            {alunos.length} {alunos.length === 1 ? 'aluno' : 'alunos'} · grupos de{' '}
            {minimo === maximo ? minimo : `${minimo} a ${maximo}`}
          </span>
          <span className={`${selo.base} ${selo.marca}`}>
            {grupos.length} {grupos.length === 1 ? 'grupo' : 'grupos'}
          </span>
          {!semAlunos && (
            <span className={`${selo.base} ${semGrupo.length ? selo.atencao : selo.sucesso}`}>
              {semGrupo.length ? `${semGrupo.length} sem grupo` : 'Todos em grupo'}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Botao className={botaoDeAcao} onClick={desfazer} disabled={salvando || grupos.every((g) => g.entregou)}>
            Desfazer grupos
          </Botao>
          <Botao className={botaoDeAcao} variante="primario" onClick={sortear} disabled={salvando || semAlunos}>
            Distribuir aleatoriamente
          </Botao>
        </div>
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {anuncio}
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
        {/* Quem ainda não tem grupo */}
        <section aria-labelledby={`${prefixo}-sem-grupo`} className={painel}>
          <div className={cabecalhoDoPainel}>
            <h3 id={`${prefixo}-sem-grupo`} className={texto.titulo}>
              Sem grupo
            </h3>
            <span className={`${selo.base} ${selo.neutro}`}>{semGrupo.length}</span>
          </div>
          {semGrupo.length === 0 ? (
            <p className={`flex flex-1 items-center justify-center p-4 text-center ${texto.apoio}`}>
              {semAlunos ? 'Nenhum aluno nesta turma.' : 'Todos os alunos estão em um grupo.'}
            </p>
          ) : (
            <ul className="min-h-0 flex-1 divide-y divide-gray-100 overflow-y-auto px-4">
              {semGrupo.map((aluno) => (
                <li key={aluno.id} className={linhaDoAluno}>
                  <span className={`min-w-0 truncate ${texto.destaque}`}>{aluno.nome}</span>
                  {seletor(aluno, SEM_GRUPO)}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Os grupos */}
        <section aria-labelledby={`${prefixo}-grupos`} className={painel}>
          <div className={cabecalhoDoPainel}>
            <h3 id={`${prefixo}-grupos`} className={texto.titulo}>
              Grupos
            </h3>
            <span className={`${selo.base} ${selo.neutro}`}>{grupos.length}</span>
          </div>
          {grupos.length === 0 ? (
            <p className={`flex flex-1 items-center justify-center p-4 text-center ${texto.apoio}`}>
              Nenhum grupo ainda. Use "Distribuir aleatoriamente" ou mova um aluno para "Novo grupo".
            </p>
          ) : (
            <ul className="grid min-h-0 flex-1 auto-rows-max grid-cols-1 gap-3 overflow-y-auto p-4 sm:grid-cols-2 xl:grid-cols-3">
              {grupos.map((grupo, i) => {
                const tamanho = tamanhoDoGrupo(grupo.integrantes.length, minimo, maximo);
                const vagas = maximo <= MAXIMO_COM_VAGAS ? Math.max(0, maximo - grupo.integrantes.length) : 0;
                return (
                  <li key={grupo.chave} className="rounded-lg border border-gray-200 bg-gray-50/60">
                    <div className="flex h-11 items-center justify-between gap-2 border-b border-gray-200 px-3">
                      <h4 className={texto.titulo}>Grupo {i + 1}</h4>
                      <span className="flex items-center gap-1">
                        {grupo.entregou && <span className={`${selo.base} ${selo.informacao}`}>Já entregou</span>}
                        <span
                          className={`${selo.base} ${tamanho === 'certo' ? selo.neutro : tamanho === 'abaixo' ? selo.atencao : selo.erro}`}
                        >
                          {grupo.integrantes.length} de {maximo}
                        </span>
                      </span>
                    </div>
                    <ul className="divide-y divide-gray-200 px-3">
                      {grupo.integrantes.map((id) => {
                        const aluno = { id, nome: nomeDe.get(id) ?? 'Aluno' };
                        return (
                          <li key={id} className={linhaDoAluno}>
                            <span className={`min-w-0 truncate ${texto.destaque}`}>{aluno.nome}</span>
                            {!grupo.entregou && seletor(aluno, grupo.chave)}
                          </li>
                        );
                      })}
                      {/* Vagas livres: todo cartão fica com a mesma altura */}
                      {Array.from({ length: vagas }, (_, vaga) => (
                        <li key={`vaga-${vaga}`} className={`${linhaDoAluno} ${texto.apoio}`} aria-hidden="true">
                          Vaga livre
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Rodapé de altura fixa: o aviso não empurra a janela */}
      <div className="flex flex-col gap-3 sm:min-h-[2.75rem] sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          {aviso && (
            <p
              role={mensagem?.tipo === 'erro' ? 'alert' : 'status'}
              className={`rounded-lg border px-3 py-2 text-sm ${aviso.classe}`}
            >
              {aviso.texto}
            </p>
          )}
        </div>
        <Botao
          className={botaoDeAcao}
          variante="primario"
          onClick={salvar}
          disabled={salvando || acimaDoMaximo || semAlunos}
        >
          {salvando ? 'Salvando…' : 'Salvar grupos'}
        </Botao>
      </div>
    </div>
  );
};

export default MontarGrupos;
