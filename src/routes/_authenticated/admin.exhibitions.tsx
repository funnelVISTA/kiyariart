import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/exhibitions")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/events", statusCode: 301, replace: true });
  },
});