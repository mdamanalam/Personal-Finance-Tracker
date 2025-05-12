import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Add your OpenAI API key to the .env file
});

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { question } = req.body;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo", // Use a GPT model
        messages: [{ role: "user", content: question }],
        max_tokens: 100,
      });

      res.status(200).json({ answer: response.choices[0].message.content.trim() });
    } catch (error) {
      console.error("Error with OpenAI API:", error);
      res.status(500).json({ error: "Failed to generate a response" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}