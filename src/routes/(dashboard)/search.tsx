import { searchProducts } from "@/actions/channel3";
import { ProductSearch } from "@/components/product-search";
import { Switch } from "@/components/ui/switch";
import type { SearchFetcher } from "@/hooks/use-product-search";
import { channel3ProductPageCodec, throwOnChannel3Error } from "@/lib/channel3/wire";
import { pageHead } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback } from "react";

const SearchPage = () => {
  const { q, deep } = Route.useSearch();
  const navigate = Route.useNavigate();
  const searchFn = useServerFn(searchProducts);

  const fetchSearch = useCallback<SearchFetcher>(
    async (input) => {
      const wire = await searchFn({ data: { ...input, mode: deep ? "agentic" : undefined } });
      const result = await channel3ProductPageCodec.deserializeUnsafe(wire);
      return throwOnChannel3Error(result);
    },
    [searchFn, deep],
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col px-4 py-8 sm:px-6">
      <div className="mb-4 flex items-start justify-between gap-4 rounded-xl border bg-muted/40 px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">Deep search</span>
          <p className="text-xs text-muted-foreground">
            Lets an AI agent plan multi-step searches for vague or complex requests. Slower, but it
            digs deeper.
          </p>
        </div>
        <Switch
          aria-label="Deep search"
          checked={deep ?? false}
          onCheckedChange={(checked) => {
            void navigate({
              search: (prev) => ({ ...prev, deep: checked || undefined }),
              replace: true,
            });
          }}
        />
      </div>
      <ProductSearch
        fetchSearch={fetchSearch}
        searchKey={deep ? "agentic" : "default"}
        initialQuery={q}
        searchOnMount
        filtersLayout="bar"
        placeholder="Search products…"
        onSelect={(product) => navigate({ to: "/product/$id", params: { id: product.id } })}
      />
    </div>
  );
};

export const Route = createFileRoute("/(dashboard)/search")({
  component: SearchPage,
  validateSearch: (search: Record<string, unknown>): { q: string; deep?: boolean } => {
    const q = typeof search.q === "string" ? search.q : "";
    const deep = search.deep === true || search.deep === "1" || search.deep === "true";
    return deep ? { q, deep } : { q };
  },
  head: () =>
    pageHead({
      title: "Search products — PayGo",
      description:
        "Search products across stores and compare every live offer side by side, cheapest first.",
      path: "/search",
    }),
});
