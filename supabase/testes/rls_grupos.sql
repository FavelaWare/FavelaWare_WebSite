-- Teste das atividades em grupo (migration 20261001128000_atividades_em_grupo.sql).
-- Termina com um erro proposital que carrega o relatório e desfaz tudo.
--
--   npx supabase db query --linked -f supabase/testes/rls_grupos.sql
--
-- Cenário: turma T1 com os alunos A1 a A5 e o professor P1; turma T2 com o aluno B1 e o
-- professor P2; um gestor, um colaborador e um parceiro.
-- Esperado: a mensagem começa com "RELATORIO" e todas as linhas dizem "ok".
-- Uma transação só não prova concorrência: aqui se provam as regras e as constraints
-- que servem de rede para as travas.
do $$
declare
  u_a1 uuid := gen_random_uuid(); u_a2 uuid := gen_random_uuid(); u_a3 uuid := gen_random_uuid();
  u_a4 uuid := gen_random_uuid(); u_a5 uuid := gen_random_uuid(); u_b1 uuid := gen_random_uuid();
  u_p1 uuid := gen_random_uuid(); u_p2 uuid := gen_random_uuid(); u_g uuid := gen_random_uuid();
  u_c uuid := gen_random_uuid(); u_par uuid := gen_random_uuid();
  e1 bigint; t1 bigint; t2 bigint;
  pa1 bigint; pa2 bigint; pa3 bigint; pa4 bigint; pa5 bigint; pb1 bigint;
  v_trilha bigint;
  v_ind bigint; v_prof bigint; v_alu bigint; v_min bigint; v_fmt bigint; v_vira bigint;
  v_g1 bigint; v_g bigint; v_tent bigint; v_tent2 bigint; v_dupla bigint; v_dupla_t2 bigint;
  v_arq uuid; v_solto uuid;
  v_n bigint; v_num int; v_txt text;
  r text := 'RELATORIO';
