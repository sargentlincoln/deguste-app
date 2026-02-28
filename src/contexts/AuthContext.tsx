import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { MOCK_USER } from '../lib/mock-data';
import { User as AppUser } from '../lib/types';

interface AuthContextType {
    user: AppUser | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (sessionUser: User) => {
        try {
            const { data, error } = await supabase!
                .from('users')
                .select('*')
                .eq('id', sessionUser.id)
                .single();

            if (error) {
                console.error('Error fetching profile:', error);
                // Fallback to basic session info if profile fetch fails
                setUser({
                    ...MOCK_USER,
                    id: sessionUser.id,
                    email: sessionUser.email!,
                    name: sessionUser.user_metadata.full_name || sessionUser.email!.split('@')[0],
                    avatar_url: sessionUser.user_metadata.avatar_url || null,
                });
            } else if (data) {
                // Merge DB profile with session info (and mock stats for now)
                setUser({
                    ...MOCK_USER, // Keep mock stats/preferences until fully implemented in DB
                    ...data,
                    id: sessionUser.id,
                    email: sessionUser.email!,
                });
            }
        } catch (err) {
            console.error('Unexpected error fetching profile:', err);
        }
    };

    useEffect(() => {
        // Check active session
        if (supabase) {
            supabase.auth.getSession().then(({ data: { session } }) => {
                if (session?.user) {
                    fetchProfile(session.user);
                } else {
                    setUser(null);
                }
                setLoading(false);
            });

            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
                if (session?.user) {
                    fetchProfile(session.user);
                } else {
                    setUser(null);
                }
                setLoading(false);
            });

            return () => subscription.unsubscribe();
        } else {
            // Mock mode: check localStorage
            const storedUser = localStorage.getItem('deguste_user');
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            }
            setLoading(false);
        }
    }, []);

    const signInWithGoogle = async () => {
        if (supabase) {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/home`,
                },
            });
            if (error) throw error;
        } else {
            // Mock login
            localStorage.setItem('deguste_user', JSON.stringify(MOCK_USER));
            setUser(MOCK_USER);
            window.location.href = '/home'; // Simulate redirect
        }
    };

    const signInWithEmail = async (email: string, password: string) => {
        if (supabase) {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;
        } else {
            // Mock login
            console.log('Mock login with email:', email);
            localStorage.setItem('deguste_user', JSON.stringify(MOCK_USER));
            setUser(MOCK_USER);
        }
    };

    const signUpWithEmail = async (email: string, password: string, name: string) => {
        if (supabase) {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: name,
                    },
                },
            });
            if (error) throw error;
        } else {
            // Mock signup
            console.log('Mock signup with:', email, name);
            const newUser = { ...MOCK_USER, email, name };
            localStorage.setItem('deguste_user', JSON.stringify(newUser));
            setUser(newUser);
        }
    };

    const signOut = async () => {
        if (supabase) {
            await supabase.auth.signOut();
            setUser(null);
        } else {
            localStorage.removeItem('deguste_user');
            setUser(null);
            window.location.href = '/login';
        }
    };

    const refreshProfile = async () => {
        if (supabase) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                await fetchProfile(session.user);
            }
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
}
