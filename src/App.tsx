import { useState, useEffect } from "react";
import { Search, ArrowLeft, Home, Loader2, Info, Trash2, Shield, LogIn, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { InlineMath, BlockMath } from "react-katex";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { PhysicsNode, NavigationState } from "./types";
import { fetchPhysicsContent, clearPhysicsCache } from "./services/gemini";
import AdminDashboard from "./components/AdminDashboard";

// Firebase & Mock Config
import { auth, googleProvider } from "./firebase";
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { ENABLE_MOCK, MOCK_USER } from "./mockConfig";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function Skeleton() {
  return (
    <div className="space-y-12">
      <section>
        <div className="skeleton-title skeleton" />
        <div className="h-1 w-20 bg-zinc-100" />
      </section>
      <section className="space-y-4">
        <div className="skeleton-text skeleton" />
        <div className="skeleton-text skeleton w-11/12" />
        <div className="skeleton-text skeleton w-4/5" />
      </section>
      <section>
        <div className="h-4 w-32 skeleton mb-6" />
        <div className="h-32 w-full skeleton" />
      </section>
      <section>
        <div className="h-4 w-32 skeleton mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-40 skeleton" />
          <div className="h-40 skeleton" />
        </div>
      </section>
    </div>
  );
}

const PLACEHOLDERS = [
  "Newton's Second Law...",
  "Einstein's General Relativity...",
  "Heisenberg's Uncertainty Principle...",
  "Maxwell's Equations...",
  "Schrödinger's Equation...",
  "Hooke's Law...",
  "Ohm's Law...",
  "Bernoulli's Principle...",
  "Faraday's Law of Induction...",
  "Planck's Quantum Theory...",
  "Boyle's Law...",
  "Galileo's Law of Falling Bodies...",
  "Kepler's Laws of Planetary Motion...",
  "Coulomb's Law...",
  "Hubble's Law...",
];

export default function App() {
  const [isAdminView, setIsAdminView] = useState(window.location.pathname === "/admin");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [randomFact, setRandomFact] = useState<string | null>(null);
  const [language, setLanguage] = useState<"id" | "en">("id");
  const [navState, setNavState] = useState<NavigationState>({
    history: [],
    current: null,
  });

  const [user, setUser] = useState<{ id: string; tokens: number; email?: string } | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [deviceId] = useState(() => Math.random().toString(36).substr(2, 9));

  // Auth Logic (Mock vs Firebase)
  useEffect(() => {
    if (ENABLE_MOCK) {
      console.log("🛠️ Mode Mock Aktif");
      setUser({ id: MOCK_USER.id, tokens: MOCK_USER.tokens, email: MOCK_USER.email });
      setIsAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({ 
          id: firebaseUser.uid, 
          tokens: 100, // Default for new user, backend will handle actual count
          email: firebaseUser.email || "" 
        });
      } else {
        setUser(null);
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    if (ENABLE_MOCK) {
      alert("Mode Mock tidak bisa logout secara teknis. Ubah ENABLE_MOCK di mockConfig.ts");
      return;
    }
    await signOut(auth);
  };

  // Cycle placeholders
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Session Check
  useEffect(() => {
    const checkSession = async () => {
      if (!user) return;
      try {
        const res = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, deviceId }),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error);
        }
      } catch (e) {
        console.error("Session check failed", e);
      }
    };
    checkSession();
  }, [user, deviceId]);

  // Update random fact when current node changes
  useEffect(() => {
    if (navState.current?.facts && navState.current.facts.length > 0) {
      const randomIndex = Math.floor(Math.random() * navState.current.facts.length);
      setRandomFact(navState.current.facts[randomIndex]);
    } else {
      setRandomFact(null);
    }
  }, [navState.current]);

  const handleSearch = async (query: string) => {
    if (!query.trim() || !user) return;
    setIsLoading(true);
    try {
      const node = await fetchPhysicsContent(query, language, user.id);
      setNavState((prev) => ({
        history: prev.current ? [...prev.history, prev.current] : prev.history,
        current: node,
      }));
      setSearchQuery("");
      // Update local token count (optimistic or refresh from server)
      setUser(prev => prev ? { ...prev, tokens: prev.tokens - 10 } : null);
    } catch (error: any) {
      alert(error.message);
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

  const resetData = () => {
    clearPhysicsCache();
    goHome();
  };

  // Cost calculation (Approximate)
  // Input: ~500 tokens ($0.075 / 1M)
  // Output: ~1000 tokens ($0.30 / 1M)
  // Total: ~$0.0003375 per request
  // IDR: ~$0.0003375 * 15,500 = ~5.23 IDR
  const approxCostIDR = 5.23;

  if (isAdminView) {
    return <AdminDashboard />;
  }

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-300" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white border border-zinc-200 rounded-[32px] p-10 shadow-xl text-center"
        >
          <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tighter mb-4">Infinite Physics</h1>
          <p className="text-zinc-500 mb-10 leading-relaxed">
            Jelajahi semesta fisika tanpa batas. Login untuk mulai riset dan kumpulkan token Anda.
          </p>
          
          <button 
            onClick={handleGoogleLogin}
            className="w-full bg-zinc-900 text-white font-bold py-5 rounded-2xl hover:bg-zinc-800 transition-all flex items-center justify-center gap-3 shadow-lg active:scale-95"
          >
            <LogIn className="w-5 h-5" />
            Lanjutkan dengan Google
          </button>
          
          <p className="text-[10px] text-zinc-400 mt-8 uppercase tracking-widest font-bold">
            Secure Authentication by Firebase
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900 selection:bg-zinc-900 selection:text-white">
      {/* Admin Quick Access */}
      <button 
        onClick={() => {
          window.history.pushState({}, "", "/admin");
          setIsAdminView(true);
        }}
        className="fixed bottom-6 right-6 w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200 transition-all z-50"
        title="Admin Access"
      >
        <Shield className="w-4 h-4" />
      </button>

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
                <span key={`${node.id}-${i}`} className="breadcrumb-item flex items-center">
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
          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none mb-1">Tokens</p>
                  <p className="text-sm font-bold text-zinc-900 leading-none">{user.tokens}</p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 overflow-hidden hover:opacity-80 transition-opacity"
                  title={`Logout (${user.email})`}
                >
                  <img 
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} 
                    alt="avatar" 
                    referrerPolicy="no-referrer"
                  />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {!navState.current && !isLoading ? (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center min-h-[60vh] text-center"
            >
              <h1 className="text-5xl md:text-6xl font-bold tracking-tighter mb-8 max-w-2xl">
                Explore the laws of the universe.
              </h1>
              
              {/* Language Selection */}
              <div className="flex items-center gap-4 mb-6 text-xs font-bold uppercase tracking-widest">
                <button
                  onClick={() => setLanguage("id")}
                  className={cn(
                    "px-3 py-1 rounded-full transition-all",
                    language === "id" ? "bg-zinc-900 text-white" : "text-zinc-400 hover:text-zinc-900"
                  )}
                >
                  Bahasa Indonesia
                </button>
                <div className="w-px h-3 bg-zinc-200" />
                <button
                  onClick={() => setLanguage("en")}
                  className={cn(
                    "px-3 py-1 rounded-full transition-all",
                    language === "en" ? "bg-zinc-900 text-white" : "text-zinc-400 hover:text-zinc-900"
                  )}
                >
                  English
                </button>
              </div>

              <div className="relative w-full max-w-xl">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch(searchQuery)}
                  placeholder={PLACEHOLDERS[placeholderIndex]}
                  className="w-full px-8 py-5 text-lg border-2 border-zinc-900 rounded-full focus:outline-none pr-16 shadow-lg shadow-zinc-100 transition-all duration-500"
                />
                <button
                  onClick={() => handleSearch(searchQuery)}
                  disabled={isLoading}
                  className="absolute right-2 top-2 p-4 bg-zinc-900 text-white rounded-full hover:bg-zinc-800 transition-colors disabled:opacity-50"
                >
                  <Search className="w-6 h-6" />
                </button>
              </div>
              <p className="mt-8 text-zinc-400 text-sm">
                Powered by AI. Click on any physical quantity to dive deeper.
              </p>
            </motion.div>
          ) : isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Skeleton />
            </motion.div>
          ) : (
            <motion.div
              key={navState.current?.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-16"
            >
              {/* Title Section */}
              <section>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-5xl font-bold tracking-tighter mb-4">
                      {navState.current?.title}
                    </h2>
                    <div className="h-1.5 w-24 bg-zinc-900 rounded-full" />
                  </div>
                  
                  {randomFact && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="hidden lg:block max-w-[240px] p-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-xs text-zinc-600 italic leading-relaxed relative"
                    >
                      <div className="absolute -top-2 -left-2 bg-zinc-900 text-white px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest">Did You Know?</div>
                      "{randomFact}"
                    </motion.div>
                  )}
                </div>
              </section>

              {/* Mobile Random Fact */}
              {randomFact && (
                <div className="lg:hidden p-6 bg-zinc-50 border border-zinc-100 rounded-3xl text-sm text-zinc-600 italic leading-relaxed relative">
                  <div className="absolute -top-2 left-6 bg-zinc-900 text-white px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest">Did You Know?</div>
                  "{randomFact}"
                </div>
              )}

              {/* Explanation Section */}
              <section className="explanation-text text-2xl text-zinc-800 max-w-3xl leading-relaxed">
                <ReactMarkdown>{navState.current?.explanation}</ReactMarkdown>
              </section>

              {/* Formulas Section */}
              {navState.current && navState.current.formulas.length > 0 && (
                <section>
                  <h3 className="text-xs uppercase tracking-widest font-bold text-zinc-400 mb-8">
                    Mathematical Representation
                  </h3>
                  <div className="grid gap-6">
                    {navState.current.formulas.map((formula, i) => (
                      <div key={i} className="latex-formula shadow-sm">
                        <BlockMath math={formula} />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Quantities Section */}
              {navState.current && (
                <section>
                  <h3 className="text-xs uppercase tracking-widest font-bold text-zinc-400 mb-8">
                    Physical Quantities
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {navState.current.quantities.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => handleQuantityClick(q.name)}
                        className="modern-card group"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl font-bold font-serif">
                              <InlineMath math={q.symbol} />
                            </span>
                            <span className="text-xs font-medium text-zinc-400 italic">
                              ({q.symbolName})
                            </span>
                          </div>
                          <span className="text-xs font-mono text-zinc-400 bg-zinc-50 px-2 py-1 rounded">
                            {q.unit}
                          </span>
                        </div>
                        <h4 className="text-lg font-bold text-zinc-900 group-hover:underline">
                          {q.name}
                        </h4>
                        <p className="text-sm text-zinc-500 mt-3 line-clamp-2 leading-relaxed">
                          {q.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Related Topics / Expansion Section */}
              {navState.current && navState.current.relatedTopics && navState.current.relatedTopics.length > 0 && (
                <section className="pt-8 border-t border-zinc-100">
                  <h3 className="text-xs uppercase tracking-widest font-bold text-zinc-400 mb-8">
                    Expansion & Deep Dive
                  </h3>
                  <div className="flex flex-wrap gap-4">
                    {navState.current.relatedTopics.map((topic, i) => (
                      <button
                        key={i}
                        onClick={() => handleSearch(topic.query)}
                        className="px-6 py-3 bg-zinc-900 text-white rounded-2xl text-sm font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200"
                      >
                        {topic.label}
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="mt-32 border-t border-zinc-100 py-16">
        <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8 text-sm text-zinc-400">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-6">
              <p>© 2026 Infinite Physics</p>
              <button 
                onClick={resetData}
                className="flex items-center gap-2 hover:text-red-500 transition-colors"
                title="Reset Cache"
              >
                <Trash2 className="w-4 h-4" />
                <span>Reset System</span>
              </button>
            </div>
            <div className="flex items-center gap-2 text-[10px] opacity-60">
              <Info className="w-3 h-3" />
              <span>Biaya 10 token per pencarian mendukung pemeliharaan kecerdasan sistem dan optimasi infrastruktur agar Anda selalu mendapatkan jawaban secepat kilat.</span>
            </div>
          </div>
          <div className="flex gap-10">
            <a href="#" className="hover:text-zinc-900 transition-colors">Documentation</a>
            <a href="#" className="hover:text-zinc-900 transition-colors">Privacy</a>
            <a href="#" className="hover:text-zinc-900 transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
