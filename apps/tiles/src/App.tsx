import { useState, useEffect, useCallback } from "react";
import "./index.css";

type Product = { id: string; name: string; freq: number; qty: number; image?: string };
type TileState = "idle" | "adding" | "done" | "error";

function Spinner() {
  return (
    <svg className="animate-spin h-6 w-6 text-white/70" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
    </svg>
  );
}

export function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [states, setStates] = useState<Record<string, TileState>>({});
  const [basketTotal, setBasketTotal] = useState<number | null>(null);
  const [basketCount, setBasketCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then(r => r.json()),
      fetch("/api/basket").then(r => r.json()),
    ]).then(([prods, basket]) => {
      setProducts(prods);
      setBasketTotal(basket.total);
      setBasketCount(basket.items?.length ?? 0);
      setLoading(false);
    });
  }, []);

  const addToBasket = useCallback(async (p: Product) => {
    if (states[p.id] === "adding") return;
    setStates(s => ({ ...s, [p.id]: "adding" }));
    try {
      const res = await fetch("/api/basket/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: p.id, quantity: p.qty }),
      });
      const data = await res.json();
      if (data.ok) {
        setStates(s => ({ ...s, [p.id]: "done" }));
        setBasketTotal(data.total);
        setBasketCount(data.itemCount);
      } else {
        setStates(s => ({ ...s, [p.id]: "error" }));
      }
    } catch {
      setStates(s => ({ ...s, [p.id]: "error" }));
    }
  }, [states]);

  if (loading) {
    return (
      <div className="h-screen bg-neutral-950 grid place-items-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="h-screen bg-neutral-950 text-neutral-100 flex flex-col overflow-hidden">
      <header className="flex items-baseline justify-between px-4 py-2 shrink-0">
        <h1 className="text-sm font-medium tracking-tight text-neutral-500">nemlig</h1>
        {basketTotal !== null && (
          <span className="text-sm text-neutral-500">
            {basketCount} varer · {basketTotal.toFixed(0)} kr
          </span>
        )}
      </header>

      <div className="flex-1 grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 auto-rows-fr gap-px bg-neutral-800 min-h-0">
        {products.map(p => {
          const state = states[p.id] ?? "idle";
          return (
            <button
              key={p.id}
              onClick={() => addToBasket(p)}
              disabled={state === "adding"}
              title={p.name}
              className={`
                relative cursor-pointer select-none overflow-hidden group
                transition-all duration-150
                ${state === "done"
                  ? "bg-emerald-950"
                  : state === "error"
                    ? "bg-red-950"
                    : "bg-neutral-950 hover:bg-neutral-900 active:scale-95"
                }
              `}
            >
              {state === "adding" && (
                <div className="absolute inset-0 bg-neutral-950/70 grid place-items-center z-20">
                  <Spinner />
                </div>
              )}

              {p.image ? (
                <img
                  src={p.image}
                  alt={p.name}
                  className="absolute inset-0 w-full h-full object-contain p-2"
                  loading="lazy"
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center text-neutral-700 text-lg">?</div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent
                              opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10
                              flex items-end p-1.5">
                <span className="text-[10px] leading-tight text-white/90">{p.name}</span>
              </div>

              {state === "done" && (
                <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500 grid place-items-center z-10">
                  <span className="text-[9px] text-white font-bold">✓</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default App;
