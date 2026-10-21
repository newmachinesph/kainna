import { seoIndex } from "@/server/catalog";
import { route } from "@/server/http";

export const GET = route(() => seoIndex());
