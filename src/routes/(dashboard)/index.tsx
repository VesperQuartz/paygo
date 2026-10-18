import { captureOrder, createOrder } from "@/actions/paypal";
import { toast } from "@/components/ui/toast";
import { PayPalOneTimePaymentButton } from "@paypal/react-paypal-js/sdk-v6";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

const App = () => {
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
          const data = await create.mutateAsync();
          return { orderId: data };
        }}
        onApprove={async ({ orderId }) => {
          await capture.mutateAsync({
            data: orderId,
          });
          toast.add({
            title: "Order complete",
            description: "        ✓ Payment successful! Your order has been confirmed.",
          });
        }}
        presentationMode="modal"
      />
    </div>
  );
};

export const Route = createFileRoute("/(dashboard)/")({
  component: App,
  loader: async () => {},
  server: {},
});
