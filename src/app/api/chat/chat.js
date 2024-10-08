import { useState } from 'react';

export default function Chat() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const onSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: input }],
                    selectedOption: 'gemini-1.5-flash',
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                setError(result.error || 'Something went wrong');
                setLoading(false);
                return;
            }

            // Append the assistant's response to the chat
            setMessages((prev) => [...prev, { role: 'assistant', content: result.content }]);
            setError('');
        } catch (err) {
            console.error('Error:', err);
            setError('Failed to fetch data from the server.');
        } finally {
            setLoading(false);
            setInput(''); // Clear the input field after submission
        }
    };

    return (
        <div className="chat-container">
            <h1>Weather Chatbot</h1>
            <form onSubmit={onSubmit}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about the weather..."
                    disabled={loading}
                />
                <button type="submit" disabled={loading || !input.trim()}>
                    {loading ? 'Loading...' : 'Send'}
                </button>
            </form>

            {/* Display messages */}
            <div className="messages">
                {messages.map((msg, index) => (
                    <div key={index} className={`message ${msg.role}`}>
                        {msg.content}
                    </div>
                ))}
            </div>

            {/* Display error message if any */}
            {error && <p className="error">{error}</p>}
        </div>
    );
}
