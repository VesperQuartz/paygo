import { findSimilarProducts, getPriceHistory, getProduct } from "@/actions/channel3";
import { getWatchlistState } from "@/actions/watchlist";
import { PriceVerdict } from "@/components/price-verdict";
import {
  ProductDetailsAttributes,
  ProductDetailsDescription,
  ProductDetailsGallery,
  ProductDetailsHeader,
  ProductDetailsOffers,
  ProductDetailsPriceHistory,
  ProductDetailsRecommendations,
  ProductDetailsRoot,
  ProductDetailsVariants,
} from "@/components/product-details";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/toast";
import { WatchButton } from "@/components/watch-button";
import type { SimilarFetcher } from "@/hooks/use-product-recommendations";
import { type VariantResolver, useVariantSelection } from "@/hooks/use-variant-selection";
import { ProductNotFound } from "@/lib/channel3/errors";
import { channel3ErrorMessage } from "@/lib/channel3/messages";
import {
  channel3PriceHistoryCodec,
  channel3ProductCodec,
  channel3ProductPageCodec,
  throwOnChannel3Error,
} from "@/lib/channel3/wire";
import { productHead } from "@/lib/seo";
import { watchlistStateCodec } from "@/lib/watchlist/wire";
import { createFileRoute, notFound, type ErrorComponentProps } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { TriangleAlert } from "lucide-react";
import { useCallback, useMemo } from "react";

const ProductLoadError = ({ error, reset }: ErrorComponentProps) => (
  <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3 px-4 py-24 text-center sm:px-6">
    <TriangleAlert aria-hidden className="size-8 text-muted-foreground" />
    <h2 className="text-lg font-semibold">Couldn't load this product</h2>
    <p className="text-sm text-muted-foreground">{channel3ErrorMessage(error)}</p>
    <Button type="button" size="sm" variant="outline" onClick={reset}>
      Try again
    </Button>
  </div>
);

const ProductPage = () => {
  const { product, priceHistory: loadedHistory, watchState } = Route.useLoaderData();
  const { id: productId } = Route.useParams();
  const getProductFn = useServerFn(getProduct);
  const findSimilarFn = useServerFn(findSimilarProducts);

  // Timestamps can arrive as ISO strings after serialization — re-hydrate so
  // the chart's Date operations always work.
  const priceHistory = useMemo(
    () =>
      loadedHistory
        ? {
            ...loadedHistory,
            history: loadedHistory.history.map((point) => ({
              ...point,
              timestamp: new Date(point.timestamp),
            })),
          }
        : undefined,
    [loadedHistory],
  );

  const resolveVariant = useCallback<VariantResolver>(
    async ({ product: current, value, selection }) => {
      const wire = await getProductFn({
        data: {
          productId: value.product_id ?? current.id,
          selectedOptions: value.product_id ? undefined : selection,
        },
      });
      const result = await channel3ProductCodec.deserializeUnsafe(wire);
      return throwOnChannel3Error(result);
    },
    [getProductFn],
  );

  const handleVariantError = useCallback((error: unknown) => {
    toast.add({
      title: "Couldn't switch variant",
      description: channel3ErrorMessage(error),
    });
  }, []);

  const {
    product: liveProduct,
    selection,
    select,
    isResolving,
  } = useVariantSelection({
    product,
    resolve: resolveVariant,
    onError: handleVariantError,
  });

  const fetchSimilar = useCallback<SimilarFetcher>(
    async (input) => {
      const wire = await findSimilarFn({ data: input });
      const result = await channel3ProductPageCodec.deserializeUnsafe(wire);
      return throwOnChannel3Error(result).products;
    },
    [findSimilarFn],
  );

  // Snapshot stored with the watchlist entry: enough to render the list
  // without re-querying Channel3. Prices come from the cheapest live offer.
  const watchSnapshot = useMemo(() => {
    const image = liveProduct.images?.[0];
    const offers = liveProduct.offers ?? [];
    const cheapest = offers.length
      ? offers.reduce((min, offer) => (offer.price.price < min.price.price ? offer : min))
      : null;

    return {
      title: liveProduct.title,
      brand: liveProduct.brands?.[0]?.name ?? null,
      imageUrl: image?.cleaned_url ?? image?.url ?? null,
      priceAmount: cheapest?.price.price ?? null,
      priceCurrency: cheapest?.price.currency ?? null,
    };
  }, [liveProduct]);

  const showPriceHistory =
    Boolean(priceHistory?.statistics) || (priceHistory?.history.length ?? 0) > 0;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <ProductDetailsRoot
        className="w-full"
        product={liveProduct}
        selection={selection}
        onSelectVariant={select}
        isResolving={isResolving}
        priceHistory={priceHistory}
        fetchSimilar={fetchSimilar}
        buyLinkRel="sponsored noopener noreferrer"
      >
        <div className="flex flex-col gap-12">
          <div className="grid gap-8 md:grid-cols-2 md:items-start lg:gap-12">
            <ProductDetailsGallery className="self-start md:sticky md:top-4" />
            <div className="flex flex-col gap-6">
              <ProductDetailsHeader />
              <PriceVerdict statistics={priceHistory?.statistics} />
              <div className="flex flex-wrap items-center gap-2">
                <WatchButton
                  productId={productId}
                  {...watchSnapshot}
                  initialWatched={watchState.watched}
                  signedIn={watchState.signedIn}
                />
              </div>
              <ProductDetailsVariants />
              <ProductDetailsOffers />
              <ProductDetailsDescription />
              <ProductDetailsAttributes />
              {showPriceHistory ? (
                <>
                  <Separator />
                  <ProductDetailsPriceHistory />
                </>
              ) : null}
            </div>
          </div>
          <ProductDetailsRecommendations />
        </div>
      </ProductDetailsRoot>
    </div>
  );
};

export const Route = createFileRoute("/(dashboard)/product/$id")({
  component: ProductPage,
  errorComponent: ProductLoadError,
  loader: async ({ params }) => {
    const [productWire, historyWire, watchStateWire] = await Promise.all([
      getProduct({ data: { productId: params.id } }),
      getPriceHistory({ data: { productId: params.id } }),
      getWatchlistState({ data: { productId: params.id } }),
    ]);

    const productResult = await channel3ProductCodec.deserializeUnsafe(productWire);
    if (productResult.status === "error") {
      if (ProductNotFound.is(productResult.error)) {
        throw notFound();
      }
      console.error("[product] failed to load", params.id, productResult.error);
      throw productResult.error;
    }

    const historyResult = await channel3PriceHistoryCodec.deserializeUnsafe(historyWire);
    if (historyResult.status === "error") {
      console.warn("[product] price history unavailable", params.id, historyResult.error);
    }

    const watchStateResult = await watchlistStateCodec.deserializeUnsafe(watchStateWire);
    if (watchStateResult.status === "error") {
      console.warn("[product] watchlist state unavailable", params.id, watchStateResult.error);
    }

    return {
      product: productResult.value,
      priceHistory: historyResult.status === "ok" ? historyResult.value : null,
      watchState:
        watchStateResult.status === "ok"
          ? watchStateResult.value
          : { signedIn: false, watched: false },
    };
  },
  head: ({ params, loaderData }) => productHead(loaderData?.product, `/product/${params.id}`),
});
