import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const StreamChat = () => {
    const [reasoning, setReasoning] = useState('');
    const [solution, setSolution] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const eventSourceRef = useRef(null);
    const { chatId } = useParams();
    const { isAuthenticated, logout, user } = useAuth();

    const startStream = () => {
        setReasoning('');
        setSolution('');
        setIsStreaming(true);

        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        const query = 'Sample Query for streaming response';
        const eventSource = new EventSource(`http://localhost:5000/api/chat/completion_stream?chat_id=${chatId}&query=${encodeURIComponent(query)}`, {
            withCredentials: true
        });
        eventSourceRef.current = eventSource;

        eventSource.addEventListener('reasoning', (event) => {
            const data = JSON.parse(event.data);
            setReasoning((prev) => prev + data);
        });

        eventSource.addEventListener('solution', (event) => {
            const data = JSON.parse(event.data);
            setSolution((prev) => prev + data);
        });

        eventSource.addEventListener('end', () => {
            eventSource.close();
            setIsStreaming(false);
        });

        eventSource.onerror = () => {
            eventSource.close();
            setIsStreaming(false);
        };
    };

    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, []);

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Inference Stream</h1>
                <button
                    onClick={startStream}
                    disabled={isStreaming}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${isStreaming
                        ? 'bg-gray-400 cursor-not-allowed text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                >
                    {isStreaming ? 'Streaming...' : 'Start Generation'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center space-x-2 mb-4">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                        <h2 className="text-lg font-semibold text-gray-700">Reasoning Chain</h2>
                    </div>
                    <div className="prose prose-sm h-64 overflow-y-auto bg-gray-50 p-4 rounded-lg border border-gray-100 font-mono text-sm">
                        {reasoning || <span className="text-gray-400 italic">Waiting for reasoning...</span>}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center space-x-2 mb-4">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <h2 className="text-lg font-semibold text-gray-700">Final Solution</h2>
                    </div>
                    <div className="prose prose-sm h-64 overflow-y-auto bg-gray-50 p-4 rounded-lg border border-gray-100 font-medium text-gray-900">
                        {solution || <span className="text-gray-400 italic">Waiting for solution...</span>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StreamChat;
