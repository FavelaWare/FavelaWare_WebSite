/**
 * ============================================
 * JANELA DA ATIVIDADE (ÁREA DO ALUNO)
 * ============================================
 *
 * Janela no padrão "Entrega: Exercício":
 * - topo com trilha, situação e prazo (quanto falta);
 * - enunciado, histórico (envios e respostas do professor);
 * - a entrega (link, comentário e/ou arquivo), com o botão sempre à vista no rodapé.
 *
 * Conta de demonstração ("ver como aluno", sem aluno ligado): o formulário é
 * conferido igual ao do aluno, mas o envio não é gravado (o banco também não deixaria).
 *
 * Atividade em grupo: a entrega é do grupo e qualquer integrante envia.
 * - Professor monta: mostra o grupo; sem grupo, o aluno é orientado a falar com o instrutor.
 * - Alunos montam: no 1º envio, quem envia escolhe os colegas (só os da turma sem grupo).
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  IconeAlerta,
  IconeClipe,
  IconeEnviarArquivo,
  IconeLink,
  IconeLinkExterno,
  IconeRelogio,
} from '../admin/Icones';
import Janela from '../admin/Janela';
import { Aviso, Botao, classeCampo, classeDoBotao, classeRotulo, classeTextoLongo, type Mensagem } from '../admin/Ui';
import { estado, foco, selo, texto } from '../admin/designSystem';
import HistoricoDeTentativas from './HistoricoDeTentativas';
import {
  emGrupo,
  podeEnviar,
  ROTULO_SITUACAO,
  rotuloDoFormato,
  situacaoDoAluno,
  tentativasDoAluno,
  type AlunoDaTurma,
  type Atividade,
  type GrupoDoAluno,
  type Situacao,
  type Tentativa,
} from '../../lib/atividades';
import { problemaNoTamanho, servicoGrupos, tamanhoDoGrupo } from '../../lib/grupos';
import { codigoDoErro } from '../../lib/banco';
import {
  formatosEmTexto,
  ROTULO_TIPO_LINK,
  servicoEntregas,
  tiposAceitos,
  type EtapaEnvio,
  type Formato,
} from '../../lib/entregas';
import { TAMANHO_MAXIMO_ARQUIVO } from '../../config';
import { StatusProcessamento } from '../../types';
import { tamanhoLegivel } from '../../utils/arquivos';
import { formatarDataHora } from '../../utils/datas';

export const COR_SITUACAO: Record<Situacao, string> = {
  pendente: selo.neutro,
  aguardando: selo.informacao,
  refazer: selo.atencao,
  concluida: selo.sucesso,
  encerrada: selo.erro,
};

const LIMITE_COMENTARIO = 10000;

/**
 * "faltam 3 dias", "vence em 5 horas", "vence em menos de 1 hora", "encerrado".
 * Sempre arredonda para baixo: nunca promete mais tempo do que realmente há.
 */
function quantoFalta(prazo: string): string {
  const ms = new Date(prazo).getTime() - Date.now();
  if (ms <= 0) return 'encerrado';
  const horas = Math.floor(ms / 36e5);
  if (horas < 1) return 'vence em menos de 1 hora';
  if (horas < 24) return horas === 1 ? 'vence em 1 hora' : `vence em ${horas} horas`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? 'falta 1 dia' : `faltam ${dias} dias`;
}

// ============================================
// JANELA DA ATIVIDADE
// ============================================
interface PropsJanela {
  atividade: Atividade;
  participanteId: number;
  /** Grupos do aluno (só os das atividades em grupo) */
  grupos: GrupoDoAluno[];
  demonstracao: boolean;
  aoEnviar: () => Promise<void>;
  onFechar: () => void;
}

