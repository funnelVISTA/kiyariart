import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

// Fire-and-forget audit logger. Never blocks or fails the caller.
async function logActivity(
  supabaseAdmin: any,
  context: { userId: string; claims?: any },
  entry: {
    action: string;
    entity_type?: string;
    entity_id?: string | null;
    entity_title?: string | null;
    details?: Record<string, any> | null;
  },
) {
  try {
    await supabaseAdmin.from("admin_activity_log").insert({
      actor_user_id: context.userId,
      actor_email: context.claims?.email ?? null,
      action: entry.action,
      entity_type: entry.entity_type ?? "artwork",
      entity_id: entry.entity_id ?? null,
      entity_title: entry.entity_title ?? null,
      details: entry.details ?? null,
    });
  } catch (e) {
    console.error("admin activity log failed", e);
  }
}

// ===== Image upload =====

const SIGNED_TTL = 60 * 60 * 24 * 365 * 10;

export const adminUploadImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { bucket: "artwork-images" | "exhibition-images"; filename: string; contentType: string; dataBase64: string }) => {
    if (!d || (d.bucket !== "artwork-images" && d.bucket !== "exhibition-images"))
      throw new Error("Invalid bucket");
    if (!d.filename || typeof d.filename !== "string" || d.filename.length > 200)
      throw new Error("Invalid filename");
    if (!d.contentType?.startsWith("image/")) throw new Error("Only images allowed");
    if (!d.dataBase64 || typeof d.dataBase64 !== "string") throw new Error("No data");
    if (d.dataBase64.length > 16_000_000) throw new Error("Image too large (max ~12MB)");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const safe = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
    const bytes = Buffer.from(data.dataBase64, "base64");
    const { error: upErr } = await supabaseAdmin.storage
      .from(data.bucket)
      .upload(path, bytes, { contentType: data.contentType, upsert: false });
    if (upErr) throw new Error(upErr.message);
    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from(data.bucket)
      .createSignedUrl(path, SIGNED_TTL);
    if (sErr) throw new Error(sErr.message);
    return { url: signed.signedUrl, path };
  });

// ===== Artworks CRUD =====

type ArtworkUpsert = {
  id?: string;
  title: string;
  description?: string | null;
  price: number;
  image_url: string;
  collection: string;
  medium?: string | null;
  sold?: boolean;
  sort_order?: number;
  display_order?: number;
  seo_title?: string | null;
  seo_description?: string | null;
  alt_text?: string | null;
  on_sale?: boolean;
  sale_price?: number | null;
  shipping_cad?: number;
};

export const adminListCustomArtworks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("artworks_custom")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { artworks: data ?? [] };
  });

export const adminUpsertCustomArtwork = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ArtworkUpsert) => {
    if (!d.title?.trim()) throw new Error("Title required");
    if (!d.image_url?.trim()) throw new Error("Image required");
    const price = Number(d.price);
    if (!Number.isFinite(price) || price < 0) throw new Error("Invalid price");
    if (!d.collection) throw new Error("Collection required");
    const shipping = Number(d.shipping_cad ?? 0);
    if (!Number.isFinite(shipping) || shipping < 0) throw new Error("Invalid shipping cost");
    const onSale = !!d.on_sale;
    let salePrice: number | null = null;
    if (onSale) {
      const sp = Number(d.sale_price);
      if (!Number.isFinite(sp) || sp <= 0) throw new Error("Sale price must be a positive number");
      if (!(price > 0)) throw new Error("Set a regular price before enabling sale");
      if (sp >= price) throw new Error("Sale price must be less than the regular price");
      salePrice = Math.round(sp * 100) / 100;
    }
    return { ...d, price, on_sale: onSale, sale_price: salePrice, shipping_cad: Math.round(shipping * 100) / 100 };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload: any = {
      title: data.title.trim(),
      description: data.description?.trim() || null,
      price: data.price,
      image_url: data.image_url,
      collection: data.collection,
      medium: data.medium?.trim() || null,
      sold: !!data.sold,
      sort_order: Number.isFinite(data.sort_order) ? data.sort_order : 0,
      display_order: Number.isFinite(data.display_order) ? data.display_order : 0,
      seo_title: data.seo_title?.trim() || null,
      seo_description: data.seo_description?.trim() || null,
      alt_text: data.alt_text?.trim() || null,
      created_by: context.userId,
      on_sale: !!data.on_sale,
      sale_price: data.sale_price ?? null,
      shipping_cad: data.shipping_cad ?? 0,
    };
    if (data.id) {
      const { data: before } = await supabaseAdmin
        .from("artworks_custom").select("*").eq("id", data.id).maybeSingle();
      const { data: row, error } = await supabaseAdmin
        .from("artworks_custom").update(payload).eq("id", data.id).select("*").single();
      if (error) throw new Error(error.message);
      const changed: Record<string, { from: any; to: any }> = {};
      if (before) {
        for (const k of Object.keys(payload)) {
          if (k === "created_by") continue;
          if (JSON.stringify((before as any)[k]) !== JSON.stringify((payload as any)[k])) {
            changed[k] = { from: (before as any)[k], to: (payload as any)[k] };
          }
        }
      }
      await logActivity(supabaseAdmin, context, {
        action: "artwork.edited",
        entity_id: row.id,
        entity_title: row.title,
        details: { changed_fields: Object.keys(changed), changes: changed },
      });
      return { artwork: row };
    }
    const { data: row, error } = await supabaseAdmin
      .from("artworks_custom").insert(payload).select("*").single();
    if (error) throw new Error(error.message);
    await logActivity(supabaseAdmin, context, {
      action: "artwork.added",
      entity_id: row.id,
      entity_title: row.title,
      details: { title: row.title, price: row.price, collection: row.collection },
    });
    return { artwork: row };
  });

