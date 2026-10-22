---
name: migracao-sql
description: Cria e aplica migrations, RLS e funções no Supabase do portal FavelaWare, com o teste de RLS. Use ao criar ou alterar tabela, política, função, trigger ou índice, ou ao rodar SQL no banco.
---

# Migrations do portal (Supabase)

Nível 3 do CCMA: migration, RLS e função `security_definer` sempre passam por `planner`, `reviewer` e
`security-auditor`.

## Regras

- Uma migration por mudança, em `supabase/migrations/AAAAMMDDHHMMSS_assunto.sql`, em ordem de data. Nunca
  editar migration já aplicada: crie outra.
- Toda tabela nasce com `enable row level security` e as políticas necessárias, e ganha um teste em
  `supabase/testes/` (a RLS é quem protege o dado; a guarda de rota só organiza a navegação).
- Função `security_definer`: `set search_path = ''`, nomes totalmente qualificados e `revoke` para quem não deve
  chamar. Coluna sensível (papel, permissão) sem `grant` de `update` para o usuário.
- Idempotente quando possível (`if not exists`, `drop policy if exists`).
- Nunca coloque segredo no SQL nem em tabela. Valor por ambiente vira secret da Edge Function.

## Como aplicar

```bash
npx supabase db query --linked --project-ref <ref> -f supabase/migrations/<arquivo>.sql
```

`--project-ref` só vale junto com `--linked`. Depois de DDL, o PostgREST precisa recarregar o schema
(`notify pgrst, 'reload schema';` no fim da migration).

## Como testar

O teste roda numa transação e termina com um erro proposital que carrega o relatório, então nada fica gravado:

```bash
npx supabase db query --linked --project-ref <ref> -f supabase/testes/<assunto>.sql
```

Esperado: a mensagem começa com `RELATORIO` e todas as linhas dizem `ok`. Teste o que **não** pode acontecer
(papel errado, outro aluno, anônimo), não só o caminho feliz. Relate o resultado real, inclusive falha.
