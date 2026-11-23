/**
 * Dados institucionais da loja.
 *
 * Preencha somente com informações reais. Campos vazios não aparecem no site,
 * para que nenhum link ou botão fique sem funcionalidade.
 */
export const site = {
  name: "RYSS COMPANY",
  url: "https://rysscompany.com.br",
  description: "Camisetas RYSS COMPANY. Compre online.",
  locale: "pt_BR",

  /**
   * Logos oficiais. Coloque os arquivos em `public/brand/` e informe o caminho.
   * Enquanto estiverem vazios, o nome da marca aparece em texto.
   * Use as logos sem alterações (somente o tamanho de exibição é ajustado).
   */
  logo: {
    black: "", // ex.: "/brand/logo-preta.svg"
    white: "", // ex.: "/brand/logo-branca.svg"
    width: 140,
    height: 32,
  },

  contact: {
    email: "", // ex.: "contato@rysscompany.com.br"
    whatsapp: "", // somente números com DDI, ex.: "5511999999999"
    instagram: "", // usuário sem @, ex.: "rysscompany"
  },
} as const;
