
import React, { useState, useRef, useEffect } from 'react';
import { getBeekeepingAdvice } from '../services/geminiService';
import { SparklesIcon, CameraIcon, XCircleIcon, PhotoIcon } from './Icons';

// Simple Markdown to HTML renderer
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    const renderContent = () => {
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code class="bg-slate-200 dark:bg-slate-700 rounded px-1 py-0.5 text-sm">$1</code>')
            .replace(/^## (.*?)$/gm, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>')
            .replace(/^### (.*?)$/gm, '<h3 class="text-lg font-semibold mt-3 mb-1">$1</h3>')
            .replace(/^- (.*?)$/gm, '<li>$1</li>')
            .replace(/<li>(.*?)<\/li>/gs, (match, p1) => `<ul><li class="list-disc ml-5">${p1}</li></ul>`)
            .replace(/<\/ul>\s*<ul>/g, '')
            .replace(/\n/g, '<br />');
    };
    return <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: renderContent() }} />;
};

const AiAssistant: React.FC = () => {
    const [prompt, setPrompt] = useState<string>('');
    const [response, setResponse] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const examplePrompts = [
        "Quali sono i segni di una regina che sta cedendo?",
        "Come posso eseguire un test con lo zucchero a velo per la varroa?",
        "Cosa dovrei piantare per aiutare le mie api a bottinare?",
        "La mia arnia ronza molto forte e fa la barba, cosa succede?",
    ];

    const handlePromptClick = (example: string) => { setPrompt(example); }

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => { setSelectedImage(reader.result as string); };
            reader.readAsDataURL(file);
        }
        event.target.value = '';
    };

    const handleRemoveImage = () => { setSelectedImage(null); };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!prompt.trim() && !selectedImage) || isLoading) return;

        setIsLoading(true);
        setError('');
        setResponse('');

        try {
            const finalPrompt = prompt.trim() || "Analizza questa immagine e dimmi cosa vedi relativo all'apicoltura.";
            const advice = await getBeekeepingAdvice(finalPrompt, selectedImage || undefined);
            setResponse(advice);
        } catch (err: any) {
            setError(err.message || 'Si è verificato un errore inaspettato.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto animate-fade-in flex flex-col h-[calc(100vh-180px)] sm:h-[calc(100vh-140px)]">
            <div className="text-center p-4 sm:p-6 bg-white dark:bg-slate-800 rounded-lg shadow-md mb-3 flex-shrink-0">
                <SparklesIcon className="w-8 h-8 sm:w-10 sm:h-10 mx-auto text-amber-500 mb-2"/>
                <h2 className="text-xl sm:text-2xl font-bold">Assistente AI Diario Apistico</h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Chiedi consigli o analizza foto.</p>
            </div>

            <div className="flex-grow overflow-y-auto bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 mb-3 border border-slate-100 dark:border-slate-700">
                {response === '' && !isLoading ? (
                     <div className="h-full flex flex-col items-center justify-center opacity-70">
                        <h3 className="text-base sm:text-lg font-semibold mb-4 text-center text-slate-600 dark:text-slate-300">Suggerimenti rapidi:</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 w-full max-w-2xl">
                            {examplePrompts.map((p, i) => (
                                <button key={i} onClick={() => handlePromptClick(p)} className="text-left p-2 sm:p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md border border-slate-200 hover:bg-amber-50 dark:hover:bg-slate-600 transition text-xs sm:text-sm">
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="min-h-full">
                         {isLoading ? (
                            <div className="flex flex-col items-center justify-center p-10 h-full">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500"></div>
                                <p className="mt-4 text-slate-500 dark:text-slate-400 animate-pulse">L'IA sta elaborando...</p>
                            </div>
                        ) : error ? (
                            <div className="p-4 text-center text-red-600 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-100">
                                <p><strong>Errore:</strong> {error}</p>
                            </div>
                        ) : (
                            <div className="prose-container pb-4">
                                <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-lg">
                                    <MarkdownRenderer content={response} />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="bg-white dark:bg-slate-800 p-2 sm:p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 flex-shrink-0">
                {selectedImage && (
                    <div className="mb-2 relative inline-block">
                        <img src={selectedImage} alt="Preview" className="h-16 sm:h-24 rounded-lg border border-slate-200 object-cover shadow-sm" />
                        <button type="button" onClick={handleRemoveImage} className="absolute -top-2 -right-2 bg-white dark:bg-slate-700 text-red-500 rounded-full shadow-md">
                            <XCircleIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex items-center gap-2">
                    <input type="file" accept="image/*" ref={galleryInputRef} onChange={handleFileChange} className="hidden" />
                    <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleFileChange} className="hidden" />
                    
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                        <button type="button" onClick={() => cameraInputRef.current?.click()} className="p-1.5 text-slate-500 hover:text-amber-500 rounded-md transition" title="Scatta Foto">
                            <CameraIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                        <button type="button" onClick={() => galleryInputRef.current?.click()} className="p-1.5 text-slate-500 hover:text-amber-500 rounded-md transition" title="Galleria">
                            <PhotoIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                    </div>

                    <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Chiedi all'assistente..."
                        className="flex-grow p-2 text-sm sm:text-base bg-slate-50 dark:bg-slate-900 border-none rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none transition dark:text-white min-w-0"
                        disabled={isLoading}
                    />
                    
                    <button type="submit" disabled={isLoading || (!prompt.trim() && !selectedImage)} className="p-2 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 transition shadow-sm flex-shrink-0">
                       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 sm:w-6 sm:h-6">
                            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AiAssistant;
