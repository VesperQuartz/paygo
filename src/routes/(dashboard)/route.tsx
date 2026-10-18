import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";

const DashboardLayout = () => (
  <>
    <SiteHeader />
    <Outlet />
  </>
);

export const Route = createFileRoute("/(dashboard)")({
  component: DashboardLayout,
});
