"use client";
import { Analytics } from "@vercel/analytics/next";
export function SiteAnalytics() {
 return <Analytics beforeSend={(event) => ({ ...event, url: event.url.split(/[?#]/)[0] })} />;
}
