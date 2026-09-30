-- Atividade com o enunciado completo fora do portal (ex.: GitBook) e prazo opcional.
--
-- link_enunciado: o aluno lê a atividade completa nesse link e entrega no portal.
-- Opcional (as atividades antigas não têm). Só https, como materiais.url e
-- tentativas.link: evita javascript: e afins, porque o link vira href na tela.
--
-- prazo nulo = sem prazo: a atividade não encerra e o 1º envio fica aberto.
-- As funções que conferem o prazo já tratam o nulo como "aberto" (comparação com
-- nulo dá nulo, e o "if" não barra), então nenhuma função muda:
-- - private.atividades_carimbar (20260925110000): "new.prazo <= now()" só barra com prazo;
-- - private.tentativas_ao_enviar (20260927101000): "now() > v_ativ.prazo" idem;
-- - public.reservar_arquivo (20260927100000): "now() > v_prazo" idem.
-- supabase/testes/rls_atividades.sql prova esse comportamento.

alter table public.atividades alter column prazo drop not null;

alter table public.atividades
  add column link_enunciado text
    check (length(link_enunciado) <= 2000 and link_enunciado ~* '^https://[^[:space:]]+$');

grant insert (link_enunciado), update (link_enunciado) on public.atividades to authenticated;
