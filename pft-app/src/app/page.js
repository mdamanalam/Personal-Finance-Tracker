"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return; // Wait for session to load
    if (!session) {
      router.push("/auth/login");
    }
  }, [session, status, router]);

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
    </div>
  );
}