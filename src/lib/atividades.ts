/**
 * ============================================
 * ATIVIDADES (CRIAÇÃO E CORREÇÃO)
 * ============================================
 *
 * - Professor da turma e gestor criam a atividade (turma, trilha e o link do enunciado
 *   no GitBook; o prazo é opcional: sem prazo, a entrega fica aberta).
 * - O aluno entrega com link, texto e/ou arquivo (ver lib/entregas.ts).
 * - O professor responde com feedback, nota (0 a 100) e "Concluída" ou "Refazer";
 *   no "Refazer" o aluno envia de novo (2ª tentativa...).
 *
 * As regras (quem vê, quem envia, prazo, numeração, quem avaliou) ficam no banco:
 * migration 20260925110000_atividades.sql. Aqui só se lê, grava e resume.
 */
import { CODIGO_REGRA_DO_BANCO, codigoDoErro, mensagemDaRegraDoBanco } from './banco';
import type { RegrasDeEntrega } from './entregas';
import { servicoSessao } from './sessao';
import { supabase } from './supabase';
import { servicoTurmas, type TurmaComEdicao } from './turmas';
import { linkValido } from '../utils/texto';

export type StatusTentativa = 'aguardando' | 'concluida' | 'refazer';

export interface Tentativa {
  id: number;
  participante_id: number;
  numero: number;
  comentario: string | null;
  link: string | null;
  /** Arquivo antigo, no Storage do Supabase */
  arquivo_caminho: string | null;
  arquivo_nome: string | null;
  /** Arquivo no Google Drive (o nome para o download vem junto) */
  arquivo_id: string | null;
  arquivo: { nome: string } | null;
  enviada_em: string;
  status: StatusTentativa;
  feedback: string | null;
  nota: number | null;
  avaliada_em: string | null;
  avaliada_por_nome: string | null;
}

export type QuemMontaOsGrupos = 'professor' | 'alunos';

/** Tamanho do grupo (individual é 1 e 1; dupla, 2 e 2) e quem distribui os alunos */
export interface FormatoDaAtividade {
  grupo_min: number;
  grupo_max: number;
  /** Só vale em atividade em grupo */
  grupos_montados_por: QuemMontaOsGrupos;
}

export const FORMATO_INDIVIDUAL: FormatoDaAtividade = { grupo_min: 1, grupo_max: 1, grupos_montados_por: 'professor' };
/** O banco tem o mesmo teto */
export const MAXIMO_POR_GRUPO = 50;

export const emGrupo = (formato: FormatoDaAtividade) => formato.grupo_max > 1;

/** "Individual", "Em dupla", "Em trio", "Em grupo de 4" ou "Em grupo de 2 a 4" */
export function rotuloDoFormato({ grupo_min: minimo, grupo_max: maximo }: FormatoDaAtividade): string {
  if (maximo <= 1) return 'Individual';
  if (minimo === 2 && maximo === 2) return 'Em dupla';
  if (minimo === 3 && maximo === 3) return 'Em trio';
  return minimo === maximo ? `Em grupo de ${maximo}` : `Em grupo de ${minimo} a ${maximo}`;
}

export interface Atividade extends RegrasDeEntrega, FormatoDaAtividade {
  id: number;
  turma_id: number;
  trilha_id: number;
  titulo: string;
  /** Texto guardado no portal (atividades antigas e resumo); as novas só têm o link */
  enunciado: string | null;
  /** Enunciado no GitBook; null só nas atividades antigas, escritas no portal */
  link_enunciado: string | null;
  /** null = sem prazo: a atividade não encerra */
  prazo: string | null;
  trilha: { nome: string; ordem: number } | null;
  tentativas: Tentativa[];
}

export interface AlunoDaTurma {
  id: number;
  nome: string;
}

export interface AtividadesDaTurma {
  alunos: AlunoDaTurma[];
  atividades: Atividade[];
}

export interface AtividadesDoAluno {
  participanteId: number | null;
  /**
   * Reserva do "Ver como aluno": hoje a conta vira o aluno da turma de
   * demonstração; este modo só vale se a demonstração não existir.
   * "Ver como aluno" (conta que alterna papéis, sem aluno ligado): recebe as
   * atividades e a lista de turmas; a tela mostra uma turma como o aluno vê, e o
   * envio não é gravado.
   */
  visualizacao: boolean;
  turmas: TurmaComEdicao[];
  atividades: Atividade[];
}

export interface DadosDaAtividade extends RegrasDeEntrega, FormatoDaAtividade {
  trilha_id: number;
  titulo: string;
  link_enunciado: string;
  /** ISO; null = sem prazo */
  prazo: string | null;
}

