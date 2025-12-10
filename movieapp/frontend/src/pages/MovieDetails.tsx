import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

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

type Rating = {
  rating_id?: number;
  id?: number;
  score: number;
  user_id: number;
  username?: string;
  created_at: string;
  comment?: string;
};

/** Estilos */
const boxStyle: React.CSSProperties = { maxWidth: 1000, margin: "80px auto 30px", padding: 18, fontFamily: "Arial, sans-serif" };
const btnStyle: React.CSSProperties = { padding: "10px 14px", borderRadius: 6, cursor: "pointer", border: "none", fontSize: 14 };
const primaryBtn = { ...btnStyle, backgroundColor: "#2196F3", color: "#fff" };
const infoBox = (bg = "#d4edda", color = "#155724") => ({ backgroundColor: bg, color, padding: 12, borderRadius: 6, marginBottom: 12 });
const errorBox = { backgroundColor: "#f8d7da", color: "#721c24", padding: 12, borderRadius: 6, marginBottom: 12 };
const warningBox = { backgroundColor: "#fff3cd", color: "#856404", padding: 12, borderRadius: 6, marginBottom: 12 };

async function parseJsonSafe(res: Response) {
  const txt = await res.text();
  try { return txt ? JSON.parse(txt) : null; } catch { return txt; }
}

export default function MovieDetails(): JSX.Element {
  const { movieId } = useParams<{ movieId: string }>();
  const navigate = useNavigate();

  // Estados
  const [movie, setMovie] = useState<Movie | null>(null);
  const [movieLoading, setMovieLoading] = useState(false);
  const [movieErr, setMovieErr] = useState<string | null>(null);

  const [ratings, setRatings] = useState<Rating[]>([]);
  const [ratingsLoading, setRatingsLoading] = useState(false);
  const [ratingsErr, setRatingsErr] = useState<string | null>(null);

  // GET /api/movies/{id}/ - carregar detalhes do filme
  async function loadMovieDetail() {
    setMovieLoading(true);
    setMovieErr(null);
    try {
      const res = await fetch(`${API_BASE}/api/movies/${movieId}/`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) {
        const body = await parseJsonSafe(res);
        throw new Error(body?.error || `Erro ${res.status}`);
      }
      const body = await res.json();
      console.log("[loadMovieDetail] Response:", body); // Debug
      setMovie(body);
    } catch (e: any) {
      setMovieErr(e?.message || "Erro ao carregar detalhes do filme.");
      setMovie(null);
    } finally {
      setMovieLoading(false);
    }
  }

  // GET /api/movies/{id}/ratings/ - carregar avaliações do filme
  async function loadRatings() {
    setRatingsLoading(true);
    setRatingsErr(null);
    try {
      const res = await fetch(`${API_BASE}/api/movies/${movieId}/ratings/`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) {
        const body = await parseJsonSafe(res);
        throw new Error(body?.error || `Erro ${res.status}`);
      }
      const body = await res.json();
      const arr: Rating[] = (body.ratings ?? []).map((r: any) => ({
        ...r,
        rating_id: r.rating_id ?? r.id,
      }));
      setRatings(arr);
    } catch (e: any) {
      setRatingsErr(e?.message || "Erro ao carregar avaliações.");
      setRatings([]);
    } finally {
      setRatingsLoading(false);
    }
  }

  // Carregar dados ao montar
  useEffect(() => {
    if (movieId) {
      loadMovieDetail();
      loadRatings();
    }
  }, [movieId]);

  const renderStarsStatic = (val?: number) => {
    const v = Math.round((val ?? 0) * 2) / 2;
    return (
      <span aria-hidden>
        {Array.from({ length: 5 }, (_, i) => {
          const n = i + 1;
          return <span key={n} style={{ fontSize: 18, marginRight: 4 }}>{n <= v ? "★" : "☆"}</span>;
        })}
      </span>
    );
  };

  if (movieLoading) {
    return (
      <div style={boxStyle}>
        <div>A carregar detalhes do filme...</div>
      </div>
    );
  }

  if (movieErr) {
    return (
      <div style={boxStyle}>
        <div style={errorBox}>{movieErr}</div>
      </div>
    );
  }

  return (
    <div style={boxStyle}>
      {movie && (
        <div style={{ marginBottom: 24, padding: 14, backgroundColor: "#f9f9f9", borderRadius: 6 }}>
          <div style={{ display: "flex", gap: 24, marginBottom: 18 }}>
            {/* Poster */}
            <div style={{ flex: "0 0 150px" }}>
              {movie.poster_url ? (
                <img
                  src={movie.poster_url}
                  alt={`Poster ${movie.title}`}
                  style={{ width: "100%", borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='150'%3E%3Crect fill='%23e0e0e0' width='100' height='150'/%3E%3Ctext x='50' y='75' text-anchor='middle' dy='.3em' fill='%23999' font-size='24'%3E🎬%3C/text%3E%3C/svg%3E";
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: 225,
                    backgroundColor: "#e0e0e0",
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 48,
                  }}
                >
                  🎬
                </div>
              )}
            </div>

            {/* Informações */}
            <div style={{ flex: 1 }}>
              <h2 style={{ marginTop: 0 }}>{movie.title}</h2>

              <p>
                <strong>Género:</strong> {movie.genre || "—"}
              </p>
              <p>
                <strong>Ano:</strong> {movie.year || "—"}
              </p>
              <p>
                <strong>Realizador:</strong> {movie.director || "—"}
              </p>

              {/* Botão Avaliar */}
              <button
                style={primaryBtn}
                onClick={() => navigate(`/movies/${movieId}/ratings`)}
              >
                ⭐ Avaliar
              </button>
            </div>
          </div>

          {/* Descrição */}
          {movie.description && (
            <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid #ddd" }}>
              <h4 style={{ marginTop: 0 }}>Sinopse</h4>
              <p style={{ lineHeight: 1.6, color: "#555" }}>{movie.description}</p>
            </div>
          )}
        </div>
      )}

      {/* Avaliações Recentes */}
      <div style={{ marginTop: 24 }}>
        <h3>Avaliações Recentes</h3>

        {ratingsLoading && <div style={infoBox()}>A carregar avaliações...</div>}
        {ratingsErr && <div style={errorBox}>{ratingsErr}</div>}

        {ratings.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
            {ratings.slice(0, 3).map((r) => (
              <div
                key={r.rating_id ?? r.id}
                style={{
                  padding: 12,
                  backgroundColor: "#f9f9f9",
                  borderRadius: 6,
                  borderLeft: "4px solid #ffb400",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <strong>{"⭐".repeat(r.score)}</strong>
                  <span style={{ color: "#666", fontSize: 12 }}>({r.score}/5)</span>
                </div>
                <div style={{ fontSize: 12, color: "#999" }}>
                  {r.username || `User #${r.user_id}`}
                  {r.created_at && (
                    <span>
                      {" - "}
                      {new Date(r.created_at).toLocaleDateString("pt-PT", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={warningBox}>Ainda sem avaliações. Seja o primeiro!</div>
        )}

        {ratings.length > 3 && (
          <button
            style={{ ...primaryBtn, marginTop: 12 }}
            onClick={() => navigate(`/movies/${movieId}/ratings`)}
          >
            Ver todas as {ratings.length} avaliações
          </button>
        )}
      </div>
    </div>
  );
}