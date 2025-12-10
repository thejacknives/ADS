// src/pages/Home.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

/** API base (usa VITE var se definida) */
const API_BASE = ((import.meta as any).env?.VITE_API_URL) || "http://localhost:8000";

/** Tipos simples */
type Movie = {
  id: number;
  title: string;
  genre?: string;
  description?: string;
  average_rating?: number;
  rating_count?: number;
  director?: string;
  year?: number;
  poster_url?: string;
};

/** Estilos inline */
const boxStyle: React.CSSProperties = { maxWidth: 1000, margin: "80px auto 24px", padding: 18, fontFamily: "Arial, sans-serif" };
const gridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 };
const cardStyle: React.CSSProperties = { background: "#fff", borderRadius: 8, padding: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.06)", cursor: "pointer", display: "flex", flexDirection: "column", minHeight: 160 };
const posterStyle: React.CSSProperties = { height: 120, marginBottom: 8, borderRadius: 6, objectFit: "cover", background: "#f0f0f0", display: "block", width: "100%" };
const titleStyle: React.CSSProperties = { fontWeight: 700, marginBottom: 6, fontSize: 16 };
const metaStyle: React.CSSProperties = { color: "#666", fontSize: 13, marginBottom: 6 };
const infoBox = (bg = "#e6f4ea", color = "#1b5e20") => ({ backgroundColor: bg, color, padding: 12, borderRadius: 6, marginBottom: 12 });
const errorBox = { backgroundColor: "#f8d7da", color: "#721c24", padding: 12, borderRadius: 6, marginBottom: 12 };

/** util para parsear JSON com segurança */
async function parseJsonSafe(res: Response) {
  const txt = await res.text();
  try { return txt ? JSON.parse(txt) : null; } catch { return txt; }
}

export default function Home(): JSX.Element {
  const navigate = useNavigate();

  // estados
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // GET /api/movies/ - listar filmes
  async function loadAllMovies() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/movies/`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
      });
      if (!res.ok) {
        const body = await parseJsonSafe(res);
        throw new Error(body?.error || `Erro ${res.status}`);
      }
      const body = await res.json();
      const arr: Movie[] = body.movies ?? [];
      setMovies(arr);
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar filmes.");
      setMovies([]);
    } finally {
      setLoading(false);
    }
  }

  // Carregar ao montar
  useEffect(() => {
    loadAllMovies();
  }, []);

  return (
    <div style={boxStyle}>
      {loading && <div style={infoBox("#eef7ff", "#0b4e76")}>A carregar filmes...</div>}
      {error && <div style={errorBox}>{error}</div>}

      {/* Grid de filmes */}
      <div style={{ marginBottom: 18 }}>
        <div style={gridStyle}>
          {movies.map((m) => (
            <div
              key={m.id}
              style={cardStyle}
              onClick={() => navigate(`/movies/${m.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter") navigate(`/movies/${m.id}`); }}
            >
              {m.poster_url ? (
                <img src={m.poster_url} alt={`Poster ${m.title}`} style={posterStyle} />
              ) : (
                <div style={{ ...posterStyle, display: "flex", alignItems: "center", justifyContent: "center", background: "#f7f7f7", fontSize: 36 }}>
                  🎬
                </div>
              )}

              <div style={{ flex: 1 }}>
                <div style={titleStyle}>{m.title}</div>
                <div style={metaStyle}>{m.genre ?? "—"} • {m.year ?? "—"}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                  <div style={{ fontWeight: 700, color: "#ffb400" }}>⭐ {m.average_rating?.toFixed(1) ?? "—"}</div>
                  <div style={{ fontSize: 12, color: "#888" }}>{m.rating_count ?? 0} avaliações</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {movies.length === 0 && !loading && (
        <div style={{ padding: 12, borderRadius: 6, background: "#f8f9fa", textAlign: "center" }}>
          Nenhum filme encontrado.
        </div>
      )}
    </div>
  );
}
