/**
 * ============================================
 * FORMULÁRIOS DA EQUIPE (ATIVIDADES)
 * ============================================
 *
 * Usados pelo professor e pelo gestor na página de trilhas:
 * - FormularioDeAtividade: publicar ou editar, em blocos: sobre a atividade (trilha,
 *   título e o link do enunciado no GitBook), prazo opcional, formato (individual, dupla,
 *   trio ou grupo, e quem monta os grupos) e o
 *   que o aluno precisa enviar: comentário, link de um tipo, arquivo de certos formatos);
 * - Corrigir: histórico da entrega + feedback, nota (0 a 100) e Concluída/Refazer.
 * As regras (quem pode, prazo, só a última tentativa) ficam no banco.
 */
import { useEffect, useState } from 'react';

import { Aviso, Botao, Vazio, classeCampo, classeTextoLongo, classeRotulo, type Mensagem } from '../admin/Ui';
import { espaco, foco, texto } from '../admin/designSystem';
import HistoricoDeTentativas from './HistoricoDeTentativas';
import {
  emGrupo,
  FORMATO_INDIVIDUAL,
  MAXIMO_POR_GRUPO,
  nomeDeQuemEnviou,
  servicoAtividades,
  tentativasDe,
  tentativasDoGrupo,
  type AlunoDaTurma,
  type Atividade,
  type FormatoDaAtividade,
  type QuemMontaOsGrupos,
  type Tentativa,
} from '../../lib/atividades';
import type { QuemEntregou } from '../trilhas/tipos';
import {
  FORMATOS,
  ROTULO_TIPO_LINK,
  SEM_REGRAS,
  type Formato,
  type RegrasDeEntrega,
  type TipoLink,
} from '../../lib/entregas';
import { useDadosEmCache } from '../../hooks/useDadosEmCache';
import { CHAVE_MATERIAL, servicoMaterial } from '../../lib/material';
import { deCampoDataHora, paraCampoDataHora } from '../../utils/datas';

// ============ BLOCOS DO FORMULÁRIO ============
/** Todo campo de uma linha com a mesma altura (select, texto, número e data) */
const campoAlinhado = `${classeCampo} h-10`;

/**
 * Bloco com título: agrupa os campos que tratam do mesmo assunto. No computador os
 * blocos ficam lado a lado, com a mesma altura (o conteúdo estica para preencher).
 */
const Bloco: React.FC<{ titulo: string; descricao?: string; className?: string; children: React.ReactNode }> = ({
  titulo,
  descricao,
  className = '',
  children,
}) => (
  <fieldset className={`flex min-w-0 flex-col rounded-xl border border-gray-200 bg-gray-50/60 p-4 ${className}`}>
    <legend className="px-1 text-sm font-semibold text-gray-900">{titulo}</legend>
    {descricao && <p className={`mb-4 ${texto.apoio}`}>{descricao}</p>}
    {children}
  </fieldset>
);

/** Opção grande de uma escolha única (um rádio com cara de cartão) */
const Opcao: React.FC<{
  nome: string;
  rotulo: string;
  apoio: string;
  marcada: boolean;
  desabilitada: boolean;
  aoEscolher: () => void;
}> = ({ nome, rotulo, apoio, marcada, desabilitada, aoEscolher }) => (
  <label
    className={`block h-full rounded-lg border p-3 transition-colors focus-within:ring-2 focus-within:ring-favela-green-500 ${
      desabilitada ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
    } ${marcada ? 'border-favela-green-600 bg-favela-green-50' : 'border-gray-300 bg-white hover:border-gray-400'}`}
  >
    <input
      type="radio"
      name={nome}
      checked={marcada}
      disabled={desabilitada}
      onChange={aoEscolher}
      className="sr-only"
    />
    <span className={`block ${texto.destaque}`}>
      {/* O rádio já diz "marcado" ao leitor de tela: o ✓ é só visual */}
      {marcada && <span aria-hidden="true">✓ </span>}
      {rotulo}
    </span>
    <span className={`block ${texto.apoio}`}>{apoio}</span>
  </label>
);

type TipoDeFormato = 'individual' | 'dupla' | 'trio' | 'grupo';

