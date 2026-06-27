import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

// /admin layout — redirects bare /admin to /admin/orders, otherwise renders children.
export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — art by KIYARI" }, { name: "robots", content: "noindex" }] }),
  beforeLoad: ({ location }) => {
    if (location.pathname === "/admin" || location.pathname === "/admin/") {
      throw redirect({ to: "/admin/orders" });
    }
  },
  component: () => <Outlet />,
});
