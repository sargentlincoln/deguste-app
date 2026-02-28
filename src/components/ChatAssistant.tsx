import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { Link, useLocation } from 'react-router-dom';
import { getCoverPhotoUrl } from '@/lib/photoUtils';
import { useVoiceSearch } from '@/hooks/useVoiceSearch';

export default function ChatAssistant() {
    const { messages, isOpen, isTyping, toggleChat, closeChat, sendMessage, clearHistory } = useChat();
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen, isTyping]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isTyping) {
            sendMessage(input);
            setInput('');
        }
    };

    const handleVoiceResult = useCallback((text: string) => {
        setInput(text);
        sendMessage(text);
        setInput('');
    }, [sendMessage]);

    const { isListening, startListening: startVoiceSearch } = useVoiceSearch(handleVoiceResult);

    const location = useLocation();

    // Draggable logic
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragDelta, setDragDelta] = useState(0);
    const dragStart = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });

    const handlePointerDown = (e: React.PointerEvent) => {
        setIsDragging(true);
        setDragDelta(0);
        dragStart.current = {
            x: e.clientX,
            y: e.clientY,
            initialX: position.x,
            initialY: position.y
        };
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return;
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        setDragDelta(prev => prev + Math.abs(dx) + Math.abs(dy));
        setPosition({
            x: dragStart.current.initialX + dx,
            y: dragStart.current.initialY + dy
        });
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setIsDragging(false);
        e.currentTarget.releasePointerCapture(e.pointerId);
    };

    const handleClick = (e: React.MouseEvent) => {
        if (dragDelta > 10) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        toggleChat();
    };

    // Hide chatbot entirely on specific pages
    const hiddenPaths = ['/', '/login', '/register', '/home'];
    if (hiddenPaths.includes(location.pathname)) {
        return null; // Do not render anything
    }

    return (
        <>
            {/* Draggable Compact Floating Button */}
            <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onClick={handleClick}
                style={{ transform: `translate(${position.x}px, ${position.y}px)`, touchAction: 'none' }}
                className={`fixed bottom-[110px] right-4 z-50 transition-all cursor-grab active:cursor-grabbing select-none ${isOpen ? 'opacity-0 pointer-events-none scale-90' : 'opacity-100 scale-100 hover:scale-110'}`}
            >
                {/* Pulse ring */}
                <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping" style={{ animationDuration: '2s' }} />
                {/* Glow */}
                <div className="absolute -inset-1 rounded-full bg-primary/20 blur-md" />
                {/* Button */}
                <div className="relative w-[52px] h-[52px] rounded-full bg-gradient-to-br from-red-600 to-primary shadow-[0_4px_20px_rgba(242,13,13,0.5)] border-2 border-white/20 flex items-center justify-center">
                    <img src="/logo.png" alt="IA" className="w-7 h-7 object-contain pointer-events-none drop-shadow-md" draggable={false} />
                    {/* Online dot */}
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 border-2 border-white dark:border-gray-900 rounded-full shadow-sm" />
                </div>
            </div>

            {/* Chat Modal / Bottom Sheet */}
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex flex-col justify-end pointer-events-none sm:items-end sm:p-6 sm:justify-start">
                    {/* Backdrop for mobile */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm sm:hidden pointer-events-auto transition-opacity"
                        onClick={closeChat}
                    ></div>

                    <div className="relative w-full h-[85vh] sm:h-[600px] sm:w-[400px] bg-background-light dark:bg-background-dark sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto border-t sm:border border-gray-200 dark:border-gray-800 animate-slide-up">

                        {/* Header */}
                        <div className="p-4 border-b border-gray-200 dark:border-gray-800/50 flex items-center justify-between bg-white/50 dark:bg-surface-dark/50 backdrop-blur-md">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-primary flex items-center justify-center shadow-glow-red p-2">
                                    <img src="/logo.png" alt="Deguste IA" className="w-full h-full object-contain" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white leading-tight">Deguste IA</h3>
                                    <p className="text-xs text-primary font-medium flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Online
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={clearHistory} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 transition-colors" title="Limpar Histórico">
                                    <span className="material-icons text-sm">delete_outline</span>
                                </button>
                                <button onClick={closeChat} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 transition-colors">
                                    <span className="material-icons text-xl">close</span>
                                </button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-background-dark no-scrollbar">
                            {messages.map((msg, idx) => (
                                <div key={msg.id || idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    {msg.role === 'system' && (
                                        <div className="w-full flex justify-center my-2">
                                            <span className="bg-red-500/10 text-red-500 text-[10px] uppercase font-bold px-3 py-1 rounded-full">{msg.content}</span>
                                        </div>
                                    )}
                                    {msg.role !== 'system' && (
                                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${msg.role === 'user'
                                            ? 'bg-primary text-white rounded-tr-sm'
                                            : 'bg-white dark:bg-surface-dark text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-white/5 rounded-tl-sm'
                                            }`}>
                                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                        </div>
                                    )}

                                    {/* Suggested Restaurants Cards */}
                                    {msg.suggestedRestaurants && msg.suggestedRestaurants.length > 0 && (
                                        <div className="w-full mt-3 overflow-x-auto hide-scroll pb-2 flex gap-3 no-scrollbar pl-1">
                                            {msg.suggestedRestaurants.map(restaurant => (
                                                <Link
                                                    onClick={closeChat}
                                                    to={`/restaurant/${restaurant.id}`}
                                                    key={restaurant.id}
                                                    className="shrink-0 w-48 bg-white dark:bg-card-dark rounded-xl overflow-hidden shadow-md border border-gray-100 dark:border-white/5 group block"
                                                >
                                                    <div className="h-24 relative">
                                                        <img src={getCoverPhotoUrl(restaurant.photos) || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80'} alt={restaurant.name} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                                                        <div className="absolute bottom-2 left-2 right-2">
                                                            <h4 className="text-white font-bold text-sm truncate">{restaurant.name}</h4>
                                                            <p className="text-gray-300 text-[10px] truncate">{restaurant.categories.join(' • ')}</p>
                                                        </div>
                                                    </div>
                                                    <div className="p-2 flex justify-between items-center">
                                                        <span className="text-primary text-xs font-bold">Ver Local</span>
                                                        <span className="material-icons-round text-primary text-sm transition-transform group-hover:translate-x-1">arrow_forward</span>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {isTyping && (
                                <div className="flex items-start">
                                    <div className="bg-white dark:bg-surface-dark border border-gray-100 dark:border-white/5 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex gap-1.5 items-center h-[44px]">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white dark:bg-surface-dark border-t border-gray-200 dark:border-gray-800/50">
                            <form onSubmit={handleSubmit} className="relative flex items-center">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Peça uma recomendação..."
                                    disabled={isTyping}
                                    className="w-full bg-gray-100 dark:bg-background-dark border border-transparent focus:border-primary/50 text-gray-900 dark:text-white text-sm rounded-full pl-5 pr-12 py-3.5 focus:outline-none focus:ring-1 focus:ring-primary shadow-inner disabled:opacity-50 transition-all"
                                />
                                {!input.trim() ? (
                                    <button
                                        type="button"
                                        onClick={startVoiceSearch}
                                        disabled={isTyping}
                                        className={`absolute right-1.5 w-10 h-10 flex items-center justify-center rounded-full disabled:opacity-50 transition-colors shadow-sm ${isListening ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300'}`}
                                    >
                                        <span className="material-icons-round text-[20px]">mic</span>
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        disabled={isTyping}
                                        className="absolute right-1.5 w-10 h-10 flex items-center justify-center bg-primary hover:bg-primary-dark text-white rounded-full disabled:opacity-50 disabled:bg-gray-400 transition-colors shadow-sm"
                                    >
                                        <span className="material-icons-round text-[20px] ml-0.5">send</span>
                                    </button>
                                )}
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