const JanelaDaAtividade: React.FC<PropsJanela> = ({
  atividade,
  participanteId,
  grupos,
  demonstracao,
  aoEnviar,
  onFechar,
}) => {
  const tentativas = tentativasDoAluno(atividade, participanteId, grupos);
  const situacao = situacaoDoAluno(tentativas, atividade.prazo);
  const ehGrupo = emGrupo(atividade);
  const meuGrupo = ehGrupo ? grupos.find((g) => g.atividade_id === atividade.id) : undefined;
  // Professor monta e ainda não pôs o aluno num grupo: não há como enviar
  const esperandoGrupo = ehGrupo && atividade.grupos_montados_por === 'professor' && !meuGrupo;
  // Alunos montam e este aluno ainda não tem grupo: escolhe os colegas no 1º envio
  const escolheColegas = ehGrupo && atividade.grupos_montados_por === 'alunos' && !meuGrupo;
  const grupoPequeno =
    meuGrupo !== undefined &&
    tamanhoDoGrupo(meuGrupo.integrantes.length, atividade.grupo_min, atividade.grupo_max) === 'abaixo';
  const envioAberto = podeEnviar(situacao) && !esperandoGrupo;

  // Colegas livres: undefined = carregando; null = falhou
  const [colegas, setColegas] = useState<AlunoDaTurma[] | null | undefined>(undefined);
  const [escolhidos, setEscolhidos] = useState<number[]>([]);
  const carregarColegas = useCallback(async () => {
    setColegas(undefined);
    try {
      const lista = await servicoGrupos.colegasLivres(atividade.id);
      setColegas(lista);
      // Quem entrou em outro grupo enquanto a janela estava aberta sai da escolha
      setEscolhidos((atual) => atual.filter((id) => lista.some((c) => c.id === id)));
    } catch (e) {
      console.error('[atividades] falha ao carregar os colegas', codigoDoErro(e));
      setColegas(null);
    }
  }, [atividade.id]);
  const precisaDosColegas = escolheColegas && envioAberto;
  useEffect(() => {
    // Demonstração não tem turma de verdade: nenhum colega para escolher
    if (!precisaDosColegas) return;
    if (demonstracao) setColegas([]);
    else void carregarColegas();
  }, [precisaDosColegas, demonstracao, carregarColegas]);

  // Estado da entrega fica aqui: o botão de enviar mora no rodapé da janela
  const [link, setLink] = useState('');
  const [comentario, setComentario] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [etapa, setEtapa] = useState<EtapaEnvio | null>(null);
  const [mensagem, setMensagem] = useState<Mensagem>(null);
  const [avisoDemonstracao, setAvisoDemonstracao] = useState(false);
  const [enviou, setEnviou] = useState(false);
  const tituloHistorico = useRef<HTMLHeadingElement>(null);
  const ocupado = etapa !== null;

  // Não fecha no meio do envio. Ref (e não dependência) para a função ficar estável:
  // a Janela refaz o foco quando ela muda.
  const ocupadoRef = useRef(false);
  ocupadoRef.current = ocupado;
  const fechar = useCallback(() => {
    if (!ocupadoRef.current) onFechar();
  }, [onFechar]);

  // Depois de enviar, o formulário some (a entrega fica "aguardando"): o foco vai
  // para o histórico, onde a entrega nova aparece, em vez de se perder fora da janela.
  useEffect(() => {
    if (enviou) tituloHistorico.current?.focus();
  }, [enviou]);

  // A mensagem fica no fim do formulário; o botão, no rodapé: rola até ela para ser vista
  useEffect(() => {
    if (mensagem?.tipo === 'erro' || avisoDemonstracao) {
      const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      document
        .getElementById(avisoDemonstracao ? 'aviso-demonstracao' : 'aviso-entrega')
        ?.scrollIntoView({ block: 'nearest', behavior: suave ? 'smooth' : 'auto' });
    }
  }, [mensagem, avisoDemonstracao]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagem(null);
    setAvisoDemonstracao(false);
    const entrega = { comentario, link, arquivo };

    if (demonstracao) {
      // Confere igual ao aluno, mas não grava nada (e não há colegas para escolher)
      const problema = servicoEntregas.validar(entrega, atividade);
      if (problema) return setMensagem({ tipo: 'erro', texto: problema });
      return setAvisoDemonstracao(true);
    }

    // Tamanho do grupo antes de enviar (o banco confere de novo)
    const tamanho = escolheColegas
      ? problemaNoTamanho(escolhidos.length + 1, atividade.grupo_min, atividade.grupo_max)
      : grupoPequeno
        ? `O grupo precisa de pelo menos ${atividade.grupo_min} integrantes para enviar. Fale com o seu instrutor.`
        : null;
    if (tamanho) return setMensagem({ tipo: 'erro', texto: tamanho });

    const resultado = await servicoEntregas.enviar(
      atividade.id,
      participanteId,
      entrega,
      setEtapa,
      atividade,
      escolheColegas ? escolhidos : undefined,
    );
    if (resultado.status !== StatusProcessamento.Sucesso) {
      setEtapa(null);
      // Um colega pode ter entrado em outro grupo nesse meio tempo: a lista se atualiza
      if (escolheColegas) void carregarColegas();
      return setMensagem({ tipo: 'erro', texto: resultado.mensagem! });
    }
    try {
      await aoEnviar(); // a janela passa a mostrar o envio no histórico
      setLink('');
      setComentario('');
      setArquivo(null);
      setMensagem({ tipo: 'sucesso', texto: 'Entrega enviada! Agora é só esperar a correção do instrutor.' });
    } catch (falha) {
      console.error('[atividades] entregue, mas falhou ao atualizar', falha);
      setMensagem({ tipo: 'sucesso', texto: 'Entrega enviada. Recarregue a página para ver o histórico.' });
    }
    setEtapa(null);
    setEnviou(true);
  };

  const numero = tentativas.length + 1;
  const temRegras = atividade.exige_texto || atividade.exige_link || atividade.exige_arquivo;
  const dicaDoLink =
    atividade.tipo_link === 'github'
      ? 'https://github.com/seu-usuario/seu-repositorio'
      : atividade.tipo_link === 'drive'
        ? 'https://drive.google.com/…'
        : 'https://github.com/… ou link do Google Drive';

  const topo = (
    <div className="flex flex-wrap items-center gap-2">
      {atividade.trilha && <span className={`${selo.base} ${selo.marca}`}>{atividade.trilha.nome}</span>}
      {ehGrupo && <span className={`${selo.base} ${selo.neutro}`}>{rotuloDoFormato(atividade)}</span>}
      <span className={`${selo.base} ${COR_SITUACAO[situacao]}`}>{ROTULO_SITUACAO[situacao]}</span>
      <span className={`ml-auto flex items-center gap-1.5 ${texto.apoio}`}>
        <IconeRelogio className="h-4 w-4" />
        {atividade.prazo ? formatarDataHora(atividade.prazo) : 'Sem prazo'}
        {situacao === 'pendente' && atividade.prazo && (
          <span className="font-semibold text-gray-700">· {quantoFalta(atividade.prazo)}</span>
        )}
      </span>
    </div>
  );

  const rodape = envioAberto ? (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className={texto.apoio}>
        {temRegras
          ? 'Os campos marcados com * são obrigatórios.'
          : 'Preencha pelo menos um: link, comentário ou arquivo.'}
      </p>
      <Botao type="submit" form="form-entrega" variante="primario" disabled={ocupado} className="sm:min-w-[11rem]">
        {ocupado && <Girando />}
        {etapa === 'arquivo'
          ? 'Enviando para o Drive…'
          : etapa === 'registro'
            ? 'Registrando…'
            : numero > 1
              ? `Enviar ${numero}ª tentativa`
              : 'Enviar entrega'}
      </Botao>
    </div>
  ) : undefined;

  return (
    <Janela titulo={atividade.titulo} aberta onFechar={fechar} larga topo={topo} rodape={rodape} focoInicial="fechar">
      <div className="space-y-6">
        {/* Confirmação do envio (o formulário já sumiu) */}
        {!envioAberto && <Aviso mensagem={mensagem} className="" />}

        {/* Enunciado */}
        <section aria-labelledby="titulo-enunciado">
          <h3 id="titulo-enunciado" className={`mb-2 ${texto.rotuloMaiusculo}`}>
            O que fazer
          </h3>
          {/* Texto guardado no portal (atividades antigas e resumo); as novas só têm o link */}
          {atividade.enunciado && (
            <div className="mb-3 rounded-lg border-l-4 border-favela-green-500 bg-gray-50 p-4">
              <p className={`whitespace-pre-wrap break-words leading-relaxed ${texto.corpo}`}>{atividade.enunciado}</p>
            </div>
          )}
          {/* A atividade completa fica no GitBook; a entrega é feita aqui */}
          {atividade.link_enunciado && (
            <a
              href={atividade.link_enunciado}
              target="_blank"
              rel="noopener noreferrer"
              className={classeDoBotao('primario')}
            >
              Ler a atividade completa
              <IconeLinkExterno className="h-4 w-4" />
              <span className="sr-only">(abre em nova aba)</span>
            </a>
          )}
        </section>

        {/* Grupo: quem está nele, ou o aviso de que o instrutor ainda não montou */}
        {meuGrupo && (
          <section aria-labelledby="titulo-grupo">
            <h3 id="titulo-grupo" className={`mb-2 ${texto.rotuloMaiusculo}`}>
              Seu grupo
            </h3>
            <p className={texto.corpo}>
              {meuGrupo.integrantes.map((i) => (i.id === participanteId ? `${i.nome} (você)` : i.nome)).join(', ')}
            </p>
            {grupoPequeno && envioAberto && (
              <p className={`mt-2 rounded-lg border p-3 text-sm ${estado.atencao}`}>
                O grupo precisa de pelo menos {atividade.grupo_min} integrantes para enviar. Fale com o seu instrutor.
              </p>
            )}
          </section>
        )}
        {esperandoGrupo && situacao !== 'encerrada' && (
          <div role="status" className={`flex gap-3 rounded-lg border p-4 text-sm ${estado.atencao}`}>
            <IconeAlerta className="mt-0.5 h-5 w-5" />
            <div>
              <p className="font-semibold">Você ainda não está em um grupo nesta atividade.</p>
              <p className="mt-1">O instrutor monta os grupos. Fale com ele para entrar em um e liberar a entrega.</p>
            </div>
          </div>
        )}

        {temRegras && envioAberto && (
          <section aria-labelledby="titulo-exigencias">
            <h3 id="titulo-exigencias" className={`mb-2 ${texto.rotuloMaiusculo}`}>
              O que você precisa enviar
            </h3>
            <ul className="grid gap-2 sm:grid-cols-3">
              {atividade.exige_texto && (
                <Exigencia titulo="Comentário ou resposta" detalhe="Escreva no campo de texto" />
              )}
              {atividade.exige_link && (
                <Exigencia titulo={ROTULO_TIPO_LINK[atividade.tipo_link]} detalhe={dicaDoLink} />
              )}
              {atividade.exige_arquivo && (
                <Exigencia titulo="Arquivo" detalhe={`${formatosEmTexto(atividade.formatos)}, até 10 MB`} />
              )}
            </ul>
          </section>
        )}

        {situacao === 'encerrada' && atividade.prazo && (
          <div role="status" className={`flex gap-3 rounded-lg border p-4 text-sm ${estado.atencao}`}>
            <IconeAlerta className="mt-0.5 h-5 w-5" />
            <div>
              <p className="font-semibold">O prazo terminou em {formatarDataHora(atividade.prazo)}.</p>
              <p className="mt-1">
                O envio das tarefas não está mais disponível. Se tiver alguma dúvida, fale com o seu instrutor.
              </p>
            </div>
          </div>
        )}

        {tentativas.length > 0 && (
          <section aria-labelledby="titulo-historico" className="border-t border-gray-100 pt-5">
            <h3
              id="titulo-historico"
              ref={tituloHistorico}
              tabIndex={-1}
              className={`mb-4 rounded ${texto.rotuloMaiusculo} ${foco}`}
            >
              {ehGrupo ? 'Entregas do grupo' : 'Suas entregas'}
            </h3>
            <HistoricoDeTentativas
              tentativas={tentativas}
              nomeDoAluno={ehGrupo ? (t) => quemEnviou(t, participanteId, meuGrupo) : 'Você'}
            />
          </section>
        )}

        {envioAberto && (
          <form
            id="form-entrega"
            onSubmit={enviar}
            aria-labelledby="titulo-entrega"
            className="space-y-4 border-t border-gray-100 pt-5"
          >
            <div>
              <h3 id="titulo-entrega" className={texto.titulo}>
                {ehGrupo
                  ? numero > 1
                    ? `${numero}ª tentativa do grupo`
                    : 'Entrega do grupo'
                  : numero > 1
                    ? `Sua ${numero}ª tentativa`
                    : 'Sua entrega'}
              </h3>
              <p className={`mt-0.5 ${texto.apoio}`}>
                {ehGrupo
                  ? 'Só um integrante envia: a entrega, a correção e a nota valem para todo o grupo.'
                  : 'Depois de enviar, o instrutor corrige e a resposta aparece aqui.'}
              </p>
            </div>

            {escolheColegas && (
              <EscolherColegas
                colegas={colegas}
                escolhidos={escolhidos}
                aoMudar={setEscolhidos}
                aoTentarDeNovo={() => void carregarColegas()}
                minimo={atividade.grupo_min}
                maximo={atividade.grupo_max}
                desabilitado={ocupado}
              />
            )}

            {/* Link */}
            <div>
              <label htmlFor="entrega-link" className={classeRotulo}>
                {atividade.tipo_link === 'qualquer' ? 'Link do trabalho' : ROTULO_TIPO_LINK[atividade.tipo_link]}{' '}
                <Obrigatorio sim={atividade.exige_link} />
              </label>
              <div className="relative">
                <IconeLink className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="entrega-link"
                  type="url"
                  inputMode="url"
                  placeholder={dicaDoLink}
                  value={link}
                  maxLength={2000}
                  onChange={(e) => setLink(e.target.value)}
                  disabled={ocupado}
                  aria-required={atividade.exige_link}
                  className={`${classeCampo} pl-9`}
                />
              </div>
            </div>

            {/* Comentário */}
            <div>
              <div className="flex items-baseline justify-between">
                <label htmlFor="entrega-texto" className={classeRotulo}>
                  Comentário ou resposta <Obrigatorio sim={atividade.exige_texto} />
                </label>
                <span className={`${texto.apoio} tabular-nums`} aria-live="polite">
                  {comentario.length > LIMITE_COMENTARIO * 0.9 ? `${comentario.length}/${LIMITE_COMENTARIO}` : ''}
                </span>
              </div>
              <textarea
                id="entrega-texto"
                rows={4}
                value={comentario}
                maxLength={LIMITE_COMENTARIO}
                aria-required={atividade.exige_texto}
                placeholder="Conte o que você fez, ou escreva a sua resposta aqui."
                onChange={(e) => setComentario(e.target.value)}
                disabled={ocupado}
                className={classeTextoLongo}
              />
            </div>

            {/* Arquivo */}
            <CampoDeArquivo
              arquivo={arquivo}
              aoEscolher={setArquivo}
              desabilitado={ocupado}
              obrigatorio={atividade.exige_arquivo}
              formatos={atividade.formatos}
            />

            <div id="aviso-entrega">
              <Aviso mensagem={mensagem} className="" />
            </div>
            {avisoDemonstracao && (
              <p id="aviso-demonstracao" role="status" className={`rounded-lg border p-3 text-sm ${estado.atencao}`}>
                <span className="font-semibold">Conta de demonstração:</span> a entrega está certinha, mas não foi
                gravada. Para um aluno, ela iria para o instrutor corrigir.
              </p>
            )}
          </form>
        )}
      </div>
    </Janela>
  );
};

