import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Navbar } from './components/Navbar';
import { MyRatings } from './pages/MyRatings';
import { Movies } from './pages/Movies';
import { MovieDetail } from './pages/MovieDetail';
import { UserRecommendations } from './pages/UserRecommendations';
import { ApiTester } from './components/ApiTester'; // <--- Importa aqui

// Placeholder
const MoviesPage = () => <h2>🍿 Página de Filmes</h2>;

function App() {
  return (
    <BrowserRouter>
      {/* --- MODO DE TESTE ATIVO --- */}
      {/* <ApiTester /> */}
      {/* <hr />  */}
      {/* --------------------------- */} 
      <Navbar />

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/my-ratings" element={<MyRatings />} />
        <Route path="/movies" element={<Movies />} />
        <Route path="/movies/:id" element={<MovieDetail />} />
        <Route path="/recommendations" element={<UserRecommendations />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;