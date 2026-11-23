# RYSS COMPANY — loja virtual

Next.js 16, TypeScript, Tailwind CSS 4 e Supabase.

## Rodar no seu computador

Requisito: [Node.js](https://nodejs.org) versão LTS (20 ou mais nova).

- **Windows:** dê dois cliques em `rodar-no-pc.bat`.
- **Mac/Linux:** no terminal, dentro da pasta, rode `./rodar-no-pc.sh`.

Na primeira vez as dependências são instaladas (alguns minutos). Depois o site
abre em <http://localhost:3000>.

Sem Supabase configurado, o site mostra **produtos de exemplo** (marcados como
"Exemplo", só no computador, nunca no site publicado). Para usar dados reais,
preencha o arquivo `.env.local` seguindo o `.env.example`.

Comandos manuais, se preferir:

```bash
npm install
npm run dev      # desenvolvimento em http://localhost:3000
npm run build    # gera a versão de produção
npm start        # roda a versão de produção
```

## Publicar na nuvem (Vercel)

1. Crie o banco: no Supabase, abra **SQL Editor**, cole
   `supabase/migrations/0001_init.sql` e clique em **Run**.
2. Na Vercel, **Add New → Project**, importe este repositório.
3. Em **Environment Variables**, adicione (valores em Supabase →
   Project Settings → API):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (secreta)
4. Clique em **Deploy**. A cada envio ao GitHub, a Vercel publica de novo.

## Estrutura

- `src/app` — páginas (início, `/produto/[slug]`, `/carrinho`)
- `src/components` — componentes visuais
- `src/lib` — dados (Supabase), carrinho, formatação
- `src/config/site.ts` — nome, logos e contatos da loja
- `supabase/migrations` — banco de dados
