import { health } from "@/server/catalog";
import { route } from "@/server/http";

export const dynamic = "force-dynamic";
export const GET = route(() => health());
