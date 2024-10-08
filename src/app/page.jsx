'use client';
import "./globals.css";
import { useChat } from 'ai/react';
import Markdown from 'react-markdown';

export default function Chat() {
    const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat();

    return (
        <div className="todo-container flex flex-col w-full max-w-md py-24 mx-auto">
            {/* Header for Weather Bot */}
            <header className="text-center mb-4">
                <h1 className="text-2xl font-bold">Weather Bot</h1>
                <p className="text-sm text-gray-500">Get real-time weather updates</p>
            </header>

            {/* Messages display */}
            <div className="message-container flex flex-col flex-grow overflow-y-auto p-4 border border-gray-300 rounded shadow-md mb-4">
                <div className="message-list">
                    {messages
                        .filter(m => m.content.trim() !== "") 
                        .map(m => (
                            <div
                                key={m.id}
                                className={`message-item mb-2 p-2 rounded ${m.role === 'user' ? 'user-message' : 'weatherbot'}`}
                            >
                                <Markdown>{m.content}</Markdown>
                            </div>
                        ))
                    }
                    {isLoading && <div className="loader"></div>}
                </div>
            </div>

            {/* Input field for user message */}
            <form onSubmit={e => {
                e.preventDefault();
                handleSubmit();
            }} className="w-full flex mt-4">
                <input
                    className="input-box flex-grow p-2 border border-gray-300 rounded-l shadow-md mr-2"
                    value={input}
                    placeholder="Say something..."
                    onChange={handleInputChange}
                    aria-label="Chat input"
                    style={{ width: '85%' }}
                />
                <button 
                    type="submit" 
                    className="send-button w-24 rounded-r border border-gray-300 bg-blue-500 text-white p-2 shadow-md hover:bg-blue-600 transition duration-200 ease-in-out"
                >
                    Send
                </button>
            </form>
        </div>
    );
}