export const adminDeleteCustomArtwork = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => {
    if (!d.id) throw new Error("id required");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: before } = await supabaseAdmin
      .from("artworks_custom").select("title").eq("id", data.id).maybeSingle();
    const { error } = await supabaseAdmin.from("artworks_custom").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logActivity(supabaseAdmin, context, {
      action: "artwork.deleted",
      entity_id: data.id,
      entity_title: before?.title ?? null,
    });
    return { ok: true };
  });

// ===== Bulk artwork actions =====

export const adminBulkSetArtworkSold = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ids: string[]; sold: boolean }) => {
    if (!Array.isArray(d.ids) || d.ids.length === 0) throw new Error("No ids");
    if (d.ids.length > 100) throw new Error("Too many");
    return { ids: d.ids.filter((x) => typeof x === "string"), sold: !!d.sold };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("artworks_custom").update({ sold: data.sold }).in("id", data.ids);
    if (error) throw new Error(error.message);
    await logActivity(supabaseAdmin, context, {
      action: data.sold ? "artwork.marked_sold" : "artwork.marked_available",
      entity_id: null,
      entity_title: `${data.ids.length} artwork(s)`,
      details: { ids: data.ids, count: data.ids.length },
    });
    return { ok: true, count: data.ids.length };
  });

export const adminBulkDeleteArtworks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ids: string[] }) => {
    if (!Array.isArray(d.ids) || d.ids.length === 0) throw new Error("No ids");
    if (d.ids.length > 100) throw new Error("Too many");
    return { ids: d.ids.filter((x) => typeof x === "string") };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("artworks_custom").delete().in("id", data.ids);
    if (error) throw new Error(error.message);
    const deleted = data.ids.length;
    const blockedSet = new Set<string>();
    if (deleted > 0) {
      await logActivity(supabaseAdmin, context, {
        action: "artwork.bulk_deleted",
        entity_id: null,
        entity_title: `${deleted} artwork(s)`,
        details: { deleted_ids: data.ids },
      });
    }
    return { ok: true, deleted, blocked: [...blockedSet] };
  });

export const adminBulkSetArtworkCollection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ids: string[]; collection: string }) => {
    if (!Array.isArray(d.ids) || d.ids.length === 0) throw new Error("No ids");
    if (d.ids.length > 100) throw new Error("Too many");
    const allowed = new Set(["Our Essence", "The Legends"]);
    if (!allowed.has(d.collection)) throw new Error("Invalid collection");
    return { ids: d.ids.filter((x) => typeof x === "string"), collection: d.collection };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("artworks_custom").update({ collection: data.collection }).in("id", data.ids);
    if (error) throw new Error(error.message);
    await logActivity(supabaseAdmin, context, {
      action: "artwork.bulk_collection_changed",
      entity_id: null,
      entity_title: `${data.ids.length} artwork(s)`,
      details: { ids: data.ids, count: data.ids.length, collection: data.collection },
    });
    return { ok: true, count: data.ids.length };
  });

