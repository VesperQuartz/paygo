import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { channel3ErrorMessage } from "@/lib/channel3/messages";

export interface SearchErrorNoticeProps {
  error: unknown;
  onRetry: () => void;
}

/**
 * Inline error state for the vendored ProductSearch block, which otherwise
 * renders a failed search as an empty result area.
 */
export const SearchErrorNotice = ({ error, onRetry }: SearchErrorNoticeProps) => (
  <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
    <TriangleAlert aria-hidden className="size-6 text-muted-foreground" />
    <div className="flex flex-col gap-1">
      <p className="text-sm font-medium">Couldn't load products</p>
      <p className="max-w-sm text-sm text-muted-foreground">{channel3ErrorMessage(error)}</p>
    </div>
    <Button type="button" size="sm" variant="outline" onClick={onRetry}>
      Try again
    </Button>
  </div>
);
