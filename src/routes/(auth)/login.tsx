import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { FieldError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

const formSchema = z.object({
  email: z.email(),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

const LoginPage = () => {
  const { redirect: redirectTo } = Route.useSearch();
  const [formError, setFormError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      setFormError(null);
      setNotice(null);
      setUnverifiedEmail(null);

      const { error } = await authClient.signIn.email({
        email: value.email,
        password: value.password,
      });

      if (error) {
        if (error.code === "EMAIL_NOT_VERIFIED") {
          setUnverifiedEmail(value.email);
          setFormError("Your email isn't verified yet. Check your inbox for the link we sent.");
          return;
        }
        setFormError(error.message ?? "Couldn't sign in. Check your email and password.");
        return;
      }

      // Full navigation keeps it simple: the session cookie is already set and
      // the target may be an in-app path or the page the user came from.
      window.location.assign(redirectTo ?? "/");
    },
  });

  const resendVerification = async () => {
    if (!unverifiedEmail) {
      return;
    }
    setFormError(null);

    const { error } = await authClient.sendVerificationEmail({
      email: unverifiedEmail,
      callbackURL: "/",
    });
    setNotice(
      error
        ? "Couldn't resend the email — wait a moment and try again."
        : "Verification email sent. Check your inbox.",
    );
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-6 py-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to sync your watchlist and price alerts.
        </p>
      </div>

      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit();
        }}
      >
        <form.Field name="email">
          {(field) => (
            <div className="flex flex-col gap-1">
              <Input
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="you@example.com"
                type="email"
                autoComplete="email"
              />
              <FieldError field={field} />
            </div>
          )}
        </form.Field>

        <form.Field name="password">
          {(field) => (
            <div className="flex flex-col gap-1">
              <Input
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Password"
                type="password"
                autoComplete="current-password"
              />
              <FieldError field={field} />
            </div>
          )}
        </form.Field>

        {formError ? (
          <div className="flex flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2">
            <p className="text-xs text-destructive">{formError}</p>
            {unverifiedEmail ? (
              <Button
                type="button"
                variant="outline"
                size="xs"
                className="self-start"
                onClick={() => void resendVerification()}
              >
                Resend verification email
              </Button>
            ) : null}
          </div>
        ) : null}

        {notice ? <p className="text-xs text-muted-foreground">{notice}</p> : null}

        <form.Subscribe selector={(state) => [state.isSubmitting, state.canSubmit]}>
          {([isSubmitting, canSubmit]) => (
            <Button type="submit" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? "Signing in…" : "Sign in"}
            </Button>
          )}
        </form.Subscribe>
      </form>

      <p className="text-sm text-muted-foreground">
        New to PayGo?{" "}
        <Link to="/signup" className="underline underline-offset-4 hover:text-foreground">
          Create an account
        </Link>
      </p>
    </div>
  );
};

export const Route = createFileRoute("/(auth)/login")({
  component: LoginPage,
  validateSearch: z.object({
    redirect: z.string().optional(),
  }),
});
