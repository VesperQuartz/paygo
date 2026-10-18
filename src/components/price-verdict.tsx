import type { PriceStatistics } from "@channel3/sdk/resources";
import { type LucideIcon, Scale, TrendingDown, TrendingUp } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";

type VerdictStatus = PriceStatistics["current_status"];

interface VerdictStyle {
  title: string;
  icon: LucideIcon;
  container: string;
  iconText: string;
  titleText: string;
}

const WINDOW_DAYS = 90;

const VERDICT_STYLES: Record<VerdictStatus, VerdictStyle> = {
  low: {
    title: "Great time to buy",
    icon: TrendingDown,
    container: "border-emerald-600/25 bg-emerald-500/10",
    iconText: "text-emerald-600 dark:text-emerald-400",
    titleText: "text-emerald-900 dark:text-emerald-200",
  },
  typical: {
    title: "Fair price",
    icon: Scale,
    container: "border-amber-600/25 bg-amber-500/10",
    iconText: "text-amber-600 dark:text-amber-400",
    titleText: "text-amber-900 dark:text-amber-200",
  },
  high: {
    title: "Consider waiting",
    icon: TrendingUp,
    container: "border-red-600/25 bg-red-500/10",
    iconText: "text-red-600 dark:text-red-400",
    titleText: "text-red-900 dark:text-red-200",
  },
};

export interface PriceVerdictProps extends React.ComponentProps<"div"> {
  statistics: PriceStatistics | null | undefined;
  locale?: string;
}

/**
 * Buy-now-or-wait banner derived from the 90-day price statistics. Placed under
 * the product title so the verdict is the first thing a shopper reads.
 */
export const PriceVerdict = ({ statistics, locale, className, ...rest }: PriceVerdictProps) => {
  if (!statistics) {
    return null;
  }

  const { current_price, mean, min_price, max_price, currency, current_status } = statistics;
  const { title, icon: Icon, container, iconText, titleText } = VERDICT_STYLES[current_status];
  const meanText = formatCurrency(mean, currency, locale);
  const deltaPct = mean > 0 ? Math.round(((current_price - mean) / mean) * 100) : 0;
  const absPct = Math.abs(deltaPct);
  const atFloor = current_price <= min_price + 0.005;

  let comparison: string;
  if (current_status === "low") {
    comparison = atFloor
      ? `Lowest price recorded in the last ${WINDOW_DAYS} days.`
      : absPct > 0
        ? `${absPct}% below its ${WINDOW_DAYS}-day average of ${meanText}.`
        : "Sitting below its usual range.";
  } else if (current_status === "high") {
    comparison =
      absPct > 0
        ? `${absPct}% above its ${WINDOW_DAYS}-day average of ${meanText} — worth waiting for a dip.`
        : "Above its usual range — worth waiting for a dip.";
  } else {
    comparison = `About average for this product over the last ${WINDOW_DAYS} days.`;
  }

  return (
    <div
      data-slot="price-verdict"
      className={cn("flex items-start gap-3 rounded-xl border p-4", container, className)}
      {...rest}
    >
      <Icon aria-hidden className={cn("mt-0.5 size-5 shrink-0", iconText)} />
      <div className="flex flex-col gap-1">
        <p className={cn("text-sm font-semibold", titleText)}>{title}</p>
        <p className="text-sm text-foreground/80">{comparison}</p>
        <p className="text-xs text-muted-foreground">
          {WINDOW_DAYS}-day range {formatCurrency(min_price, currency, locale)} –{" "}
          {formatCurrency(max_price, currency, locale)}
        </p>
      </div>
    </div>
  );
};