const TIPOS_DE_FORMATO: { tipo: TipoDeFormato; rotulo: string; apoio: string }[] = [
  { tipo: 'individual', rotulo: 'Individual', apoio: '1 aluno' },
  { tipo: 'dupla', rotulo: 'Dupla', apoio: '2 alunos' },
  { tipo: 'trio', rotulo: 'Trio', apoio: '3 alunos' },
  { tipo: 'grupo', rotulo: 'Grupo', apoio: 'Você define' },
];

const tipoDoFormato = ({ grupo_min: minimo, grupo_max: maximo }: FormatoDaAtividade): TipoDeFormato =>
  maximo <= 1 ? 'individual' : minimo === 2 && maximo === 2 ? 'dupla' : minimo === 3 && maximo === 3 ? 'trio' : 'grupo';

/** O que a pessoa escolheu no bloco Formato (os números só valem no tipo "grupo") */
interface EscolhaDeFormato {
  tipo: TipoDeFormato;
  minimo: string;
  maximo: string;
  quemMonta: QuemMontaOsGrupos;
}

const paraFormato = (e: EscolhaDeFormato): FormatoDaAtividade =>
  e.tipo === 'individual'
    ? FORMATO_INDIVIDUAL
    : e.tipo === 'dupla'
      ? { grupo_min: 2, grupo_max: 2, grupos_montados_por: e.quemMonta }
      : e.tipo === 'trio'
        ? { grupo_min: 3, grupo_max: 3, grupos_montados_por: e.quemMonta }
        : { grupo_min: Number(e.minimo), grupo_max: Number(e.maximo), grupos_montados_por: e.quemMonta };

