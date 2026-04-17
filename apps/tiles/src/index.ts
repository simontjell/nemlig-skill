import { serve, $ } from "bun";
import index from "./index.html";
import products from "./products.json";

const ROOT = `${import.meta.dir}/../../..`;
const CLI = `${ROOT}/nemlig_cli.py`;

serve({
  port: 3000,
  routes: {
    "/*": index,

    "/api/products": {
      GET() {
        return Response.json(products);
      },
    },

    "/api/basket": {
      async GET() {
        try {
          const result = await $`python3 ${CLI} basket`.cwd(ROOT).text();
          const lines: { id: string; name: string; qty: number; price: number }[] = [];
          for (const line of result.split("\n")) {
            const m = line.match(/\[(\d+)\]\s+(.+?)\s+x(\d+)\s+@\s+([\d.]+)\s+kr/);
            if (m) lines.push({ id: m[1], name: m[2], qty: +m[3], price: +m[4] });
          }
          const totalMatch = result.match(/Total:\s+([\d.]+)\s+kr/);
          return Response.json({ items: lines, total: totalMatch ? +totalMatch[1] : 0 });
        } catch (e: any) {
          return Response.json({ error: e.message }, { status: 500 });
        }
      },
    },

    "/api/basket/add": {
      async POST(req) {
        const { productId, quantity } = await req.json() as { productId: string; quantity: number };
        try {
          const result = await $`python3 ${CLI} add ${productId} --quantity ${String(quantity)}`.cwd(ROOT).text();
          const totalMatch = result.match(/Basket total:\s+([\d.]+)\s+kr\s+\((\d+)\s+items?\)/);
          return Response.json({
            ok: true,
            total: totalMatch ? +totalMatch[1] : 0,
            itemCount: totalMatch ? +totalMatch[2] : 0,
          });
        } catch (e: any) {
          return Response.json({ error: e.message }, { status: 500 });
        }
      },
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log("🛒 Nemlig Tiles running at http://localhost:3000");