// Returns the subset of artwork ids that appear in sold_artworks or any order's items[].id.
async function findArtworksWithOrderHistory(
  supabaseAdmin: any,
  ids: string[],
): Promise<Set<string>> {
  const blocked = new Set<string>();
  if (ids.length === 0) return blocked;

  const { data: sold } = await supabaseAdmin
    .from("sold_artworks")
    .select("artwork_id")
    .in("artwork_id", ids);
  for (const r of sold ?? []) blocked.add(r.artwork_id);

  const remaining = ids.filter((id) => !blocked.has(id));
  if (remaining.length === 0) return blocked;

  const { data: orders } = await supabaseAdmin.from("orders").select("items");
  const idSet = new Set(remaining);
  for (const o of orders ?? []) {
    const items = Array.isArray(o.items) ? o.items : [];
    for (const it of items as any[]) {
      const itemId = it?.id;
      if (typeof itemId === "string" && idSet.has(itemId)) blocked.add(itemId);
    }
  }
  return blocked;
}

// ===== Reordering (custom artworks) =====

export const adminReorderCustomArtworks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderedIds: string[] }) => {
    if (!Array.isArray(d.orderedIds)) throw new Error("orderedIds required");
    if (d.orderedIds.length > 500) throw new Error("Too many");
    return { orderedIds: d.orderedIds.filter((x) => typeof x === "string") };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Update each row's display_order by index
    await Promise.all(
      data.orderedIds.map((id, idx) =>
        supabaseAdmin.from("artworks_custom").update({ display_order: idx }).eq("id", id),
      ),
    );
    return { ok: true };
  });

// ===== Static catalog display order (artwork_display_order) =====

export const adminReorderStaticArtworks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderedIds: string[] }) => {
    if (!Array.isArray(d.orderedIds)) throw new Error("orderedIds required");
    return { orderedIds: d.orderedIds.filter((x) => typeof x === "string") };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const rows = data.orderedIds.map((id, idx) => ({ artwork_id: id, position: idx, updated_at: new Date().toISOString() }));
    const { error } = await supabaseAdmin
      .from("artwork_display_order")
      .upsert(rows, { onConflict: "artwork_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Exhibitions CRUD =====

type ExhibitionUpsert = {
  id?: string;
  title: string;
  venue?: string | null;
  city?: string | null;
  blurb?: string | null;
  event_date?: string | null;
  end_date?: string | null;
  time_text?: string | null;
  image_url?: string | null;
  link_url?: string | null;
  status?: "upcoming" | "past";
  sort_order?: number;
  gallery_images?: string[] | null;
};

export const adminListExhibitions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("exhibitions").select("*")
      .order("status", { ascending: true })
      .order("event_date", { ascending: true, nullsFirst: false })
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return { exhibitions: data ?? [] };
  });

export const adminUpsertExhibition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ExhibitionUpsert) => {
    if (!d.title?.trim()) throw new Error("Title required");
    const status = d.status === "past" ? "past" : "upcoming";
    return { ...d, status };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload: any = {
      title: data.title.trim(),
      venue: data.venue?.trim() || null,
      city: data.city?.trim() || null,
      blurb: data.blurb?.trim() || null,
      event_date: data.event_date || null,
      end_date: data.end_date || null,
      time_text: data.time_text?.trim() || null,
      image_url: data.image_url || null,
      link_url: data.link_url?.trim() || null,
      status: data.status,
      sort_order: Number.isFinite(data.sort_order) ? data.sort_order : 0,
      created_by: context.userId,
      gallery_images: Array.isArray(data.gallery_images)
        ? data.gallery_images.filter((u) => typeof u === "string" && u.length > 0)
        : [],
    };
    if (data.id) {
      const { data: row, error } = await supabaseAdmin
        .from("exhibitions").update(payload).eq("id", data.id).select("*").single();
      if (error) throw new Error(error.message);
      return { exhibition: row };
    }
    const { data: row, error } = await supabaseAdmin
      .from("exhibitions").insert(payload).select("*").single();
    if (error) throw new Error(error.message);
    return { exhibition: row };
  });

