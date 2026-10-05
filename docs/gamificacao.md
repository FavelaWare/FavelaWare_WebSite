# Gamificação

Regras da gamificação do portal do FavelaWare. Este documento fecha a issue #15 e é a base da modelagem
(#16). Ele reúne as decisões da coordenação e as respostas aceitas nas discussions #40 a #44.

Quando a definição da coordenação e uma discussion divergem, vale a definição da coordenação. O único
caso hoje é o escopo do ranking: ele é por edição e geral, e não por turma (ver [Ranking](#ranking)).

## Visão geral

| Elemento                | Resumo                                                                              |
| ----------------------- | ----------------------------------------------------------------------------------- |
| Trilhas de conhecimento | Uma trilha por trilha do curso (Lógica de Programação, HTML...), do zero ao domínio |
| Pontos e níveis         | Ganhos por presença, entrega, nota, exercício, desafio e evento                     |
| FavelaCoin              | A moeda virtual do FavelaWare                                                       |
| Álbum do FavelaWare     | Pacotes de figurinhas (cartas) para colar no álbum, com venda entre alunos          |
| Badges                  | De conquista (evoluem por estágios) e sazonais                                      |
| Desafios                | Diários, mensais e anuais                                                           |
| Ranking                 | Por edição e geral, com todos os participantes do FavelaWare                        |
| Vida                    | Acertar não tira vida; errar tira                                                   |
| Painel de gestão        | Cadastro de desafios e edição das trilhas                                           |

## Trilhas de conhecimento

Cada trilha acompanha uma trilha do curso e leva o aluno do zero ao domínio do tema. Exemplos:

- **Lógica de Programação:** teste de mesa, atividades no Portugol e outros exercícios de lógica.
- **HTML:** do zero até o domínio completo da linguagem.

A trilha é uma sequência de atividades e exercícios. Concluir os passos gera pontos e conta para as
badges de domínio de tema e de trilha concluída. As trilhas são criadas e alteradas pelo painel de gestão.

## Pontos

Cada ponto é gravado como um lançamento com a origem, o que permite o histórico e os ajustes.

| Origem                                     | Pontos                                                            |
| ------------------------------------------ | ----------------------------------------------------------------- |
| Presença na aula                           | 10                                                                |
| Entrega no prazo                           | 20 + bônus pela nota (nota ÷ 10, até +10)                         |
| Entrega atrasada                           | 10 + bônus pela nota                                              |
| Entrega devolvida para Refazer e reenviada | ganha só a diferença quando for concluída, sem pontuar duas vezes |
| Quiz e exercício de programação            | o valor definido em cada exercício                                |
| Desafio diário, mensal ou anual            | o valor definido no cadastro do desafio                           |
| Evento (palestra, hackathon, visita)       | definido por evento pela coordenação                              |

Os valores de exercício, desafio e evento são definidos por quem gerencia o conteúdo (professores e
coordenação) no painel de gestão.

### Níveis

Os pontos somados definem o **nível** do aluno, em faixas que vão ficando maiores: por exemplo, 0 a 50 é
Novato, 50 a 125 é Aprendiz I, 125 a 225 é Aprendiz II, e assim por diante. Isso dá progresso rápido no
começo e um objetivo de longo prazo.

## FavelaCoin

**FavelaCoin** é a moeda virtual do FavelaWare. Ela é usada na compra e venda de figurinhas do álbum.

## Álbum do FavelaWare

- O aluno ganha **pacotes de figurinhas** (cartas) e cola as figurinhas no álbum do FavelaWare.
- As figurinhas podem ser **vendidas para outros alunos**.
- Quem tem figurinhas repetidas pode vendê-las para comprar as que faltam e completar o álbum.

## Badges

### Badges de conquista

As badges ficam agrupadas por categoria e **evoluem por estágios**. Cada badge tem degraus
(Bronze → Prata → Ouro → …) e sobe quando o aluno atinge o próximo marco. Assim, cada badge é única por
aluno, e a repetição aparece como evolução.

| Categoria        | Exemplo                    | Marcos (Bronze, Prata, Ouro)                 |
| ---------------- | -------------------------- | -------------------------------------------- |
| Primeiros passos | Primeira Entrega           | 1, 5, 10 entregas                            |
| Consistência     | Sequência de Presença      | 4, 8, 12 aulas seguidas                      |
| Desempenho       | Nota Máxima                | 1, 5, 10 entregas com 100                    |
| Domínio de tema  | Mestre HTML, Mestre Lógica | 10, 25, 50 exercícios do tema                |
| Trilhas          | Trilha Concluída           | 1, 3, 5 trilhas                              |
| Nível            | Subiu de Nível             | ao chegar a Aprendiz, Praticante, Estudioso… |
| Eventos          | Participou de evento       | 1, 3, 5 eventos                              |

Falta com atestado não quebra a sequência de presença (ver [Casos de borda](#casos-de-borda)). Quando o
aluno ganha uma badge ou sobe de estágio, aparece um aviso na hora, e as conquistadas ficam no perfil.

### Badges sazonais

Badges ligadas a um período ou data (uma edição, um evento, uma época do ano), disponíveis só enquanto
o período durar.

## Desafios

Há desafios **diários**, **mensais** e **anuais**. Cada desafio é cadastrado no painel de gestão, com o
período e o valor em pontos.

## Vida

O aluno tem uma barra de vida nos exercícios: **se acerta, não perde vida; se erra, perde vida.**

## Ranking

**Escopo:** ranking **por edição** e ranking **geral**, que reúne todos os participantes do FavelaWare.

**Quem aparece:** só alunos ativos. Professor, monitor e admin não pontuam e ficam de fora. Aluno
desativado sai da lista enquanto estiver inativo, mas não perde o saldo.

**Exposição de menores:** no ranking aparece o **nome de exibição** (apelido) que o próprio aluno
escolhe, nunca o nome completo. Se ele não escolher, aparece só o primeiro nome com a inicial do
sobrenome. Nada de foto, e-mail ou outro dado pessoal. O aluno ou o responsável pode pedir para ele
aparecer como "Anônimo", e ele continua pontuando normalmente.

**Quem vê o quê:**

- **Aluno:** vê o top 10 e a própria posição, mesmo fora do top 10. Não vê a pontuação detalhada dos
  colegas.
- **Professor e coordenação/admin:** veem o ranking completo.

**Desempate:** primeiro mais pontos; depois mais atividades concluídas com nota; por fim, quem chegou
primeiro à pontuação.

**Ranking público no site:** não existe. Ele fica só dentro do portal, para quem está logado.

## Ajuste e retirada de pontos

Ponto conquistado não é apagado nem editado. Se houver erro, por exemplo uma nota lançada errada ou uma
presença marcada para o aluno errado, a correção é **um novo lançamento de ajuste**, positivo ou
negativo, com motivo obrigatório. O lançamento original continua no histórico. O saldo do aluno é sempre
a soma dos lançamentos, então dá para refazer a conta a qualquer momento.

- **Professor:** corrige a nota da entrega, e o ponto da entrega acompanha. Fica registrado quem
  corrigiu, quando e o comentário.
- **Coordenação/admin:** é o único que faz ajuste manual avulso.
- **Aluno:** só vê o próprio histórico.

Todo ajuste manual entra também no log de auditoria, com quem fez, o que mudou, em qual registro e o
valor anterior.

Ponto concedido de forma retroativa, por exemplo ao criar uma regra nova, só é lançado para quem ainda
não recebeu aquela origem. Assim, rodar de novo não duplica.

## Casos de borda

- **Troca de turma:** o ponto é do aluno, não da turma, então ele leva o saldo inteiro. O histórico
  continua mostrando onde cada ponto foi ganho.
- **Falta com atestado:** não gera ponto de presença, porque o aluno não esteve lá. Mas também **não
  conta como falta** para nada que dependa de sequência ou frequência mínima, como a badge de
  assiduidade. O atestado funciona como um "escudo": protege a sequência sem dar ponto.
- **Atividade apagada depois de entregue:** atividade que já tem entrega não pode ser apagada, só
  arquivada. Se for apagada mesmo assim, o lançamento continua valendo, porque foi ganho, e só perde o
  vínculo com a atividade. O aluno não perde ponto por decisão de quem gerencia o conteúdo.
- **Aluno desativado:** sai do ranking enquanto estiver inativo, mas o saldo fica guardado e volta se ele
  for reativado.

## Painel de gestão

Um painel para:

- cadastrar novos desafios diários, mensais e anuais;
- criar e modificar as trilhas de conhecimento;
- definir o valor em pontos de exercícios, desafios e eventos.

## Pontos em aberto

Ficam para a modelagem (#16) ou para nova decisão da coordenação:

- Relação entre pontos e FavelaCoin: se são o mesmo saldo ou saldos separados (gastar FavelaCoin não
  deveria baixar o nível nem a posição no ranking).
- Como o aluno ganha pacotes de figurinhas, quantas figurinhas vêm por pacote e quantas existem no álbum.
- Preço das figurinhas na venda entre alunos: livre ou com limite.
- Vida: quantas vidas o aluno tem, quanto cada erro tira, como recupera e o que acontece ao zerar.
- Quais badges sazonais existem e em quais períodos.
- Quem pode usar o painel de gestão: só coordenação ou também professores.
