"use client";
import { useState } from "react";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });
  const handleSubmit = e => {
    e.preventDefault();
    setSent(true);
    // Optionally, send to backend or email service
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">Contact Us</h1>
        {sent ? (
          <p className="text-green-600 text-center">Thank you for contacting us!</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input name="name" placeholder="Your Name" className="p-2 border rounded" value={form.name} onChange={handleChange} required />
            <input name="email" type="email" placeholder="Your Email" className="p-2 border rounded" value={form.email} onChange={handleChange} required />
            <textarea name="message" placeholder="Your Message" className="p-2 border rounded" value={form.message} onChange={handleChange} required />
            <button type="submit" className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600">Send</button>
          </form>
        )}
      </div>
    </div>
  );
}