export const adminDeleteExhibition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => {
    if (!d.id) throw new Error("id required");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("exhibitions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Bulk exhibition actions =====

export const adminBulkSetExhibitionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ids: string[]; status: "upcoming" | "past" }) => {
    if (!Array.isArray(d.ids) || d.ids.length === 0) throw new Error("No ids");
    if (d.ids.length > 100) throw new Error("Too many");
    const status = d.status === "past" ? "past" : "upcoming";
    return { ids: d.ids.filter((x) => typeof x === "string"), status };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("exhibitions")
      .update({ status: data.status })
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true, count: data.ids.length };
  });

export const adminBulkDeleteExhibitions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ids: string[] }) => {
    if (!Array.isArray(d.ids) || d.ids.length === 0) throw new Error("No ids");
    if (d.ids.length > 100) throw new Error("Too many");
    return { ids: d.ids.filter((x) => typeof x === "string") };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("exhibitions").delete().in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true, count: data.ids.length };
  });

// ===== Admin activity log =====

// ===== Catalog price / sale overrides (for hardcoded ARTWORKS ids) =====

type CatalogOverrideUpsert = {
  artworkId: string;
  originalPrice: number; // reference — used to validate sale bounds
  priceOverride?: number | null;
  onSale?: boolean;
  salePrice?: number | null;
  title?: string | null;
  description?: string | null;
  medium?: string | null;
  image_url?: string | null;
  alt_text?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
};

export const adminUpsertCatalogOverride = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: CatalogOverrideUpsert) => {
    if (!d.artworkId || typeof d.artworkId !== "string") throw new Error("artworkId required");
    const original = Number(d.originalPrice);
    if (!Number.isFinite(original) || original < 0) throw new Error("Invalid original price");
    let priceOverride: number | null = null;
    if (d.priceOverride !== undefined && d.priceOverride !== null && `${d.priceOverride}` !== "") {
      const p = Number(d.priceOverride);
      if (!Number.isFinite(p) || p < 0) throw new Error("Invalid price");
      priceOverride = Math.round(p * 100) / 100;
    }
    const effectiveList = priceOverride ?? original;
    const onSale = !!d.onSale;
    let salePrice: number | null = null;
    if (onSale) {
      const sp = Number(d.salePrice);
      if (!Number.isFinite(sp) || sp <= 0) throw new Error("Sale price must be positive");
      if (!(effectiveList > 0)) throw new Error("Set a regular price before enabling sale");
      if (sp >= effectiveList) throw new Error("Sale price must be less than the regular price");
      salePrice = Math.round(sp * 100) / 100;
    }
    const norm = (v: unknown) => {
      if (v === undefined) return undefined;
      if (v === null) return null;
      const s = String(v);
      return s.trim() === "" ? null : s;
    };
    return {
      artworkId: d.artworkId,
      priceOverride,
      onSale,
      salePrice,
      title: norm(d.title),
      description: norm(d.description),
      medium: norm(d.medium),
      image_url: norm(d.image_url),
      alt_text: norm(d.alt_text),
      seo_title: norm(d.seo_title),
      seo_description: norm(d.seo_description),
    };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const row: Record<string, unknown> = {
      artwork_id: data.artworkId,
      price_override: data.priceOverride,
      on_sale: data.onSale,
      sale_price: data.salePrice,
      updated_at: new Date().toISOString(),
    };
    // Only include text override fields if the client sent them (undefined = leave as-is).
    for (const k of ["title","description","medium","image_url","alt_text","seo_title","seo_description"] as const) {
      if ((data as any)[k] !== undefined) row[k] = (data as any)[k];
    }
    const { error } = await supabaseAdmin
      .from("artwork_catalog_overrides")
      .upsert(row as any, { onConflict: "artwork_id" });
    if (error) throw new Error(error.message);
    await logActivity(supabaseAdmin, context, {
      action: "artwork.catalog_override_saved",
      entity_id: data.artworkId,
      entity_title: data.artworkId,
      details: { priceOverride: data.priceOverride, onSale: data.onSale, salePrice: data.salePrice },
    });
    return { ok: true };
  });

export const adminListActivityLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limit?: number } | undefined) => ({
    limit: Math.min(Math.max(Number(d?.limit ?? 200), 1), 500),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("admin_activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return { entries: rows ?? [] };
  });
