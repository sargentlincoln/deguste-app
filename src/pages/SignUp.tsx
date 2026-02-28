import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function SignUp() {
    const navigate = useNavigate();
    const { signInWithGoogle, signUpWithEmail } = useAuth(); // We can reuse Google Sign In
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await signUpWithEmail(email, password, name);
            navigate('/shorts');
        } catch (err: any) {
            console.error(err);
            setError('Erro ao criar conta: ' + (err.message || 'Tente novamente.'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background-dark flex flex-col items-center justify-center px-6 py-10 relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 opacity-30 pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-primary/20 blur-[120px]"></div>
                <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[100px]"></div>
            </div>

            <div className="w-full max-w-sm relative z-10 mb-8">
                <Link to="/login" className="text-gray-400 hover:text-white flex items-center gap-1 text-sm font-medium transition-colors mb-6">
                    <span className="material-icons text-base">arrow_back</span> Voltar
                </Link>
                <h1 className="text-3xl font-bold text-white tracking-tight">Crie sua conta</h1>
                <p className="text-gray-500 text-sm mt-1">Comece sua jornada gastronômica.</p>
            </div>

            {/* Signup Form */}
            <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 relative z-10">
                <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-gray-400 ml-1 uppercase tracking-wider">Nome Completo</label>
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="material-symbols-outlined text-gray-500 text-[18px]">person</span>
                        </span>
                        <input
                            className="w-full bg-card-dark border border-white/10 text-white text-sm rounded-lg py-3 pl-10 pr-4 focus:ring-1 focus:ring-primary focus:border-primary placeholder-gray-600 transition-colors"
                            placeholder="Seu nome"
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-gray-400 ml-1 uppercase tracking-wider">Email</label>
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="material-symbols-outlined text-gray-500 text-[18px]">mail</span>
                        </span>
                        <input
                            className="w-full bg-card-dark border border-white/10 text-white text-sm rounded-lg py-3 pl-10 pr-4 focus:ring-1 focus:ring-primary focus:border-primary placeholder-gray-600 transition-colors"
                            placeholder="seu@email.com"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-gray-400 ml-1 uppercase tracking-wider">Senha</label>
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="material-symbols-outlined text-gray-500 text-[18px]">lock</span>
                        </span>
                        <input
                            className="w-full bg-card-dark border border-white/10 text-white text-sm rounded-lg py-3 pl-10 pr-12 focus:ring-1 focus:ring-primary focus:border-primary placeholder-gray-600 transition-colors"
                            placeholder="Min. 8 caracteres"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            minLength={8}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                            <span className="material-symbols-outlined text-gray-500 text-[18px] hover:text-gray-300 transition-colors">
                                {showPassword ? 'visibility_off' : 'visibility'}
                            </span>
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-primary hover:bg-red-600 disabled:opacity-60 text-white font-bold py-3.5 rounded-lg shadow-lg shadow-red-900/30 transition-all active:scale-[0.98] mt-6 flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <span className="material-icons animate-spin text-lg">autorenew</span>
                            Criando conta...
                        </>
                    ) : (
                        'Cadastrar'
                    )}
                </button>
            </form>

            {/* Social Login */}
            <div className="w-full max-w-sm mt-6 relative z-10">
                <div className="relative flex items-center my-4">
                    <div className="flex-grow border-t border-gray-800"></div>
                    <span className="flex-shrink mx-4 text-gray-600 text-[10px] font-bold uppercase tracking-widest">ou cadastre com</span>
                    <div className="flex-grow border-t border-gray-800"></div>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => signInWithGoogle()} className="flex-1 flex items-center justify-center gap-2 py-3 bg-card-dark border border-white/10 rounded-lg hover:bg-white/5 transition-colors active:scale-[0.98]">
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                        <span className="text-sm font-medium text-white">Google</span>
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-card-dark border border-white/10 rounded-lg hover:bg-white/5 transition-colors active:scale-[0.98]">
                        <span className="material-icons text-white text-xl">apple</span>
                        <span className="text-sm font-medium text-white">Apple</span>
                    </button>
                </div>
            </div>

            <p className="mt-8 text-sm text-gray-500 relative z-10">
                Já tem uma conta?{' '}
                <Link to="/login" className="text-primary font-bold cursor-pointer hover:text-red-400 transition-colors">Faça Login</Link>
            </p>
        </div>
    );
}
