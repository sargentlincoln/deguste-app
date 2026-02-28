import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { ChatMessage, ChatState, Restaurant } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { chatWithAssistant } from '@/lib/gemini';

interface ChatContextType extends ChatState {
    toggleChat: () => void;
    openChat: () => void;
    closeChat: () => void;
    sendMessage: (content: string) => Promise<void>;
    clearHistory: () => void;
    messages: ChatMessage[];
    isOpen: boolean;
    isTyping: boolean;
}

const defaultState = {
    messages: [],
    isOpen: false,
    isTyping: false
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
    const [messages, setMessages] = useState<ChatMessage[]>(() => {
        const saved = localStorage.getItem('deguste-chat-messages');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                return [];
            }
        }
        return [
            {
                id: uuidv4(),
                role: 'assistant',
                content: 'Olá! Sou seu Concierge do Deguste. Onde vamos comer hoje?',
                timestamp: Date.now()
            }
        ];
    });

    const [isOpen, setIsOpen] = useState(false);
    const [isTyping, setIsTyping] = useState(false);

    useEffect(() => {
        localStorage.setItem('deguste-chat-messages', JSON.stringify(messages));
    }, [messages]);

    const toggleChat = () => setIsOpen(!isOpen);
    const openChat = () => setIsOpen(true);
    const closeChat = () => setIsOpen(false);

    const clearHistory = () => {
        setMessages([{
            id: uuidv4(),
            role: 'assistant',
            content: 'Histórico apagado! Como posso ajudar você agora?',
            timestamp: Date.now()
        }]);
        localStorage.removeItem('deguste-chat-messages');
    };

    const sendMessage = async (content: string) => {
        if (!content.trim()) return;

        // Add user message
        const userMessage: ChatMessage = {
            id: uuidv4(),
            role: 'user',
            content: content.trim(),
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMessage]);
        setIsTyping(true);
        setIsOpen(true);

        try {
            // Fetch latest messages to send to AI
            const currentMessages = [...messages, userMessage];
            const aiResponse = await chatWithAssistant(currentMessages);

            const aiMessage: ChatMessage = {
                id: uuidv4(),
                role: 'assistant',
                content: aiResponse.text,
                suggestedRestaurants: aiResponse.suggestedRestaurants,
                timestamp: Date.now()
            };

            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error("Failed to send message to AI", error);
            const errorMessage: ChatMessage = {
                id: uuidv4(),
                role: 'system',
                content: "Oops! Tive um problema ao processar sua mensagem. Tente novamente.",
                timestamp: Date.now()
            };

            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <ChatContext.Provider value={{ messages, isOpen, isTyping, toggleChat, openChat, closeChat, sendMessage, clearHistory }}>
            {children}
        </ChatContext.Provider>
    );
}

export function useChat() {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
}
