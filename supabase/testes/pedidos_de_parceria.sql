-- Teste dos pedidos de parceria (migration 20261001132000_pedidos_de_parceria.sql).
-- Roda numa transação e termina com um erro proposital que carrega o relatório:
-- o erro desfaz tudo, então nada fica gravado.
--
--   npx supabase db query --linked -f supabase/testes/pedidos_de_parceria.sql
--
-- Esperado: a mensagem começa com "RELATORIO" e todas as linhas dizem "ok".
do $$
declare
  v_gestor uuid := gen_random_uuid();
  v_outro uuid := gen_random_uuid();
  v_txt text;
  v_n bigint;
  r text := 'RELATORIO';
begin
  -- ===== Montagem (sem login) =====
  insert into auth.users (id, email, aud, role) values
    (v_gestor, 'parceria-gestor@exemplo.invalid', 'authenticated', 'authenticated'),
    (v_outro, 'parceria-outro@exemplo.invalid', 'authenticated', 'authenticated');
  update public.perfis set papel = 'gestor' where id = v_gestor;
  update public.perfis set papel = 'colaborador' where id = v_outro;
  -- O teto por hora conta o que já existe: o teste começa do zero
  delete from public.pedidos_de_parceria;

  -- ===== Visitante (sem login) =====
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  set local role anon;

  perform public.enviar_pedido_de_parceria(
    '  Maria Lima  ', ' Maria@Empresa.COM ', '(31) 99999-0000', ' Empresa Teste ', ' Quero contratar formandos '
  );

  begin
    select count(*) into v_n from public.pedidos_de_parceria;
    r := r || E'\nFALHOU - visitante leu os pedidos';
  exception when insufficient_privilege then
    r := r || E'\nok - visitante não lê os pedidos';
  end;

  begin
    insert into public.pedidos_de_parceria (nome, email, telefone, empresa, contribuicao)
    values ('Direto', 'direto@exemplo.invalid', '31999990000', 'Empresa', 'Direto na tabela');
    r := r || E'\nFALHOU - visitante gravou direto na tabela';
  exception when insufficient_privilege then
    r := r || E'\nok - visitante só grava pela função';
  end;

  begin
    perform public.enviar_pedido_de_parceria('Maria', 'sem-arroba', '31999990000', 'Empresa', 'Texto');
    r := r || E'\nFALHOU - aceitou e-mail inválido';
  exception when check_violation then
    r := r || E'\nok - e-mail inválido é recusado';
  end;

  begin
    perform public.enviar_pedido_de_parceria('Maria', 'maria@exemplo.invalid', '9999', 'Empresa', 'Texto');
    r := r || E'\nFALHOU - aceitou telefone sem DDD';
  exception when check_violation then
    r := r || E'\nok - telefone sem DDD é recusado';
  end;

  begin
    perform public.enviar_pedido_de_parceria(
      'Maria', 'maria@exemplo.invalid', '31999990000', 'Empresa', repeat('a', 2001)
    );
    r := r || E'\nFALHOU - aceitou texto acima do limite';
  exception when check_violation then
    r := r || E'\nok - texto acima do limite é recusado';
  end;

  begin
    perform public.enviar_pedido_de_parceria('Maria', 'maria@exemplo.invalid', '31999990000', 'Empresa', E'\n\t \n');
    r := r || E'\nFALHOU - aceitou texto só com espaços e quebras de linha';
  exception when check_violation then
    r := r || E'\nok - texto só com espaços e quebras de linha é recusado';
  end;

  begin
    perform public.enviar_pedido_de_parceria(
      'Maria', 'maria@exemplo.invalid', '31999990000', 'Empresa', repeat('a', 20000)
    );
    r := r || E'\nFALHOU - aceitou texto gigante';
  exception when check_violation then
    r := r || E'\nok - texto gigante é recusado antes de processar';
  end;

  reset role;
  select nome || '|' || email || '|' || telefone || '|' || empresa || '|' || contribuicao into v_txt
  from public.pedidos_de_parceria;
  r := r || E'\n'
    || case when v_txt = 'Maria Lima|maria@empresa.com|31999990000|Empresa Teste|Quero contratar formandos'
         then 'ok' else 'FALHOU' end
    || ' - visitante envia e o pedido fica normalizado';

  -- ===== Conta que não é do gestor =====
  perform set_config('request.jwt.claims', json_build_object('sub', v_outro, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into v_n from public.pedidos_de_parceria;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - quem não é gestor não lê os pedidos';

  begin
    insert into public.pedidos_de_parceria (nome, email, telefone, empresa, contribuicao)
    values ('Direto', 'direto@exemplo.invalid', '31999990000', 'Empresa', 'Direto na tabela');
    r := r || E'\nFALHOU - conta logada gravou direto na tabela';
  exception when insufficient_privilege then
    r := r || E'\nok - conta logada só grava pela função';
  end;
  reset role;

  -- ===== Gestor =====
  perform set_config('request.jwt.claims', json_build_object('sub', v_gestor, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into v_n from public.pedidos_de_parceria;
  r := r || E'\n' || case when v_n = 1 then 'ok' else 'FALHOU' end || ' - gestor lê os pedidos';

  begin
    update public.pedidos_de_parceria set nome = 'Outro nome';
    r := r || E'\nFALHOU - gestor alterou um pedido';
  exception when insufficient_privilege then
    r := r || E'\nok - gestor não altera pedido';
  end;

  begin
    delete from public.pedidos_de_parceria;
    r := r || E'\nFALHOU - gestor apagou um pedido';
  exception when insufficient_privilege then
    r := r || E'\nok - gestor não apaga pedido';
  end;
  reset role;

  -- ===== Teto de envios por hora =====
  insert into public.pedidos_de_parceria (nome, email, telefone, empresa, contribuicao)
  select 'Pedido ' || numero, 'pedido' || numero || '@exemplo.invalid', '31999990000', 'Empresa', 'Texto'
  from generate_series(1, 19) as numero;

  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  set local role anon;
  begin
    perform public.enviar_pedido_de_parceria('Maria', 'maria@exemplo.invalid', '31999990000', 'Empresa', 'Texto');
    r := r || E'\nFALHOU - passou do teto de envios por hora';
  exception when sqlstate '22023' then
    r := r || E'\nok - o teto de envios por hora recusa o excedente';
  end;
  reset role;

  raise exception '%', r;
end;
$$;
