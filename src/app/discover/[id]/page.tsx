import { permanentRedirect } from "next/navigation";
import { catalogSlug } from "@/lib/catalog-urls";

/** Old collection URLs carried the full image id; dishes now live at /recipes/<slug>. */
export default async function FoodPage({ params }: PageProps<"/discover/[id]">) {
  const { id } = await params;
  permanentRedirect(`/recipes/${catalogSlug(id)}`);
}
