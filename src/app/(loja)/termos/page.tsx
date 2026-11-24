import type { Metadata } from "next";
import Link from "next/link";
import {
  CompanyIdentification,
  ContactChannels,
  H2,
  LegalPage,
} from "@/components/LegalPage";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Termos de uso",
  description: `Condições de uso do site e de compra na ${site.name}.`,
  alternates: { canonical: "/termos" },
};

export default function TermsPage() {
  return (
    <LegalPage title="Termos de uso">
      <p>
        Estes termos regulam o uso deste site e as compras feitas na {site.name}. Ao
        finalizar um pedido, você declara ter lido e concordado com eles. As relações de
        consumo seguem o Código de Defesa do Consumidor (Lei nº 8.078/1990) e o Decreto
        nº 7.962/2013.
      </p>
      <CompanyIdentification />

      <H2>Dados informados</H2>
      <p>
        Você é responsável por informar dados verdadeiros e completos na finalização da
        compra, especialmente o endereço de entrega. O tratamento desses dados segue a
        nossa <Link href="/privacidade" className="underline underline-offset-4">Política
        de privacidade</Link>.
      </p>

      <H2>Produtos, preços e estoque</H2>
      <p>
        Preços e disponibilidade podem mudar sem aviso prévio. Vale o preço exibido no
        momento da confirmação do pedido, que é conferido novamente pelo sistema antes de
        o pedido ser registrado. As fotos são ilustrativas e podem ter pequenas variações
        de cor conforme a tela.
      </p>

      <H2>Pedidos e pagamento</H2>
      <p>
        Após a confirmação, o pedido recebe um número e fica com a situação{" "}
        <strong>aguardando pagamento</strong> até a confirmação do pagamento. As peças do
        pedido ficam reservadas no estoque durante esse período. Pedidos não pagos
        podem ser cancelados, e as peças voltam ao estoque.
      </p>
      <p>
        As formas de pagamento aceitas são as exibidas na finalização da compra.
      </p>

      <H2>Entrega</H2>
      <p>
        O valor do frete e o prazo de entrega, quando aplicáveis, são informados ao
        cliente antes da confirmação do pagamento.
      </p>

      <H2>Trocas, devoluções e arrependimento</H2>
      <p>
        Veja a página{" "}
        <Link href="/trocas-e-devolucoes" className="underline underline-offset-4">
          Trocas e devoluções
        </Link>
        .
      </p>

      <H2>Propriedade intelectual</H2>
      <p>
        A marca {site.name}, as logos, fotos e textos deste site pertencem à loja ou a
        seus licenciantes e não podem ser usados sem autorização.
      </p>

      <H2>Atendimento</H2>
      <p>
        Dúvidas, solicitações e reclamações podem ser enviadas <ContactChannels />.
      </p>

      <H2>Legislação e foro</H2>
      <p>
        Estes termos seguem as leis brasileiras. Eventuais disputas podem ser levadas ao
        foro do domicílio do consumidor, conforme o Código de Defesa do Consumidor.
      </p>
    </LegalPage>
  );
}
