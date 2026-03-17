import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Shield, Users, Database, DollarSign, LogOut, Activity } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        setIsLoggedIn(true);
        fetchStats();
      } else {
        const data = await res.json();
        setError(data.error);
      }
    } catch (err) {
      setError("Login failed");
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch stats");
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl"
        >
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
              <Shield className="w-8 h-8 text-emerald-500" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white text-center mb-2">Admin Security</h1>
          <p className="text-zinc-500 text-center text-sm mb-8">Silakan lapor ke Satpam untuk masuk.</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Username</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="admin"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="••••••••"
              />
            </div>
            {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
            <button 
              type="submit"
              className="w-full bg-emerald-500 text-black font-bold py-4 rounded-xl hover:bg-emerald-400 transition-all mt-4"
            >
              Masuk Dashboard
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans">
      {/* Sidebar / Header */}
      <nav className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Shield className="w-6 h-6 text-emerald-500" />
            <span className="font-bold tracking-tight">PHYSICS ADMIN <span className="text-emerald-500 text-[10px] ml-2 px-2 py-0.5 border border-emerald-500/30 rounded-full">MASTER ACCESS</span></span>
          </div>
          <button 
            onClick={() => setIsLoggedIn(false)}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8">
        <header className="mb-12">
          <h2 className="text-4xl font-bold mb-2">Dashboard Overview</h2>
          <p className="text-zinc-500">Monitoring sistem real-time dan manajemen infrastruktur.</p>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard icon={<Users />} label="Total Pengguna" value={stats?.usersCount || 0} color="blue" />
          <StatCard icon={<Database />} label="Global Nodes" value={stats?.nodesCount || 0} color="emerald" />
          <StatCard icon={<DollarSign />} label="Total Revenue" value={`Rp ${(stats?.revenue || 0).toLocaleString()}`} color="amber" />
          <StatCard icon={<Activity />} label="System Health" value="99.9%" color="purple" />
        </div>

        {/* Recent Activity / Audit Log Placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
            <h3 className="text-xl font-bold mb-6">Log Audit Satpam</h3>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <div>
                      <p className="text-sm font-medium">Admin accessed /api/admin/stats</p>
                      <p className="text-[10px] text-zinc-500">15 Mar 2026 • 13:15:22</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-600">IP: 192.168.1.{i}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
            <h3 className="text-xl font-bold mb-6">Infrastruktur</h3>
            <div className="space-y-6">
              <StorageBar label="Firestore Storage" used={1.2} total={20} unit="GB" />
              <StorageBar label="API Quota (Gemini)" used={450} total={1000} unit="Req" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, color }: any) {
  const colors: any = {
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    amber: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    purple: "text-purple-500 bg-purple-500/10 border-purple-500/20",
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border mb-4 ${colors[color]}`}>
        {React.cloneElement(icon, { className: "w-6 h-6" })}
      </div>
      <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function StorageBar({ label, used, total, unit }: any) {
  const percentage = (used / total) * 100;
  return (
    <div>
      <div className="flex justify-between text-xs mb-2">
        <span className="text-zinc-400">{label}</span>
        <span className="font-bold">{used} / {total} {unit}</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-emerald-500 transition-all duration-1000" 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}
