-- Atividades em grupo (dupla, trio, equipe): um integrante envia, o instrutor corrige
-- uma vez e todos do grupo leem a entrega, o feedback e a nota. Issue #34.
--
-- Modelo:
-- - atividades.grupo_min / grupo_max: individual é 1 e 1; "em grupo" é grupo_max > 1
--   (não há coluna de formato: o que se deduz não se grava);
-- - atividades.grupos_montados_por: 'professor' (distribui antes) ou 'alunos' (quem
--   envia escolhe os colegas). Só vale quando a atividade é em grupo;
-- - grupos_da_atividade: um grupo de uma atividade;
-- - integrantes_do_grupo: ligação grupo <-> aluno. atividade_id repete o do grupo de
--   propósito (amarrado pela chave composta) para "um grupo por aluno por atividade"
--   caber numa constraint;
-- - tentativas.grupo_id: nulo no individual. A entrega é UMA só, com a nota nela;
--   participante_id é quem enviou. Nada é copiado: os integrantes leem pelo grupo.
--
-- Atividade individual não muda: mesma leitura, envio, numeração, correção e arquivo.
-- O navegador nunca manda grupo_id: o trigger de envio descobre o grupo e carimba.
-- Toda escrita em grupos e integrantes passa por função (não há grant de escrita).
--
-- Travas (advisory, por transação), sempre nesta ordem:
--   'atividade:<id>' -> 'grupo:<id>' ou '<atividade>:<participante>' (a de antes).
-- Envio pega a da atividade compartilhada; formar e ajustar grupo, exclusiva. Assim a
-- composição do grupo não muda no meio de um envio, e dois alunos não formam grupos
-- que se cruzam. Quem inclui integrante pega a exclusiva ANTES de qualquer outra trava
-- (o trigger de integrantes também pede a exclusiva: pedir só a compartilhada antes
-- dele travaria duas transações uma na outra).
--
-- Pode rodar mais de uma vez.

-- ============================================
-- 1. Atividade: tamanho do grupo e quem monta
-- ============================================
alter table public.atividades
  add column if not exists grupo_min smallint not null default 1,
  add column if not exists grupo_max smallint not null default 1,
  add column if not exists grupos_montados_por text not null default 'professor';

alter table public.atividades drop constraint if exists atividades_tamanho_do_grupo;
alter table public.atividades add constraint atividades_tamanho_do_grupo
  check (grupo_min >= 1 and grupo_min <= grupo_max and grupo_max <= 50);
alter table public.atividades drop constraint if exists atividades_grupos_montados_por;
alter table public.atividades add constraint atividades_grupos_montados_por
  check (grupos_montados_por in ('professor', 'alunos'));

grant insert (grupo_min, grupo_max, grupos_montados_por), update (grupo_min, grupo_max, grupos_montados_por)
  on public.atividades to authenticated;

-- ============================================
-- 2. Grupos e integrantes
-- ============================================
create table if not exists public.grupos_da_atividade (
  id           bigint generated always as identity primary key,
  atividade_id bigint not null references public.atividades (id) on delete cascade,
  criado_em    timestamptz not null default now(),
  criado_por   uuid references public.perfis (id) on delete set null,
  -- Alvo das chaves compostas: integrante e entrega são sempre da atividade do grupo
  constraint grupos_da_atividade_id_atividade_key unique (id, atividade_id)
);
create index if not exists grupos_da_atividade_atividade_id_idx on public.grupos_da_atividade (atividade_id);
create index if not exists grupos_da_atividade_criado_por_idx on public.grupos_da_atividade (criado_por);

create table if not exists public.integrantes_do_grupo (
  grupo_id        bigint not null,
  participante_id bigint not null references public.participantes (id) on delete cascade,
  atividade_id    bigint not null,
  -- Incluir alguém num grupo que já entregou dá leitura da entrega: fica registrado quem incluiu
  incluido_em     timestamptz not null default now(),
  incluido_por    uuid references public.perfis (id) on delete set null,
  primary key (grupo_id, participante_id),
  -- Cada aluno em no máximo um grupo por atividade
  constraint integrantes_um_grupo_por_atividade unique (atividade_id, participante_id),
  constraint integrantes_grupo_da_mesma_atividade foreign key (grupo_id, atividade_id)
    references public.grupos_da_atividade (id, atividade_id) on delete cascade
);
create index if not exists integrantes_do_grupo_participante_id_idx on public.integrantes_do_grupo (participante_id);
create index if not exists integrantes_do_grupo_incluido_por_idx on public.integrantes_do_grupo (incluido_por);

