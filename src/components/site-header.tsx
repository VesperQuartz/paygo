import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { Button, buttonVariants } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

/** Top bar shared by every dashboard page: brand, navigation, and the session. */
export const SiteHeader = () => {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await authClient.signOut();
    await router.invalidate();
    void navigate({ to: "/" });
  };

  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-baseline gap-2">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            PayGo
          </Link>
          <span className="hidden text-xs font-medium tracking-wide text-muted-foreground uppercase sm:inline">
            never overpay
          </span>
        </div>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            to="/search"
            search={{ q: "" }}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Search
          </Link>
          <Link to="/watchlist" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Watchlist
          </Link>
          <Link to="/pro" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Pro
          </Link>
          {isPending ? null : session ? (
            <>
              <span className="hidden max-w-40 truncate text-xs text-muted-foreground sm:inline">
                {session.user.email}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleSignOut()}
              >
                Sign out
              </Button>
            </>
          ) : (
            <Link to="/login" className={buttonVariants({ size: "sm" })}>
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};
