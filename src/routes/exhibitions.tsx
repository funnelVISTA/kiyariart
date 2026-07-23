import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/exhibitions")({
  beforeLoad: () => {
    throw redirect({ to: "/events", statusCode: 301, replace: true });
  },
});