alter table public.grupos_da_atividade enable row level security;
alter table public.integrantes_do_grupo enable row level security;
revoke all on public.grupos_da_atividade, public.integrantes_do_grupo from anon, authenticated;
-- Por coluna: quem lê o grupo não lê o id da conta de quem criou ou incluiu
grant select (id, atividade_id, criado_em) on public.grupos_da_atividade to authenticated;
grant select (grupo_id, participante_id, atividade_id, incluido_em) on public.integrantes_do_grupo to authenticated;

-- ============================================
-- 3. Entrega do grupo
-- ============================================
alter table public.tentativas add column if not exists grupo_id bigint;

-- "no action" (e não "restrict"): apagar a atividade leva o grupo e a entrega na mesma
-- instrução; grupo com entrega, sozinho, não é apagado
alter table public.tentativas drop constraint if exists tentativas_grupo_da_mesma_atividade;
alter table public.tentativas add constraint tentativas_grupo_da_mesma_atividade
  foreign key (grupo_id, atividade_id) references public.grupos_da_atividade (id, atividade_id) on delete no action;

-- A numeração passa a ser por grupo quando há grupo: o aluno que troca de grupo pode
-- ter a "1ª tentativa" em cada um. No individual a unicidade é a de antes.
do $$
declare
  v_nome text;
begin
  -- Pela definição, não pelo nome: o unique nasceu sem nome próprio
  for v_nome in
    select conname from pg_constraint
    where conrelid = 'public.tentativas'::regclass and contype = 'u'
      and pg_get_constraintdef(oid) = 'UNIQUE (atividade_id, participante_id, numero)'
  loop
    execute format('alter table public.tentativas drop constraint %I', v_nome);
  end loop;
end $$;
create unique index if not exists tentativas_individual_numero_key
  on public.tentativas (atividade_id, participante_id, numero) where grupo_id is null;
create unique index if not exists tentativas_grupo_numero_key
  on public.tentativas (grupo_id, numero) where grupo_id is not null;
-- Repõe a cobertura que o unique antigo dava a (atividade_id, participante_id)
create index if not exists tentativas_atividade_participante_idx on public.tentativas (atividade_id, participante_id);

-- ============================================
-- 4. Apoio das regras de leitura
-- ============================================
-- Grupos do aluno logado (função à parte: a regra de integrantes não pode ler a si mesma)
create or replace function private.meus_grupos()
returns setof bigint
language sql
stable
security definer
set search_path = ''
as $$
  select i.grupo_id from public.integrantes_do_grupo i where i.participante_id = private.meu_participante();
$$;

-- Arquivos das entregas dos grupos do aluno logado
create or replace function private.arquivos_dos_meus_grupos()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select t.arquivo_id
  from public.tentativas t
  where t.arquivo_id is not null and t.grupo_id in (select private.meus_grupos());
$$;

-- Quem edita a atividade também cuida dos grupos dela (professor da turma, gestor e colaborador)
create or replace function private.pode_gerir_atividade(p_atividade bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.atividades a
    where a.id = p_atividade and (private.pode_fazer_chamada(a.turma_id) or private.eh_colaborador())
  );
$$;

revoke execute on function private.meus_grupos(), private.arquivos_dos_meus_grupos(), private.pode_gerir_atividade(bigint)
  from public, anon;
grant execute on function private.meus_grupos(), private.arquivos_dos_meus_grupos(), private.pode_gerir_atividade(bigint)
  to authenticated;

-- ============================================
-- 5. Regras de leitura
-- ============================================
drop policy if exists "le grupos" on public.grupos_da_atividade;
create policy "le grupos" on public.grupos_da_atividade for select to authenticated
  using (
    (select private.eh_gestor())
    or (select private.eh_colaborador())
    or atividade_id in (select private.minhas_atividades())
    or id in (select private.meus_grupos())
  );

drop policy if exists "le integrantes" on public.integrantes_do_grupo;
create policy "le integrantes" on public.integrantes_do_grupo for select to authenticated
  using (
    (select private.eh_gestor())
    or (select private.eh_colaborador())
    or atividade_id in (select private.minhas_atividades())
    or grupo_id in (select private.meus_grupos())
  );

-- Entrega individual: só o próprio aluno, como antes. Entrega de grupo: quem está no grupo
-- (quem enviou e depois saiu do grupo deixa de ler).
drop policy if exists "le tentativas" on public.tentativas;
create policy "le tentativas" on public.tentativas for select to authenticated
  using (
    (select private.eh_gestor())
    or (grupo_id is null and participante_id = (select private.meu_participante()))
    or grupo_id in (select private.meus_grupos())
    or atividade_id in (select private.minhas_atividades())
  );

