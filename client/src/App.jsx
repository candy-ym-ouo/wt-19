import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import Collections from './pages/Collections.jsx';
import CollectionDetail from './pages/CollectionDetail.jsx';
import Films from './pages/Films.jsx';
import FilmDetail from './pages/FilmDetail.jsx';
import Calendar from './pages/Calendar.jsx';
import Reviews from './pages/Reviews.jsx';
import Favorites from './pages/Favorites.jsx';
import Drafts from './pages/Drafts.jsx';
import Admin from './pages/Admin.jsx';

function App() {
  return (
    <div className="min-h-screen flex flex-col bg-film-black text-film-cream">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/collections/:id" element={<CollectionDetail />} />
          <Route path="/films" element={<Films />} />
          <Route path="/films/:id" element={<FilmDetail />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/drafts" element={<Drafts />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
