---
name: deploy
description: Publica o portal FavelaWare (site estático na Hostinger) e as Edge Functions no Supabase. Use ao subir uma versão, depois do merge na main, ou ao conferir o que está no ar.
---

# Deploy do portal

Publicar é ação visível para todos: confirme com quem pediu antes de apagar ou sobrescrever o site.

## Site (Hostinger, estático)

O portal é um site estático (`website_type: other`): as variáveis `VITE_*` entram **na compilação**, não no
servidor. Compile com o `.env` certo e envie o `dist`.

1. `git checkout main && git pull`. Confira o `.env` (arquivo ignorado pelo git): `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_PUBLISHABLE_KEY` (chave publicável; a secreta nunca vai ao front) e `VITE_FAVELAB_URL`.
2. `npm run build` e confira que `dist/` tem `index.html`, `assets/*.js` e o `.htaccess`. Se o build falhar por
   arquivo travado (OneDrive), rode de novo e leia o log inteiro (nada de `| tail` que esconde a causa).
3. Zip só do conteúdo de `dist` (com `tar.exe` do Windows: `tar -a -c -f site.zip -C dist .`), sem `node_modules`,
   `.env` nem `dist` como pasta.
4. Antes do deploy, liste a raiz do site no servidor e confirme que ela só tem o build e o `public/`: o deploy
   estático **apaga a raiz** antes de extrair.
5. Envie o zip (upload TUS) e dispare o deploy do site estático. Com o plugin da Hostinger: gerar URL de upload,
   `POST`/`PATCH` do arquivo, depois a operação de deploy de site estático.
6. Limpe o cache do site e **prove** que está no ar: baixe o bundle publicado e procure uma string que só a
   versão nova tem (200 sozinho não prova nada; o servidor pode servir a página antiga).

## Edge Functions (Supabase)

`npx supabase functions deploy <função> --project-ref <ref> --no-verify-jwt --use-api` (o login é conferido
dentro de cada função). Antes: `deno check` da função (no CI também). Secrets: `npx supabase secrets set`;
valor secreto nunca vai ao repositório nem ao chat.

## Depois

Conferir o fluxo real (login, a tela mexida) e relatar o resultado. Se algo ficou sem prova, diga o quê.