-- O arquivo enviado por um integrante é lido pelos outros (arquivo solto de colega, não)
drop policy if exists "le arquivos de entrega" on public.arquivos_entrega;
create policy "le arquivos de entrega" on public.arquivos_entrega for select to authenticated
  using (
    descartado_em is null and drive_id is not null
    and (
      (select private.eh_gestor())
      or participante_id = (select private.meu_participante())
      or atividade_id in (select private.minhas_atividades())
      or id in (select private.arquivos_dos_meus_grupos())
    )
  );

-- ============================================
-- 6. Regras dos integrantes e do formato
-- ============================================
-- Integrante: aluno da MESMA turma da atividade, atividade em grupo e grupo sem passar
-- do máximo. Vale para toda função que inclui e para quem grava como administrador.
create or replace function private.integrantes_ao_incluir()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_turma bigint;
  v_max smallint;
  v_outros int;
begin
  perform pg_advisory_xact_lock(hashtextextended('atividade:' || new.atividade_id::text, 0));

  select a.turma_id, a.grupo_max into v_turma, v_max from public.atividades a where a.id = new.atividade_id;
  if v_max is null or v_max <= 1 then
    raise exception 'Esta atividade é individual' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.participantes p
    where p.id = new.participante_id and p.turma_id = v_turma and p.funcao = 'aluno'
  ) then
    raise exception 'Aluno não encontrado nesta turma' using errcode = '22023';
  end if;

  select count(*) into v_outros
  from public.integrantes_do_grupo i
  where i.grupo_id = new.grupo_id and i.participante_id <> new.participante_id;
  if v_outros + 1 > v_max then
    raise exception 'O grupo já está completo (até % integrantes)', v_max using errcode = '22023';
  end if;
  if tg_op = 'INSERT' then
    new.incluido_em := now();
    new.incluido_por := (select auth.uid());
  end if;
  return new;
end;
$$;
revoke all on function private.integrantes_ao_incluir() from public, anon, authenticated;

drop trigger if exists ao_incluir_integrante on public.integrantes_do_grupo;
create trigger ao_incluir_integrante
  before insert or update on public.integrantes_do_grupo
  for each row execute function private.integrantes_ao_incluir();

-- Formato não muda depois das entregas, e o máximo não fica menor que um grupo já montado.
-- Atividade que volta a ser individual perde os grupos (ainda sem entregas).
-- "security definer" porque o colaborador não lê as entregas: com a regra dele, a
-- conferência diria sempre "sem entregas".
create or replace function private.atividades_proteger_formato()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_maior int;
begin
  if new.grupo_min = old.grupo_min and new.grupo_max = old.grupo_max
    and new.grupos_montados_por = old.grupos_montados_por then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('atividade:' || new.id::text, 0));

  if private.atividade_tem_entregas(new.id) then
    raise exception 'Esta atividade já tem entregas: o formato não pode mais mudar' using errcode = '22023';
  end if;
  if new.grupo_max = 1 then
    delete from public.grupos_da_atividade g where g.atividade_id = new.id;
    return new;
  end if;
  select max(n) into v_maior
  from (select count(*) as n from public.integrantes_do_grupo i where i.atividade_id = new.id group by i.grupo_id) g;
  if v_maior > new.grupo_max then
    raise exception 'Já existe um grupo com % integrantes: ajuste os grupos antes de diminuir o máximo', v_maior
      using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke all on function private.atividades_proteger_formato() from public, anon, authenticated;

drop trigger if exists proteger_formato on public.atividades;
create trigger proteger_formato
  before update of grupo_min, grupo_max, grupos_montados_por on public.atividades
  for each row execute function private.atividades_proteger_formato();

-- Aluno que troca de turma sai dos grupos da turma antiga que ainda não entregaram
-- (grupo que fica vazio é apagado). Onde o grupo já entregou ele continua: é o trabalho
-- dele, e a nota segue visível, como acontece com a entrega individual.
create or replace function private.participantes_ao_trocar_turma()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_atividade bigint;
begin
  if new.turma_id is not distinct from old.turma_id then
    return new;
  end if;
  -- Uma atividade por vez, em ordem, com a trava exclusiva de quem ajusta grupos
  for v_atividade in
    select i.atividade_id
    from public.integrantes_do_grupo i
    join public.atividades a on a.id = i.atividade_id
    where i.participante_id = new.id and a.turma_id is distinct from new.turma_id
    order by i.atividade_id
  loop
    perform pg_advisory_xact_lock(hashtextextended('atividade:' || v_atividade::text, 0));
    delete from public.integrantes_do_grupo i
    where i.participante_id = new.id and i.atividade_id = v_atividade
      and not exists (select 1 from public.tentativas t where t.grupo_id = i.grupo_id);
    delete from public.grupos_da_atividade g
    where g.atividade_id = v_atividade
      and not exists (select 1 from public.integrantes_do_grupo i where i.grupo_id = g.id)
      and not exists (select 1 from public.tentativas t where t.grupo_id = g.id);
  end loop;
  return new;
