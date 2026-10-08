-- Colaborador não monta nem ajusta os grupos das atividades. Mexer no grupo decide quem
-- vê a entrega, o feedback e a nota, e o colaborador não vê entregas nem notas dos alunos
-- (migration 20261001122000). Quem cuida dos grupos: o professor da turma e o gestor.
--
-- Muda só private.pode_gerir_atividade, usada por definir_grupos, incluir_no_grupo e
-- tirar_do_grupo (migration 20261001128000). A leitura dos grupos e a edição da
-- atividade pelo colaborador continuam como estão.
-- Pode rodar mais de uma vez.

create or replace function private.pode_gerir_atividade(p_atividade bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.atividades a
    where a.id = p_atividade and private.pode_fazer_chamada(a.turma_id)
  );
$$;

revoke execute on function private.pode_gerir_atividade(bigint) from public, anon;
grant execute on function private.pode_gerir_atividade(bigint) to authenticated;
