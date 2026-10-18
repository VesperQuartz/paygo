/** Search params accepted by the `/search` route. */
export interface SearchRouteParams {
  q?: string;
  deep?: boolean;
}

/**
 * Normalizes the raw `/search` URL params.
 *
 * The router merges this output over the parsed search instead of replacing
 * it, so both keys are always returned: `undefined` clears values the URL
 * parser coerced to numbers or booleans (`?q=1`, `?q=`, `?deep=1`). Returning
 * only valid keys would leave the raw values in place and let a non-string `q`
 * reach the page.
 */
export const parseSearchRouteParams = (search: Record<string, unknown>): SearchRouteParams => {
  const q = typeof search.q === "string" && search.q.length > 0 ? search.q : undefined;
  const deep =
    search.deep === true || search.deep === 1 || search.deep === "1" || search.deep === "true"
      ? true
      : undefined;

  return { q, deep };
};