end;
$$;
revoke all on function private.participantes_ao_trocar_turma() from public, anon, authenticated;

drop trigger if exists ao_trocar_turma on public.participantes;
create trigger ao_trocar_turma
  after update of turma_id on public.participantes
  for each row execute function private.participantes_ao_trocar_turma();

-- Apagar o aluno que enviou não pode levar a entrega e a nota do grupo (tentativas e
-- arquivos_entrega apagam junto com o participante): antes de apagar, a entrega do grupo
-- e o arquivo dela passam para outro integrante. Sem outro integrante, vão junto, como
-- a entrega individual.
-- O herdeiro precisa existir em participantes: ao apagar a turma, os integrantes somem
-- um a um na mesma instrução, e quem já foi apagado não pode herdar (a cascata que tira
-- a linha de integrantes só roda no fim).
create or replace function private.participantes_ao_apagar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.arquivos_entrega a
  set participante_id = h.herdeiro
  from public.tentativas t
  cross join lateral (
    select i.participante_id as herdeiro
    from public.integrantes_do_grupo i
    join public.participantes p on p.id = i.participante_id
    where i.grupo_id = t.grupo_id and i.participante_id <> old.id
    order by i.participante_id
    limit 1
  ) h
  where t.participante_id = old.id and t.grupo_id is not null and a.id = t.arquivo_id;

  update public.tentativas t
  set participante_id = h.herdeiro
  from (
    select distinct on (i.grupo_id) i.grupo_id, i.participante_id as herdeiro
    from public.integrantes_do_grupo i
    join public.participantes p on p.id = i.participante_id
    where i.participante_id <> old.id
    order by i.grupo_id, i.participante_id
  ) h
  where t.participante_id = old.id and t.grupo_id = h.grupo_id;
  return old;
end;
$$;
revoke all on function private.participantes_ao_apagar() from public, anon, authenticated;

drop trigger if exists ao_apagar_participante on public.participantes;
create trigger ao_apagar_participante
  before delete on public.participantes
  for each row execute function private.participantes_ao_apagar();

-- ============================================
-- 7. Envio, correção e reserva de arquivo: o grupo no lugar do aluno
-- ============================================
-- Igual a 20260927101000_regras_de_entrega_ajustes.sql, mais o grupo: em atividade em
-- grupo o remetente precisa estar num grupo com o mínimo de integrantes, a "última
-- tentativa" é a do grupo (qualquer integrante reenvia depois do Refazer) e o grupo é
-- carimbado aqui.
create or replace function private.tentativas_ao_enviar()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_ativ record;
  v_ultima record;
  v_mime text;
  v_grupo bigint;
  v_integrantes int;
