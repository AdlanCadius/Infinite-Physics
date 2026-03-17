import { GoogleGenAI, Type } from "@google/genai";
import { PhysicsNode } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const CACHE_KEY = "physics_cache_v4";

function getCache(): Record<string, PhysicsNode> {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

function setCache(query: string, node: PhysicsNode) {
  try {
    const cache = getCache();
    cache[query.toLowerCase().trim()] = node;
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn("Failed to save to cache:", e);
  }
}

export async function fetchPhysicsContent(query: string, lang: "id" | "en" = "id", userId: string): Promise<PhysicsNode> {
  const response = await fetch("/api/physics/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, lang, userId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch physics content");
  }

  const node = await response.json();
  return {
    id: Math.random().toString(36).substr(2, 9),
    ...node
  };
}

export function clearPhysicsCache() {
  localStorage.removeItem(CACHE_KEY);
}
