import type { Metadata } from "next";
import { all } from "@/modules/platform/db";
import { itemsOf } from "@/modules/platform/menu";
import { showcaseDishes } from "@/modules/platform/showcase";
import Landing from "@/modules/landing/Landing";
import { landingPhotos } from "@/modules/landing/photos";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Shop AI · Every table. In good hands.",
  description: "A restaurant menu in Thai, Burmese and English. Browse dishes, ask the menu, and send your picks to staff for confirmation.",
};

export default function Home() {
  const restaurants = all<{ id: number; slug: string; name: string; dishes: number }>(
    "SELECT r.id, r.slug, r.name, (SELECT COUNT(*) FROM menu_items m WHERE m.restaurant_id = r.id) AS dishes FROM restaurants r ORDER BY r.id",
  );
  // Preserve the public directory: known demo restaurants, or the first restaurant when none are present.
  const demo = restaurants.filter(restaurant => ["golden-lotus", "hachi-kyu"].includes(restaurant.slug));
  const shops = (demo.length ? demo : restaurants.slice(0, 1)).map(shop => ({ ...shop, menu: showcaseDishes(shop.id) }));
  const primary = shops.find(shop => shop.menu.some(dish => dish.photo_url)) || shops[0];
  const available = primary ? itemsOf(primary.id).filter(dish => dish.available) : [];
  const cached = available.filter(dish => landingPhotos.has(dish.photo_url));
  const preview = (cached.length ? cached : available).slice(0, 4).map(({ id, name, price, photo_url }) => ({
    id, name, price, photo_url: landingPhotos.get(photo_url) || photo_url,
  }));
  return <Landing shops={shops} primary={primary} preview={preview} />;
}