begin
  -- ===== Montagem (como admin) =====
  insert into public.edicoes (nome, ordem, arquivo_origem) values ('Teste grupos', 9701, 'teste') returning id into e1;
  insert into public.turmas (edicao_id, nome) values (e1, 'Turma 1') returning id into t1;
  insert into public.turmas (edicao_id, nome) values (e1, 'Turma 2') returning id into t2;
  insert into auth.users (id, email, aud, role) values
    (u_a1, 'grp-a1@exemplo.invalid', 'authenticated', 'authenticated'),
    (u_a2, 'grp-a2@exemplo.invalid', 'authenticated', 'authenticated'),
    (u_a3, 'grp-a3@exemplo.invalid', 'authenticated', 'authenticated'),
    (u_a4, 'grp-a4@exemplo.invalid', 'authenticated', 'authenticated'),
    (u_a5, 'grp-a5@exemplo.invalid', 'authenticated', 'authenticated'),
    (u_b1, 'grp-b1@exemplo.invalid', 'authenticated', 'authenticated'),
    (u_p1, 'grp-p1@exemplo.invalid', 'authenticated', 'authenticated'),
    (u_p2, 'grp-p2@exemplo.invalid', 'authenticated', 'authenticated'),
    (u_g, 'grp-g@exemplo.invalid', 'authenticated', 'authenticated'),
    (u_c, 'grp-c@exemplo.invalid', 'authenticated', 'authenticated'),
    (u_par, 'grp-par@exemplo.invalid', 'authenticated', 'authenticated');
  insert into public.participantes (edicao_id, turma_id, funcao, nome) values (e1, t1, 'aluno', 'A1 teste') returning id into pa1;
  insert into public.participantes (edicao_id, turma_id, funcao, nome) values (e1, t1, 'aluno', 'A2 teste') returning id into pa2;
  insert into public.participantes (edicao_id, turma_id, funcao, nome) values (e1, t1, 'aluno', 'A3 teste') returning id into pa3;
  insert into public.participantes (edicao_id, turma_id, funcao, nome) values (e1, t1, 'aluno', 'A4 teste') returning id into pa4;
  insert into public.participantes (edicao_id, turma_id, funcao, nome) values (e1, t1, 'aluno', 'A5 teste') returning id into pa5;
  insert into public.participantes (edicao_id, turma_id, funcao, nome) values (e1, t2, 'aluno', 'B1 teste') returning id into pb1;
  update public.perfis set papel = 'aluno', participante_id = pa1 where id = u_a1;
  update public.perfis set papel = 'aluno', participante_id = pa2 where id = u_a2;
  update public.perfis set papel = 'aluno', participante_id = pa3 where id = u_a3;
  update public.perfis set papel = 'aluno', participante_id = pa4 where id = u_a4;
  update public.perfis set papel = 'aluno', participante_id = pa5 where id = u_a5;
  update public.perfis set papel = 'aluno', participante_id = pb1 where id = u_b1;
  update public.perfis set papel = 'professor', nome = 'Prof Um' where id = u_p1;
  update public.perfis set papel = 'professor' where id = u_p2;
  update public.perfis set papel = 'gestor' where id = u_g;
  update public.perfis set papel = 'colaborador' where id = u_c;
  update public.perfis set papel = 'parceiro' where id = u_par;
  insert into public.professores_turmas (professor_id, turma_id) values (u_p1, t1), (u_p2, t2);
  insert into public.trilhas (nome) values ('Trilha teste grupos ' || gen_random_uuid()) returning id into v_trilha;

  -- ===== Formato da atividade =====
  perform set_config('request.jwt.claims', json_build_object('sub', u_p1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.atividades (turma_id, trilha_id, titulo, enunciado) values (t1, v_trilha, 'Individual', 'x')
  returning id, grupo_min || '/' || grupo_max || '/' || grupos_montados_por into v_ind, v_txt;
  r := r || E'\n' || case when v_txt = '1/1/professor' then 'ok' else 'FALHOU (' || v_txt || ')' end || ' - atividade sem formato nasce individual';

  insert into public.atividades (turma_id, trilha_id, titulo, enunciado, grupo_min, grupo_max, grupos_montados_por)
  values (t1, v_trilha, 'Professor monta', 'x', 2, 3, 'professor') returning id into v_prof;
  insert into public.atividades (turma_id, trilha_id, titulo, enunciado, grupo_min, grupo_max, grupos_montados_por)
  values (t1, v_trilha, 'Alunos montam', 'x', 2, 3, 'alunos') returning id into v_alu;
  insert into public.atividades (turma_id, trilha_id, titulo, enunciado, grupo_min, grupo_max, grupos_montados_por)
  values (t1, v_trilha, 'Minimo', 'x', 2, 3, 'professor') returning id into v_min;
  insert into public.atividades (turma_id, trilha_id, titulo, enunciado, grupo_min, grupo_max, grupos_montados_por)
  values (t1, v_trilha, 'Formato', 'x', 2, 3, 'professor') returning id into v_fmt;
  r := r || E'\n' || case when v_prof is not null and v_alu is not null then 'ok' else 'FALHOU' end || ' - professor cria atividade em grupo (mínimo, máximo e quem monta)';

  v_n := 0;
  begin
    insert into public.atividades (turma_id, trilha_id, titulo, enunciado, grupo_min, grupo_max) values (t1, v_trilha, 'x', 'x', 0, 2);
  exception when check_violation then v_n := v_n + 1;
  end;
  begin
    insert into public.atividades (turma_id, trilha_id, titulo, enunciado, grupo_min, grupo_max) values (t1, v_trilha, 'x', 'x', 3, 2);
  exception when check_violation then v_n := v_n + 1;
  end;
  begin
    insert into public.atividades (turma_id, trilha_id, titulo, enunciado, grupo_min, grupo_max) values (t1, v_trilha, 'x', 'x', 2, 51);
  exception when check_violation then v_n := v_n + 1;
  end;
  begin
    insert into public.atividades (turma_id, trilha_id, titulo, enunciado, grupo_max, grupos_montados_por) values (t1, v_trilha, 'x', 'x', 2, 'sorteio');
  exception when check_violation then v_n := v_n + 1;
  end;
  r := r || E'\n' || case when v_n = 4 then 'ok' else 'FALHOU (' || v_n || ' de 4)' end || ' - recusa mínimo 0, mínimo maior que o máximo, máximo acima do teto e modo inválido';

  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_a1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.atividades set grupo_max = 5 where id = v_prof;
  get diagnostics v_n = row_count;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - aluno não muda o formato da atividade';

  -- ===== Professor monta os grupos =====
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_p1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.definir_grupos(v_prof, jsonb_build_array(jsonb_build_array(pa1, pa2), jsonb_build_array(pa3, pa4)));
  select count(distinct grupo_id) || '/' || count(*) into v_txt from public.integrantes_do_grupo where atividade_id = v_prof;
  r := r || E'\n' || case when v_txt = '2/4' then 'ok' else 'FALHOU (' || v_txt || ')' end || ' - professor da turma monta os grupos';

  v_n := 0;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_p2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.definir_grupos(v_prof, jsonb_build_array(jsonb_build_array(pa1, pa2)));
  exception when insufficient_privilege then v_n := v_n + 1;
  end;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_a1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.definir_grupos(v_prof, jsonb_build_array(jsonb_build_array(pa1, pa2)));
  exception when insufficient_privilege then v_n := v_n + 1;
  end;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_par, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.definir_grupos(v_prof, jsonb_build_array(jsonb_build_array(pa1, pa2)));
  exception when insufficient_privilege then v_n := v_n + 1;
  end;
  r := r || E'\n' || case when v_n = 3 then 'ok' else 'FALHOU (' || v_n || ' de 3)' end || ' - professor de outra turma, aluno e parceiro não montam grupos';

  -- Colaborador não monta, não inclui e não tira (migration 20261001131000): mexer no
  -- grupo decide quem vê a nota, e ele não vê entregas
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_c, 'role', 'authenticated')::text, true);
  set local role authenticated;
  v_n := 0;
  begin
    perform public.definir_grupos(v_prof, jsonb_build_array(jsonb_build_array(pa1, pa2), jsonb_build_array(pa3, pa4)));
  exception when insufficient_privilege then v_n := v_n + 1;
  end;
  begin
    perform public.incluir_no_grupo(v_prof, pa1, null);
  exception when insufficient_privilege then v_n := v_n + 1;
  end;
  begin
    perform public.tirar_do_grupo(v_prof, pa1);
  exception when insufficient_privilege then v_n := v_n + 1;
  end;
  r := r || E'\n' || case when v_n = 3 then 'ok' else 'FALHOU (' || v_n || ' de 3)' end || ' - colaborador não monta, não inclui e não tira aluno de grupo';

  -- Gestor monta; o mesmo pedido de novo não duplica
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_g, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.definir_grupos(v_prof, jsonb_build_array(jsonb_build_array(pa1, pa2), jsonb_build_array(pa3, pa4)));
  perform public.definir_grupos(v_prof, jsonb_build_array(jsonb_build_array(pa1, pa2), jsonb_build_array(pa3, pa4)));
  select count(distinct grupo_id) || '/' || count(*) into v_txt from public.integrantes_do_grupo where atividade_id = v_prof;
  r := r || E'\n' || case when v_txt = '2/4' then 'ok' else 'FALHOU (' || v_txt || ')' end || ' - gestor monta; repetir o pedido não duplica';

  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_p1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  v_n := 0;
  begin
    perform public.definir_grupos(v_prof, jsonb_build_array(jsonb_build_array(pa1, pb1)));
  exception when invalid_parameter_value then v_n := v_n + 1;
  end;
  begin
    perform public.definir_grupos(v_prof, jsonb_build_array(jsonb_build_array(pa1, pa2), jsonb_build_array(pa2, pa3)));
  exception when invalid_parameter_value then v_n := v_n + 1;
  end;
  begin
    perform public.definir_grupos(v_prof, jsonb_build_array(jsonb_build_array(pa1, pa2, pa3, pa4)));
  exception when invalid_parameter_value then v_n := v_n + 1;
  end;
  begin
    perform public.definir_grupos(v_prof, '{"a": 1}'::jsonb);
  exception when invalid_parameter_value then v_n := v_n + 1;
  end;
  begin
    perform public.definir_grupos(v_prof, '[["1; drop table x"], [1.5]]'::jsonb);
  exception when invalid_parameter_value then v_n := v_n + 1;
  end;
  begin
    perform public.definir_grupos(v_ind, jsonb_build_array(jsonb_build_array(pa1, pa2)));
  exception when invalid_parameter_value then v_n := v_n + 1;
  end;
  select count(distinct grupo_id) || '/' || count(*) into v_txt from public.integrantes_do_grupo where atividade_id = v_prof;
  r := r || E'\n' || case when v_n = 6 and v_txt = '2/4' then 'ok' else 'FALHOU (' || v_n || ' de 6, ' || v_txt || ')' end
    || ' - recusa aluno de outra turma, aluno repetido, grupo acima do máximo, lista malformada e atividade individual, sem alterar nada';

  -- ===== Envio em grupo =====
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_a1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.tentativas (atividade_id, participante_id, comentario) values (v_prof, pa1, 'feito pelo grupo')
  returning id, numero, grupo_id into v_tent, v_num, v_g1;
  r := r || E'\n' || case when v_num = 1 and v_g1 is not null then 'ok' else 'FALHOU' end || ' - integrante envia e o banco carimba o grupo (1ª tentativa)';

  begin
    insert into public.tentativas (atividade_id, participante_id, comentario, grupo_id) values (v_prof, pa1, 'forjado', v_g1);
    r := r || E'\nFALHOU - aluno gravou o grupo da entrega';
  exception when insufficient_privilege then
    r := r || E'\nok - aluno não escolhe o grupo da entrega';
  end;

  select count(*) into v_n from public.grupos_da_atividade where atividade_id = v_prof;
  select v_n || '/' || count(*) into v_txt from public.integrantes_do_grupo where atividade_id = v_prof;
  r := r || E'\n' || case when v_txt = '1/2' then 'ok' else 'FALHOU (' || v_txt || ')' end || ' - aluno só vê o próprio grupo e os integrantes dele';

  v_n := 0;
  begin
    insert into public.grupos_da_atividade (atividade_id) values (v_prof);
  exception when insufficient_privilege then v_n := v_n + 1;
  end;
  begin
    insert into public.integrantes_do_grupo (grupo_id, participante_id, atividade_id) values (v_g1, pa5, v_prof);
  exception when insufficient_privilege then v_n := v_n + 1;
  end;
  begin
    delete from public.integrantes_do_grupo where grupo_id = v_g1;
  exception when insufficient_privilege then v_n := v_n + 1;
  end;
  r := r || E'\n' || case when v_n = 3 then 'ok' else 'FALHOU (' || v_n || ' de 3)' end || ' - aluno não cria grupo, não se inclui e não tira ninguém direto na tabela';

  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_a2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_n from public.tentativas where atividade_id = v_prof;
  r := r || E'\n' || case when v_n = 1 then 'ok' else 'FALHOU' end || ' - colega do grupo que não enviou lê a entrega';
  begin
    insert into public.tentativas (atividade_id, participante_id, comentario) values (v_prof, pa2, 'de novo');
    r := r || E'\nFALHOU - outro integrante enviou com a entrega do grupo aguardando';
  exception when invalid_parameter_value then
    r := r || E'\nok - outro integrante não envia enquanto a entrega do grupo aguarda correção';
  end;
  begin
    perform * from public.reservar_arquivo(v_prof, 'r.pdf', 'application/pdf', 100);
    r := r || E'\nFALHOU - integrante reservou arquivo com a entrega do grupo aguardando';
  exception when invalid_parameter_value then
    r := r || E'\nok - integrante não reserva arquivo enquanto a entrega do grupo aguarda';
  end;

  v_n := 0;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_a3, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select v_n + count(*) into v_n from public.tentativas where atividade_id = v_prof;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_a5, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select v_n + count(*) into v_n from public.tentativas where atividade_id = v_prof;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_b1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select v_n + count(*) into v_n from public.tentativas where atividade_id = v_prof;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - aluno de outro grupo, sem grupo ou de outra turma não lê a entrega';

  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_a5, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.tentativas (atividade_id, participante_id, comentario) values (v_prof, pa5, 'sozinho');
    r := r || E'\nFALHOU - aluno sem grupo entregou atividade em grupo';
  exception when invalid_parameter_value then
    r := r || E'\nok - aluno sem grupo não entrega atividade em grupo';
  end;
  begin
    perform * from public.reservar_arquivo(v_prof, 'r.pdf', 'application/pdf', 100);
    r := r || E'\nFALHOU - aluno sem grupo reservou arquivo (grupos do professor)';
  exception when invalid_parameter_value then
    r := r || E'\nok - aluno sem grupo não reserva arquivo quando o professor monta';
  end;

  -- ===== Correção única =====
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_p1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.tentativas set status = 'refazer', feedback = 'Falta a parte 2' where id = v_tent;
  get diagnostics v_n = row_count;
  r := r || E'\n' || case when v_n = 1 then 'ok' else 'FALHOU' end || ' - professor pede para o grupo refazer';

  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_a2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select participante_id into v_n from public.reservar_arquivo(v_prof, 'r2.pdf', 'application/pdf', 100);
  r := r || E'\n' || case when v_n = pa2 then 'ok' else 'FALHOU' end || ' - depois do Refazer, outro integrante já reserva o arquivo';
  insert into public.tentativas (atividade_id, participante_id, comentario) values (v_prof, pa2, 'parte 2 feita')
  returning id, numero, grupo_id into v_tent2, v_num, v_g;
  r := r || E'\n' || case when v_num = 2 and v_g = v_g1 then 'ok' else 'FALHOU' end || ' - depois do Refazer, outro integrante reenvia (2ª tentativa do mesmo grupo)';

  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_p1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    update public.tentativas set status = 'concluida', nota = 50, feedback = 'antiga' where id = v_tent;
    r := r || E'\nFALHOU - reavaliou tentativa antiga do grupo';
  exception when invalid_parameter_value then
    r := r || E'\nok - tentativa antiga do grupo não é reavaliada';
  end;
  update public.tentativas set status = 'concluida', nota = 90, feedback = 'Muito bom' where id = v_tent2;

  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_a1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select nota || '|' || feedback into v_txt from public.tentativas where id = v_tent2;
  r := r || E'\n' || case when v_txt = '90|Muito bom' then 'ok' else 'FALHOU (' || coalesce(v_txt, 'nada') || ')' end || ' - uma correção: o colega que não enviou lê a nota e o feedback';
  begin
    insert into public.tentativas (atividade_id, participante_id, comentario) values (v_prof, pa1, 'mais uma');
    r := r || E'\nFALHOU - grupo enviou depois de concluída';
  exception when invalid_parameter_value then
    r := r || E'\nok - grupo não envia depois de concluída';
  end;

  -- Quem lê as entregas do grupo na equipe
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_p1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_n from public.tentativas where atividade_id = v_prof;
  v_txt := v_n::text;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_g, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_n from public.tentativas where atividade_id = v_prof;
  v_txt := v_txt || '/' || v_n;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_p2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_n from public.tentativas where atividade_id = v_prof;
  v_txt := v_txt || '/' || v_n;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_par, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_n from public.tentativas where atividade_id = v_prof;
  v_txt := v_txt || '/' || v_n;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_c, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_n from public.tentativas where atividade_id = v_prof;
  v_txt := v_txt || '/' || v_n;
  select count(*) into v_n from public.grupos_da_atividade where atividade_id = v_prof;
  v_txt := v_txt || '/' || v_n;
  r := r || E'\n' || case when v_txt = '2/2/0/0/0/2' then 'ok' else 'FALHOU (' || v_txt || ')' end
    || ' - professor da turma e gestor leem as entregas; outro professor, parceiro e colaborador não (o colaborador lê os grupos)';

  -- ===== Redefinir os grupos preserva quem já entregou =====
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_p1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.definir_grupos(v_prof, jsonb_build_array(jsonb_build_array(pa3, pa5)));
  select string_agg(participante_id::text, ',' order by participante_id) into v_txt
  from public.integrantes_do_grupo where atividade_id = v_prof;
  r := r || E'\n' || case when v_txt = concat_ws(',', pa1, pa2, pa3, pa5) then 'ok' else 'FALHOU (' || v_txt || ')' end
    || ' - redefinir troca os grupos sem entrega e mantém o grupo que já entregou';
  begin
    perform public.definir_grupos(v_prof, jsonb_build_array(jsonb_build_array(pa1, pa4)));
    r := r || E'\nFALHOU - redefiniu incluindo aluno de grupo que já entregou';
  exception when invalid_parameter_value then
    select string_agg(participante_id::text, ',' order by participante_id) into v_txt
    from public.integrantes_do_grupo where atividade_id = v_prof;
    r := r || E'\n' || case when v_txt = concat_ws(',', pa1, pa2, pa3, pa5) then 'ok' else 'FALHOU (' || v_txt || ')' end
      || ' - recusa redefinir com aluno de grupo que já entregou, sem alterar nada';
  end;

  -- ===== Mínimo, máximo e ajuste do grupo =====
  perform public.definir_grupos(v_min, jsonb_build_array(jsonb_build_array(pa5)));
  select grupo_id into v_g from public.integrantes_do_grupo where atividade_id = v_min and participante_id = pa5;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_a5, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.tentativas (atividade_id, participante_id, comentario) values (v_min, pa5, 'sozinho');
    r := r || E'\nFALHOU - grupo abaixo do mínimo entregou';
  exception when invalid_parameter_value then
    r := r || E'\nok - grupo abaixo do mínimo não entrega';
  end;
  begin
    perform public.incluir_no_grupo(v_min, pa4, v_g);
    r := r || E'\nFALHOU - aluno ajustou grupo';
  exception when insufficient_privilege then
    r := r || E'\nok - aluno não inclui ninguém em grupo';
  end;
  begin
    perform public.tirar_do_grupo(v_min, pa5);
    r := r || E'\nFALHOU - aluno saiu do grupo sozinho';
  exception when insufficient_privilege then
    r := r || E'\nok - aluno não tira ninguém de grupo';
  end;

  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_p2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.incluir_no_grupo(v_min, pa4, v_g);
    r := r || E'\nFALHOU - professor de outra turma ajustou grupo';
  exception when insufficient_privilege then
    r := r || E'\nok - professor de outra turma não ajusta grupo';
  end;

  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_p1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.incluir_no_grupo(v_min, pa4, v_g);
  perform public.incluir_no_grupo(v_min, pa3, v_g);
  begin
    perform public.incluir_no_grupo(v_min, pa2, v_g);
    r := r || E'\nFALHOU - grupo passou do máximo';
  exception when invalid_parameter_value then
    r := r || E'\nok - professor inclui até o máximo, e não além';
  end;
  begin
    perform public.incluir_no_grupo(v_min, pb1);
    r := r || E'\nFALHOU - incluiu aluno de outra turma';
  exception when invalid_parameter_value then
    r := r || E'\nok - não inclui aluno de outra turma';
  end;
  begin
    perform public.incluir_no_grupo(v_min, pa1, v_g1);
    r := r || E'\nFALHOU - usou grupo de outra atividade';
  exception when invalid_parameter_value then
    r := r || E'\nok - grupo de outra atividade não é aceito';
  end;
  begin
    perform public.incluir_no_grupo(v_min, pa4);
    r := r || E'\nFALHOU - aluno em dois grupos da mesma atividade';
  exception when invalid_parameter_value then
    r := r || E'\nok - aluno não entra em dois grupos da mesma atividade';
  end;

  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_a5, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.tentativas (atividade_id, participante_id, comentario) values (v_min, pa5, 'agora somos três')
  returning numero into v_num;
  r := r || E'\n' || case when v_num = 1 then 'ok' else 'FALHOU' end || ' - com o mínimo de integrantes, o grupo entrega';

  -- Formato não muda com entregas (nem para o colaborador, que não lê as entregas)
  v_n := 0;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_p1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    update public.atividades set grupo_max = 4 where id = v_min;
  exception when invalid_parameter_value then v_n := v_n + 1;
  end;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_c, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    update public.atividades set grupos_montados_por = 'alunos' where id = v_min;
  exception when invalid_parameter_value then v_n := v_n + 1;
  end;
  r := r || E'\n' || case when v_n = 2 then 'ok' else 'FALHOU (' || v_n || ' de 2)' end || ' - atividade com entregas não muda de formato (professor e colaborador)';

  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_p1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.atividades set titulo = 'Minimo (editada)' where id = v_min;
  get diagnostics v_n = row_count;
  r := r || E'\n' || case when v_n = 1 then 'ok' else 'FALHOU' end || ' - atividade com entregas ainda aceita editar o título';

  perform public.definir_grupos(v_fmt, jsonb_build_array(jsonb_build_array(pa1, pa2, pa3)));
  begin
    update public.atividades set grupo_min = 1, grupo_max = 2 where id = v_fmt;
    r := r || E'\nFALHOU - máximo ficou menor que um grupo montado';
  exception when invalid_parameter_value then
    r := r || E'\nok - o máximo não fica menor que um grupo já montado';
  end;
  update public.atividades set grupo_max = 4 where id = v_fmt;
  get diagnostics v_n = row_count;
  r := r || E'\n' || case when v_n = 1 then 'ok' else 'FALHOU' end || ' - sem entregas, o máximo pode aumentar';

  v_n := 0;
  begin
    perform public.definir_grupos(v_alu, jsonb_build_array(jsonb_build_array(pa1, pa2)));
  exception when invalid_parameter_value then v_n := v_n + 1;
  end;
  begin
    perform public.incluir_no_grupo(v_ind, pa1);
  exception when invalid_parameter_value then v_n := v_n + 1;
  end;
  begin
    perform public.tirar_do_grupo(v_fmt, pa5);
  exception when invalid_parameter_value then v_n := v_n + 1;
  end;
  r := r || E'\n' || case when v_n = 3 then 'ok' else 'FALHOU (' || v_n || ' de 3)' end
    || ' - professor não monta grupos quando são os alunos que montam, não inclui em atividade individual e não tira quem não está em grupo';

  -- Prazo vale para o 1º envio do grupo; depois, a atividade volta a ser individual
  insert into public.atividades (turma_id, trilha_id, titulo, enunciado, grupo_min, grupo_max)
  values (t1, v_trilha, 'Vira individual', 'x', 2, 3) returning id into v_vira;
  perform public.definir_grupos(v_vira, jsonb_build_array(jsonb_build_array(pa4, pa5)));
  reset role;
  update public.atividades set prazo = now() - interval '1 hour' where id = v_vira;
  perform set_config('request.jwt.claims', json_build_object('sub', u_a4, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.tentativas (atividade_id, participante_id, comentario) values (v_vira, pa4, 'atrasado');
    r := r || E'\nFALHOU - grupo fez o 1º envio depois do prazo';
  exception when invalid_parameter_value then
    r := r || E'\nok - grupo não faz o 1º envio depois do prazo';
  end;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_p1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.atividades set grupo_min = 1, grupo_max = 1 where id = v_vira;
  select count(*) into v_n from public.grupos_da_atividade where atividade_id = v_vira;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU (' || v_n || ')' end || ' - atividade que volta a ser individual perde os grupos';

  -- Tirar do grupo
  perform public.tirar_do_grupo(v_min, pa3);
  perform public.tirar_do_grupo(v_min, pa4);
  begin
    perform public.tirar_do_grupo(v_min, pa5);
    r := r || E'\nFALHOU - tirou o último integrante de grupo que já entregou';
  exception when invalid_parameter_value then
    r := r || E'\nok - o último integrante de grupo que já entregou não sai';
  end;
  select public.incluir_no_grupo(v_min, pa1) into v_g;
  perform public.tirar_do_grupo(v_min, pa1);
  select count(*) into v_n from public.grupos_da_atividade where id = v_g;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - grupo que fica vazio e sem entrega é apagado';

  -- Aluno que troca de grupo: deixa de ler a entrega do grupo antigo e entrega no novo
  perform public.tirar_do_grupo(v_prof, pa1);
  select grupo_id into v_g from public.integrantes_do_grupo where atividade_id = v_prof and participante_id = pa3;
  perform public.incluir_no_grupo(v_prof, pa1, v_g);
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_a1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_n from public.tentativas where grupo_id = v_g1;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - quem saiu do grupo não lê mais a entrega dele (mesmo tendo enviado)';
  begin
    insert into public.tentativas (atividade_id, participante_id, comentario) values (v_prof, pa1, 'no grupo novo')
    returning numero, grupo_id into v_num, v_n;
    r := r || E'\n' || case when v_num = 1 and v_n = v_g then 'ok' else 'FALHOU' end || ' - no grupo novo, o aluno envia a 1ª tentativa de novo';
  exception when others then
    r := r || E'\nFALHOU - aluno que trocou de grupo não enviou: ' || sqlerrm;
  end;

  reset role;
  begin
    delete from public.grupos_da_atividade where id = v_g1;
    r := r || E'\nFALHOU - apagou grupo com entrega';
  exception when foreign_key_violation then
    r := r || E'\nok - grupo com entrega não é apagado';
  end;

  -- ===== Alunos montam o grupo =====
  perform set_config('request.jwt.claims', json_build_object('sub', u_a1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) || '|' || bool_or(id = pa1) || '|' || bool_or(id = pb1) into v_txt from public.colegas_livres(v_alu);
  r := r || E'\n' || case when v_txt = '4|false|false' then 'ok' else 'FALHOU (' || v_txt || ')' end || ' - lista de colegas livres: só a turma, sem o próprio aluno';
  select count(*) into v_n from (select * from public.colegas_livres(v_ind) union all select * from public.colegas_livres(v_prof)) x;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_b1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select v_n + count(*) into v_n from public.colegas_livres(v_alu);
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_p1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select v_n + count(*) into v_n from public.colegas_livres(v_alu);
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - lista de colegas vazia para outra turma, professor, atividade individual e grupos do professor';

  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_a1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select participante_id into v_n from public.reservar_arquivo(v_alu, 'r.pdf', 'application/pdf', 100);
  r := r || E'\n' || case when v_n = pa1 then 'ok' else 'FALHOU' end || ' - antes de montar o grupo, o aluno já reserva o arquivo';

  v_n := 0;
  begin
    perform public.enviar_em_grupo(v_alu, array[pb1], 'x', null, null);
  exception when invalid_parameter_value then v_n := v_n + 1;
  end;
  begin
    perform public.enviar_em_grupo(v_alu, array[pa2, pa3, pa4], 'x', null, null);
  exception when invalid_parameter_value then v_n := v_n + 1;
  end;
  begin
    perform public.enviar_em_grupo(v_alu, array[]::bigint[], 'x', null, null);
  exception when invalid_parameter_value then v_n := v_n + 1;
  end;
  begin
    perform public.enviar_em_grupo(v_alu, array[pa1], 'x', null, null);
  exception when invalid_parameter_value then v_n := v_n + 1;
  end;
  begin
    perform public.enviar_em_grupo(v_alu, array[pa2, pa2], 'x', null, null);
  exception when invalid_parameter_value then v_n := v_n + 1;
  end;
  begin
    perform public.enviar_em_grupo(v_prof, array[pa2], 'x', null, null);
  exception when invalid_parameter_value then v_n := v_n + 1;
  end;
  begin
    -- Entrega sem conteúdo: a regra da entrega falha depois de o grupo ser montado
    perform public.enviar_em_grupo(v_alu, array[pa2], null, null, null);
  exception when check_violation then v_n := v_n + 1;
  end;
  reset role;
  select v_n || '/' || count(*) into v_txt from public.grupos_da_atividade where atividade_id = v_alu;
  r := r || E'\n' || case when v_txt = '7/0' then 'ok' else 'FALHOU (' || v_txt || ')' end
    || ' - recusa colega de outra turma, acima do máximo, abaixo do mínimo, o próprio aluno, colega repetido, grupos do professor e entrega inválida, sem deixar grupo criado';

  -- (como o servidor) o arquivo da entrega e um arquivo solto do A1
  insert into public.arquivos_entrega (atividade_id, participante_id, drive_id, nome, mime, tamanho)
  values (v_alu, pa1, 'driveGrupoEntregaA1x', 'grupo.pdf', 'application/pdf', 100) returning id into v_arq;
  insert into public.arquivos_entrega (atividade_id, participante_id, drive_id, nome, mime, tamanho)
  values (v_alu, pa1, 'driveGrupoSoltoA1xyz', 'solto.pdf', 'application/pdf', 100) returning id into v_solto;

  perform set_config('request.jwt.claims', json_build_object('sub', u_a1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select public.enviar_em_grupo(v_alu, array[pa2], 'feito em dupla', null, v_arq) into v_tent;
  select numero || '|' || (grupo_id is not null) into v_txt from public.tentativas where id = v_tent;
  r := r || E'\n' || case when v_txt = '1|true' then 'ok' else 'FALHOU (' || coalesce(v_txt, 'nada') || ')' end || ' - aluno escolhe o colega e envia: grupo e entrega criados juntos';
  select count(*) into v_n from public.colegas_livres(v_alu);
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU (' || v_n || ')' end || ' - quem já tem grupo recebe a lista de colegas vazia';
  begin
    perform public.enviar_em_grupo(v_alu, array[pa4], 'x', null, null);
    r := r || E'\nFALHOU - aluno montou um segundo grupo';
  exception when invalid_parameter_value then
    r := r || E'\nok - quem já tem grupo não monta outro';
  end;

  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_a2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_n from public.tentativas where id = v_tent;
  select v_n || '|' || count(*) filter (where id = v_arq) || '|' || count(*) filter (where id = v_solto) into v_txt
  from public.arquivos_entrega where id in (v_arq, v_solto);
  r := r || E'\n' || case when v_txt = '1|1|0' then 'ok' else 'FALHOU (' || v_txt || ')' end
    || ' - colega escolhido lê a entrega e o arquivo dela, mas não o arquivo solto de quem enviou';
  select string_agg(nome, '|' order by nome) into v_txt from public.integrantes_dos_meus_grupos() where atividade_id = v_alu;
  r := r || E'\n' || case when v_txt = 'A1 teste|A2 teste' then 'ok' else 'FALHOU (' || coalesce(v_txt, 'nada') || ')' end || ' - aluno vê o nome dos integrantes do próprio grupo';
  begin
    insert into public.tentativas (atividade_id, participante_id, comentario) values (v_alu, pa2, 'outra');
    r := r || E'\nFALHOU - colega escolhido enviou outra entrega';
  exception when invalid_parameter_value then
    r := r || E'\nok - colega escolhido não envia outra entrega na mesma atividade';
  end;

  -- Quem saiu do grupo: a entrega do grupo antigo não fecha o envio dele, e o arquivo some
  reset role;
  select grupo_id into v_g from public.tentativas where id = v_tent;
  perform set_config('request.jwt.claims', json_build_object('sub', u_p1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.tirar_do_grupo(v_alu, pa2);
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_a2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    select participante_id into v_n from public.reservar_arquivo(v_alu, 'novo.pdf', 'application/pdf', 100);
    select (v_n = pa2) || '|' || count(*) into v_txt from public.arquivos_entrega where id = v_arq;
    r := r || E'\n' || case when v_txt = 'true|0' then 'ok' else 'FALHOU (' || v_txt || ')' end
      || ' - quem saiu do grupo reserva arquivo para um grupo novo e não lê mais o arquivo do antigo';
  exception when others then
    r := r || E'\nFALHOU - quem saiu do grupo não reservou arquivo: ' || sqlerrm;
  end;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_p1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.incluir_no_grupo(v_alu, pa2, v_g);

  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_a3, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_n from public.tentativas where id = v_tent;
  select v_n + count(*) into v_n from public.arquivos_entrega where id = v_arq;
  select v_n + count(*) into v_n from public.integrantes_dos_meus_grupos() where atividade_id = v_alu;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - aluno de fora do grupo não lê a entrega, o arquivo nem os integrantes';
  select count(*) || '|' || bool_or(id in (pa1, pa2)) into v_txt from public.colegas_livres(v_alu);
  r := r || E'\n' || case when v_txt = '2|false' then 'ok' else 'FALHOU (' || v_txt || ')' end || ' - quem entrou em grupo sai da lista de colegas livres';
  begin
    perform public.enviar_em_grupo(v_alu, array[pa2], 'x', null, null);
    r := r || E'\nFALHOU - colega entrou em dois grupos';
  exception when invalid_parameter_value then
    r := r || E'\nok - não dá para escolher colega que já está em grupo';
  end;
  begin
    perform public.enviar_em_grupo(v_alu, array[pa4], 'x', null, v_arq);
    r := r || E'\nFALHOU - usou o arquivo de outro aluno';
  exception when insufficient_privilege then
    r := r || E'\nok - entrega em grupo não usa o arquivo de outro aluno';
  end;

  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_b1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.enviar_em_grupo(v_alu, array[]::bigint[], 'x', null, null);
    r := r || E'\nFALHOU - aluno de outra turma montou grupo';
  exception when insufficient_privilege then
    r := r || E'\nok - aluno de outra turma não monta grupo na atividade';
  end;

  -- ===== Visitante =====
  reset role;
  perform set_config('request.jwt.claims', '{}', true);
  set local role anon;
  v_n := 0;
  begin
    perform 1 from public.grupos_da_atividade limit 1;
  exception when insufficient_privilege then v_n := v_n + 1;
  end;
  begin
    perform 1 from public.integrantes_do_grupo limit 1;
  exception when insufficient_privilege then v_n := v_n + 1;
  end;
  begin
    perform * from public.colegas_livres(v_alu);
  exception when insufficient_privilege then v_n := v_n + 1;
  end;
  begin
    perform public.definir_grupos(v_prof, '[]'::jsonb);
  exception when insufficient_privilege then v_n := v_n + 1;
  end;
  r := r || E'\n' || case when v_n = 4 then 'ok' else 'FALHOU (' || v_n || ' de 4)' end || ' - visitante não lê grupos nem chama as funções';

  -- ===== Troca de turma e cascatas (como admin) =====
  reset role;
  -- pa2 está em dois grupos que já entregaram (v_prof e v_alu) e em um que não (v_fmt)
  update public.participantes set turma_id = t2 where id = pa2;
  select count(*) || '|' || count(*) filter (where atividade_id = v_fmt) into v_txt
  from public.integrantes_do_grupo where participante_id = pa2;
  r := r || E'\n' || case when v_txt = '2|0' then 'ok' else 'FALHOU (' || v_txt || ')' end
    || ' - aluno que troca de turma sai dos grupos sem entrega e continua nos que já entregaram';

  -- pa1 enviou a entrega do grupo dele com pa2 (v_alu), com arquivo
  begin
    delete from public.participantes where id = pa1;
    select count(*) filter (where participante_id = pa2) into v_n from public.tentativas where id = v_tent;
    select v_n || '|' || count(*) filter (where participante_id = pa2) into v_txt from public.arquivos_entrega where id = v_arq;
    r := r || E'\n' || case when v_txt = '1|1' then 'ok' else 'FALHOU (' || v_txt || ')' end
      || ' - apagar o aluno que enviou não apaga a entrega do grupo: ela e o arquivo passam para outro integrante';
  exception when others then
    r := r || E'\nFALHOU - não apagou o aluno que enviou pelo grupo: ' || sqlerrm;
  end;

  delete from public.atividades where id = v_fmt;
  select count(*) into v_n from public.grupos_da_atividade where atividade_id = v_fmt;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - apagar a atividade leva os grupos dela';

  begin
    delete from public.participantes where id = pa3;
    r := r || E'\nok - apaga aluno que está em grupo';
  exception when others then
    r := r || E'\nFALHOU - não apagou aluno que está em grupo: ' || sqlerrm;
  end;

  -- Duplas com entrega e arquivo, os dois integrantes na mesma turma: pa4 + pa5 em T1 e
  -- pb1 + pa2 em T2 (pa2 trocou de turma acima). Apagar os dois de uma vez, a turma ou a
  -- edição não pode travar: o último integrante não tem para quem passar a entrega.
  insert into public.atividades (turma_id, trilha_id, titulo, enunciado, grupo_min, grupo_max)
  values (t1, v_trilha, 'Dupla T1', 'x', 2, 2) returning id into v_dupla;
  insert into public.atividades (turma_id, trilha_id, titulo, enunciado, grupo_min, grupo_max)
  values (t2, v_trilha, 'Dupla T2', 'x', 2, 2) returning id into v_dupla_t2;
  insert into public.grupos_da_atividade (atividade_id) values (v_dupla) returning id into v_g;
  insert into public.integrantes_do_grupo (grupo_id, participante_id, atividade_id) values (v_g, pa4, v_dupla), (v_g, pa5, v_dupla);
  insert into public.grupos_da_atividade (atividade_id) values (v_dupla_t2) returning id into v_g;
  insert into public.integrantes_do_grupo (grupo_id, participante_id, atividade_id) values (v_g, pb1, v_dupla_t2), (v_g, pa2, v_dupla_t2);
  insert into public.arquivos_entrega (atividade_id, participante_id, drive_id, nome, mime, tamanho)
  values (v_dupla, pa4, 'driveDuplaT1arquivo1', 'dupla.pdf', 'application/pdf', 100) returning id into v_arq;
  insert into public.arquivos_entrega (atividade_id, participante_id, drive_id, nome, mime, tamanho)
  values (v_dupla_t2, pb1, 'driveDuplaT2arquivo1', 'dupla.pdf', 'application/pdf', 100) returning id into v_solto;
  perform set_config('request.jwt.claims', json_build_object('sub', u_a4, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.tentativas (atividade_id, participante_id, comentario, arquivo_id) values (v_dupla, pa4, 'dupla', v_arq);
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_b1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.tentativas (atividade_id, participante_id, comentario, arquivo_id) values (v_dupla_t2, pb1, 'dupla', v_solto);
  reset role;

  begin
    delete from public.participantes where id in (pa4, pa5);
    select count(*) into v_n from public.tentativas where atividade_id = v_dupla;
    r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU (' || v_n || ')' end || ' - apaga os dois integrantes de uma vez (a entrega vai junto com o último)';
  exception when others then
    r := r || E'\nFALHOU - não apagou os dois integrantes de uma vez: ' || sqlerrm;
  end;
  begin
    delete from public.turmas where id = t2;
    r := r || E'\nok - apaga turma com entrega de grupo e arquivo (os dois integrantes na turma)';
  exception when others then
    r := r || E'\nFALHOU - não apagou turma com entrega de grupo: ' || sqlerrm;
  end;
  begin
    delete from public.edicoes where id = e1;
    r := r || E'\nok - apaga a edição com entregas em grupo';
  exception when others then
    r := r || E'\nFALHOU - não apagou a edição com entregas em grupo: ' || sqlerrm;
  end;

  reset role;
  raise exception '%', r;
end $$;