begin
  -- A composição do grupo não muda durante o envio (formar e ajustar pegam esta trava exclusiva)
  perform pg_advisory_xact_lock_shared(hashtextextended('atividade:' || new.atividade_id::text, 0));

  select prazo, exige_texto, exige_link, tipo_link, exige_arquivo, formatos, grupo_min, grupo_max, grupos_montados_por
  into v_ativ
  from public.atividades where id = new.atividade_id;

  if v_ativ.grupo_max > 1 then
    select i.grupo_id into v_grupo
    from public.integrantes_do_grupo i
    where i.atividade_id = new.atividade_id and i.participante_id = new.participante_id;
    if v_grupo is null then
      raise exception '%', case v_ativ.grupos_montados_por
        when 'alunos' then 'Escolha os colegas do grupo para enviar'
        else 'Você ainda não está em um grupo nesta atividade. Fale com o seu instrutor.' end
        using errcode = '22023';
    end if;
    select count(*) into v_integrantes from public.integrantes_do_grupo i where i.grupo_id = v_grupo;
    if v_integrantes < v_ativ.grupo_min then
      raise exception 'O grupo precisa de pelo menos % integrantes para enviar', v_ativ.grupo_min using errcode = '22023';
    end if;

    -- Um envio por vez para o mesmo grupo (evita duas "1ª tentativa" de integrantes diferentes)
    perform pg_advisory_xact_lock(hashtextextended('grupo:' || v_grupo::text, 0));

    select numero, status into v_ultima
    from public.tentativas
    where grupo_id = v_grupo
    order by numero desc
    limit 1;
  else
    -- Um envio por vez para o mesmo aluno e atividade (evita duas "1ª tentativa")
    perform pg_advisory_xact_lock(hashtextextended(new.atividade_id::text || ':' || new.participante_id::text, 0));

    select numero, status into v_ultima
    from public.tentativas
    where atividade_id = new.atividade_id and participante_id = new.participante_id and grupo_id is null
    order by numero desc
    limit 1;
  end if;

  if v_ultima.numero is not null and v_ultima.status <> 'refazer' then
    raise exception 'Já existe um envio aguardando correção ou concluído' using errcode = '22023';
  end if;
  -- O prazo vale para o primeiro envio; o "Refazer" do professor reabre o envio
  if v_ultima.numero is null and now() > v_ativ.prazo then
    raise exception 'O envio das tarefas não está mais disponível' using errcode = '22023';
  end if;

  -- Exigências da atividade
  if v_ativ.exige_texto and coalesce(btrim(new.comentario, E' \t\r\n'), '') = '' then
    raise exception 'Esta atividade pede um comentário ou resposta' using errcode = '22023';
  end if;
  if v_ativ.exige_link and new.link is null then
    raise exception '%', case v_ativ.tipo_link
      when 'github' then 'Esta atividade pede o link do GitHub'
      when 'drive' then 'Esta atividade pede o link do Google Drive'
      else 'Esta atividade pede um link' end
      using errcode = '22023';
  end if;
  if new.link is not null and not private.link_do_tipo(new.link, v_ativ.tipo_link) then
    raise exception '%', case v_ativ.tipo_link
      when 'github' then 'O link precisa ser do GitHub (https://github.com/...)'
      else 'O link precisa ser do Google Drive (https://drive.google.com/...)' end
      using errcode = '22023';
  end if;
  if v_ativ.exige_arquivo and new.arquivo_id is null and new.arquivo_caminho is null then
    raise exception 'Esta atividade pede um arquivo' using errcode = '22023';
  end if;

  if new.arquivo_caminho is not null then
    if not starts_with(new.arquivo_caminho, new.atividade_id::text || '/' || new.participante_id::text || '/') then
      raise exception 'Arquivo fora da pasta da entrega' using errcode = '42501';
    end if;
    if not private.entrega_existe(new.arquivo_caminho) then
      raise exception 'Arquivo não encontrado' using errcode = '22023';
    end if;
  end if;

  if new.arquivo_id is not null then
    select a.mime into v_mime
    from public.arquivos_entrega a
    where a.id = new.arquivo_id and a.atividade_id = new.atividade_id and a.participante_id = new.participante_id
      and a.descartado_em is null and a.drive_id is not null;
    if v_mime is null then
      raise exception 'Arquivo não encontrado' using errcode = '42501';
    end if;
    if cardinality(v_ativ.formatos) > 0 and not (coalesce(private.formato_do_mime(v_mime), '') = any (v_ativ.formatos)) then
      raise exception 'Formato de arquivo não aceito nesta atividade' using errcode = '22023';
    end if;
  end if;

  new.grupo_id := v_grupo;
  new.numero := coalesce(v_ultima.numero, 0) + 1;
  new.enviada_em := now();
  new.enviada_por := (select auth.uid());
  new.status := 'aguardando';
  new.feedback := null;
  new.nota := null;
  new.avaliada_em := null;
  new.avaliada_por := null;
  new.avaliada_por_nome := null;
  return new;
end;
$$;

-- Igual a 20260925120000_perfil_e_entregas_ajustes.sql, mais o grupo: a trava e o "só a
-- última tentativa" valem para o grupo quando a entrega é de grupo.
create or replace function private.tentativas_ao_avaliar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;
  if not (private.eh_gestor() or new.atividade_id in (select private.minhas_atividades())) then
    raise exception 'Sem permissão para avaliar' using errcode = '42501';
  end if;

  if new.grupo_id is not null then
    perform pg_advisory_xact_lock(hashtextextended('grupo:' || new.grupo_id::text, 0));
    if exists (select 1 from public.tentativas t where t.grupo_id = new.grupo_id and t.numero > new.numero) then
      raise exception 'Só a última tentativa pode ser avaliada' using errcode = '22023';
    end if;
  else
    perform pg_advisory_xact_lock(hashtextextended(new.atividade_id::text || ':' || new.participante_id::text, 0));
    if exists (
      select 1 from public.tentativas t
      where t.atividade_id = new.atividade_id and t.participante_id = new.participante_id
        and t.grupo_id is null and t.numero > new.numero
    ) then
      raise exception 'Só a última tentativa pode ser avaliada' using errcode = '22023';
    end if;
  end if;
  if new.status = 'aguardando' then
    raise exception 'Escolha Concluída ou Refazer' using errcode = '22023';
  end if;

  new.avaliada_em := now();
  new.avaliada_por := (select auth.uid());
  new.avaliada_por_nome := (select nome from public.perfis where id = (select auth.uid()));
  return new;
end;
$$;

