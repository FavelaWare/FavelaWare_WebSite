-- Pedidos de parceria: o formulário público "Seja um parceiro" (/seja-parceiro).
--
-- 1. Tabela com os dados de contato de quem quer ser parceiro. São dados pessoais
--    de gente sem conta: ninguém de fora lê, altera ou apaga.
-- 2. O visitante (sem login) não ganha privilégio na tabela. Ele grava pela função
--    enviar_pedido_de_parceria, que normaliza os campos e segura o excesso de envios.
-- 3. Só o gestor lê (a lista em /dashboard/parcerias). Não há update nem delete
--    pela API: a limpeza, se um dia for preciso, é por SQL.

create table public.pedidos_de_parceria (
  id bigint generated always as identity primary key,
  nome text not null
    constraint pedidos_de_parceria_nome_tamanho check (char_length(btrim(nome, E' \t\n\r')) >= 2 and char_length(nome) <= 120),
  email text not null
    constraint pedidos_de_parceria_email_formato
      check (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  -- Só os dígitos, com DDD (igual a dados_instrutores)
  telefone text not null
    constraint pedidos_de_parceria_telefone_formato check (telefone ~ '^\d{10,11}$'),
  empresa text not null
    constraint pedidos_de_parceria_empresa_tamanho
      check (char_length(btrim(empresa, E' \t\n\r')) >= 2 and char_length(empresa) <= 120),
  contribuicao text not null
    constraint pedidos_de_parceria_contribuicao_tamanho
      check (char_length(btrim(contribuicao, E' \t\n\r')) >= 1 and char_length(contribuicao) <= 2000),
  criado_em timestamptz not null default now()
);
-- Nos checks, espaço, tabulação e quebra de linha não contam como texto (igual ao trim do site)

comment on table public.pedidos_de_parceria is
  'Pedidos do formulário público "Seja um parceiro". Dado pessoal: só o gestor lê.';

-- Serve à lista do gestor (mais novo primeiro) e à contagem do limite de envios
create index pedidos_de_parceria_criado_em_idx on public.pedidos_de_parceria (criado_em desc);

alter table public.pedidos_de_parceria enable row level security;

revoke all on public.pedidos_de_parceria from anon, authenticated;
grant select on public.pedidos_de_parceria to authenticated;

create policy "gestor le pedidos de parceria"
  on public.pedidos_de_parceria
  for select
  to authenticated
  using ((select private.eh_gestor()));

-- Envio do formulário. Devolve void: quem envia não recebe a linha de volta.
-- O teto por hora vale para todos os visitantes juntos (não guarda IP): segura
-- uma enxurrada automática sem coletar mais dado pessoal. Risco aceito: quem
-- esgota o teto de propósito bloqueia o formulário para os demais naquela hora
-- (a mensagem aponta os contatos do rodapé); a saída completa seria um CAPTCHA.
create function public.enviar_pedido_de_parceria(
  p_nome text,
  p_email text,
  p_telefone text,
  p_empresa text,
  p_contribuicao text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_maximo_por_hora constant integer := 20;
  c_brancos constant text := E' \t\n\r';
begin
  -- Texto gigante é recusado antes de qualquer processamento (os limites exatos são os checks)
  if octet_length(p_nome) > 1000 or octet_length(p_email) > 1000 or octet_length(p_telefone) > 100
    or octet_length(p_empresa) > 1000 or octet_length(p_contribuicao) > 10000 then
    raise exception 'Pedido de parceria acima do tamanho aceito' using errcode = 'check_violation';
  end if;

  -- Um envio por vez: sem a trava, envios simultâneos contariam antes de o outro gravar e furariam o teto
  perform pg_advisory_xact_lock(hashtext('public.pedidos_de_parceria'));

  if (
    select count(*)
    from public.pedidos_de_parceria
    where criado_em > now() - interval '1 hour'
  ) >= c_maximo_por_hora then
    raise exception 'Recebemos muitos pedidos agora. Tente de novo mais tarde ou fale com a gente pelos contatos do rodapé.'
      using errcode = '22023';
  end if;

  -- Formato e tamanho são conferidos pelos checks da tabela
  insert into public.pedidos_de_parceria (nome, email, telefone, empresa, contribuicao)
  values (
    btrim(p_nome, c_brancos),
    lower(btrim(p_email, c_brancos)),
    regexp_replace(p_telefone, '\D', '', 'g'),
    btrim(p_empresa, c_brancos),
    btrim(p_contribuicao, c_brancos)
  );
end;
$$;

revoke execute on function public.enviar_pedido_de_parceria(text, text, text, text, text) from public;
grant execute on function public.enviar_pedido_de_parceria(text, text, text, text, text) to anon, authenticated;
