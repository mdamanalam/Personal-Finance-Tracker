import { PrismaClient } from "@prisma/client";
import { hash } from "bcrypt";

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { name, email, password } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ message: "Missing fields" });
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    return res.status(400).json({ message: "User already exists" });
  }

  const hashedPassword = await hash(password, 12);

  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword }
  });

  res.status(201).json({ message: "User created", user });
}


