-- O enunciado da atividade mora no GitBook: o portal guarda o link (link_enunciado) e o
-- texto deixa de ser obrigatório. O formulário não pede mais o texto, só o link.
--
-- O texto que já existe continua guardado e aparece para o aluno (as atividades antigas,
-- escritas no portal, e o resumo curto das que vieram do GitBook). Nada é apagado.
-- Toda atividade precisa ter pelo menos um dos dois: o link ou o texto. As antigas têm o
-- texto; as novas, criadas pela tela, têm o link.
-- O check de tamanho do enunciado (1 a 10000) continua valendo quando há texto.
-- Pode rodar mais de uma vez.

alter table public.atividades alter column enunciado drop not null;

alter table public.atividades drop constraint if exists atividades_tem_enunciado;
alter table public.atividades add constraint atividades_tem_enunciado
  check (link_enunciado is not null or enunciado is not null);
