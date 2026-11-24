import type { Metadata } from "next";
import {
  CompanyIdentification,
  ContactChannels,
  H2,
  LegalPage,
} from "@/components/LegalPage";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: `Como a ${site.name} trata os seus dados pessoais, conforme a LGPD.`,
  alternates: { canonical: "/privacidade" },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de privacidade">
      <p>
        Esta política explica quais dados pessoais a {site.name} coleta neste site, para
        que são usados e quais são os seus direitos, de acordo com a Lei Geral de
        Proteção de Dados Pessoais (Lei nº 13.709/2018, LGPD).
      </p>

      <H2>Quem é o responsável pelos dados</H2>
      <p>
        A {site.name} é a controladora dos dados pessoais tratados neste site.
      </p>
      <CompanyIdentification />

      <H2>Quais dados coletamos</H2>
      <p>Ao finalizar uma compra ou criar uma conta, pedimos:</p>
      <ul className="list-disc pl-5">
        <li>nome completo, CPF, e-mail e telefone;</li>
        <li>data de nascimento (somente na criação da conta);</li>
        <li>
          senha da conta, que é guardada de forma criptografada: nem a equipe da loja consegue
          vê-la;
        </li>
        <li>endereço de entrega (CEP, rua, número, complemento, bairro, cidade e estado);</li>
        <li>os produtos comprados, valores e a forma de pagamento escolhida.</li>
      </ul>
      <p>
        Navegar pela loja não exige cadastro. Não usamos cookies de publicidade nem
        ferramentas de rastreamento de terceiros.
      </p>
      <p>
        Mensagens de novidades e ofertas (marketing) só são enviadas a quem autorizou, e a
        autorização pode ser retirada a qualquer momento em “Minha conta → Meus dados” ou
        pelos canais de atendimento.
      </p>

      <H2>Para que usamos os dados</H2>
      <ul className="list-disc pl-5">
        <li>
          processar, entregar e dar suporte ao seu pedido (execução de contrato, art. 7º,
          V, da LGPD);
        </li>
        <li>
          cumprir obrigações legais e fiscais, como a emissão de nota fiscal (art. 7º,
          II, da LGPD);
        </li>
        <li>
          prevenir fraudes e proteger os direitos da loja e dos clientes (legítimo
          interesse, art. 7º, IX, da LGPD);
        </li>
        <li>manter sua conta e o histórico de pedidos (execução de contrato);</li>
        <li>
          enviar novidades e ofertas, somente com o seu consentimento (art. 7º, I, da LGPD).
        </li>
      </ul>
      <p>Não vendemos nem alugamos seus dados pessoais.</p>

      <H2>Com quem os dados são compartilhados</H2>
      <p>Somente com prestadores de serviço necessários para a loja funcionar:</p>
      <ul className="list-disc pl-5">
        <li>hospedagem do site (Vercel) e banco de dados (Supabase, com servidores em São Paulo);</li>
        <li>
          consulta de endereço pelo CEP (ViaCEP): ao digitar o CEP, apenas o número do
          CEP é enviado ao serviço;
        </li>
        <li>empresas de pagamento e de entrega, quando utilizadas no seu pedido;</li>
        <li>autoridades públicas, quando houver obrigação legal ou ordem judicial.</li>
      </ul>
      <p>
        Alguns desses prestadores podem processar dados fora do Brasil. Nesses casos,
        a transferência segue as regras do art. 33 da LGPD.
      </p>

      <H2>Armazenamento no seu navegador</H2>
      <p>
        O carrinho de compras fica salvo apenas no seu navegador (armazenamento local),
        para que os itens não se percam ao fechar a página. Esses dados não são enviados
        à loja até você finalizar a compra. Quem entra na conta recebe um cookie de sessão,
        necessário para manter o acesso; ele é apagado ao sair.
      </p>

      <H2>Por quanto tempo guardamos</H2>
      <p>
        Os dados dos pedidos são mantidos enquanto forem necessários para as finalidades
        acima e pelos prazos exigidos em lei (por exemplo, a legislação fiscal e o Código
        de Defesa do Consumidor). Depois disso, são excluídos ou anonimizados.
      </p>

      <H2>Segurança</H2>
      <p>
        O site usa conexão criptografada (HTTPS) e o acesso aos dados dos pedidos é
        restrito à equipe autorizada da loja.
      </p>

      <H2>Seus direitos</H2>
      <p>Conforme o art. 18 da LGPD, você pode pedir a qualquer momento:</p>
      <ul className="list-disc pl-5">
        <li>confirmação de que tratamos seus dados e acesso a eles;</li>
        <li>correção de dados incompletos, inexatos ou desatualizados;</li>
        <li>anonimização, bloqueio ou eliminação de dados desnecessários;</li>
        <li>portabilidade dos dados a outro fornecedor;</li>
        <li>informações sobre com quem seus dados foram compartilhados;</li>
        <li>
          eliminação dos dados, exceto quando a lei exigir que sejam mantidos.
        </li>
      </ul>
      <p>
        Para exercer seus direitos ou tirar dúvidas, entre em contato <ContactChannels />.
        Você também pode apresentar reclamação à Autoridade Nacional de Proteção de Dados
        (ANPD).
      </p>

      <H2>Alterações</H2>
      <p>
        Esta política pode ser atualizada. A data da última atualização aparece no topo
        da página.
      </p>
    </LegalPage>
  );
}