const FormatoDaEntrega: React.FC<{
  escolha: EscolhaDeFormato;
  aoMudar: (e: EscolhaDeFormato) => void;
  desabilitado: boolean;
  /** Atividade com entregas: o banco não deixa mais trocar o formato */
  travado: boolean;
}> = ({ escolha, aoMudar, desabilitado, travado }) => {
  const parado = desabilitado || travado;
  // O bloco tem sempre os mesmos campos (a janela não muda de tamanho ao trocar de opção):
  // o tamanho e quem monta só ficam desabilitados quando não se aplicam
  const tamanhoLivre = escolha.tipo === 'grupo';
  const individual = escolha.tipo === 'individual';
  const { grupo_min: minimoFixo, grupo_max: maximoFixo } = paraFormato({ ...escolha, minimo: '0', maximo: '0' });
  return (
    <Bloco
      titulo="Formato"
      className="flex-1"
      descricao={
        travado
          ? 'Esta atividade já tem entregas: o formato não pode mais mudar.'
          : 'Em dupla, trio ou grupo, só um integrante envia, e a correção e a nota valem para todos.'
      }
    >
      <div className="grid auto-rows-fr grid-cols-2 gap-2 sm:grid-cols-4">
        {TIPOS_DE_FORMATO.map((t) => (
          <Opcao
            key={t.tipo}
            nome="atividade-formato"
            rotulo={t.rotulo}
            apoio={t.apoio}
            marcada={escolha.tipo === t.tipo}
            desabilitada={parado}
            aoEscolher={() => aoMudar({ ...escolha, tipo: t.tipo })}
          />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="atividade-grupo-minimo" className={classeRotulo}>
            Mínimo de integrantes
          </label>
          <input
            id="atividade-grupo-minimo"
            type="number"
            inputMode="numeric"
            required={tamanhoLivre}
            min={1}
            max={MAXIMO_POR_GRUPO}
            value={tamanhoLivre ? escolha.minimo : minimoFixo}
            disabled={parado || !tamanhoLivre}
            className={campoAlinhado}
            onChange={(e) => aoMudar({ ...escolha, minimo: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="atividade-grupo-maximo" className={classeRotulo}>
            Máximo de integrantes
          </label>
          <input
            id="atividade-grupo-maximo"
            type="number"
            inputMode="numeric"
            required={tamanhoLivre}
            min={2}
            max={MAXIMO_POR_GRUPO}
            value={tamanhoLivre ? escolha.maximo : maximoFixo}
            disabled={parado || !tamanhoLivre}
            className={campoAlinhado}
            onChange={(e) => aoMudar({ ...escolha, maximo: e.target.value })}
          />
        </div>
      </div>

      <div className="mt-4">
        <p id="atividade-quem-monta" className={classeRotulo}>
          Quem monta os grupos
        </p>
        <div role="radiogroup" aria-labelledby="atividade-quem-monta" className="grid auto-rows-fr grid-cols-2 gap-2">
          <Opcao
            nome="atividade-quem-monta"
            rotulo="O professor"
            apoio="Você distribui a turma"
            marcada={!individual && escolha.quemMonta === 'professor'}
            desabilitada={parado || individual}
            aoEscolher={() => aoMudar({ ...escolha, quemMonta: 'professor' })}
          />
          <Opcao
            nome="atividade-quem-monta"
            rotulo="Os alunos"
            apoio="Quem envia escolhe os colegas"
            marcada={!individual && escolha.quemMonta === 'alunos'}
            desabilitada={parado || individual}
            aoEscolher={() => aoMudar({ ...escolha, quemMonta: 'alunos' })}
          />
        </div>
      </div>
    </Bloco>
  );
};

// ============ CRIAR / EDITAR ============
export const FormularioDeAtividade: React.FC<{
  turmaId: number;
  atividade: Atividade | null;
  /** Atividade nova já começa nesta trilha (a do cartão onde se clicou) */
  trilhaInicial?: number;
  /**
   * `montarGruposDe` vem com o id da atividade recém-criada quando ela é em grupo e é o
   * professor quem monta: a página abre "Montar grupos" em seguida.
   */
  aoSalvar: (mensagem: string, montarGruposDe?: number) => Promise<void>;
}> = ({ turmaId, atividade, trilhaInicial, aoSalvar }) => {
  const { dados: trilhas, erro } = useDadosEmCache(CHAVE_MATERIAL, () => servicoMaterial.carregarTrilhas());
  const [campos, setCampos] = useState({
    trilhaId: atividade?.trilha_id ?? trilhaInicial ?? 0,
    titulo: atividade?.titulo ?? '',
    linkEnunciado: atividade?.link_enunciado ?? '',
    prazo: atividade?.prazo ? paraCampoDataHora(atividade.prazo) : '',
  });
  const [regras, setRegras] = useState<RegrasDeEntrega>(() =>
    atividade
      ? {
          exige_texto: atividade.exige_texto,
          exige_link: atividade.exige_link,
          tipo_link: atividade.tipo_link,
          exige_arquivo: atividade.exige_arquivo,
          formatos: atividade.formatos,
        }
      : SEM_REGRAS,
  );
  const [formato, setFormato] = useState<EscolhaDeFormato>(() => {
    const atual = atividade ?? FORMATO_INDIVIDUAL;
    const tipo = tipoDoFormato(atual);
    return {
      tipo,
      // Tamanho sugerido para quem escolher "Grupo" depois
      minimo: String(tipo === 'grupo' ? atual.grupo_min : 2),
      maximo: String(tipo === 'grupo' ? atual.grupo_max : 4),
      quemMonta: atual.grupos_montados_por,
    };
  });
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<Mensagem>(null);
  // Atividade antiga, escrita no portal: o texto dela continua valendo, e o link é opcional
  const linkOpcional = Boolean(atividade?.enunciado);

  // Atividade nova começa na primeira trilha
  useEffect(() => {
    if (!campos.trilhaId && trilhas?.length) setCampos((c) => ({ ...c, trilhaId: trilhas[0]!.id }));
  }, [trilhas, campos.trilhaId]);

  if (erro && trilhas === undefined)
    return <Aviso mensagem={{ tipo: 'erro', texto: 'Não foi possível carregar as trilhas.' }} className="" />;
  if (trilhas === undefined) return <p className={texto.corpo}>Carregando as trilhas…</p>;
  if (!trilhas.length) return <Vazio>Crie uma trilha antes de publicar atividades.</Vazio>;

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagem(null);
    setSalvando(true);
    const formatoEscolhido = paraFormato(formato);
    const resultado = await servicoAtividades.salvar(
      {
        trilha_id: campos.trilhaId,
        titulo: campos.titulo,
        link_enunciado: campos.linkEnunciado,
        // Campo vazio = sem prazo (a entrega fica aberta)
        prazo: campos.prazo ? deCampoDataHora(campos.prazo) : null,
        ...regras,
        ...formatoEscolhido,
      },
      atividade ? { id: atividade.id } : { turmaId },
    );
    if ('falha' in resultado) {
      setSalvando(false);
      return setMensagem({ tipo: 'erro', texto: resultado.falha });
    }
    if (atividade) return aoSalvar('Atividade atualizada.');
    const professorMonta = emGrupo(formatoEscolhido) && formatoEscolhido.grupos_montados_por === 'professor';
    await aoSalvar('Atividade publicada para a turma.', professorMonta ? resultado.id : undefined);
  };

  return (
    // No computador: três colunas da mesma altura (atividade e prazo | formato | entrega).
    // No celular: um bloco embaixo do outro.
    <form onSubmit={salvar} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="flex min-w-0 flex-col gap-4">
        <Bloco titulo="Sobre a atividade" className="flex-1">
          <div className={espaco.formulario}>
            <div>
              <label htmlFor="atividade-trilha" className={classeRotulo}>
                Trilha
              </label>
              <select
                id="atividade-trilha"
                value={campos.trilhaId}
                disabled={salvando}
                className={campoAlinhado}
                onChange={(e) => setCampos((c) => ({ ...c, trilhaId: Number(e.target.value) }))}
              >
                {trilhas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="atividade-titulo" className={classeRotulo}>
                Título
              </label>
              <input
                id="atividade-titulo"
                required
                maxLength={120}
                placeholder="Ex: Exercício Módulo 2"
                value={campos.titulo}
                disabled={salvando}
                className={campoAlinhado}
                onChange={(e) => setCampos((c) => ({ ...c, titulo: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="atividade-link-enunciado" className={classeRotulo}>
                Link do enunciado (GitBook)
              </label>
              <input
                id="atividade-link-enunciado"
                required={!linkOpcional}
                type="url"
                inputMode="url"
                maxLength={2000}
                placeholder="https://favelaware.gitbook.io/favelaware/..."
                value={campos.linkEnunciado}
                disabled={salvando}
                className={campoAlinhado}
                aria-describedby="atividade-link-enunciado-apoio"
                onChange={(e) => setCampos((c) => ({ ...c, linkEnunciado: e.target.value }))}
              />
              <p id="atividade-link-enunciado-apoio" className={`mt-1 ${texto.apoio}`}>
                {linkOpcional
                  ? 'Opcional nesta atividade: ela já tem o enunciado escrito no portal.'
                  : 'O aluno lê a atividade nesta página do GitBook e entrega aqui no portal.'}
              </p>
            </div>
          </div>
        </Bloco>
        <Bloco titulo="Prazo">
          <label htmlFor="atividade-prazo" className={classeRotulo}>
            Data e hora (horário de Brasília, opcional)
          </label>
          <input
            id="atividade-prazo"
            aria-describedby="atividade-prazo-apoio"
            type="datetime-local"
            value={campos.prazo}
            disabled={salvando}
            className={campoAlinhado}
            onChange={(e) => setCampos((c) => ({ ...c, prazo: e.target.value }))}
          />
          <p id="atividade-prazo-apoio" className={`mt-1 ${texto.apoio}`}>
            Sem prazo, o envio fica aberto. Depois do prazo, o envio fecha. Quem receber "Refazer" ainda pode reenviar.
          </p>
        </Bloco>
      </div>
      <FormatoDaEntrega
        escolha={formato}
        aoMudar={setFormato}
        desabilitado={salvando}
        travado={(atividade?.tentativas.length ?? 0) > 0}
      />
      <RegrasDaEntrega regras={regras} aoMudar={setRegras} desabilitado={salvando} />
      <div className="flex flex-col gap-3 sm:min-h-[3rem] sm:flex-row sm:items-center sm:justify-between lg:col-span-3">
        <div className="min-w-0 flex-1">
          <Aviso mensagem={mensagem} className="" />
        </div>
        <Botao type="submit" variante="primario" disabled={salvando} className="sm:min-w-[12rem]">
          {salvando ? 'Salvando…' : atividade ? 'Salvar alterações' : 'Publicar atividade'}
        </Botao>
      </div>
    </form>
  );
};

// ============ O QUE O ALUNO PRECISA ENVIAR ============
const Chave: React.FC<{
  id: string;
  ligada: boolean;
  aoMudar: (v: boolean) => void;
  desabilitado: boolean;
  rotulo: string;
  apoio: string;
}> = ({ id, ligada, aoMudar, desabilitado, rotulo, apoio }) => (
  <div className="flex items-start justify-between gap-4">
    <span>
      <label htmlFor={id} className={`block ${texto.destaque}`}>
        {rotulo}
      </label>
      <span id={`${id}-apoio`} className={`block ${texto.apoio}`}>
        {apoio}
      </span>
    </span>
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={ligada}
      aria-describedby={`${id}-apoio`}
      disabled={desabilitado}
      onClick={() => aoMudar(!ligada)}
      className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${foco} ${
        ligada ? 'bg-favela-green-600' : 'bg-gray-400'
      }`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${ligada ? 'translate-x-5' : 'translate-x-0.5'}`}
      />
    </button>
  </div>
);

const RegrasDaEntrega: React.FC<{
  regras: RegrasDeEntrega;
  aoMudar: (r: RegrasDeEntrega) => void;
  desabilitado: boolean;
}> = ({ regras, aoMudar, desabilitado }) => {
  const mudar = (parte: Partial<RegrasDeEntrega>) => aoMudar({ ...regras, ...parte });
  const alternarFormato = (f: Formato) =>
    mudar({ formatos: regras.formatos.includes(f) ? regras.formatos.filter((x) => x !== f) : [...regras.formatos, f] });

  return (
    <Bloco
      titulo="O que o aluno precisa enviar"
      descricao="Ligue o que é obrigatório. Sem nada ligado, o aluno escolhe: link, comentário ou arquivo."
    >
      <div className="space-y-5">
        <Chave
          id="regra-texto"
          rotulo="Comentário ou resposta"
          apoio="Um texto escrito pelo aluno."
          ligada={regras.exige_texto}
          aoMudar={(v) => mudar({ exige_texto: v })}
          desabilitado={desabilitado}
        />

        <div className="space-y-2">
          <Chave
            id="regra-link"
            rotulo="Link"
            apoio="Repositório, documento ou site publicado."
            ligada={regras.exige_link}
            aoMudar={(v) => mudar({ exige_link: v })}
            desabilitado={desabilitado}
          />
          <div>
            <label htmlFor="regra-tipo-link" className={classeRotulo}>
              Tipo de link aceito
            </label>
            <select
              id="regra-tipo-link"
              value={regras.tipo_link}
              disabled={desabilitado}
              className={campoAlinhado}
              onChange={(e) => mudar({ tipo_link: e.target.value as TipoLink })}
            >
              {(Object.keys(ROTULO_TIPO_LINK) as TipoLink[]).map((t) => (
                <option key={t} value={t}>
                  {ROTULO_TIPO_LINK[t]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Chave
            id="regra-arquivo"
            rotulo="Arquivo"
            apoio="Enviado pelo portal (vai para o Google Drive), até 10 MB."
            ligada={regras.exige_arquivo}
            aoMudar={(v) => mudar({ exige_arquivo: v })}
            desabilitado={desabilitado}
          />
          <div>
            <p id="regra-formatos" className={classeRotulo}>
              Formatos aceitos
            </p>
            <div role="group" aria-labelledby="regra-formatos" className="flex flex-wrap gap-2">
              {(Object.keys(FORMATOS) as Formato[]).map((f) => {
                const marcado = regras.formatos.includes(f);
                return (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={marcado}
                    disabled={desabilitado}
                    onClick={() => alternarFormato(f)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${foco} ${
                      marcado
                        ? 'border-favela-green-600 bg-favela-green-50 text-favela-green-800'
                        : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    {marcado ? '✓ ' : ''}
                    {FORMATOS[f].rotulo}
                  </button>
                );
              })}
            </div>
            <p className={`mt-1 ${texto.apoio}`}>
              {regras.formatos.length
                ? 'Só os formatos marcados serão aceitos.'
                : 'Nenhum marcado: qualquer formato aceito pelo portal.'}
            </p>
          </div>
        </div>
      </div>
    </Bloco>
  );
};

// ============ CORRIGIR ============
// Em grupo, a correção é uma só e vale para todos os integrantes (o banco guarda na entrega do grupo)
export const Corrigir: React.FC<{
  atividade: Atividade;
  quem: QuemEntregou;
  /** Alunos da turma: dão o nome de quem enviou cada tentativa do grupo */
  alunos: AlunoDaTurma[];
  aoSalvar: () => Promise<void>;
}> = ({ atividade, quem, alunos, aoSalvar }) => {
  const doGrupo = 'grupoId' in quem;
  const tentativas = doGrupo ? tentativasDoGrupo(atividade, quem.grupoId) : tentativasDe(atividade, quem.aluno.id);
  const nomeDoAluno = doGrupo ? (t: Tentativa) => nomeDeQuemEnviou(t, alunos) : quem.aluno.nome;
  const ultima = tentativas[tentativas.length - 1];
  const [feedback, setFeedback] = useState(ultima?.status !== 'aguardando' ? (ultima?.feedback ?? '') : '');
  const [nota, setNota] = useState(ultima?.nota != null ? String(ultima.nota) : '');
  const [salvando, setSalvando] = useState<'concluida' | 'refazer' | null>(null);
  const [mensagem, setMensagem] = useState<Mensagem>(null);

  if (!ultima) return <Vazio>{doGrupo ? 'Este grupo ainda não entregou.' : 'Este aluno ainda não entregou.'}</Vazio>;

  const responder = async (status: 'concluida' | 'refazer') => {
    setMensagem(null);
    setSalvando(status);
    const falha = await servicoAtividades.avaliar(ultima.id, { status, feedback, notaDigitada: nota });
    if (falha) {
      setSalvando(null);
      return setMensagem({ tipo: 'erro', texto: falha });
    }
    try {
      await aoSalvar();
      setMensagem({
        tipo: 'sucesso',
        texto:
          status === 'concluida'
            ? doGrupo
              ? 'Entrega concluída: a nota vale para todo o grupo.'
              : 'Entrega concluída.'
            : `Pedido de refazer enviado ao ${doGrupo ? 'grupo' : 'aluno'}.`,
      });
    } catch (e) {
      console.error('[atividades] corrigiu, mas falhou ao atualizar', e);
      setMensagem({ tipo: 'sucesso', texto: 'Correção salva. Recarregue a página para ver o histórico.' });
    }
    setSalvando(null);
  };

  return (
    <div className="space-y-6">
      <HistoricoDeTentativas tentativas={tentativas} nomeDoAluno={nomeDoAluno} />

      <div className={`border-t border-gray-100 pt-5 ${espaco.formulario}`}>
        <p className={texto.titulo}>
          {ultima.status === 'aguardando'
            ? `Responder a ${ultima.numero}ª tentativa`
            : `Alterar a resposta da ${ultima.numero}ª tentativa`}
        </p>
        <div>
          <label htmlFor="correcao-feedback" className={classeRotulo}>
            {doGrupo ? 'Feedback para o grupo' : 'Feedback para o aluno'}
          </label>
          <textarea
            id="correcao-feedback"
            rows={5}
            maxLength={10000}
            value={feedback}
            disabled={salvando !== null}
            onChange={(e) => setFeedback(e.target.value)}
            className={classeTextoLongo}
          />
        </div>
        <div className="sm:max-w-[10rem]">
          <label htmlFor="correcao-nota" className={classeRotulo}>
            Nota (0 a 100)
          </label>
          <input
            id="correcao-nota"
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            step={1}
            value={nota}
            disabled={salvando !== null}
            onChange={(e) => setNota(e.target.value)}
            className={classeCampo}
          />
          <p className={`mt-1 ${texto.apoio}`}>Obrigatória para concluir.</p>
        </div>
        <Aviso mensagem={mensagem} className="" />
        <div className="flex flex-wrap gap-3">
          <Botao variante="primario" disabled={salvando !== null} onClick={() => responder('concluida')}>
            {salvando === 'concluida' ? 'Salvando…' : 'Concluída'}
          </Botao>
          <Botao disabled={salvando !== null} onClick={() => responder('refazer')}>
            {salvando === 'refazer' ? 'Salvando…' : 'Pedir para refazer'}
          </Botao>
        </div>
      </div>
    </div>
  );
};
