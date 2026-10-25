// Cloudflare Pages Function: /api/fetch (see server/passthrough.ts).
import { passThrough } from "../../server/passthrough.ts";

export const onRequest = ({ request }: { request: Request }) => passThrough(request);
