import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';

export default function Settings() {
    const navigate = useNavigate();
    const { theme, setTheme } = useTheme();

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-gray-900 dark:text-white min-h-screen">
            <header className="px-5 py-4 flex items-center gap-4 bg-surface-light dark:bg-surface-dark border-b border-gray-200 dark:border-white/5 sticky top-0 z-20">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 transition-colors active:scale-95"
                >
                    <span className="material-icons-round text-gray-700 dark:text-gray-300">arrow_back</span>
                </button>
                <h1 className="text-xl font-bold tracking-tight">Configurações</h1>
            </header>

            <main className="p-5 space-y-6">
                <section>
                    <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 px-1">Aparência</h2>
                    <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden shadow-sm">
                        <div className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-white/5">
                            <div className="flex items-center gap-3">
                                <span className="material-icons-round text-gray-600 dark:text-gray-400">palette</span>
                                <span className="font-medium">Tema do Aplicativo</span>
                            </div>
                        </div>
                        <div className="p-4 space-y-3">
                            <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors border border-transparent has-[:checked]:border-primary/30 has-[:checked]:bg-primary/5 dark:has-[:checked]:bg-primary/10">
                                <div className="flex items-center gap-3">
                                    <span className="material-icons-round text-gray-500 dark:text-gray-400">brightness_auto</span>
                                    <span className="font-medium text-sm">Padrão do Sistema</span>
                                </div>
                                <input
                                    type="radio"
                                    name="theme"
                                    value="system"
                                    checked={theme === 'system'}
                                    onChange={() => setTheme('system')}
                                    className="w-5 h-5 accent-primary"
                                />
                            </label>

                            <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors border border-transparent has-[:checked]:border-primary/30 has-[:checked]:bg-primary/5 dark:has-[:checked]:bg-primary/10">
                                <div className="flex items-center gap-3">
                                    <span className="material-icons-round text-gray-500 dark:text-gray-400">light_mode</span>
                                    <span className="font-medium text-sm">Modo Claro</span>
                                </div>
                                <input
                                    type="radio"
                                    name="theme"
                                    value="light"
                                    checked={theme === 'light'}
                                    onChange={() => setTheme('light')}
                                    className="w-5 h-5 accent-primary"
                                />
                            </label>

                            <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors border border-transparent has-[:checked]:border-primary/30 has-[:checked]:bg-primary/5 dark:has-[:checked]:bg-primary/10">
                                <div className="flex items-center gap-3">
                                    <span className="material-icons-round text-gray-500 dark:text-gray-400">dark_mode</span>
                                    <span className="font-medium text-sm">Modo Escuro</span>
                                </div>
                                <input
                                    type="radio"
                                    name="theme"
                                    value="dark"
                                    checked={theme === 'dark'}
                                    onChange={() => setTheme('dark')}
                                    className="w-5 h-5 accent-primary"
                                />
                            </label>
                        </div>
                    </div>
                </section>

                <section>
                    <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 px-1">Geral</h2>
                    <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden shadow-sm">
                        <button className="w-full p-4 flex items-center justify-between border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-3">
                                <span className="material-icons-round text-gray-600 dark:text-gray-400">notifications</span>
                                <span className="font-medium">Notificações</span>
                            </div>
                            <span className="material-icons-round text-gray-400">chevron_right</span>
                        </button>
                        <button className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-3">
                                <span className="material-icons-round text-gray-600 dark:text-gray-400">language</span>
                                <span className="font-medium">Idioma</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">Português (BR)</span>
                                <span className="material-icons-round text-gray-400">chevron_right</span>
                            </div>
                        </button>
                    </div>
                </section>
            </main>
        </div>
    );
}
