# Inventário de agentes e skills

Levantamento das pastas `.claude/skills`, `.agents/skills` e `.claude/agents` dos projetos locais (projeto SDK, site institucional e demais). **42 skills distintas** e **6 agentes**, os mesmos em todos os projetos.

## Agentes

| Agente | Escreve? | Papel |
| --- | --- | --- |
| `planner` | não | entende o comportamento atual e desenha a menor alteração segura |
| `coder` | sim | implementa o plano |
| `tester` | sim (testes) | roda e cobre o que mudou |
| `reviewer` | não | revisão independente do diff |
| `security-auditor` | não | checklist de segurança; crítica bloqueia |
| `auditor-de-padroes` | não | mede a distância até as boas práticas e propõe ondas (fora do PR) |

Quem escreve não aprova. Estão em `.claude/agents` no portal e no Favelab.

## Skills

Classificação: **Reaproveitar** (genérica, serve como está), **Adaptar** (modelo, trocar nomes e exemplos) e **Manter** (específica de um produto).

| Skill | Onde existe | Decisão | Motivo |
| --- | --- | --- | --- |
| `3d-web-experience` | dados educacionais, lumina-bot, lumina-website, modelos de CI, portal, projeto SDK, qualiacad-website, site institucional, weekly-brain-challenge | Reaproveitar | genérica de web e 3D |
| `adicionar-ilha-missao` | Favelab | Manter no Favelab | específica do jogo |
| `adicionar-tipo-de-exercicio` | Favelab | Manter no Favelab | específica do jogo |
| `audit-codebase` | Favelab, dados educacionais, lumina-bot, lumina-website, modelos de CI, portal, projeto SDK, qualiacad-website, site institucional, weekly-brain-challenge | Reaproveitar | fluxo de qualidade e segurança; já no portal e no Favelab |
| `boas-praticas` | Favelab, dados educacionais, lumina-bot, lumina-website, modelos de CI, portal, projeto SDK, qualiacad-website, site institucional, weekly-brain-challenge | Reaproveitar | fluxo de qualidade e segurança; já no portal e no Favelab |
| `ccma` | Favelab, dados educacionais, lumina-bot, lumina-website, modelos de CI, portal, projeto SDK, qualiacad-website, site institucional, weekly-brain-challenge | Reaproveitar | fluxo de qualidade e segurança; já no portal e no Favelab |
| `code-security` | Favelab, dados educacionais, lumina-bot, lumina-website, modelos de CI, portal, projeto SDK, qualiacad-website, site institucional, weekly-brain-challenge | Reaproveitar | fluxo de qualidade e segurança; já no portal e no Favelab |
| `conceptual-modeling` | dados educacionais, lumina-bot, lumina-website, modelos de CI, portal, projeto SDK, qualiacad-website, site institucional, weekly-brain-challenge | Reaproveitar | modelagem de dados; portal e Favelab usam Postgres |
| `convencoes-arquitetura` | Favelab | Manter no Favelab | específica do jogo |
| `data-modeling-fundamentals` | dados educacionais, lumina-bot, lumina-website, modelos de CI, portal, projeto SDK, qualiacad-website, site institucional, weekly-brain-challenge | Reaproveitar | modelagem de dados; portal e Favelab usam Postgres |
| `database-schema-designer` | dados educacionais, lumina-bot, lumina-website, modelos de CI, portal, projeto SDK, qualiacad-website, site institucional, weekly-brain-challenge | Reaproveitar | modelagem de dados; portal e Favelab usam Postgres |
| `deploy` | Favelab, portal | Adaptar | cada projeto tem a sua (Favelab: Vercel e PAT; portal: Hostinger e Supabase CLI) |
| `desafios-1x1` | Favelab | Manter no Favelab | específica do jogo |
| `entity-relationship-modeling` | dados educacionais, lumina-bot, lumina-website, modelos de CI, portal, projeto SDK, qualiacad-website, site institucional, weekly-brain-challenge | Reaproveitar | modelagem de dados; portal e Favelab usam Postgres |
| `favelaware-padrao-visual` | portal | Adaptar | só no portal; modelo para a skill de padrão visual do Favelab |
| `frontend-design` | Favelab, dados educacionais, lumina-bot, lumina-website, modelos de CI, portal, projeto SDK, qualiacad-website, site institucional, weekly-brain-challenge | Reaproveitar | design; base do design system do Favelab |
| `lumina-navegacao` | dados educacionais, lumina-website | Adaptar | de outro produto: modelo para as skills próprias, sem copiar nome ou detalhe |
| `lumina-padrao-visual` | dados educacionais, lumina-website | Adaptar | de outro produto: modelo para as skills próprias, sem copiar nome ou detalhe |
| `lumina-perf-web` | dados educacionais, lumina-website | Adaptar | de outro produto: modelo para as skills próprias, sem copiar nome ou detalhe |
| `lumina-web-3d` | dados educacionais, lumina-website | Adaptar | de outro produto: modelo para as skills próprias, sem copiar nome ou detalhe |
| `migracao-sql` | Favelab, portal | Adaptar | cada projeto tem a sua (Favelab: Vercel e PAT; portal: Hostinger e Supabase CLI) |
| `motor-git` | Favelab | Manter no Favelab | específica do jogo |
| `navegacao-web` | Favelab, dados educacionais, lumina-bot, lumina-website, modelos de CI, portal, projeto SDK, qualiacad-website, site institucional, weekly-brain-challenge | Reaproveitar | genérica de web e 3D |
| `novo-motor-de-execucao` | Favelab | Manter no Favelab | específica do jogo |
| `owasp-security` | Favelab, dados educacionais, lumina-bot, lumina-website, modelos de CI, portal, projeto SDK, qualiacad-website, site institucional, weekly-brain-challenge | Reaproveitar | fluxo de qualidade e segurança; já no portal e no Favelab |
| `performance-web` | Favelab, dados educacionais, lumina-bot, lumina-website, modelos de CI, portal, projeto SDK, qualiacad-website, site institucional, weekly-brain-challenge | Reaproveitar | genérica de web e 3D |
| `ponytail` | Favelab, dados educacionais, lumina-bot, lumina-website, modelos de CI, portal, projeto SDK, qualiacad-website, site institucional, weekly-brain-challenge | Reaproveitar | fluxo de qualidade e segurança; já no portal e no Favelab |
| `ponytail-audit` | Favelab, modelos de CI, portal, projeto SDK, site institucional, weekly-brain-challenge | Reaproveitar | fluxo de qualidade e segurança; já no portal e no Favelab |
| `ponytail-debt` | Favelab, modelos de CI, portal, projeto SDK, site institucional, weekly-brain-challenge | Reaproveitar | fluxo de qualidade e segurança; já no portal e no Favelab |
| `ponytail-gain` | Favelab, modelos de CI, portal, projeto SDK, site institucional, weekly-brain-challenge | Reaproveitar | fluxo de qualidade e segurança; já no portal e no Favelab |
| `ponytail-help` | Favelab, modelos de CI, portal, projeto SDK, site institucional, weekly-brain-challenge | Reaproveitar | fluxo de qualidade e segurança; já no portal e no Favelab |
| `ponytail-review` | Favelab, modelos de CI, portal, projeto SDK, site institucional, weekly-brain-challenge | Reaproveitar | fluxo de qualidade e segurança; já no portal e no Favelab |
| `postgresql-table-design` | dados educacionais, lumina-bot, lumina-website, modelos de CI, portal, projeto SDK, qualiacad-website, site institucional, weekly-brain-challenge | Reaproveitar | modelagem de dados; portal e Favelab usam Postgres |
| `product-designer` | dados educacionais, lumina-bot, lumina-website, modelos de CI, portal, projeto SDK, qualiacad-website, site institucional, weekly-brain-challenge | Reaproveitar | design; base do design system do Favelab |
| `relational-database-design` | dados educacionais, lumina-bot, lumina-website, modelos de CI, portal, projeto SDK, qualiacad-website, site institucional, weekly-brain-challenge | Reaproveitar | modelagem de dados; portal e Favelab usam Postgres |
| `security-review` | Favelab, dados educacionais, lumina-bot, lumina-website, modelos de CI, portal, projeto SDK, qualiacad-website, site institucional, weekly-brain-challenge | Reaproveitar | fluxo de qualidade e segurança; já no portal e no Favelab |
| `web-3d` | Favelab, dados educacionais, lumina-bot, lumina-website, modelos de CI, portal, projeto SDK, qualiacad-website, site institucional, weekly-brain-challenge | Reaproveitar | genérica de web e 3D |
| padrão visual, banco, navegação, performance e 3D do site institucional (**5 skills**, nome do produto omitido) | site institucional | Adaptar | modelo para as skills próprias do FavelaWare e do Favelab; não se copiam |

## Conferido antes de adotar

- Nenhuma skill adotada executa rede, subprocesso ou `eval`. A `product-designer` traz 3 scripts Python (`design_critique.py`, `journey_mapper.py`, `usability_scorer.py`) que só importam a biblioteca padrão (`argparse`, `json`, `csv`, `sys`, `math`) e leem arquivos locais.
- `ponytail` e variantes são de terceiros (MIT, autor original): a licença acompanha a skill e o texto original não foi alterado; as seções de acréscimo próprio, que citavam a organização de referência, foram retiradas das cópias.
- `frontend-design` traz o próprio `LICENSE.txt`.

## Estado depois desta etapa

- **Portal:** `.claude/skills` passa a ser a única fonte (27 skills, com `deploy` e `migracao-sql` escritas para o stack dele). `.agents/` fica fora do git: é uma pasta de ferramenta, duplicada de `.claude/skills`, e a `ponytail` dela difere da versionada.
- **Favelab:** 6 agentes e 24 skills (as 8 próprias do jogo mais o fluxo e o apoio).
