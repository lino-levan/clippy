import { FreshContext, Handlers } from "$fresh/server.ts";
import { publishImage } from "../../lib/db.ts";


export const handler: Handlers = {
  async POST(req: Request, _ctx: FreshContext) {
    const { text, options } = await req.json();
    if (!text || !options) {
      return new Response("Missing required fields", { status: 400 });
    }
    if (typeof text !== "string" || !Array.isArray(options) || options.some((o) => typeof o !== "string")) {
      return new Response("Invalid input", { status: 400 });
    }
    await publishImage(text, options); 
    return new Response(null);
  },
};