// ============================================
// CAMPO DE ARQUIVO (clique ou arraste)
// ============================================
const CampoDeArquivo: React.FC<{
  arquivo: File | null;
  aoEscolher: (f: File | null) => void;
  desabilitado: boolean;
  obrigatorio: boolean;
  formatos: Formato[];
}> = ({ arquivo, aoEscolher, desabilitado, obrigatorio, formatos }) => {
  const [arrastando, setArrastando] = useState(false);
  const campo = useRef<HTMLInputElement>(null);
  const [removeu, setRemoveu] = useState(false);

  // Enquanto o formulário está na tela, arquivo solto fora da área não abre no
  // navegador (o que tiraria a pessoa da página e perderia o que ela digitou)
  useEffect(() => {
    const segurar = (e: DragEvent) => e.preventDefault();
    window.addEventListener('dragover', segurar);
    window.addEventListener('drop', segurar);
    return () => {
      window.removeEventListener('dragover', segurar);
      window.removeEventListener('drop', segurar);
    };
  }, []);

  // Depois de "Remover", o foco volta para a escolha de arquivo (o botão sumiu)
  useEffect(() => {
    if (removeu && !arquivo) campo.current?.focus();
  }, [removeu, arquivo]);

  const soltar = (e: React.DragEvent) => {
    e.preventDefault();
    setArrastando(false);
    if (!desabilitado) aoEscolher(e.dataTransfer.files?.[0] ?? null);
  };

  // Sair de um filho (texto, ícone) não é sair da área: evita o destaque piscar
  const sair = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setArrastando(false);
  };

  return (
    <div>
      <span className={classeRotulo} id="rotulo-arquivo">
        Arquivo <Obrigatorio sim={obrigatorio} />
      </span>
      {arquivo ? (
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-favela-green-50 text-favela-green-700">
            <IconeClipe />
          </span>
          <span className="min-w-0 flex-1">
            <span className={`block truncate ${texto.destaque}`}>{arquivo.name}</span>
            <span className={`block ${texto.apoio}`}>{tamanhoLegivel(arquivo.size)}</span>
          </span>
          <Botao
            tamanho="pequeno"
            variante="perigo"
            disabled={desabilitado}
            aria-label={`Remover ${arquivo.name}`}
            onClick={() => {
              aoEscolher(null);
              setRemoveu(true);
            }}
          >
            Remover
          </Botao>
        </div>
      ) : (
        <label
          htmlFor="entrega-arquivo"
          onDragOver={(e) => {
            e.preventDefault();
            if (!desabilitado) setArrastando(true);
          }}
          onDragLeave={sair}
          onDrop={soltar}
          className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-favela-green-500 ${
            arrastando
              ? 'border-favela-green-500 bg-favela-green-50'
              : 'border-gray-300 bg-white hover:border-favela-green-500 hover:bg-gray-50'
          }`}
        >
          <IconeEnviarArquivo className="h-7 w-7 text-favela-green-600" />
          <span className={texto.destaque}>
            Arraste o arquivo aqui ou <span className="text-favela-green-700 underline">escolha no computador</span>
          </span>
          <span id="dica-arquivo" className={texto.apoio}>
            {formatosEmTexto(formatos)} · até {TAMANHO_MAXIMO_ARQUIVO / 1024 / 1024} MB
          </span>
          <input
            id="entrega-arquivo"
            ref={campo}
            type="file"
            accept={tiposAceitos(formatos).join(',')}
            disabled={desabilitado}
            aria-labelledby="rotulo-arquivo"
            aria-describedby="dica-arquivo"
            aria-required={obrigatorio}
            className="sr-only"
            onChange={(e) => aoEscolher(e.target.files?.[0] ?? null)}
          />
        </label>
      )}
    </div>
  );
};

/** Nome de quem enviou a tentativa do grupo ("Você", um colega, ou quem já saiu do grupo) */
function quemEnviou(t: Tentativa, participanteId: number, grupo: GrupoDoAluno | undefined): string {
  if (t.participante_id === participanteId) return 'Você';
  return grupo?.integrantes.find((i) => i.id === t.participante_id)?.nome ?? 'Ex-integrante do grupo';
}

// ============================================
// COLEGAS DO GRUPO (1º envio, quando os alunos montam)
// ============================================
const EscolherColegas: React.FC<{
  /** undefined = carregando; null = falhou */
  colegas: AlunoDaTurma[] | null | undefined;
  escolhidos: number[];
  aoMudar: (ids: number[]) => void;
  aoTentarDeNovo: () => void;
  minimo: number;
  maximo: number;
  desabilitado: boolean;
}> = ({ colegas, escolhidos, aoMudar, aoTentarDeNovo, minimo, maximo, desabilitado }) => {
  // Quem envia já conta como um integrante
  const cheio = escolhidos.length + 1 >= maximo;
  const tamanho = minimo === maximo ? `${maximo} pessoas` : `de ${minimo} a ${maximo} pessoas`;
  const alternar = (id: number) =>
    aoMudar(escolhidos.includes(id) ? escolhidos.filter((e) => e !== id) : [...escolhidos, id]);

  return (
    <fieldset aria-describedby="dica-colegas">
      <legend className={classeRotulo}>
        Colegas do grupo <Obrigatorio sim />
      </legend>
      <p id="dica-colegas" className={texto.apoio}>
        O grupo tem {tamanho}, contando com você. Marque quem fez a atividade com você. A lista mostra só quem ainda não
        está em um grupo.
      </p>

      {colegas === undefined ? (
        <p className={`mt-2 ${texto.corpo}`}>Carregando os colegas…</p>
      ) : colegas === null ? (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <p className="text-sm text-red-700">Não foi possível carregar os colegas.</p>
          <Botao tamanho="pequeno" onClick={aoTentarDeNovo}>
            Tentar de novo
          </Botao>
        </div>
      ) : colegas.length === 0 ? (
        <p className={`mt-2 ${texto.corpo}`}>Nenhum colega disponível: todos da turma já estão em um grupo.</p>
      ) : (
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {colegas.map((c) => {
            const marcado = escolhidos.includes(c.id);
            return (
              <li key={c.id}>
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-favela-green-500 ${
                    marcado ? 'border-favela-green-500 bg-favela-green-50' : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={marcado}
                    disabled={desabilitado || (cheio && !marcado)}
                    onChange={() => alternar(c.id)}
                    className="h-4 w-4 accent-favela-green-600"
                  />
                  <span className="min-w-0 truncate text-gray-900">{c.nome}</span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <p className={`mt-2 ${texto.apoio}`} aria-live="polite">
        {escolhidos.length === 0
          ? 'Ninguém marcado ainda.'
          : `Grupo: você e mais ${escolhidos.length} ${escolhidos.length === 1 ? 'colega' : 'colegas'}${cheio ? ' (grupo completo)' : ''}.`}
      </p>
    </fieldset>
  );
};

/** "*" nos campos obrigatórios; "(opcional)" nos outros */
const Obrigatorio: React.FC<{ sim: boolean }> = ({ sim }) =>
  sim ? (
    <>
      <span className="text-red-600" aria-hidden="true">
        *
      </span>
      <span className="sr-only">(obrigatório)</span>
    </>
  ) : (
    <span className="font-normal">(opcional)</span>
  );

/** Um item de "O que você precisa enviar" */
const Exigencia: React.FC<{ titulo: string; detalhe: string }> = ({ titulo, detalhe }) => (
  <li className="flex items-start gap-2 rounded-lg border border-favela-green-500/40 bg-favela-green-50 px-3 py-2">
    <span
      aria-hidden="true"
      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-favela-green-500 text-[11px] font-bold text-[#2d2a5f]"
    >
      ✓
    </span>
    <span className="min-w-0">
      <span className={`block ${texto.destaque}`}>{titulo}</span>
      <span className={`block break-words ${texto.apoio}`}>{detalhe}</span>
    </span>
  </li>
);

/** Indicador de envio em andamento (dentro do botão) */
const Girando: React.FC = () => (
  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.3" strokeWidth="4" />
    <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

export default JanelaDaAtividade;
