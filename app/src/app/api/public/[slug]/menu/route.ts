import { restaurantBySlug, itemsOf, categoriesOf, specialsOf } from "@/lib/menu";
import { run } from "@/lib/db";
import { json, bad } from "@/lib/http";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = restaurantBySlug(slug);
  if (!r) return bad("Restaurant not found.", 404);
  if (new URL(req.url).searchParams.get("open") === "1") run("INSERT INTO events (restaurant_id, kind) VALUES (?, 'menu_open')", r.id);
  return json({
    restaurant: { name: r.name, city: r.city, currency: r.currency, hours: r.hours, persona: { name: r.persona.name, gender: r.persona.gender, greeting: r.persona.greeting } },
    categories: categoriesOf(r.id),
    items: itemsOf(r.id),
    specials: specialsOf(r.id).map((s: any) => ({ id: s.id, title: s.title, text: s.text })),
  });
}
