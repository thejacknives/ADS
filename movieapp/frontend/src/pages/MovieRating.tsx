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
  created_at: string;
  comment?: string;
};

/** Estilos partilhados */
const boxStyle: React.CSSProperties = { maxWidth: 900, margin: "80px auto 30px", padding: 18, fontFamily: "Arial, sans-serif" };
const btnStyle: React.CSSProperties = { padding: "10px 14px", borderRadius: 6, cursor: "pointer", border: "none" };
const primaryBtn = { ...btnStyle, backgroundColor: "#2196F3", color: "#fff" };
const dangerBtn = { ...btnStyle, backgroundColor: "#dc3545", color: "#fff" };
const neutralBtn = { ...btnStyle, backgroundColor: "#6c757d", color: "#fff" };
const infoBox = (bg = "#d4edda", color = "#155724") => ({ backgroundColor: bg, color, padding: 12, borderRadius: 6, marginBottom: 12 });
const errorBox = { backgroundColor: "#f8d7da", color: "#721c24", padding: 12, borderRadius: 6, marginBottom: 12 };

async function parseJsonSafe(res: Response) {
  const txt = await res.text();
  try { return txt ? JSON.parse(txt) : null; } catch { return txt; }
}

export default function MovieRating(): JSX.Element {
  const { movieId } = useParams<{ movieId: string }>();
  const navigate = useNavigate();

  // Estados
  const [score, setScore] = useState<number>(5);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // POST /api/ratings/{movie_id}/ - criar nova avaliação
  async function submitRating() {
    setSubmitErr(null);
    setSubmitSuccess(null);
    setSubmitLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/ratings/${movieId}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rating: score, comment: "" }),
      });

      if (!res.ok) {
        const body = await parseJsonSafe(res);
        throw new Error(body?.error || `Erro ${res.status}`);
      }

      setSubmitSuccess("Avaliação enviada com sucesso!");
      setScore(5);
      setTimeout(() => navigate(-1), 1500);
    } catch (e: any) {
      setSubmitErr(e?.message || "Erro ao enviar avaliação.");
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
    <div style={boxStyle}>
      {/* Formulário para adicionar avaliação */}
      <div style={{ marginBottom: 24, padding: 14, backgroundColor: "#e3f2fd", borderRadius: 6 }}>
        {submitErr && <div style={errorBox}>{submitErr}</div>}
        {submitSuccess && <div style={infoBox()}>{submitSuccess}</div>}

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", marginBottom: 6 }}>
            <strong>Classificação (1-5 estrelas):</strong>
          </label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setScore(star)}
                style={{
                  padding: "8px 12px",
                  fontSize: "28px",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  opacity: star <= score ? 1 : 0.3,
                  transition: "opacity 0.2s",
                }}
              >
                ⭐
              </button>
            ))}
          </div>
          <div style={{ marginTop: 8, color: "#666", fontSize: 14 }}>
            Selecionado: <strong>{score} estrelas</strong>
          </div>
        </div>

        <button
          style={primaryBtn}
          onClick={submitRating}
          disabled={submitLoading}
        >
          {submitLoading ? "A enviar..." : "Enviar Avaliação"}
        </button>
      </div>
    </div>
  );
}