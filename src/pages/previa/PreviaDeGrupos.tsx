/**
 * ============================================
 * PRÉVIA · MONTAR GRUPOS (só no modo de desenvolvimento)
 * ============================================
 *
 * Mostra a tela de montar grupos com uma turma fictícia, sem login e sem banco:
 * serve para ver e clicar na distribuição sem entrar no dashboard. Também abre o
 * formulário de atividade (com trilhas de exemplo), para conferir o layout.
 * Nada aqui é gravado. A rota só existe em `npm run dev` (ver src/App.tsx).
 */
import { useState } from 'react';

import Janela from '../../components/admin/Janela';
import { Botao, Cartao, classeCampo, classeRotulo } from '../../components/admin/Ui';
import { FormularioDeAtividade } from '../../components/atividades/FormulariosDaEquipe';
import { estado, superficie, texto } from '../../components/admin/designSystem';
import MontarGrupos from '../../components/trilhas/MontarGrupos';
import { servicoCache } from '../../lib/cache';
import type { GrupoEmEdicao } from '../../lib/grupos';
import { CHAVE_MATERIAL } from '../../lib/material';

const NOMES = [
  'Ana Souza',
  'Bruno Lima',
  'Carla Dias',
  'Diego Alves',
  'Elisa Rocha',
  'Felipe Castro',
  'Gabi Martins',
  'Heitor Nunes',
  'Iara Pinto',
  'João Reis',
  'Kelly Moura',
  'Lucas Prado',
  'Marina Teles',
  'Nando Braga',
  'Olívia Cruz',
  'Paulo Sena',
  'Quésia Melo',
  'Rafa Barros',
  'Sara Viana',
  'Tiago Lopes',
  'Úrsula Paz',
  'Vitor Hugo',
  'Wanda Leal',
  'Xande Freire',
  'Yasmin Couto',
  'Zeca Nunes',
  'Alice Porto',
  'Beto Farias',
  'Cíntia Luz',
  'Davi Rangel',
  'Érica Tavares',
];
// Trilhas de exemplo para o formulário (a busca de verdade pede login)
void servicoCache.buscar(CHAVE_MATERIAL, async () =>
  ['HTML', 'CSS', 'JavaScript'].map((nome, i) => ({ id: i + 1, nome, descricao: null, ordem: i, materiais: [] })),
);

const TURMA = NOMES.map((nome, i) => ({ id: i + 1, nome }));
// Um grupo que "já entregou", para ver como ele fica travado
const GRUPO_ENTREGUE: GrupoEmEdicao = { chave: 'entregue', integrantes: [1, 2, 3], entregou: true };

const PreviaDeGrupos: React.FC = () => {
  const [alunos, setAlunos] = useState(31);
  const [minimo, setMinimo] = useState(2);
  const [maximo, setMaximo] = useState(3);
  const [comEntrega, setComEntrega] = useState(false);
  const [gravado, setGravado] = useState<number[][] | null>(null);
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [gruposAbertos, setGruposAbertos] = useState(false);

  const numero = (valor: string, piso: number, teto: number) => Math.min(teto, Math.max(piso, Number(valor) || piso));

  return (
    <div className={`min-h-screen ${superficie.pagina} p-4 sm:p-6`}>
      <div className="mx-auto max-w-5xl space-y-6">
        <p role="note" className={`rounded-lg border p-3 text-sm ${estado.atencao}`}>
          Prévia com turma fictícia. Nada é gravado e esta página só existe no modo de desenvolvimento.
        </p>

        <Cartao titulo="Formulário de atividade" descricao="O mesmo formulário do dashboard, sem gravar">
          <Botao onClick={() => setFormularioAberto(true)}>Abrir o formulário</Botao>
        </Cartao>
        <Janela titulo="Nova atividade" aberta={formularioAberto} onFechar={() => setFormularioAberto(false)} ampla>
          <FormularioDeAtividade turmaId={0} atividade={null} aoSalvar={async () => setFormularioAberto(false)} />
        </Janela>

        <Cartao titulo="Configuração da prévia" descricao="Mude os valores para ver a tela em outras situações">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label htmlFor="previa-alunos" className={classeRotulo}>
                Alunos na turma
              </label>
              <input
                id="previa-alunos"
                type="number"
                min={1}
                max={TURMA.length}
                value={alunos}
                className={classeCampo}
                onChange={(e) => setAlunos(numero(e.target.value, 1, TURMA.length))}
              />
            </div>
            <div>
              <label htmlFor="previa-minimo" className={classeRotulo}>
                Mínimo por grupo
              </label>
              <input
                id="previa-minimo"
                type="number"
                min={1}
                max={maximo}
                value={minimo}
                className={classeCampo}
                onChange={(e) => setMinimo(numero(e.target.value, 1, maximo))}
              />
            </div>
            <div>
              <label htmlFor="previa-maximo" className={classeRotulo}>
                Máximo por grupo
              </label>
              <input
                id="previa-maximo"
                type="number"
                min={minimo}
                max={50}
                value={maximo}
                className={classeCampo}
                onChange={(e) => setMaximo(numero(e.target.value, minimo, 50))}
              />
            </div>
            <label className={`flex items-end gap-2 pb-2 ${texto.corpo}`}>
              <input
                type="checkbox"
                checked={comEntrega}
                className="h-4 w-4 rounded border-gray-300 text-favela-green-600 focus:ring-favela-green-500"
                onChange={(e) => setComEntrega(e.target.checked)}
              />
              Um grupo já entregou
            </label>
          </div>
        </Cartao>

        <Cartao titulo="Montar grupos" descricao="A mesma janela do dashboard, com a turma de exemplo">
          <Botao onClick={() => setGruposAbertos(true)}>Abrir Montar grupos</Botao>
        </Cartao>
        <Janela
          titulo="Montar grupos · Desafio final de HTML"
          subtitulo="Turma 1 · Edição 4 (2027)"
          aberta={gruposAbertos}
          onFechar={() => setGruposAbertos(false)}
          ampla
          focoInicial="fechar"
        >
          {/* A chave recomeça a tela quando a configuração muda */}
          <MontarGrupos
            key={`${alunos}-${minimo}-${maximo}-${comEntrega}`}
            alunos={TURMA.slice(0, alunos)}
            minimo={minimo}
            maximo={maximo}
            gruposIniciais={comEntrega ? [GRUPO_ENTREGUE] : []}
            aoSalvar={async (grupos) => {
              setGravado(grupos);
              return null;
            }}
          />
        </Janela>

        {gravado && (
          <Cartao
            titulo="O que seria gravado"
            descricao="Os grupos que ainda não entregaram, com o número de cada aluno"
          >
            <pre className="overflow-x-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-700">
              {JSON.stringify(gravado)}
            </pre>
          </Cartao>
        )}
      </div>
    </div>
  );
};

export default PreviaDeGrupos;