const COLUNAS_TENTATIVA =
  'id, participante_id, numero, comentario, link, arquivo_caminho, arquivo_nome, arquivo_id, arquivo:arquivos_entrega(nome), enviada_em, status, feedback, nota, avaliada_em, avaliada_por_nome';
const COLUNAS_ATIVIDADE = `id, turma_id, trilha_id, titulo, enunciado, link_enunciado, prazo, exige_texto, exige_link, tipo_link, exige_arquivo, formatos, grupo_min, grupo_max, grupos_montados_por, trilha:trilhas(nome, ordem), tentativas(${COLUNAS_TENTATIVA})`;

/** Chaves do cache (ver lib/cache.ts) */
export const CHAVE_ATIVIDADES_ALUNO = 'atividades:aluno';
export const chaveAtividadesDaTurma = (turmaId: number) => `atividades:turma:${turmaId}`;

// ============================================
// SITUAÇÃO E RESUMO (contas sobre os dados já carregados)
// ============================================
export type Situacao = 'pendente' | 'aguardando' | 'refazer' | 'concluida' | 'encerrada';

export const ROTULO_SITUACAO: Record<Situacao, string> = {
  pendente: 'Pendente',
  aguardando: 'Aguardando correção',
  refazer: 'Refazer',
  concluida: 'Concluída',
  encerrada: 'Prazo encerrado',
};

/** O prazo da atividade já passou? (sem prazo, nunca) */
const prazoEncerrado = (prazo: string | null) => prazo !== null && new Date(prazo) < new Date();

/** Tentativas de um aluno numa atividade, da 1ª à última */
export const tentativasDe = (atividade: Atividade, participanteId: number) =>
  atividade.tentativas.filter((t) => t.participante_id === participanteId);

export function situacaoDoAluno(tentativas: Tentativa[], prazo: string | null): Situacao {
  const ultima = tentativas[tentativas.length - 1];
  if (!ultima) return prazoEncerrado(prazo) ? 'encerrada' : 'pendente';
  return ultima.status;
}

/** O aluno ainda pode enviar? (1º envio até o prazo, ou sempre se não houver; depois de "Refazer", sempre) */
export const podeEnviar = (situacao: Situacao) => situacao === 'pendente' || situacao === 'refazer';

/** Resumo da atividade só com quem está na turma: entregas para corrigir, quem entregou e o prazo */
export function resumoNaTurma(atividade: Atividade, idsDosAlunos: Set<number>) {
  const daTurma = atividade.tentativas.filter((t) => idsDosAlunos.has(t.participante_id));
  return {
    aguardando: daTurma.filter((t) => t.status === 'aguardando').length,
    entregaram: new Set(daTurma.map((t) => t.participante_id)).size,
    encerrada: prazoEncerrado(atividade.prazo),
  };
}

/** Entregas esperando correção num conjunto de atividades (só de quem está na turma) */
export const paraCorrigir = (atividades: Atividade[], idsDosAlunos: Set<number>) =>
  atividades.reduce((total, a) => total + resumoNaTurma(a, idsDosAlunos).aguardando, 0);

/** Por prazo (as sem prazo no fim); no empate, pela ordem de criação (id) */
export function arrumar(atividades: Atividade[]): Atividade[] {
  const porPrazo = (a: Atividade, b: Atividade) =>
    a.prazo === b.prazo ? 0 : a.prazo === null ? 1 : b.prazo === null ? -1 : a.prazo.localeCompare(b.prazo);
  return atividades
    .map((a) => ({ ...a, tentativas: [...a.tentativas].sort((x, y) => x.numero - y.numero) }))
    .sort((a, b) => porPrazo(a, b) || a.id - b.id);
}

export class ServicoAtividades {
  /**
   * Aluno: atividades da turma dele, com as tentativas dele (o banco só devolve as dele).
   * Visualização ("ver como aluno"): atividades de todas as turmas e a lista de turmas.
   */
  async carregarDoAluno(): Promise<AtividadesDoAluno> {
    const { perfil } = await servicoSessao.exigirContaLogada();

    const visualizacao = !perfil.participanteId && perfil.podeAlternarPapel;
    if (!perfil.participanteId && !visualizacao) {
      return { participanteId: null, visualizacao: false, turmas: [], atividades: [] };
    }

    const [atividades, turmas] = await Promise.all([
      supabase.from('atividades').select(COLUNAS_ATIVIDADE),
      visualizacao ? servicoTurmas.carregarComEdicao() : Promise.resolve([]),
    ]);
    if (atividades.error) throw atividades.error;
    return {
      participanteId: perfil.participanteId,
      visualizacao,
      turmas,
      atividades: arrumar(atividades.data as unknown as Atividade[]),
    };
  }

