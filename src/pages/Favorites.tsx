import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getFavoriteRestaurants } from '@/lib/api/favorites';
import { Restaurant } from '@/lib/types';
import { getCoverPhotoUrl } from '@/lib/photoUtils';
import { StarRating } from '@/components/StarRating';

export default function Favorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Todos');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    async function fetchFavorites() {
      if (user) {
        try {
          const data = await getFavoriteRestaurants(user.id);
          setFavorites(data);
        } catch (error) {
          console.error('Failed to fetch favorites:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    }
    fetchFavorites();
  }, [user]);

  const tabs = ['Todos', 'Restaurantes', 'Cafés', 'Bares'];

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-text-dark dark:text-text-light min-h-screen pb-24 selection:bg-primary selection:text-white">
      <main className="w-full max-w-md mx-auto pt-14 px-4 sm:px-6">
        <header className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-text-dark dark:text-white flex items-center gap-2">
              Meus Favoritos <span className="text-primary text-xl">❤️</span>
            </h1>
          </div>
          <div className="relative group mb-3">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="material-icons-round text-gray-400 dark:text-gray-500 group-focus-within:text-primary transition-colors">search</span>
            </div>
            <input className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-gray-800 rounded-lg leading-5 bg-gray-50 dark:bg-card-dark text-text-dark dark:text-text-light placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:bg-white dark:focus:bg-card-dark focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-300 sm:text-sm" placeholder="Buscar em favoritos..." type="text" />
          </div>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Ordenar por:</span>
              <div className="relative inline-block text-left">
                <select className="block w-full pl-3 pr-8 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-800 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary appearance-none">
                  <option>Distância</option>
                  <option>Nota</option>
                  <option>Preço</option>
                  <option>Recentemente</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                  <span className="material-icons-round text-sm">expand_more</span>
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${viewMode === 'grid' ? 'text-primary' : 'text-gray-400 dark:text-gray-500'}`}>
                <span className="material-icons-round text-xl">grid_view</span>
              </button>
              <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${viewMode === 'list' ? 'text-primary' : 'text-gray-400 dark:text-gray-500'}`}>
                <span className="material-icons-round text-xl">list</span>
              </button>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium transition-all ${activeTab === tab
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 shadow-sm'
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <section className="mt-6 mb-6">
            <div className="flex justify-between items-center mb-3 px-1">
              <h2 className="text-lg font-bold text-text-dark dark:text-white flex items-center gap-2">
                🎬 Shorts Salvos
              </h2>
              <span className="text-xs font-medium text-primary cursor-pointer hover:text-red-400 transition-colors">Ver todos</span>
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {[
                { img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAkcvglrFaW43DLh8kOXRI8OjB04EQQk78sOsEEiUMtfryyjN5RhWYJwwujZFx3jSQCtBfRMX4zVLVk5c3zk6Dd3ktifyE9cWUUCD2JPrUM5aPVh_UPTQ7sYolvUaqVRIPu2Alv8jiUszdUoBWn-THeKkVowBX_DcgyQiUZQWeYAoeQQxWOyidUcF5pzlgl0zbdvaGHdZzMrib_NyVIPVMwNssJXLqaKqmCteFg4LMwDQ83spvXuA4vlL9ZMH5uoUDLRof7RoOBV7Cu", views: "1.2k", title: "O melhor ponto da carne!" },
                { img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBI4-CP7qLfZn42xSde2EzMU_hkE81_tG0I7WpBxhct3sjTXcAcn8tKIxDn66fgIpCPjzNjl8RsNgYtGzW6o6zyNJxBFJ2dociWopBAm6OApxM6PjMXewmWB8CMT5nrRT7CZO6Y8G01ZSekF_EVXykMy-SJhRvofEZQ0oeRjcZhpqQ-0rMpuAvL3UFDl03aK4ncLesCQr91RO_C5es9K8P7PlCyvbf1XH_DxOYUTpgrtSkC-MhIRq6d55OcVoIY5ygL05kWHcjPBToc", views: "856", title: "Sushi arte em SP" },
                { img: "https://lh3.googleusercontent.com/aida-public/AB6AXuA2yi7WUjAEG7MZsWIklenQ8E2EMWiipr7ciqMfkKhUFZSgvWdU8JuuF4VYsk14gmpW1tUt4E18cqGnuP0ejvqxTUcXXIk7vbpfyOV8TG5uA21Ke2qlhOBtD8aERn4QufKLrKUKGX1dQb_qXh5knvZ6adUq3FZB3WgQMmDQ3rEa0LYiNJkS4Ar0LWZVJW3F11pnkYeW-3tHNWs0BqoHx9Wy91UQg5nHvHswqlgnjDedLaGBy2u9aS709dDroWvzSuWLXd4gKqmvPPYg", views: "3.4k", title: "Café da manhã perfeito" }
              ].map((short, i) => (
                <Link to="/shorts" key={i} className="flex-shrink-0 w-28 h-44 rounded-xl overflow-hidden relative group cursor-pointer shadow-lg bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-800/50">
                  <img alt={short.title} className="w-full h-full object-cover opacity-90" src={short.img} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="material-icons-round text-white text-[10px]">play_arrow</span>
                      <span className="text-[10px] text-white font-medium">{short.views}</span>
                    </div>
                    <p className="text-[10px] font-bold text-white leading-tight line-clamp-2">{short.title}</p>
                  </div>
                </Link>
              ))}
              <Link to="/shorts" className="flex-shrink-0 w-28 h-44 rounded-xl overflow-hidden relative group cursor-pointer shadow-lg bg-gray-100 dark:bg-card-dark border border-gray-200 dark:border-gray-800 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center mx-auto mb-2 shadow-sm">
                    <span className="material-icons text-gray-400 dark:text-gray-500 text-sm">arrow_forward</span>
                  </div>
                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Ver mais</span>
                </div>
              </Link>
            </div>
          </section>

          <section className="mt-6 mb-4">
            <h2 className="text-lg font-bold text-text-dark dark:text-white mb-4 px-1">Coleções</h2>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
              <div className="flex-shrink-0 w-32 h-40 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 flex flex-col items-center justify-center gap-3 group cursor-pointer hover:border-primary/50 transition-all duration-300">
                <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm group-hover:bg-primary/5 dark:group-hover:bg-primary/20 transition-colors">
                  <span className="material-icons text-gray-400 dark:text-gray-500 group-hover:text-primary transition-colors">add</span>
                </div>
                <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 group-hover:text-primary text-center px-2 leading-tight">Criar nova coleção</p>
              </div>
              {[
                { img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAkcvglrFaW43DLh8kOXRI8OjB04EQQk78sOsEEiUMtfryyjN5RhWYJwwujZFx3jSQCtBfRMX4zVLVk5c3zk6Dd3ktifyE9cWUUCD2JPrUM5aPVh_UPTQ7sYolvUaqVRIPu2Alv8jiUszdUoBWn-THeKkVowBX_DcgyQiUZQWeYAoeQQxWOyidUcF5pzlgl0zbdvaGHdZzMrib_NyVIPVMwNssJXLqaKqmCteFg4LMwDQ83spvXuA4vlL9ZMH5uoUDLRof7RoOBV7Cu", title: "Jantares Românticos", count: "12 lugares" },
                { img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBI4-CP7qLfZn42xSde2EzMU_hkE81_tG0I7WpBxhct3sjTXcAcn8tKIxDn66fgIpCPjzNjl8RsNgYtGzW6o6zyNJxBFJ2dociWopBAm6OApxM6PjMXewmWB8CMT5nrRT7CZO6Y8G01ZSekF_EVXykMy-SJhRvofEZQ0oeRjcZhpqQ-0rMpuAvL3UFDl03aK4ncLesCQr91RO_C5es9K8P7PlCyvbf1XH_DxOYUTpgrtSkC-MhIRq6d55OcVoIY5ygL05kWHcjPBToc", title: "Melhores Burgers", count: "8 lugares" },
                { img: "https://lh3.googleusercontent.com/aida-public/AB6AXuA2yi7WUjAEG7MZsWIklenQ8E2EMWiipr7ciqMfkKhUFZSgvWdU8JuuF4VYsk14gmpW1tUt4E18cqGnuP0ejvqxTUcXXIk7vbpfyOV8TG5uA21Ke2qlhOBtD8aERn4QufKLrKUKGX1dQb_qXh5knvZ6adUq3FZB3WgQMmDQ3rEa0LYiNJkS4Ar0LWZVJW3F11pnkYeW-3tHNWs0BqoHx9Wy91UQg5nHvHswqlgnjDedLaGBy2u9aS709dDroWvzSuWLXd4gKqmvPPYg", title: "Happy Hour", count: "5 lugares" }
              ].map((collection, i) => (
                <div key={i} className="flex-shrink-0 w-32 h-40 rounded-lg overflow-hidden relative group cursor-pointer shadow-lg bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-800/50">
                  <img alt={collection.title} className="w-full h-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-110" src={collection.img} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent"></div>
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-xs font-bold text-white leading-tight drop-shadow-sm">{collection.title}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{collection.count}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </header>

        <div className="space-y-4">
          <h2 className="text-lg font-bold text-text-dark dark:text-white px-1">Restaurantes Salvos</h2>

          {!user ? (
            <div className="text-center py-10 bg-white dark:bg-card-dark rounded-xl border border-gray-200 dark:border-white/5">
              <span className="material-icons-round text-4xl text-gray-400 dark:text-gray-600 mb-2">lock</span>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Faça login para ver seus favoritos</p>
              <Link to="/login" className="bg-primary text-white px-6 py-2 rounded-full font-bold text-sm shadow-glow hover:bg-primary-hover transition-colors">
                Entrar
              </Link>
            </div>
          ) : loading ? (
            <div className="text-center py-10 text-gray-500">
              <span className="material-icons animate-spin text-2xl">autorenew</span>
            </div>
          ) : favorites.length === 0 ? (
            <div className="text-center py-10 bg-white dark:bg-card-dark rounded-xl border border-gray-200 dark:border-white/5">
              <span className="material-icons-round text-4xl text-gray-400 dark:text-gray-600 mb-2">favorite_border</span>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Você ainda não tem favoritos.</p>
            </div>
          ) : (
            favorites.map(restaurant => (
              <Link key={restaurant.id} to={`/restaurant/${restaurant.id}`} className="block">
                <article className="glass-panel-light dark:glass-panel rounded-lg overflow-hidden relative group active:scale-[0.98] transition-transform duration-200 bg-white dark:bg-card-dark border border-gray-200 dark:border-white/5">
                  <div className="relative h-40 w-full">
                    <img alt={restaurant.name} className="w-full h-full object-cover opacity-90" src={getCoverPhotoUrl(restaurant.photos)} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80"></div>
                    <div className="absolute top-3 left-3 bg-white/90 dark:bg-black/60 backdrop-blur-md text-text-dark dark:text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm border border-gray-100 dark:border-white/10">
                      {restaurant.categories[0]}
                    </div>
                    <div className="absolute top-3 right-3 p-2 bg-white/90 dark:bg-black/50 backdrop-blur-md rounded-full shadow-md cursor-pointer hover:bg-white dark:hover:bg-black/70 transition-colors border border-transparent dark:border-white/10">
                      <span className="material-icons text-primary text-xl block">favorite</span>
                    </div>
                  </div>
                  <div className="p-4 relative bg-white dark:bg-card-dark">
                    <div className="flex justify-between items-start mb-1">
                      <h2 className="text-lg font-bold text-text-dark dark:text-white tracking-tight">{restaurant.name}</h2>
                      {/* Mock logic for open status */}
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 dark:bg-[#1A3322] text-green-700 dark:text-[#4ADE80] border border-green-200 dark:border-[#22c55e]/30 shadow-[0_0_10px_rgba(74,222,128,0.2)]">
                        ABERTO
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800/50 px-1.5 py-0.5 rounded border border-gray-100 dark:border-gray-700 w-fit">
                        <StarRating rating={restaurant.rating_avg} showNumber={true} size="xs" />
                        <span className="text-[10px] text-gray-400">({restaurant.rating_count})</span>
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-600">•</span>
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{restaurant.categories.slice(0, 2).join(', ')}</span>
                    </div>
                    <div className="flex items-center text-xs text-gray-500 font-medium">
                      <span className="text-text-dark dark:text-white font-semibold">{'$'.repeat(restaurant.price_level)}</span>
                      <span className="mx-1.5 text-gray-300 dark:text-gray-600">•</span>
                      <span>{restaurant.city}</span>
                      <span className="mx-1.5 text-gray-300 dark:text-gray-600">•</span>
                      <span className="flex items-center gap-0.5"><span className="material-icons-round text-[10px]">location_on</span> 0.8 km</span>
                    </div>
                  </div>
                </article>
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
