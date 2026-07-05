import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { adminListActivityLog } from "@/lib/admin-content.functions";

export const Route = createFileRoute("/_authenticated/admin/activity")({
  head: () => ({
    meta: [
      { title: "Activity Log — Admin · art by KIYARI" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminActivityPage,
});

type Entry = {
  id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_title: string | null;
  details: any;
  created_at: string;
};

const ACTION_LABELS: Record<string, string> = {
  "artwork.added": "Added artwork",
  "artwork.edited": "Edited artwork",
  "artwork.deleted": "Deleted artwork",
  "artwork.marked_sold": "Marked sold",
  "artwork.marked_available": "Marked available",
  "artwork.bulk_deleted": "Bulk deleted artworks",
};

function actionTone(action: string) {
  if (action.includes("deleted")) return "text-accent border-accent/40 bg-accent/5";
  if (action.includes("added")) return "text-gold border-gold/40 bg-gold/5";
  return "text-muted-foreground border-border bg-card/40";
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AdminActivityPage() {
  const q = useQuery({
    queryKey: ["admin", "activity-log"],
    queryFn: () => adminListActivityLog({ data: { limit: 200 } }),
  });

  const entries: Entry[] = (q.data?.entries as Entry[] | undefined) ?? [];

  return (
    <div className="pt-10 pb-20">
      <div className="container-page">
        <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">Studio</div>
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl">Activity log</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-xl">
          Who changed what, and when. Newest first. Showing the most recent 200 actions.
        </p>

        {q.isLoading && (
          <p className="mt-10 text-sm text-muted-foreground">Loading…</p>
        )}

        {!q.isLoading && entries.length === 0 && (
          <div className="mt-10 border border-dashed border-border p-10 text-center">
            <History className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No activity yet. Actions on artworks will appear here.
            </p>
          </div>
        )}

        {entries.length > 0 && (
          <div className="mt-8 border border-border bg-card/40 overflow-hidden">
            <div className="hidden md:grid grid-cols-[160px_180px_1fr_220px] gap-4 px-4 py-3 border-b border-border text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              <div>When</div>
              <div>Action</div>
              <div>Artwork</div>
              <div>Actor</div>
            </div>
            <ul>
              {entries.map((e) => {
                const changed: string[] | undefined = Array.isArray(
                  e.details?.changed_fields,
                )
                  ? e.details.changed_fields
                  : undefined;
                return (
                  <li
                    key={e.id}
                    className="grid md:grid-cols-[160px_180px_1fr_220px] gap-2 md:gap-4 px-4 py-4 border-b border-border last:border-b-0"
                  >
                    <div className="text-xs text-muted-foreground">
                      {fmtDate(e.created_at)}
                    </div>
                    <div>
                      <span
                        className={`inline-block px-2 py-1 text-[10px] uppercase tracking-[0.2em] border ${actionTone(
                          e.action,
                        )}`}
                      >
                        {ACTION_LABELS[e.action] ?? e.action}
                      </span>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">
                        {e.entity_title ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                      {e.entity_id && (
                        <div className="text-[11px] text-muted-foreground font-mono truncate">
                          {e.entity_id}
                        </div>
                      )}
                      {changed && changed.length > 0 && (
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          Changed: {changed.join(", ")}
                        </div>
                      )}
                      {e.details?.count && !changed && (
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {e.details.count} item(s)
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground break-all">
                      {e.actor_email ?? e.actor_user_id ?? "unknown"}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}