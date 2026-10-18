import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { FieldError } from "@/components/form-error";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { pageHead } from "@/lib/seo";

const formSchema = z.object({
  name: z.string().min(1, "Tell us what to call you."),
  email: z.email(),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

const SignUpPage = () => {
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      setFormError(null);

      const { error } = await authClient.signUp.email({
        name: value.name,
        email: value.email,
        password: value.password,
        callbackURL: "/",
      });

      if (error) {
        setFormError(error.message ?? "Couldn't create the account. Please try again.");
        return;
      }

      setSentTo(value.email);
    },
  });

  if (sentTo) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-4 px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Check your inbox</h1>
        <p className="text-sm text-muted-foreground">
          We sent a verification link to{" "}
          <span className="font-medium text-foreground">{sentTo}</span>. Open it to activate your
          account, then sign in.
        </p>
        <Link
          to="/login"
          className={buttonVariants({ variant: "outline", size: "sm", className: "self-start" })}
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-6 py-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">
          Watch prices across every store and get told the moment they drop.
        </p>
      </div>

      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit();
        }}
      >
        <form.Field name="name">
          {(field) => (
            <div className="flex flex-col gap-1">
              <Input
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
              />
              <FieldError field={field} />
            </div>
          )}
        </form.Field>

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
                placeholder="Password (6+ characters)"
                type="password"
                autoComplete="new-password"
              />
              <FieldError field={field} />
            </div>
          )}
        </form.Field>

        {formError ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2">
            <p className="text-xs text-destructive">{formError}</p>
          </div>
        ) : null}

        <form.Subscribe selector={(state) => [state.isSubmitting, state.canSubmit]}>
          {([isSubmitting, canSubmit]) => (
            <Button type="submit" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? "Creating account…" : "Create account"}
            </Button>
          )}
        </form.Subscribe>
      </form>

      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="underline underline-offset-4 hover:text-foreground">
          Sign in
        </Link>
      </p>
    </div>
  );
};

export const Route = createFileRoute("/(auth)/signup")({
  component: SignUpPage,
  head: () =>
    pageHead({
      title: "Create account — PayGo",
      description: "Create a PayGo account to track products and get price-drop alerts.",
      path: "/signup",
      robots: "noindex, nofollow",
    }),
});
