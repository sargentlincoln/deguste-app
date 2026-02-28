import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (!user) return null; // Or redirect

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-gray-900 dark:text-white antialiased min-h-screen flex flex-col relative overflow-hidden">
      <div className="fixed top-0 left-0 right-0 h-96 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none z-0 opacity-50"></div>
      <main className="flex-1 relative z-10 px-6 pb-28 overflow-y-auto no-scrollbar pt-6">
        <header className="flex flex-col items-center mt-6 mb-8">
          <div className="relative group cursor-pointer transition-transform active:scale-95">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-red-700 flex items-center justify-center shadow-glow mb-4 relative z-10 ring-4 ring-background-dark overflow-hidden">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span className="material-icons-round text-white text-5xl">person</span>
              )}
            </div>
            <div className="absolute inset-0 bg-primary blur-xl opacity-20 rounded-full z-0"></div>
            <button className="absolute bottom-4 -right-1 z-20 bg-surface-dark border-2 border-background-dark text-white rounded-full p-2 flex items-center justify-center shadow-lg">
              <span className="material-icons-round text-xs text-primary">edit</span>
            </button>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mb-0.5">{user.name}</h1>
          <p className="text-sm text-gray-400 font-medium mb-6">{user.email}</p>
          <div className="w-full relative overflow-hidden rounded-xl bg-gradient-to-br from-[#2a1a1a] to-surface-dark border border-fire-orange/30 shadow-fire-glow p-4 flex items-center justify-between">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-30 mix-blend-overlay"></div>
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-fire-orange/20 blur-2xl rounded-full animate-flicker"></div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-full bg-gradient-to-t from-orange-600 to-yellow-400 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <span className="material-icons-round text-white text-2xl animate-pulse">local_fire_department</span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-white tracking-wide">{user.stats?.current_streak || 0} Dias de Streak!</span>
                <span className="text-xs text-orange-200/70">Você está on fire 🔥</span>
              </div>
            </div>
            <div className="relative z-10 text-right">
              <div className="text-xs text-gray-400 mb-1">Próximo bônus</div>
              <div className="text-sm font-bold text-gold">Em 3 dias</div>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-surface-dark rounded-xl p-4 flex flex-col items-center justify-center text-center border border-white/5 shadow-sm active:bg-neutral-dark transition-colors cursor-pointer group hover:border-primary/30">
            <span className="text-2xl font-bold text-primary mb-1 group-hover:scale-110 transition-transform">12</span>
            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold leading-tight">Restaurantes</span>
          </div>
          <div className="bg-surface-dark rounded-xl p-4 flex flex-col items-center justify-center text-center border border-white/5 shadow-sm active:bg-neutral-dark transition-colors cursor-pointer group hover:border-primary/30">
            <span className="text-2xl font-bold text-primary mb-1 group-hover:scale-110 transition-transform">5</span>
            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold leading-tight">Reservas</span>
          </div>
          <div className="bg-surface-dark rounded-xl p-4 flex flex-col items-center justify-center text-center border border-white/5 shadow-sm active:bg-neutral-dark transition-colors cursor-pointer group hover:border-primary/30">
            <span className="text-2xl font-bold text-primary mb-1 group-hover:scale-110 transition-transform">3</span>
            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold leading-tight">Cupons</span>
          </div>
        </section>

        <div className="mb-6 relative w-full rounded-xl overflow-hidden group">
          <div className="absolute inset-0 bg-green-accent/10 backdrop-blur-md"></div>
          <div className="relative z-10 bg-gradient-to-r from-green-accent/20 to-emerald-900/40 border border-green-accent/30 p-4 flex flex-row items-center justify-between shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-accent/20 border border-green-accent/30 flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                <span className="material-icons-round text-green-accent text-2xl">savings</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-emerald-100/80 font-medium uppercase tracking-wide">Total economizado</span>
                <span className="text-xl font-bold text-white drop-shadow-sm">R$ {user.stats?.total_savings?.toFixed(2) || '0.00'}</span>
              </div>
            </div>
            <div className="h-8 w-[1px] bg-white/10 mx-2"></div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-emerald-300 bg-emerald-900/50 px-2 py-0.5 rounded-full border border-emerald-500/20 mb-1">RECORD</span>
              <span className="text-xs text-white/60">+R$ 24 essa semana</span>
            </div>
          </div>
        </div>

        <div className="mb-8 w-full rounded-xl p-[1px] bg-gradient-to-r from-gold via-orange-500 to-primary shadow-lg relative overflow-hidden group">
          <div className="bg-surface-dark rounded-[11px] p-5 h-full relative z-10">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Seus Pontos</h3>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gold to-primary">{user.stats?.total_points || 0}</span>
                  <span className="text-sm text-gray-500 font-medium">/ 2000 pts</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold/20 to-primary/20 flex items-center justify-center border border-white/5 animate-pulse">
                <span className="material-icons-round text-gold text-xl">stars</span>
              </div>
            </div>
            <div className="w-full bg-neutral-dark rounded-full h-2 mb-4 overflow-hidden relative">
              <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-gold to-primary rounded-full" style={{ width: "62.5%" }}></div>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <div className="flex-shrink-0 bg-neutral-dark/50 border border-white/5 rounded-md px-3 py-2 flex flex-col items-center min-w-[80px]">
                <span className="text-[10px] text-gray-400">500 pts</span>
                <span className="text-xs font-bold text-white">R$10 OFF</span>
                <div className="mt-1 w-full h-0.5 bg-primary/50 rounded-full"></div>
              </div>
              <div className="flex-shrink-0 bg-neutral-dark/50 border border-gold/30 rounded-md px-3 py-2 flex flex-col items-center relative overflow-hidden min-w-[80px]">
                <div className="absolute inset-0 bg-gold/5"></div>
                <span className="text-[10px] text-gold/80 relative z-10">1000 pts</span>
                <span className="text-xs font-bold text-white relative z-10">R$25 OFF</span>
                <div className="mt-1 w-full h-0.5 bg-gold rounded-full relative z-10"></div>
              </div>
              <div className="flex-shrink-0 bg-neutral-dark/50 border border-white/5 rounded-md px-3 py-2 flex flex-col items-center opacity-60 min-w-[80px]">
                <span className="text-[10px] text-gray-400">2000 pts</span>
                <span className="text-xs font-bold text-white">R$60 OFF</span>
                <div className="mt-1 w-full h-0.5 bg-gray-600 rounded-full"></div>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-3 text-center">Faltam <span className="text-white font-bold">750 pontos</span> para o próximo nível!</p>
          </div>
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-gold/20 blur-3xl rounded-full z-0"></div>
        </div>

        <section className="flex flex-col gap-6">
          <div>
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 px-1">Minha Atividade</h4>
            <div className="flex flex-col gap-2">
              <Link to="/favorites" className="group w-full bg-surface-dark rounded-xl p-4 flex items-center justify-between border border-white/5 active:scale-[0.99] transition-all hover:bg-white/5 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <span className="material-icons-round text-primary text-xl">bookmark</span>
                  </div>
                  <span className="text-[15px] font-medium text-white">Salvos</span>
                </div>
                <span className="material-icons-round text-gray-500 text-xl group-hover:text-white transition-colors">chevron_right</span>
              </Link>
              <button className="group w-full bg-surface-dark rounded-xl p-4 flex items-center justify-between border border-white/5 active:scale-[0.99] transition-all hover:bg-white/5 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                    <span className="material-icons-round text-blue-500 text-xl">place</span>
                  </div>
                  <span className="text-[15px] font-medium text-white">Histórico de Locais</span>
                </div>
                <span className="material-icons-round text-gray-500 text-xl group-hover:text-white transition-colors">chevron_right</span>
              </button>
              <button className="group w-full bg-surface-dark rounded-xl p-4 flex items-center justify-between border border-white/5 active:scale-[0.99] transition-all hover:bg-white/5 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                    <span className="material-icons-round text-purple-500 text-xl">event</span>
                  </div>
                  <span className="text-[15px] font-medium text-white">Minhas Reservas</span>
                </div>
                <span className="material-icons-round text-gray-500 text-xl group-hover:text-white transition-colors">chevron_right</span>
              </button>
              <button className="group w-full bg-surface-dark rounded-xl p-4 flex items-center justify-between border border-white/5 active:scale-[0.99] transition-all hover:bg-white/5 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                    <span className="material-icons-round text-green-500 text-xl">confirmation_number</span>
                  </div>
                  <span className="text-[15px] font-medium text-white">Meus Cupons</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm shadow-glow">NEW</span>
                  <span className="material-icons-round text-gray-500 text-xl group-hover:text-white transition-colors">chevron_right</span>
                </div>
              </button>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 px-1">Preferências</h4>
            <div className="flex flex-col gap-2">
              <Link to="/settings" className="group w-full bg-surface-dark rounded-xl p-4 flex items-center justify-between border border-white/5 active:scale-[0.99] transition-all hover:bg-white/5 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-neutral-dark flex items-center justify-center group-hover:bg-neutral-600 transition-colors">
                    <span className="material-icons-round text-gray-400 text-xl group-hover:text-white">settings</span>
                  </div>
                  <span className="text-[15px] font-medium text-white">Configurações</span>
                </div>
                <span className="material-icons-round text-gray-500 text-xl group-hover:text-white transition-colors">chevron_right</span>
              </Link>
              <button className="group w-full bg-surface-dark rounded-xl p-4 flex items-center justify-between border border-white/5 active:scale-[0.99] transition-all hover:bg-white/5 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-neutral-dark flex items-center justify-center group-hover:bg-neutral-600 transition-colors">
                    <span className="material-icons-round text-gray-400 text-xl group-hover:text-white">help_outline</span>
                  </div>
                  <span className="text-[15px] font-medium text-white">Ajuda</span>
                </div>
                <span className="material-icons-round text-gray-500 text-xl group-hover:text-white transition-colors">chevron_right</span>
              </button>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="mt-2 w-full py-3 text-sm text-red-500 font-medium hover:text-red-400 transition-colors opacity-80 hover:opacity-100 text-center block"
          >
            Sair da conta
          </button>
        </section>
      </main>
    </div>
  );
}