-- Igual a 20260927100000_regras_de_entrega.sql, mais o grupo: o "envio aberto" olha a
-- última tentativa do grupo do aluno. Alunos que ainda vão montar o grupo (no envio)
-- podem reservar até o prazo, como no 1º envio (a entrega de um grupo de que o aluno
-- saiu não conta); com grupos do professor, quem está sem grupo não reserva.
create or replace function public.reservar_arquivo(p_atividade bigint, p_nome text, p_mime text, p_tamanho integer)
returns table (arquivo_id uuid, participante_id bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_participante bigint := private.meu_participante();
  v_prazo timestamptz;
  v_formatos text[];
  v_grupo_max smallint;
  v_montados_por text;
  v_grupo bigint;
  v_status text;
  v_soltos int;
  v_bytes bigint;
  v_id uuid;
begin
  if v_participante is null or not private.pode_enviar(p_atividade, v_participante) then
    raise exception 'Você não pode enviar arquivo para esta atividade' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock_shared(hashtextextended('atividade:' || p_atividade::text, 0));
  -- Mesma trava do trigger de envio: um pedido por vez para este aluno e atividade
  perform pg_advisory_xact_lock(hashtextextended(p_atividade::text || ':' || v_participante::text, 0));

  -- Mesma regra do trigger tentativas_ao_enviar (1º envio até o prazo; "refazer" reabre).
  -- Se mudar lá, mude aqui.
  select prazo, formatos, grupo_max, grupos_montados_por into v_prazo, v_formatos, v_grupo_max, v_montados_por
  from public.atividades where id = p_atividade;
  if v_grupo_max > 1 then
    select i.grupo_id into v_grupo
    from public.integrantes_do_grupo i
    where i.atividade_id = p_atividade and i.participante_id = v_participante;
    if v_grupo is null and v_montados_por = 'professor' then
      raise exception 'Você ainda não está em um grupo nesta atividade. Fale com o seu instrutor.' using errcode = '22023';
    end if;
  end if;
  if v_grupo is not null then
    select status into v_status
    from public.tentativas
    where grupo_id = v_grupo
    order by numero desc limit 1;
  elsif v_grupo_max = 1 then
    select status into v_status
    from public.tentativas
    where atividade_id = p_atividade and tentativas.participante_id = v_participante and grupo_id is null
    order by numero desc limit 1;
  end if;
  -- (atividade em grupo e aluno ainda sem grupo: será o 1º envio do grupo que ele montar)
  if (v_status is null and now() > v_prazo) or (v_status is not null and v_status <> 'refazer') then
    raise exception 'O envio das tarefas não está mais disponível' using errcode = '22023';
  end if;

  if cardinality(v_formatos) > 0 and not (coalesce(private.formato_do_mime(p_mime), '') = any (v_formatos)) then
    raise exception 'Formato de arquivo não aceito nesta atividade' using errcode = '22023';
  end if;

  select count(*) into v_soltos
  from public.arquivos_entrega a
  where a.atividade_id = p_atividade and a.participante_id = v_participante
    and a.criado_em > now() - interval '24 hours'
    and not exists (select 1 from public.tentativas t where t.arquivo_id = a.id);
  if v_soltos >= 5 then
    raise exception 'Muitos arquivos enviados sem concluir a entrega. Tente de novo amanhã.' using errcode = '22023';
  end if;

  -- Cota diária do aluno (todas as atividades): a trava acima é por atividade,
  -- então esta conta é aproximada entre atividades diferentes ao mesmo tempo
  select coalesce(sum(tamanho), 0) into v_bytes
  from public.arquivos_entrega a
  where a.participante_id = v_participante and a.criado_em > now() - interval '24 hours';
  if v_bytes + p_tamanho > 50 * 1024 * 1024 then
    raise exception 'Você atingiu o limite de 50 MB de arquivos por dia. Tente de novo amanhã.' using errcode = '22023';
  end if;

  insert into public.arquivos_entrega (atividade_id, participante_id, nome, mime, tamanho)
  values (p_atividade, v_participante, p_nome, p_mime, p_tamanho)
  returning id into v_id;

  return query select v_id, v_participante;
end;
$$;

-- ============================================
-- 8. Funções para as telas
-- ============================================
-- Colegas da turma ainda sem grupo na atividade (só id e nome: o aluno não lê a ficha
-- dos colegas). Vazio para quem não pode enviar, para quem já tem grupo, depois do prazo
-- ou quando os alunos não montam o grupo.
create or replace function public.colegas_livres(p_atividade bigint)
returns table (id bigint, nome text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.nome
  from public.atividades a
  join public.participantes p on p.turma_id = a.turma_id and p.funcao = 'aluno'
  where a.id = p_atividade
    and a.grupo_max > 1 and a.grupos_montados_por = 'alunos'
    and private.pode_enviar(p_atividade, private.meu_participante())
    and (a.prazo is null or a.prazo > now())
    and p.id <> private.meu_participante()
    and not exists (
      select 1 from public.integrantes_do_grupo i
      where i.atividade_id = a.id and i.participante_id in (p.id, private.meu_participante())
    )
  order by p.nome;
$$;

-- Quem está nos grupos do aluno logado, com o nome (para "Seu grupo: Ana, João")
create or replace function public.integrantes_dos_meus_grupos()
returns table (atividade_id bigint, grupo_id bigint, participante_id bigint, nome text)
language sql
stable
security definer
set search_path = ''
as $$
  select i.atividade_id, i.grupo_id, i.participante_id, p.nome
  from public.integrantes_do_grupo i
  join public.participantes p on p.id = i.participante_id
  where i.grupo_id in (select private.meus_grupos())
  order by i.atividade_id, p.nome;
$$;

-- Alunos montam: forma o grupo (quem envia + colegas) e envia, tudo ou nada.
-- Devolve o id da entrega.
create or replace function public.enviar_em_grupo(
  p_atividade bigint,
  p_colegas bigint[],
  p_comentario text,
  p_link text,
  p_arquivo_id uuid
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_eu bigint := private.meu_participante();
  v_colegas bigint[] := coalesce(p_colegas, '{}');
  v_min smallint;
  v_max smallint;
  v_montados_por text;
  v_grupo bigint;
  v_tentativa bigint;
begin
  if v_eu is null or not private.pode_enviar(p_atividade, v_eu) then
    raise exception 'Você não pode enviar esta atividade' using errcode = '42501';
  end if;
  -- Antes da trava: lista gigante não segura os envios da turma
  if cardinality(v_colegas) > 49 then
    raise exception 'Lista de colegas inválida' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('atividade:' || p_atividade::text, 0));

  select grupo_min, grupo_max, grupos_montados_por into v_min, v_max, v_montados_por
  from public.atividades where id = p_atividade;
  if v_max <= 1 or v_montados_por <> 'alunos' then
    raise exception 'Nesta atividade os grupos não são montados pelos alunos' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.integrantes_do_grupo i where i.atividade_id = p_atividade and i.participante_id = v_eu
  ) then
    raise exception 'Você já está em um grupo nesta atividade' using errcode = '22023';
  end if;
  if array_position(v_colegas, null) is not null or v_eu = any (v_colegas)
    or (select count(distinct c) from unnest(v_colegas) c) <> cardinality(v_colegas) then
    raise exception 'Lista de colegas inválida' using errcode = '22023';
  end if;
  if cardinality(v_colegas) + 1 < v_min or cardinality(v_colegas) + 1 > v_max then
    raise exception 'O grupo precisa ter de % a % integrantes', v_min, v_max using errcode = '22023';
  end if;

  insert into public.grupos_da_atividade (atividade_id, criado_por)
  values (p_atividade, (select auth.uid()))
  returning id into v_grupo;
  begin
    insert into public.integrantes_do_grupo (grupo_id, participante_id, atividade_id)
    select v_grupo, c, p_atividade from unnest(array_prepend(v_eu, v_colegas)) c;
  exception when unique_violation then
    raise exception 'Um dos colegas já está em um grupo nesta atividade' using errcode = '22023';
  end;

  -- O trigger de envio aplica todas as regras da entrega e carimba o grupo
  insert into public.tentativas (atividade_id, participante_id, comentario, link, arquivo_id)
  values (p_atividade, v_eu, p_comentario, p_link, p_arquivo_id)
  returning id into v_tentativa;
  return v_tentativa;
end;
$$;

-- Professor monta: grava a distribuição inteira. p_grupos é [[id, id], [id, id, id], ...].
-- Grupo que já entregou fica como está; os outros são trocados pelos novos.
create or replace function public.definir_grupos(p_atividade bigint, p_grupos jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_max smallint;
  v_montados_por text;
  v_itens jsonb;
  v_grupo bigint;
begin
  if not private.pode_gerir_atividade(p_atividade) then
    raise exception 'Sem permissão para montar os grupos desta atividade' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('atividade:' || p_atividade::text, 0));

  select grupo_max, grupos_montados_por into v_max, v_montados_por from public.atividades where id = p_atividade;
  if v_max <= 1 or v_montados_por <> 'professor' then
    raise exception 'Nesta atividade os grupos não são montados pelo professor' using errcode = '22023';
  end if;

  if p_grupos is null or jsonb_typeof(p_grupos) <> 'array' or jsonb_array_length(p_grupos) > 100 then
    raise exception 'Lista de grupos inválida' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_grupos) g
    where jsonb_typeof(g) <> 'array' or jsonb_array_length(g) = 0
  ) then
    raise exception 'Lista de grupos inválida' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements(p_grupos) g where jsonb_array_length(g) > v_max) then
    raise exception 'Cada grupo pode ter até % integrantes', v_max using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_grupos) g, jsonb_array_elements(g) x
    where jsonb_typeof(x) <> 'number' or x::text !~ '^[1-9][0-9]{0,17}$'
  ) then
    raise exception 'Lista de grupos inválida' using errcode = '22023';
  end if;
  if (select count(*) from jsonb_array_elements(p_grupos) g, jsonb_array_elements_text(g) x)
    <> (select count(distinct x) from jsonb_array_elements(p_grupos) g, jsonb_array_elements_text(g) x) then
    raise exception 'Um aluno aparece em mais de um grupo' using errcode = '22023';
  end if;

  delete from public.grupos_da_atividade g
  where g.atividade_id = p_atividade
    and not exists (select 1 from public.tentativas t where t.grupo_id = g.id);

  for v_itens in select g from jsonb_array_elements(p_grupos) g loop
    insert into public.grupos_da_atividade (atividade_id, criado_por)
    values (p_atividade, (select auth.uid()))
    returning id into v_grupo;
    begin
      insert into public.integrantes_do_grupo (grupo_id, participante_id, atividade_id)
      select v_grupo, x::bigint, p_atividade from jsonb_array_elements_text(v_itens) x;
    exception when unique_violation then
      raise exception 'Um dos alunos está em um grupo que já entregou' using errcode = '22023';
    end;
  end loop;
