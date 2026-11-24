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
   `supabase/migrations/0001_init.sql` e clique em **Run**. Depois faça o
   mesmo com `supabase/migrations/0002_checkout.sql` (pedidos) e
   `supabase/migrations/0003_admin.sql` (painel) e
   `supabase/migrations/0004_crm_erp.sql` (contas de clientes, CRM e estoque).
   Em Authentication → URL Configuration, coloque o endereço do site em
   **Site URL** e adicione `https://SEU-SITE/**` em **Redirect URLs**.
2. Na Vercel, **Add New → Project**, importe este repositório.
3. Em **Environment Variables**, adicione (valores em Supabase →
   Project Settings → API):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (secreta)
4. Clique em **Deploy**. A cada envio ao GitHub, a Vercel publica de novo.

## Painel administrativo

Endereço: `/admin`. Para criar o primeiro acesso, siga as instruções em
`supabase/tornar-administrador.sql`. Módulos:

- **Pedidos:** situação, frete, rastreio e anotações internas (cancelar devolve o estoque)
- **Clientes (CRM):** ficha completa, etiquetas, histórico de atendimento,
  mensagens por WhatsApp/e-mail, nova senha ou link de redefinição, bloqueio
  e exportação em planilha. Senhas nunca podem ser vistas, só redefinidas.
- **Produtos:** preço, custo, SKU, descrição, tamanhos, estoque e fotos
- **Estoque:** entradas, perdas, ajustes e histórico de todos os movimentos
- **Marketing:** públicos (só quem autorizou — LGPD), modelos de mensagem e exportação
- **Relatórios:** vendas por período, ticket médio, mais vendidos e melhores clientes
- **Equipe:** quem tem acesso ao painel

## Área do cliente

`/conta`: cadastro (nome, CPF, nascimento, celular, e-mail e senha), login,
“esqueci minha senha”, meus pedidos (com rastreio), meus dados e endereços.
Cliente logado tem os dados preenchidos na finalização da compra.

## Integrações futuras

O sistema está pronto para conectar: pagamento (PIX/cartão), frete
(ex.: Melhor Envio) e envio automático de e-mail/WhatsApp. Hoje o pagamento é
confirmado manualmente no painel e o frete é informado no pedido.

## Estrutura

- `src/app/(loja)` — páginas da loja (início, produto, carrinho, checkout,
  pedido, trocas e devoluções, privacidade, termos)
- `src/app/admin` — painel administrativo
- `src/app/sitemap.ts` e `src/app/robots.ts` — mapa do site e robots
- `src/components` — componentes visuais
- `src/lib` — dados (Supabase), carrinho, formatação
- `src/config/site.ts` — nome, logos, contatos, CNPJ/endereço e política de troca
- `supabase/migrations` — banco de dados
- `supabase/teste-*.sql` — cadastrar/remover 6 camisetas de TESTE
