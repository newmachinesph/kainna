import type { Metadata } from "next";
﻿import { Suspense } from "react";
import { LoginPage } from "@/components/LoginPage";
export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };
export default function Page() { return <Suspense><LoginPage /></Suspense>; }
