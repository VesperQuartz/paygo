export interface DropDecisionInput {
  /** Live cheapest price from Channel3. */
  currentPrice: number;
  /** Price stored when the user added the product (null when unknown). */
  baselinePrice: number | null;
  /** Price at this item's last alert (null until one has been sent). */
  lastAlertedPrice: number | null;
}

/**
 * One alert per drop: the first email fires when the live price beats the
 * price the user saw when adding the product; after that, only a price lower
 * than the last alerted one emails again. A null baseline (no price known at
 * add time) never alerts — there is nothing honest to compare against.
 */
export const shouldAlertOnDrop = ({
  currentPrice,
  baselinePrice,
  lastAlertedPrice,
}: DropDecisionInput): boolean => {
  const reference = lastAlertedPrice ?? baselinePrice;
  return reference != null && currentPrice < reference;
};
