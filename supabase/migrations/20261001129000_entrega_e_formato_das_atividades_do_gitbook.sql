-- O que cada atividade do GitBook pede na entrega e quais são em grupo, nas atividades
-- criadas pela 20261001127000 nas turmas da Edição 4 (2027). Elas nasceram sem nenhuma
-- exigência marcada; aqui cada uma recebe o que a página dela diz em "Como entregar":
-- - "Código no GitHub (link do repositório)": link obrigatório, do GitHub;
-- - "Link do site publicado": link obrigatório, de qualquer site;
-- - Word, Excel ou PowerPoint: arquivo obrigatório, formato Office (o portal não separa os três).
-- Em grupo (31 das 144): as duas que o GitBook já pede em grupo e as que a coordenação
-- escolheu para estimular trabalho em equipe, liderança e comunicação:
-- - dupla (15, de 2 a 3 alunos): os alunos escolhem o colega;
-- - trio (9, de 3 a 4) e grupo (7, de 3 a 5): o professor monta, para misturar a turma.
-- Dupla e trio aceitam um a mais: em turma de tamanho ímpar ninguém fica sem grupo, e
-- depois da primeira entrega o tamanho não pode mais mudar.
-- O enunciado dessas páginas no GitBook ainda precisa dizer o formato (issue #39).
-- Só mexe na atividade criada por migration (sem autor), das duas turmas da Edição 4,
-- que ainda está como nasceu (nenhuma exigência marcada, individual) e sem entrega: o
-- que o professor publicou, configurou ou já recebeu fica como está.
-- Pode rodar mais de uma vez: a atividade já preenchida não está mais "como nasceu".

create temporary table entregas_do_gitbook (
  url text, exige_link boolean, tipo_link text, exige_arquivo boolean, formatos text[],
  grupo_min smallint, grupo_max smallint, grupos_montados_por text
);

insert into entregas_do_gitbook values
  ('https://favelaware.gitbook.io/favelaware/1-carreira-tech/atividades/atividade-1-profissoes-da-area-de-ti', false, 'qualquer', true, '{office}', 3, 4, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/1-carreira-tech/atividades/atividade-2-cursos-e-caminhos-de-formacao', false, 'qualquer', true, '{office}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/1-carreira-tech/atividades/atividade-3-meu-primeiro-curriculo', false, 'qualquer', true, '{office}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/1-carreira-tech/atividades/atividade-4-apresentacao-pessoal-pitch', false, 'qualquer', true, '{office}', 2, 3, 'alunos'),
  ('https://favelaware.gitbook.io/favelaware/2-inclusao-digital/atividades/atividade-1-dispositivos-de-entrada-e-saida', false, 'qualquer', true, '{office}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/2-inclusao-digital/atividades/atividade-2-hardware-e-software', false, 'qualquer', true, '{office}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/2-inclusao-digital/atividades/atividade-3-explorando-o-computador', false, 'qualquer', true, '{office}', 2, 3, 'alunos'),
  ('https://favelaware.gitbook.io/favelaware/2-inclusao-digital/atividades/atividade-4-tipos-de-software-e-sistemas-operacionais', false, 'qualquer', true, '{office}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/3-midias-digitais/atividades/atividade-1-e-mail-profissional', false, 'qualquer', true, '{office}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/3-midias-digitais/atividades/atividade-2-organizando-arquivos-na-nuvem-google-drive', false, 'qualquer', true, '{office}', 2, 3, 'alunos'),
  ('https://favelaware.gitbook.io/favelaware/3-midias-digitais/atividades/atividade-3-documento-bem-formatado-google-docs', false, 'qualquer', true, '{office}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/3-midias-digitais/atividades/atividade-4-pesquisa-e-fontes-confiaveis', false, 'qualquer', true, '{office}', 3, 4, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/4-pensamento-logico/atividades/atividade-1-pensamento-logico-no-dia-a-dia', false, 'qualquer', true, '{office}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/4-pensamento-logico/atividades/atividade-2-jogos-de-logica', false, 'qualquer', true, '{office}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/4-pensamento-logico/atividades/atividade-3-quebra-cabeca-em-dupla', false, 'qualquer', true, '{office}', 2, 3, 'alunos'),
  ('https://favelaware.gitbook.io/favelaware/4-pensamento-logico/atividades/atividade-4-questoes-de-logica', false, 'qualquer', true, '{office}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/4-pensamento-logico/atividades/atividade-5-questoes-de-logica-aquecimento', false, 'qualquer', true, '{office}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/4-pensamento-logico/atividades/atividade-6-dinamicas-em-grupo', false, 'qualquer', true, '{office}', 3, 5, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/4-pensamento-logico/atividades/atividade-7-raciocinio-logico-e-ilogico', false, 'qualquer', true, '{office}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/4-pensamento-logico/atividades/atividade-8-compute-it', false, 'qualquer', true, '{office}', 2, 3, 'alunos'),
  ('https://favelaware.gitbook.io/favelaware/4-pensamento-logico/atividades/atividade-9-little-dot-adventure', false, 'qualquer', true, '{office}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/4-pensamento-logico/atividades/atividade-10-primeiros-passos-com-hedy', false, 'qualquer', true, '{office}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/5-git-e-github/atividades/atividade-1-historia-do-git-e-controle-de-versao', false, 'qualquer', true, '{office}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/5-git-e-github/atividades/atividade-2-instalando-e-configurando-o-git', false, 'qualquer', true, '{office}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/5-git-e-github/atividades/atividade-3-comandos-basicos-do-git', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/5-git-e-github/atividades/atividade-4-branches-e-merges', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/5-git-e-github/atividades/atividade-5-workflows-do-git', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/5-git-e-github/atividades/atividade-6-pull-request', true, 'github', false, '{}', 3, 4, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/5-git-e-github/atividades/atividade-7-readme-do-perfil-do-github', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/5-git-e-github/atividades/atividade-8-readme-de-um-projeto', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/5-git-e-github/atividades/atividade-9-lista-de-exercicios-de-git-e-github', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/5-git-e-github/atividades/atividade-10-projeto-final-diario-de-versionamento-em-equipe', true, 'github', false, '{}', 3, 5, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/6-html/atividades/atividade-1-etiquetando-o-panfleto-do-baile', false, 'qualquer', true, '{office}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/6-html/atividades/atividade-2-esqueleto-da-pagina-da-associacao-de-moradores', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/6-html/atividades/atividade-3-cabecalhos-paragrafos-e-formatacao', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/6-html/atividades/atividade-4-promocao-do-mercadinho-do-seu-ze', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/6-html/atividades/atividade-5-organizando-o-churrasco-da-laje', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/6-html/atividades/atividade-6-tabelas-da-copa-da-quebrada-e-do-cursinho', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/6-html/atividades/atividade-7-imagens', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/6-html/atividades/atividade-8-revisao-de-imagens-atributos-e-o-alt', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/6-html/atividades/atividade-9-conserte-a-pagina-do-vila-unida-fc', true, 'github', false, '{}', 2, 3, 'alunos'),
  ('https://favelaware.gitbook.io/favelaware/6-html/atividades/atividade-10-ficha-de-inscricao-da-copa-da-quebrada', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/6-html/atividades/atividade-11-recriando-a-pagina-do-brecho-da-dona-cida', true, 'github', false, '{}', 2, 3, 'alunos'),
  ('https://favelaware.gitbook.io/favelaware/6-html/atividades/atividade-12-desafio-final-minha-pagina-pessoal', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/7-css/atividades/atividade-1-conserte-o-css-da-barbearia', true, 'github', false, '{}', 2, 3, 'alunos'),
  ('https://favelaware.gitbook.io/favelaware/7-css/atividades/atividade-2-cardapio-da-pastelaria-em-tres-versoes', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/7-css/atividades/atividade-3-cartaz-do-sarau-da-quebrada', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/7-css/atividades/atividade-4-inscricao-da-copa-da-quebrada-sem-mexer-no-html', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/7-css/atividades/atividade-5-qual-regra-vence-briga-de-seletores', false, 'qualquer', true, '{office}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/7-css/atividades/atividade-6-uniforme-do-time-da-varzea', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/7-css/atividades/atividade-7-lista-de-compras-do-mercadinho-interativa', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/7-css/atividades/atividade-8-detetive-de-combinadores-e-css-diner', false, 'qualquer', true, '{office}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/7-css/atividades/atividade-9-vitrine-do-brecho-a-caixa-que-nao-cabe', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/7-css/atividades/atividade-10-botoes-animados-da-radio-comunitaria', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/7-css/atividades/atividade-11-cartao-de-perfil-do-artista-da-quebrada', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/7-css/atividades/atividade-12-preveja-o-flexbox-e-monte-o-menu-da-linha-de-onibus', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/7-css/atividades/atividade-13-sapos-e-cenouras-flexbox-froggy-e-grid-garden', false, 'qualquer', true, '{office}', 2, 3, 'alunos'),
  ('https://favelaware.gitbook.io/favelaware/7-css/atividades/atividade-14-cardapio-do-trailer-que-se-adapta-a-tela', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/7-css/atividades/atividade-15-site-da-associacao-de-moradores-responsivo', true, 'github', false, '{}', 3, 5, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/7-css/atividades/atividade-16-site-da-associacao-no-ar', true, 'qualquer', false, '{}', 3, 5, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/8-logica-de-programacao/atividades/atividade-1-tabela-verdade-da-quebrada', false, 'qualquer', true, '{office}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/8-logica-de-programacao/atividades/atividade-2-algoritmo-para-pegar-o-onibus-certo', false, 'qualquer', true, '{office}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/8-logica-de-programacao/atividades/atividade-3-rachando-a-conta-do-churrasco', false, 'qualquer', true, '{office}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/8-logica-de-programacao/atividades/atividade-4-variaveis-e-operadores-do-time-de-varzea', false, 'qualquer', true, '{office}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/8-logica-de-programacao/atividades/atividade-5-escolhendo-a-estrutura-certa', false, 'qualquer', true, '{office}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/8-logica-de-programacao/atividades/atividade-6-o-que-este-portugol-imprime', false, 'qualquer', true, '{office}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/8-logica-de-programacao/atividades/atividade-7-condicoes-em-portugol', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/8-logica-de-programacao/atividades/atividade-8-operadores-logicos-em-portugol', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/8-logica-de-programacao/atividades/atividade-9-catraca-inteligente-tarifa-do-onibus', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/8-logica-de-programacao/atividades/atividade-10-lacos-de-repeticao-em-portugol', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/8-logica-de-programacao/atividades/atividade-11-vetores-e-matrizes-notas-da-turma-e-tabela-do-campeonato', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/8-logica-de-programacao/atividades/atividade-12-conta-de-luz-em-partes-funcoes-em-portugol', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/8-logica-de-programacao/atividades/atividade-13-teste-de-mesa-o-cofrinho-e-a-sequencia-misteriosa', false, 'qualquer', true, '{office}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/8-logica-de-programacao/atividades/atividade-14-caca-aos-bugs-de-logica', true, 'github', false, '{}', 2, 3, 'alunos'),
  ('https://favelaware.gitbook.io/favelaware/8-logica-de-programacao/atividades/atividade-15-troco-com-o-menor-numero-de-pecas', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/8-logica-de-programacao/atividades/atividade-16-fluxograma-do-atendimento-no-posto-de-saude', false, 'qualquer', true, '{office}', 3, 4, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/8-logica-de-programacao/atividades/atividade-17-fluxograma', false, 'qualquer', true, '{office}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/8-logica-de-programacao/atividades/atividade-18-desafio-final-o-caixa-do-mercadinho', true, 'github', false, '{}', 3, 4, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/9-javascript/atividades/atividade-1-variaveis-tipos-e-boas-praticas', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/9-javascript/atividades/atividade-2-o-que-este-codigo-imprime', false, 'qualquer', true, '{office}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/9-javascript/atividades/atividade-3-praticando-operadores', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/9-javascript/atividades/atividade-4-caca-aos-bugs-dos-operadores', true, 'github', false, '{}', 2, 3, 'alunos'),
  ('https://favelaware.gitbook.io/favelaware/9-javascript/atividades/atividade-5-estruturas-condicionais', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/9-javascript/atividades/atividade-6-calculadora-da-tarifa-do-busao', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/9-javascript/atividades/atividade-7-arrays', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/9-javascript/atividades/atividade-8-carrinho-do-mercadinho-com-desconto', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/9-javascript/atividades/atividade-9-teste-de-mesa-a-vaquinha-do-churrasco', false, 'qualquer', true, '{office}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/9-javascript/atividades/atividade-10-estruturas-de-repeticao', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/9-javascript/atividades/atividade-11-boletim-da-turma-media-e-situacao', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/9-javascript/atividades/atividade-12-relatorio-de-vendas-da-feira', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/9-javascript/atividades/atividade-13-complete-as-funcoes-da-conta-de-luz', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/9-javascript/atividades/atividade-14-cadastro-seguro-senha-forte-nome-e-cpf', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/9-javascript/atividades/atividade-15-refatorando-o-delivery-da-lanchonete', true, 'github', false, '{}', 2, 3, 'alunos'),
  ('https://favelaware.gitbook.io/favelaware/9-javascript/atividades/atividade-16-funcoes', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/9-javascript/atividades/atividade-17-tabela-do-campeonato-da-quebrada', true, 'github', false, '{}', 3, 4, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/9-javascript/atividades/atividade-18-controle-de-estoque-do-mercadinho', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/9-javascript/atividades/atividade-19-classes-e-objetos', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/9-javascript/atividades/atividade-20-agenda-de-contatos-da-quebrada', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/9-javascript/atividades/atividade-21-caixa-eletronico-do-banco-da-quebrada', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/9-javascript/atividades/atividade-22-jogo-de-adivinhacao-com-recorde', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/10-javascript-para-web/atividades/atividade-1-desenhando-a-arvore-do-dom', false, 'qualquer', true, '{office}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/10-javascript-para-web/atividades/atividade-2-primeiro-script-no-dom-mensagem-atualizada', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/10-javascript-para-web/atividades/atividade-3-selecionar-e-alterar-elementos-a-escalacao-do-time', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/10-javascript-para-web/atividades/atividade-4-botao-que-muda-o-titulo', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/10-javascript-para-web/atividades/atividade-5-mural-de-avisos-criar-e-remover-itens-de-uma-lista', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/10-javascript-para-web/atividades/atividade-6-tema-claro-e-escuro-na-radio-comunitaria', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/10-javascript-para-web/atividades/atividade-7-lotacao-da-van-contador-de-cliques-com-limite', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/10-javascript-para-web/atividades/atividade-8-galeria-do-sarau-com-botoes-proximo-e-anterior', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/10-javascript-para-web/atividades/atividade-9-racha-da-pizza-calculadora-de-conta-dividida', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/10-javascript-para-web/atividades/atividade-10-inscricao-no-campeonato-validar-o-formulario-antes-de-enviar', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/10-javascript-para-web/atividades/atividade-11-guia-de-servicos-da-quebrada-filtro-de-busca', true, 'github', false, '{}', 3, 4, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/10-javascript-para-web/atividades/atividade-12-javascript-e-dom-na-pratica', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/10-javascript-para-web/atividades/atividade-13-quadro-de-tarefas-do-mutirao', true, 'github', false, '{}', 3, 5, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/10-javascript-para-web/atividades/atividade-14-desafio-final-jogo-da-velha-da-vila', true, 'github', false, '{}', 2, 3, 'alunos'),
  ('https://favelaware.gitbook.io/favelaware/11-apis/atividades/atividade-1-lendo-e-montando-json', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/11-apis/atividades/atividade-2-qual-status-a-api-devolve', false, 'qualquer', true, '{office}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/11-apis/atividades/atividade-3-consumindo-uma-api-get-parte-1', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/11-apis/atividades/atividade-4-quando-a-api-falha-erros-amigaveis', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/11-apis/atividades/atividade-5-pagina-de-frete-do-mercadinho-com-viacep', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/11-apis/atividades/atividade-6-consumindo-uma-api-get-parte-2', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/11-apis/atividades/atividade-7-inserindo-dados-post', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/11-apis/atividades/atividade-8-metodo-put', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/11-apis/atividades/atividade-9-metodo-patch', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/11-apis/atividades/atividade-10-metodo-delete', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/11-apis/atividades/atividade-11-token-no-header-401-403-e-jwt-na-pratica', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/11-apis/atividades/atividade-12-exercicios-extras-de-api', false, 'qualquer', true, '{office}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/11-apis/atividades/atividade-13-explorando-a-api-do-rick-and-morty-no-postman', false, 'qualquer', true, '{office}', 2, 3, 'alunos'),
  ('https://favelaware.gitbook.io/favelaware/11-apis/atividades/atividade-14-api-do-campeonato-da-quebrada', true, 'github', false, '{}', 3, 4, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/11-apis/atividades/atividade-15-mini-projeto-to-do-list-com-mvc', true, 'github', false, '{}', 3, 5, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/12-banco-de-dados/atividades/atividade-1-caca-ao-tesouro-de-dados', false, 'qualquer', true, '{office}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/12-banco-de-dados/atividades/atividade-2-gaveta-ou-caixa-relacional-ou-nao-relacional', false, 'qualquer', true, '{office}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/12-banco-de-dados/atividades/atividade-3-a-planilha-do-unidos-da-laje-fc', false, 'qualquer', true, '{office}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/12-banco-de-dados/atividades/atividade-4-biblioteca-comunitaria-do-caderno-as-tabelas', false, 'qualquer', true, '{office}', 3, 4, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/12-banco-de-dados/atividades/atividade-5-modelando-seu-mundo-chaves-primaria-e-estrangeira', false, 'qualquer', true, '{office}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/12-banco-de-dados/atividades/atividade-6-sumula-da-varzea-select-com-filtro-e-ordem', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/12-banco-de-dados/atividades/atividade-7-o-caderninho-do-fiado-insert-update-e-delete-com-cuidado', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/12-banco-de-dados/atividades/atividade-8-missao-sql-o-detetive-de-dados', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/12-banco-de-dados/atividades/atividade-9-quem-esta-com-o-livro-desafio-de-join', true, 'github', false, '{}', 2, 3, 'alunos'),
  ('https://favelaware.gitbook.io/favelaware/12-banco-de-dados/atividades/atividade-10-definindo-as-regras-do-jogo-constraints', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/12-banco-de-dados/atividades/atividade-11-cada-um-no-seu-prato-rls-na-pratica', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/12-banco-de-dados/atividades/atividade-12-o-cofre-da-marmitaria-buckets-e-politicas-no-storage', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/12-banco-de-dados/atividades/atividade-13-tunando-o-projeto-com-os-superpoderes-do-supabase', false, 'qualquer', true, '{office}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/12-banco-de-dados/atividades/atividade-14-seu-primeiro-robo-de-dados', true, 'github', false, '{}', 1, 1, 'professor'),
  ('https://favelaware.gitbook.io/favelaware/12-banco-de-dados/atividades/atividade-15-projeto-final-o-banco-do-campeonato-interquebradas', true, 'github', false, '{}', 3, 5, 'professor');

do $$
declare
  v_alteradas integer;
  v_turmas integer;
begin
  select count(*) into v_turmas
  from public.turmas tu
  join public.edicoes e on e.id = tu.edicao_id
  where e.nome = 'Edição 4 (2027)' and tu.nome in ('Turma 1', 'Turma 2');
  if v_turmas < 2 then
    raise warning 'Atividades do GitBook: achei % de 2 turmas da Edição 4 (2027)', v_turmas;
  end if;

  update public.atividades a
  set exige_link = v.exige_link,
      tipo_link = v.tipo_link,
      exige_arquivo = v.exige_arquivo,
      formatos = v.formatos,
      grupo_min = v.grupo_min,
      grupo_max = v.grupo_max,
      grupos_montados_por = v.grupos_montados_por
  from entregas_do_gitbook v, public.turmas tu, public.edicoes e
  where a.link_enunciado = v.url
    and tu.id = a.turma_id and e.id = tu.edicao_id
    and e.nome = 'Edição 4 (2027)' and tu.nome in ('Turma 1', 'Turma 2')
    and a.criada_por is null
    and not exists (select 1 from public.tentativas t where t.atividade_id = a.id)
    -- Ainda como nasceu: ninguém configurou a entrega nem o formato pela tela
    and not a.exige_texto and not a.exige_link and a.tipo_link = 'qualquer'
    and not a.exige_arquivo and a.formatos = '{}'
    and a.grupo_min = 1 and a.grupo_max = 1 and a.grupos_montados_por = 'professor';
  get diagnostics v_alteradas = row_count;
  raise notice 'Atividades do GitBook: % atividades com a entrega e o formato preenchidos', v_alteradas;
end $$;

drop table entregas_do_gitbook;
