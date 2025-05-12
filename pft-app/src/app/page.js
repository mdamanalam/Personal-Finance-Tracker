"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isChatOpen, setIsChatOpen] = useState(false); // State to toggle chatbot
  const [question, setQuestion] = useState(""); // State for user input
  const [answer, setAnswer] = useState(""); // State for chatbot response

  useEffect(() => {
    if (status === "loading") return; // Wait for session to load
    if (!session) {
      router.push("/auth/login");
    }
  }, [session, status, router]);

  const handleAsk = async () => {
    const res = await fetch("/api/chatbot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });

    const data = await res.json();
    setAnswer(data.answer); // Update the chatbot response
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (!session) {
    return null; // Show nothing while redirecting
  }

  return (
    <div className="h-screen flex flex-col">
      <nav className="bg-blue-500 text-white p-4 flex justify-between">
        <h1 className="text-xl font-bold">Personal Finance Tracker</h1>
        <button
          onClick={() => signOut()}
          className="bg-red-500 px-4 py-2 rounded hover:bg-red-600"
        >
          Logout
        </button>
      </nav>
      <main className="flex-grow flex items-center justify-center bg-gray-100">
        <h1 className="text-3xl font-bold">Welcome, {session.user.name}!</h1>
      </main>
      <footer className="bg-gray-800 text-white p-4 text-center">
        <p>&copy; 2025 Personal Finance Tracker. All rights reserved.</p>
      </footer>

      {/* Chatbot Icon */}
      <div
        className="fixed bottom-4 right-4 bg-blue-500 text-white p-4 rounded-full shadow-lg cursor-pointer hover:bg-blue-600"
        onClick={() => setIsChatOpen(!isChatOpen)}
      >
        💬
      </div>

      {/* Chatbot Popup */}
      {isChatOpen && (
        <div className="fixed bottom-16 right-4 bg-white p-4 rounded shadow-lg w-80">
          <h2 className="text-lg font-bold mb-2">Chatbot</h2>
          <textarea
            className="w-full p-2 border rounded mb-2"
            rows="3"
            placeholder="Type your question here..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          ></textarea>
          <button
            onClick={handleAsk}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Ask
          </button>
          {answer && (
            <p className="mt-4 text-gray-800">
              <strong>Chatbot:</strong> {answer}
            </p>
          )}
        </div>
      )}
    </div>
  );
}