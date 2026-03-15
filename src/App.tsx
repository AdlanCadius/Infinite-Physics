import { useState, useEffect } from "react";
import { Search, ArrowLeft, Home, Loader2, Info } from "lucide-react";
import { InlineMath, BlockMath } from "react-katex";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { PhysicsNode, NavigationState } from "./types";
import { fetchPhysicsContent } from "./services/gemini";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [navState, setNavState] = useState<NavigationState>({
    history: [],
    current: null,
  });

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    setIsLoading(true);
    try {
      const node = await fetchPhysicsContent(query);
      setNavState((prev) => ({
        history: prev.current ? [...prev.history, prev.current] : prev.history,
        current: node,
      }));
      setSearchQuery("");
    } catch (error) {
      console.error("Failed to fetch physics content:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuantityClick = (quantityName: string) => {
    handleSearch(quantityName);
  };

  const navigateToHistory = (index: number) => {
    const newHistory = navState.history.slice(0, index);
    const newCurrent = navState.history[index];
    setNavState({
      history: newHistory,
      current: newCurrent,
    });
  };

  const goHome = () => {
    setNavState({
      history: [],
      current: null,
    });
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 selection:bg-zinc-900 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-zinc-100">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={goHome}
            className="text-xl font-bold tracking-tighter hover:opacity-70 transition-opacity"
          >
            INFINITE PHYSICS
          </button>
          
          {navState.current && (
            <div className="flex items-center text-sm text-zinc-500 overflow-x-auto whitespace-nowrap scrollbar-hide">
              {navState.history.map((node, i) => (
                <span key={node.id} className="breadcrumb-item flex items-center">
                  <button 
                    onClick={() => navigateToHistory(i)}
                    className="hover:text-zinc-900 transition-colors"
                  >
                    {node.title}
                  </button>
                </span>
              ))}
              <span className="breadcrumb-item text-zinc-900 font-medium">{navState.current.title}</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {!navState.current ? (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center min-h-[60vh] text-center"
            >
              <h1 className="text-5xl font-bold tracking-tighter mb-8">
                Explore the laws of the universe.
              </h1>
              <div className="relative w-full max-w-xl">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch(searchQuery)}
                  placeholder="Search for a physics concept (e.g. Gravity, Entropy, Maxwell's Equations)..."
                  className="w-full px-6 py-4 text-lg border-2 border-zinc-900 rounded-full focus:outline-none pr-16"
                />
                <button
                  onClick={() => handleSearch(searchQuery)}
                  disabled={isLoading}
                  className="absolute right-2 top-2 p-3 bg-zinc-900 text-white rounded-full hover:bg-zinc-800 transition-colors disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Search className="w-6 h-6" />}
                </button>
              </div>
              <p className="mt-6 text-zinc-500 text-sm">
                Powered by AI. Click on any physical quantity to dive deeper.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key={navState.current.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-12"
            >
              {/* Title Section */}
              <section>
                <h2 className="text-4xl font-bold tracking-tighter mb-4">
                  {navState.current.title}
                </h2>
                <div className="h-1 w-20 bg-zinc-900" />
              </section>

              {/* Explanation Section */}
              <section className="explanation-text text-xl text-zinc-800 max-w-3xl">
                {navState.current.explanation}
              </section>

              {/* Formulas Section */}
              {navState.current.formulas.length > 0 && (
                <section>
                  <h3 className="text-xs uppercase tracking-widest font-bold text-zinc-400 mb-6">
                    Mathematical Representation
                  </h3>
                  <div className="grid gap-4">
                    {navState.current.formulas.map((formula, i) => (
                      <div key={i} className="latex-formula">
                        <BlockMath math={formula} />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Quantities Section */}
              <section>
                <h3 className="text-xs uppercase tracking-widest font-bold text-zinc-400 mb-6">
                  Physical Quantities
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {navState.current.quantities.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuantityClick(q.name)}
                      className="group flex flex-col p-6 border border-zinc-100 rounded-2xl hover:border-zinc-900 transition-all text-left"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl font-bold font-serif">
                          <InlineMath math={q.symbol} />
                        </span>
                        <span className="text-xs font-mono text-zinc-400 uppercase">
                          {q.unit}
                        </span>
                      </div>
                      <h4 className="font-bold text-zinc-900 group-hover:underline">
                        {q.name}
                      </h4>
                      <p className="text-sm text-zinc-500 mt-2 line-clamp-2">
                        {q.description}
                      </p>
                    </button>
                  ))}
                </div>
              </section>

              {/* Loading Overlay for nested searches */}
              {isLoading && (
                <div className="fixed inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-50">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 animate-spin text-zinc-900" />
                    <p className="font-bold tracking-tighter">Analyzing physics...</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="mt-24 border-t border-zinc-100 py-12">
        <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-zinc-400">
          <p>© 2026 Infinite Physics. All rights reserved.</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-zinc-900 transition-colors">Documentation</a>
            <a href="#" className="hover:text-zinc-900 transition-colors">Privacy</a>
            <a href="#" className="hover:text-zinc-900 transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
