import React, { useEffect, useState } from "react";

const API_BASE = ((import.meta as any).env?.VITE_API_URL) || 'http://localhost:8000';

type Movie = {
  id: number;
  title: string;
  genre?: string;
  description?: string;
  average_rating?: number;
  rating_count?: number;
};

type Rating = {
  id?: number;
  rating_id?: number;
  score: number;
  user_id?: number;
  created_at?: string;
  movie_id?: number;
};

type Profile = {
  id?: number;
  username?: string;
  email?: string;
};

type User = {
  id?: number;
  username?: string;
  email?: string;
};

export default function Homepage(): JSX.Element {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [moviesErr, setMoviesErr] = useState<string | null>(null);
  const [loadingMovies, setLoadingMovies] = useState(false);

  const [users, setUsers] = useState<User[]>([]);
  const [usersErr, setUsersErr] = useState<string | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);

  const [profileRatings, setProfileRatings] = useState<Rating[]>([]);
  const [profileRatingsErr, setProfileRatingsErr] = useState<string | null>(null);

  const [myRatings, setMyRatings] = useState<Rating[]>([]);
  const [myRatingsErr, setMyRatingsErr] = useState<string | null>(null);

  const [recs, setRecs] = useState<Movie[]>([]);
  const [recsErr, setRecsErr] = useState<string | null>(null);

  const [selectedMovieRatings, setSelectedMovieRatings] = useState<Rating[]>([]);
  const [selRatingsErr, setSelRatingsErr] = useState<string | null>(null);
  const [loadingSelRatings, setLoadingSelRatings] = useState(false);

  async function parseJsonSafe(res: Response) {
    const text = await res.text();
    try { return text ? JSON.parse(text) : null; } catch { return text; }
  }

  // GET /api/movies/
  async function loadAllMovies() {
    setLoadingMovies(true);
    setMoviesErr(null);
    try {
      const res = await fetch(`${API_BASE}/api/movies/`, { method: "GET", headers: { "Content-Type": "application/json" } });
      if (!res.ok) throw new Error(JSON.stringify(await parseJsonSafe(res)));
      const body = await res.json();
      const arr: Movie[] = Array.isArray(body) ? body : body.results ?? body.movies ?? [];
      setMovies(arr);
    } catch (e: any) {
      setMovies([]);
      setMoviesErr(e?.message || "Erro ao carregar filmes");
    } finally { setLoadingMovies(false); }
  }

  // GET /api/users/
  async function loadUsers() {
    setLoadingUsers(true);
    setUsersErr(null);
    try {
      const res = await fetch(`${API_BASE}/api/users/`, { method: "GET", headers: { "Content-Type": "application/json" } });
      if (!res.ok) throw new Error(JSON.stringify(await parseJsonSafe(res)));
      const body = await res.json();
      const arr: User[] = Array.isArray(body) ? body : body.results ?? body.users ?? [];
      setUsers(arr);
    } catch (e: any) {
      setUsers([]);
      setUsersErr(e?.message || "Erro ao carregar utilizadores");
    } finally { setLoadingUsers(false); }
  }

  // GET /api/profile/ (include credentials)
  async function loadProfile() {
    setProfileErr(null);
    try {
      const res = await fetch(`${API_BASE}/api/profile/`, { method: "GET", headers: { "Content-Type": "application/json" }, credentials: "include" });
      if (!res.ok) throw new Error(JSON.stringify(await parseJsonSafe(res)));
      const body = await res.json();
      setProfile(body);
    } catch (e: any) {
      setProfile(null);
      setProfileErr(e?.message || "Erro ao carregar perfil");
    }
  }

  // GET /api/profile/ratings/ (requires auth)
  async function loadProfileRatings() {
    setProfileRatingsErr(null);
    try {
      const res = await fetch(`${API_BASE}/api/profile/ratings/`, { method: "GET", headers: { "Content-Type": "application/json" }, credentials: "include" });
      if (!res.ok) throw new Error(JSON.stringify(await parseJsonSafe(res)));
      const body = await res.json();
      const arr: Rating[] = Array.isArray(body) ? body : body.ratings ?? [];
      setProfileRatings(arr);
    } catch (e: any) {
      setProfileRatings([]);
      setProfileRatingsErr(e?.message || "Erro ao carregar histórico de avaliações do perfil");
    }
  }

  // GET /api/ratings/mine/ (requires auth)
  async function loadMyRatings() {
    setMyRatingsErr(null);
    try {
      const res = await fetch(`${API_BASE}/api/ratings/mine/`, { method: "GET", headers: { "Content-Type": "application/json" }, credentials: "include" });
      if (!res.ok) throw new Error(JSON.stringify(await parseJsonSafe(res)));
      const body = await res.json();
      const arr: Rating[] = Array.isArray(body) ? body : body.ratings ?? [];
      setMyRatings(arr);
    } catch (e: any) {
      setMyRatings([]);
      setMyRatingsErr(e?.message || "Erro ao carregar as minhas avaliações");
    }
  }

  // GET /api/recommendations/mine/ (requires auth)
  async function loadMyRecs() {
    setRecsErr(null);
    try {
      const res = await fetch(`${API_BASE}/api/recommendations/mine/`, { method: "GET", headers: { "Content-Type": "application/json" }, credentials: "include" });
      if (!res.ok) throw new Error(JSON.stringify(await parseJsonSafe(res)));
      const body = await res.json();
      const arr: Movie[] = Array.isArray(body) ? body : body.recommendations ?? [];
      setRecs(arr);
    } catch (e: any) {
      setRecs([]);
      setRecsErr(e?.message || "Erro ao carregar recomendações");
    }
  }

  // GET /api/movies/{id}/ratings/ - load ratings for selected movie
  async function loadRatingsForMovie(movieId: number) {
    setSelRatingsErr(null);
    setLoadingSelRatings(true);
    setSelectedMovieRatings([]);
    try {
      const res = await fetch(`${API_BASE}/api/movies/${movieId}/ratings/`, { method: "GET", headers: { "Content-Type": "application/json" }, credentials: "include" });
      if (!res.ok) throw new Error(JSON.stringify(await parseJsonSafe(res)));
      const body = await res.json();
      const arr: Rating[] = Array.isArray(body) ? body : body.ratings ?? [];
      setSelectedMovieRatings(arr);
    } catch (e: any) {
      setSelectedMovieRatings([]);
      setSelRatingsErr(e?.message || "Erro ao carregar avaliações do filme");
    } finally { setLoadingSelRatings(false); }
  }

  // helper to select movie and fetch its ratings
  async function selectMovie(m: Movie) {
    await loadRatingsForMovie(m.id);
  }

  useEffect(() => { loadAllMovies(); }, []);

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>
      <header style={{ marginBottom: 16 }}>
        <h2>Homepage</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={loadAllMovies} disabled={loadingMovies}>{loadingMovies ? "Carregando filmes..." : "Listar filmes"}</button>
          <button onClick={loadUsers} disabled={loadingUsers}>{loadingUsers ? "Carregando utilizadores..." : "Listar utilizadores"}</button>
          <button onClick={loadProfile}>Perfil</button>
          <button onClick={loadProfileRatings}>Perfil: Minhas avaliações</button>
          <button onClick={loadMyRatings}>Minhas avaliações</button>
          <button onClick={loadMyRecs}>Minhas recomendações</button>
        </div>

        <div style={{ marginTop: 8 }}>
          {profile ? <div><strong>{profile.username ?? profile.email}</strong></div> : profileErr ? <div style={{ color: "red" }}>{profileErr}</div> : <div style={{ color: "#666" }}>Não autenticado / perfil não carregado</div>}
        </div>
      </header>

      <section>
        <h3>Filmes</h3>
        {moviesErr && <div style={{ color: "red" }}>{moviesErr}</div>}
        <ul>
          {movies.map((m) => (
            <li key={m.id} style={{ margin: "6px 0" }}>
              <strong>{m.title}</strong> — {m.genre ?? "—"}
              <button style={{ marginLeft: 8 }} onClick={() => selectMovie(m)}>Ver avaliações</button>
            </li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: 12 }}>
        <h3>Utilizadores</h3>
        {usersErr && <div style={{ color: "red" }}>{usersErr}</div>}
        <ul>
          {users.map((u) => <li key={u.id}><strong>{u.username ?? "(sem username)"}</strong> — {u.email ?? "—"}</li>)}
        </ul>
      </section>

      <section style={{ marginTop: 12 }}>
        <h3>Minhas Recomendações</h3>
        {recsErr && <div style={{ color: "red" }}>{recsErr}</div>}
        <ul>
          {recs.map((r) => <li key={r.id}><strong>{r.title}</strong></li>)}
        </ul>
      </section>

      <section style={{ marginTop: 12 }}>
        <h3>Minhas Avaliações</h3>
        {myRatingsErr && <div style={{ color: "red" }}>{myRatingsErr}</div>}
        <ul>
          {myRatings.map((r) => <li key={r.rating_id ?? r.id}>Filme ID: {r.movie_id ?? "?"} — Score: {r.score}</li>)}
        </ul>
      </section>

      <section style={{ marginTop: 12 }}>
        <h3>Histórico de Avaliações do Perfil</h3>
        {profileRatingsErr && <div style={{ color: "red" }}>{profileRatingsErr}</div>}
        <ul>
          {profileRatings.map((r) => <li key={r.rating_id ?? r.id}>Filme ID: {r.movie_id ?? "?"} — Score: {r.score}</li>)}
        </ul>
      </section>

      <section style={{ marginTop: 12 }}>
        <h3>Avaliações do Filme Selecionado</h3>
        {selRatingsErr && <div style={{ color: "red" }}>{selRatingsErr}</div>}
        {loadingSelRatings && <div>Carregando avaliações...</div>}
        <ul>
          {selectedMovieRatings.map((r) => <li key={r.rating_id ?? r.id}>User: {r.user_id ?? "?"} — Score: {r.score}</li>)}
        </ul>
      </section>
    </div>
  );
}
