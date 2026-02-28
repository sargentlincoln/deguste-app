import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { LocationProvider } from '@/contexts/LocationContext';
import { ChatProvider } from '@/contexts/ChatContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import ChatAssistant from '@/components/ChatAssistant';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import Splash from '@/pages/Splash';
import Home from '@/pages/Home';
import Search from '@/pages/Search';
import SearchResults from '@/pages/SearchResults';
import Shorts from '@/pages/Shorts';
import Favorites from '@/pages/Favorites';
import Profile from '@/pages/Profile';
import Settings from '@/pages/Settings';
import RestaurantDetails from '@/pages/RestaurantDetails';
import MapExplore from '@/pages/MapExplore';
import Login from '@/pages/Login';
import SignUp from '@/pages/SignUp';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <LocationProvider>
          <ChatProvider>
            <BrowserRouter>
              <ChatAssistant />
              <Layout>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/home" element={<Home />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/search/results" element={<SearchResults />} />
                  <Route path="/shorts" element={<Shorts />} />
                  <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                  <Route path="/restaurant/:id" element={<RestaurantDetails />} />
                  <Route path="/map" element={<MapExplore />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<SignUp />} />
                </Routes>
              </Layout>
            </BrowserRouter>
          </ChatProvider>
        </LocationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