  async carregarDaTurma(turmaId: number): Promise<AtividadesDaTurma> {
    const [alunos, atividades] = await Promise.all([
      supabase.from('participantes').select('id, nome').eq('turma_id', turmaId).eq('funcao', 'aluno').order('nome'),
      supabase.from('atividades').select(COLUNAS_ATIVIDADE).eq('turma_id', turmaId),
    ]);
    if (alunos.error) throw alunos.error;
    if (atividades.error) throw atividades.error;
    return { alunos: alunos.data, atividades: arrumar(atividades.data as unknown as Atividade[]) };
  }

  /** Cria (com turma) ou edita (com id). Devolve o id da atividade, ou o texto da falha. */
  async salvar(
    dados: DadosDaAtividade,
    alvo: { turmaId: number } | { id: number },
  ): Promise<{ id: number } | { falha: string }> {
    const link = dados.link_enunciado.trim();
    if (!link) return { falha: 'Informe o link do enunciado no GitBook.' };
    if (!linkValido(link)) return { falha: 'O link do enunciado precisa começar com https://' };
    const { grupo_min: minimo, grupo_max: maximo } = dados;
    if (!Number.isInteger(minimo) || !Number.isInteger(maximo) || minimo < 1 || maximo < minimo) {
      return {
        falha: 'Confira o tamanho do grupo: o mínimo é pelo menos 1 e o máximo não pode ser menor que o mínimo.',
      };
    }
    if (maximo > MAXIMO_POR_GRUPO) return { falha: `O grupo pode ter até ${MAXIMO_POR_GRUPO} integrantes.` };
    const campos = {
      ...dados,
      titulo: dados.titulo.trim(),
      link_enunciado: link,
    };
    const { data, error } =
      'id' in alvo
        ? await supabase.from('atividades').update(campos).eq('id', alvo.id).select('id').maybeSingle()
        : await supabase
            .from('atividades')
            .insert({ ...campos, turma_id: alvo.turmaId })
            .select('id')
            .maybeSingle();
    if (!error) {
      // Sem linha de volta: o banco não deixou esta conta gravar (a regra de acesso filtra em silêncio)
      return data ? { id: data.id } : { falha: 'Você não pode alterar esta atividade.' };
    }
    console.error('[atividades] falha ao salvar a atividade', error.code);
    // Prazo no passado ou formato trocado depois das entregas: o banco diz qual foi
    if (error.code === CODIGO_REGRA_DO_BANCO)
      return { falha: mensagemDaRegraDoBanco(error, 'O prazo precisa ser depois de agora.') };
    if (error.code === '23514')
      return { falha: 'Confira os campos: título até 120 letras e link do enunciado preenchido.' };
    return { falha: 'Não foi possível salvar a atividade.' };
  }

  /** Só apaga atividade sem entregas (o banco confere). Devolve null se apagou. */
  async apagar(id: number): Promise<string | null> {
    const { data, error } = await supabase.from('atividades').delete().eq('id', id).select('id');
    if (error) {
      console.error('[atividades] falha ao apagar', error.code);
      return 'Não foi possível apagar a atividade.';
    }
    return data.length ? null : 'Esta atividade já tem entregas e não pode ser apagada.';
  }

  /**
   * Responde a última tentativa do aluno, com a nota como foi digitada ("" = sem nota).
   * Devolve null se deu certo, ou o texto do erro.
   */
  async avaliar(
    tentativaId: number,
    avaliacao: { status: 'concluida' | 'refazer'; feedback: string; notaDigitada: string },
  ): Promise<string | null> {
    const nota = avaliacao.notaDigitada.trim() === '' ? null : Number(avaliacao.notaDigitada);
    if (nota !== null && (!Number.isInteger(nota) || nota < 0 || nota > 100)) {
      return 'A nota vai de 0 a 100, sem vírgula.';
    }
    if (!avaliacao.feedback.trim()) return 'Escreva o feedback para o aluno.';
    if (avaliacao.status === 'concluida' && nota === null) return 'Dê a nota (0 a 100) para concluir.';
    const { data, error } = await supabase
      .from('tentativas')
      .update({ status: avaliacao.status, feedback: avaliacao.feedback.trim(), nota })
      .eq('id', tentativaId)
      .select('id');
    if (error) {
      console.error('[atividades] falha ao avaliar', codigoDoErro(error));
      return mensagemDaRegraDoBanco(error, 'Não foi possível salvar a correção.');
    }
    return data.length ? null : 'Você não pode corrigir esta entrega.';
  }
}

export const servicoAtividades = new ServicoAtividades();
