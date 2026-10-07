/**
 * ============================================
 * GRUPOS DA ATIVIDADE (CONTAS DA TELA DE MONTAR GRUPOS)
 * ============================================
 *
 * Atividade em grupo tem mínimo e máximo de integrantes (2 e 2 = dupla, 3 e 3 = trio).
 * Aqui ficam só as contas sobre a distribuição: sortear a turma em grupos e dizer se
 * um grupo está dentro do tamanho. Quem grava e confere de novo é o banco
 * (migration 20261001128000_atividades_em_grupo.sql).
 * O serviço lê os grupos de uma atividade e grava a distribuição inteira de uma vez.
 */
import { codigoDoErro, mensagemDaRegraDoBanco } from './banco';
import { supabase } from './supabase';

/** Grupo na tela de montar grupos (a chave é só da tela; o banco dá o id ao gravar) */
export interface GrupoEmEdicao {
  chave: string;
  integrantes: number[];
  /** Grupo que já entregou fica travado: a distribuição não mexe nele */
  entregou: boolean;
}

export type TamanhoDoGrupo = 'certo' | 'abaixo' | 'acima';

/** O grupo está dentro do mínimo e do máximo? */
export const tamanhoDoGrupo = (integrantes: number, minimo: number, maximo: number): TamanhoDoGrupo =>
  integrantes < minimo ? 'abaixo' : integrantes > maximo ? 'acima' : 'certo';

/** Cópia da lista em ordem aleatória (Fisher-Yates); o sorteador entra por parâmetro para o teste */
export function embaralhar<T>(lista: T[], aleatorio: () => number = Math.random): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [copia[i], copia[j]] = [copia[j]!, copia[i]!];
  }
  return copia;
}

/**
 * Sorteia os alunos em grupos de `minimo` a `maximo` integrantes, do tamanho mais
 * parecido possível (31 alunos em grupos de 2 a 3: 11 grupos, 9 de 3 e 2 de 2).
 * Quando a conta não fecha (5 alunos em duplas), os grupos ficam cheios e quem sobra
 * volta em `semGrupo`, para o professor decidir.
 */
export function sortearGrupos(
  alunos: number[],
  minimo: number,
  maximo: number,
  aleatorio: () => number = Math.random,
): { grupos: number[][]; semGrupo: number[] } {
  const sorteados = embaralhar(alunos, aleatorio);
  // O menor número de grupos em que todos cabem sem passar do máximo
  let quantidade = Math.ceil(sorteados.length / maximo);
  let distribuidos = sorteados.length;
  if (quantidade * minimo > sorteados.length) {
    // Não fecha: grupos cheios, e a sobra fica sem grupo
    quantidade = Math.floor(sorteados.length / minimo);
    distribuidos = Math.min(sorteados.length, quantidade * maximo);
  }
  const grupos: number[][] = Array.from({ length: quantidade }, () => []);
  // Um por vez em cada grupo: os tamanhos diferem no máximo em 1
  sorteados.slice(0, distribuidos).forEach((aluno, i) => grupos[i % quantidade]!.push(aluno));
  return { grupos, semGrupo: sorteados.slice(distribuidos) };
}

export class ServicoGrupos {
  /** Grupos da atividade, do mais antigo ao mais novo, com quem está em cada um */
  async carregar(atividadeId: number): Promise<GrupoEmEdicao[]> {
    const { data, error } = await supabase
      .from('grupos_da_atividade')
      .select('id, integrantes:integrantes_do_grupo(participante_id), tentativas(id)')
      .eq('atividade_id', atividadeId)
      .order('id');
    if (error) throw error;
    return data.map((g) => ({
      chave: String(g.id),
      integrantes: g.integrantes.map((i) => i.participante_id),
      entregou: g.tentativas.length > 0,
    }));
  }

  /**
   * Grava a distribuição (só os grupos que ainda não entregaram: os outros o banco mantém).
   * Devolve null se gravou, ou o texto do erro.
   */
  async definir(atividadeId: number, grupos: number[][]): Promise<string | null> {
    const { error } = await supabase.rpc('definir_grupos', { p_atividade: atividadeId, p_grupos: grupos });
    if (!error) return null;
    console.error('[grupos] falha ao gravar os grupos', codigoDoErro(error));
    return mensagemDaRegraDoBanco(error, 'Não foi possível salvar os grupos.');
  }
}

export const servicoGrupos = new ServicoGrupos();
