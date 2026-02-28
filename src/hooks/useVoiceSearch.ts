import { useState, useCallback, useRef } from 'react';

/**
 * Shared hook for voice search/input across the app.
 * Handles all edge cases: non-HTTPS, unsupported browsers, permission denied, etc.
 */
export function useVoiceSearch(onResult: (text: string) => void) {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    const startListening = useCallback(() => {
        // Already listening? Stop first.
        if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch (_) { }
            recognitionRef.current = null;
            setIsListening(false);
        }

        // @ts-ignore
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            alert('Seu navegador não suporta reconhecimento de voz. Use o Chrome ou Edge para esta funcionalidade.');
            return;
        }

        // Check if we're on a secure context (HTTPS or localhost)
        if (!window.isSecureContext) {
            alert('O microfone requer conexão segura (HTTPS). Em dispositivos móveis, use o Chrome com HTTPS ou teste via localhost no computador.');
            return;
        }

        try {
            const recognition = new SpeechRecognition();
            recognition.lang = 'pt-BR';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;
            recognition.continuous = false;

            recognition.onstart = () => {
                console.log('[VoiceSearch] Listening started');
                setIsListening(true);
            };

            recognition.onend = () => {
                console.log('[VoiceSearch] Listening ended');
                setIsListening(false);
                recognitionRef.current = null;
            };

            recognition.onerror = (event: any) => {
                console.error('[VoiceSearch] Error:', event.error);
                setIsListening(false);
                recognitionRef.current = null;

                switch (event.error) {
                    case 'not-allowed':
                    case 'permission-denied':
                        alert('Permissão do microfone negada. Permita o acesso ao microfone nas configurações do seu navegador.');
                        break;
                    case 'no-speech':
                        // User didn't say anything — not an error worth alerting about
                        break;
                    case 'network':
                        alert('Erro de rede ao tentar reconhecer sua voz. Verifique sua conexão.');
                        break;
                    case 'audio-capture':
                        alert('Nenhum microfone encontrado. Verifique se seu dispositivo tem um microfone ativo.');
                        break;
                    case 'aborted':
                        // User or code cancelled — no alert needed
                        break;
                    default:
                        // For unknown errors, log but don't annoy the user
                        console.warn('[VoiceSearch] Unhandled error:', event.error);
                        break;
                }
            };

            recognition.onresult = (event: any) => {
                const text = event.results[0][0].transcript;
                console.log('[VoiceSearch] Result:', text);
                if (text && text.trim()) {
                    onResult(text.trim());
                }
            };

            recognitionRef.current = recognition;
            recognition.start();
        } catch (error: any) {
            console.error('[VoiceSearch] Failed to start:', error);
            setIsListening(false);
            alert('Não foi possível iniciar o microfone. Verifique as permissões do navegador.');
        }
    }, [onResult]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (_) { }
            recognitionRef.current = null;
            setIsListening(false);
        }
    }, []);

    return { isListening, startListening, stopListening };
}
