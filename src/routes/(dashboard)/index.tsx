import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

const SUGGESTIONS = [
  "noise-cancelling headphones under $250",
  "espresso machine for beginners",
  "running shoes on sale",
  "4k monitor for programming",
];

const STEPS = [
  {
    step: "01",
    title: "Describe it in plain English",
    body: "No filters, no tabs, no spreadsheets. Tell PayGo what you actually need.",
  },
  {
    step: "02",
    title: "See every offer in one place",
    body: "The same product across every retailer we cover, cheapest first.",
  },
  {
    step: "03",
    title: "Know exactly when to buy",
    body: "Live price history tells you if today's deal is good — and we'll watch it until it drops.",
  },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const go = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    void navigate({ to: "/search", search: { q: trimmed } });
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6">
        <div className="mx-auto w-full max-w-3xl pt-10 text-center">
          <h1 className="text-5xl font-semibold tracking-tighter text-balance sm:text-7xl">
            Never overpay.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-pretty text-muted-foreground sm:text-lg">
            One search across every store. PayGo finds the product, compares every live offer, and
            tells you the exact moment it's cheapest.
          </p>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              go(query);
            }}
            className="mx-auto mt-8 flex w-full max-w-xl items-center gap-2"
          >
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="What are you shopping for?"
              aria-label="Search products"
              className="h-12 rounded-xl px-4 text-base"
            />
            <Button type="submit" size="lg" className="h-12 rounded-xl px-6 text-base">
              Search
            </Button>
          </form>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => go(suggestion)}
                className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-20 grid w-full max-w-4xl gap-8 pb-16 sm:grid-cols-3">
          {STEPS.map((item) => (
            <div key={item.step}>
              <span className="font-mono text-xs text-primary">{item.step}</span>
              <h2 className="mt-2 text-sm font-medium">{item.title}</h2>
              <p className="mt-1 text-sm text-pretty text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-6 pb-6">
        <p className="text-center text-xs text-muted-foreground">
          Prices update live. PayGo may earn a commission when you buy through our links — at no
          extra cost to you.
        </p>
      </footer>
    </div>
  );
};

export const Route = createFileRoute("/(dashboard)/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "PayGo — never overpay" },
      {
        name: "description",
        content:
          "Search products across every store, compare live offers, and know the exact moment to buy.",
      },
    ],
  }),
});
