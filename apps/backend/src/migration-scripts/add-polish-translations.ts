import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { updateStoresWorkflow } from "@medusajs/medusa/core-flows";

const PL_LOCALE = "pl-PL";

const productTranslations: Record<string, { description: string }> = {
  "t-shirt": {
    description:
      "Odkryj na nowo uczucie klasycznego T-shirtu. Dzięki naszym bawełnianym koszulkom codzienne must-have przestaje być zwyczajne.",
  },
  sweatshirt: {
    description:
      "Odkryj na nowo uczucie klasycznej bluzy. Dzięki naszej bawełnianej bluzie codzienne must-have przestaje być zwyczajne.",
  },
  sweatpants: {
    description:
      "Odkryj na nowo uczucie klasycznych spodni dresowych. Dzięki naszym bawełnianym spodniom dresowym codzienne must-have przestaje być zwyczajne.",
  },
  shorts: {
    description:
      "Odkryj na nowo uczucie klasycznych szortów. Dzięki naszym bawełnianym szortom codzienne must-have przestaje być zwyczajne.",
  },
};

export default async function add_polish_translations({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const translationModuleService = container.resolve(Modules.TRANSLATION);

  const handles = Object.keys(productTranslations);

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
    filters: { handle: handles },
  });

  if (!products.length) {
    logger.warn(
      "No matching products found - run the initial data seed first."
    );
    return;
  }

  const { data: existingTranslations } = await query.graph({
    entity: "translation",
    fields: ["reference_id"],
    filters: {
      reference: "product",
      reference_id: products.map((product) => product.id),
      locale_code: PL_LOCALE,
    },
  });
  const alreadyTranslated = new Set(
    existingTranslations.map((translation) => translation.reference_id)
  );

  const productsToTranslate = products.filter(
    (product) => !alreadyTranslated.has(product.id)
  );

  if (!productsToTranslate.length) {
    logger.info("Polish translations already exist for all matching products.");
  } else {
    logger.info(
      `Creating Polish translations for ${productsToTranslate.length} product(s)...`
    );

    await translationModuleService.createTranslations(
      productsToTranslate.map((product) => ({
        reference: "product",
        reference_id: product.id,
        locale_code: PL_LOCALE,
        translations: productTranslations[product.handle],
      }))
    );
  }

  const { data: [store] } = await query.graph({
    entity: "store",
    fields: ["id", "supported_locales.locale_code"],
    pagination: { take: 1 },
  });

  if (store) {
    const existingLocales: string[] = (store.supported_locales ?? [])
      .map((l: any) => l?.locale_code)
      .filter(Boolean);

    if (!existingLocales.includes(PL_LOCALE)) {
      logger.info(`Adding "${PL_LOCALE}" to the store's supported locales...`);

      await updateStoresWorkflow(container).run({
        input: {
          selector: { id: store.id },
          update: {
            supported_locales: [
              ...existingLocales.map((locale_code) => ({ locale_code })),
              { locale_code: PL_LOCALE },
            ],
          },
        },
      });
    }
  }

  logger.info("Done.");
}
