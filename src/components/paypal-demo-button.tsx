import { captureOrder, createOrder } from "@/actions/paypal";
import { toast } from "@/components/ui/toast";
import { paypalErrorMessage } from "@/lib/paypal/messages";
import { paypalOrderCaptureCodec, paypalOrderCreateCodec } from "@/lib/paypal/wire";
import { PayPalOneTimePaymentButton } from "@paypal/react-paypal-js/sdk-v6";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

/**
 * Sandbox checkout demo kept from the starter. The Pro plan flow uses
 * subscriptions (`/pro`), but this exercises the same create/capture path —
 * including the capture-state verification that prevents blind retries.
 */
export const PayPalDemoButton = () => {
  const createOrderFn = useServerFn(createOrder);
  const captureOrderFn = useServerFn(captureOrder);

  const create = useMutation({
    mutationKey: ["createOrder"],
    mutationFn: createOrderFn,
  });
  const capture = useMutation({
    mutationKey: ["captureOrder"],
    mutationFn: captureOrderFn,
  });

  return (
    <div className="p-4 text-center">
      <PayPalOneTimePaymentButton
        createOrder={async () => {
          const result = await paypalOrderCreateCodec.deserializeUnsafe(await create.mutateAsync());
          if (result.status === "error") {
            toast.add({
              title: "Couldn't start checkout",
              description: paypalErrorMessage(result.error),
            });
            // Abort the PayPal flow instead of letting the SDK surface a raw error.
            throw result.error;
          }
          return { orderId: result.value };
        }}
        onApprove={async ({ orderId }) => {
          const result = await paypalOrderCaptureCodec.deserializeUnsafe(
            await capture.mutateAsync({ data: orderId }),
          );
          if (result.status === "error") {
            toast.add({
              title: "Payment not confirmed",
              description: paypalErrorMessage(result.error),
            });
            return;
          }
          toast.add({
            title: "Order complete",
            description: "Payment successful — your order is confirmed.",
          });
        }}
        onError={(error) => {
          toast.add({
            title: "Payment couldn't start",
            description: paypalErrorMessage(error),
          });
        }}
        presentationMode="modal"
      />
    </div>
  );
};
