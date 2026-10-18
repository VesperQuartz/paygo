import { TanStackDevtools } from "@tanstack/react-devtools";
import { formDevtoolsPlugin } from "@tanstack/react-form-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { Toaster } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LoadingProvider } from "@/providers/loaders/loader";
import TanStackQueryDevtools from "@/providers/query/devtools";
import "../globals.css";
import { PayPalProvider } from "@paypal/react-paypal-js/sdk-v6";
import { clientEnv } from "@/env/client";

export interface RootContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RootContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Paygo",
      },
    ],
  }),

  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <PayPalProvider
          environment="sandbox"
          clientId={clientEnv.VITE_PAY_CLIENT_ID}
          components={["paypal-payments", "paypal-subscriptions"]}
        >
          <TooltipProvider>
            <LoadingProvider>
              {children}
              <TanStackDevtools
                config={{
                  position: "bottom-left",
                  openHotkey: ["Meta", "Shift", "O"],
                }}
                plugins={[
                  {
                    name: "Tanstack Router",
                    render: <TanStackRouterDevtoolsPanel />,
                  },
                  TanStackQueryDevtools,
                  formDevtoolsPlugin(),
                ]}
              />
            </LoadingProvider>
          </TooltipProvider>
        </PayPalProvider>
        <Scripts />
        <Toaster />
      </body>
    </html>
  );
}
