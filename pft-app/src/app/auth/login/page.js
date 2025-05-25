"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (result.ok) {
      window.location.href = "/";
    } else {
      alert(result.error);
    }
  };

  return (

    // <div className="flex items-center justify-center h-screen bg-gray-100">
    //   <div className="bg-white p-8 rounded shadow-md w-96">
    <div 
      className="flex items-center justify-center h-screen bg-cover bg-center"
      style={{ backgroundImage: "url('/images/loginimg.jpg')" }} // Path relative to the public directory
    >
      {/* Add a semi-transparent overlay for better text readability if your image is busy */}
      {/* <div className="absolute inset-0 bg-black opacity-50"></div> */}
      <div className="bg-white bg-opacity-90 p-8 rounded-lg shadow-xl w-96 relative z-10"> {/* Added bg-opacity, rounded-lg, shadow-xl and z-index */}
        <h1 className="text-2xl font-bold mb-6 text-center">Login</h1>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            className="p-2 border rounded"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            className="p-2 border rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="submit"
            className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            Login
          </button>
        </form>
        <p className="mt-4 text-center">
          New user?{" "}
          <a href="/auth/signup" className="text-blue-500 underline">
            Signup
          </a>
        </p>
      </div>
    </div>
  );
}