end;
$$;

-- Inclui o aluno num grupo da atividade (p_grupo nulo cria um grupo novo). Devolve o grupo.
create or replace function public.incluir_no_grupo(p_atividade bigint, p_participante bigint, p_grupo bigint default null)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_grupo bigint := p_grupo;
begin
  if not private.pode_gerir_atividade(p_atividade) then
    raise exception 'Sem permissão para ajustar os grupos desta atividade' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('atividade:' || p_atividade::text, 0));

  if v_grupo is null then
    insert into public.grupos_da_atividade (atividade_id, criado_por)
    values (p_atividade, (select auth.uid()))
    returning id into v_grupo;
  elsif not exists (
    select 1 from public.grupos_da_atividade g where g.id = v_grupo and g.atividade_id = p_atividade
  ) then
    raise exception 'Grupo não encontrado' using errcode = '22023';
  end if;

  begin
    insert into public.integrantes_do_grupo (grupo_id, participante_id, atividade_id)
    values (v_grupo, p_participante, p_atividade);
  exception when unique_violation then
    raise exception 'Este aluno já está em um grupo nesta atividade' using errcode = '22023';
  end;
  return v_grupo;
end;
$$;

-- Tira o aluno do grupo dele na atividade. Grupo que fica vazio e sem entrega é apagado;
-- o último integrante de um grupo que já entregou não sai (a entrega ficaria sem ninguém).
create or replace function public.tirar_do_grupo(p_atividade bigint, p_participante bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_grupo bigint;
  v_restam int;
begin
  if not private.pode_gerir_atividade(p_atividade) then
    raise exception 'Sem permissão para ajustar os grupos desta atividade' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('atividade:' || p_atividade::text, 0));

  select i.grupo_id into v_grupo
  from public.integrantes_do_grupo i
  where i.atividade_id = p_atividade and i.participante_id = p_participante;
  if v_grupo is null then
    raise exception 'Este aluno não está em um grupo nesta atividade' using errcode = '22023';
  end if;

  select count(*) into v_restam
  from public.integrantes_do_grupo i
  where i.grupo_id = v_grupo and i.participante_id <> p_participante;
  if v_restam = 0 and exists (select 1 from public.tentativas t where t.grupo_id = v_grupo) then
    raise exception 'O grupo já entregou: o último integrante não pode sair' using errcode = '22023';
  end if;

  delete from public.integrantes_do_grupo i where i.grupo_id = v_grupo and i.participante_id = p_participante;
  if v_restam = 0 then
    delete from public.grupos_da_atividade g where g.id = v_grupo;
  end if;
end;
$$;

revoke execute on function
  public.colegas_livres(bigint),
  public.integrantes_dos_meus_grupos(),
  public.enviar_em_grupo(bigint, bigint[], text, text, uuid),
  public.definir_grupos(bigint, jsonb),
  public.incluir_no_grupo(bigint, bigint, bigint),
  public.tirar_do_grupo(bigint, bigint)
  from public, anon;
grant execute on function
  public.colegas_livres(bigint),
  public.integrantes_dos_meus_grupos(),
  public.enviar_em_grupo(bigint, bigint[], text, text, uuid),
  public.definir_grupos(bigint, jsonb),
  public.incluir_no_grupo(bigint, bigint, bigint),
  public.tirar_do_grupo(bigint, bigint)
  to authenticated;
