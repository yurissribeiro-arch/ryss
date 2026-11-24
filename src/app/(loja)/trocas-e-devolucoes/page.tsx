import type { Metadata } from "next";
import { ContactChannels, H2, LegalPage } from "@/components/LegalPage";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Trocas e devoluções",
  description: `Direito de arrependimento e produtos com defeito nas compras da ${site.name}.`,
  alternates: { canonical: "/trocas-e-devolucoes" },
};

export default function ExchangesPage() {
  const exchange: string = site.policies.exchange;
  return (
    <LegalPage title="Trocas e devoluções">
      <p>
        Esta página resume os seus direitos nas compras feitas neste site, conforme o
        Código de Defesa do Consumidor (Lei nº 8.078/1990) e o Decreto nº 7.962/2013.
      </p>

      <H2>Desistência da compra (direito de arrependimento)</H2>
      <p>
        Em compras pela internet, você pode desistir em até <strong>7 (sete) dias
        corridos</strong> a contar do recebimento do produto, sem precisar justificar
        (art. 49 do Código de Defesa do Consumidor).
      </p>
      <p>
        Nesse caso, os valores pagos são devolvidos integralmente, incluindo o frete,
        pelo mesmo meio de pagamento utilizado, e a compra é cancelada sem custo para você.
      </p>
      <p>
        Para desistir, entre em contato <ContactChannels /> informando o número do pedido.
      </p>

      <H2>Produto com defeito</H2>
      <p>
        Se o produto apresentar defeito, você pode reclamar em até <strong>90 (noventa)
        dias</strong> a contar do recebimento, no caso de defeitos aparentes ou de fácil
        constatação (art. 26 do Código de Defesa do Consumidor). Para defeitos ocultos,
        o prazo começa a contar a partir do momento em que o defeito for identificado.
      </p>
      <p>
        A loja tem até 30 (trinta) dias para resolver o problema. Se não for resolvido
        nesse prazo, você pode escolher entre: a troca por outro produto igual em perfeitas
        condições, a devolução do valor pago com correção, ou o abatimento proporcional
        do preço (art. 18 do Código de Defesa do Consumidor).
      </p>
      <p>
        Para solicitar, entre em contato <ContactChannels /> com o número do pedido e, se
        possível, fotos do defeito.
      </p>

      <H2>Troca por tamanho ou preferência</H2>
      {exchange ? (
        <p className="whitespace-pre-line">{exchange}</p>
      ) : (
        <p>
          A troca de produtos sem defeito por tamanho, cor ou preferência não é uma
          obrigação legal fora do prazo de arrependimento acima. Consulte a loja{" "}
          <ContactChannels /> antes de comprar, se tiver dúvidas sobre o tamanho.
        </p>
      )}

      <H2>Como enviar o produto de volta</H2>
      <p>
        Após o contato, a loja informará como fazer o envio do produto.
      </p>
    </LegalPage>
  );
}
