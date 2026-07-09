import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken } from "../lib/auth";

export class AuthService {
  static async signup({ name, email, password }: any) {
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (existing.length > 0) {
      const err = new Error("Email already in use");
      (err as any).statusCode = 409;
      throw err;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db
      .insert(usersTable)
      .values({ name, email, passwordHash, role: "user" })
      .returning();

    const token = signToken({ userId: user.id, email: user.email, role: user.role });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      },
    };
  }

  static async login({ email, password }: any) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (!user) {
      const err = new Error("Invalid credentials");
      (err as any).statusCode = 401;
      throw err;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      const err = new Error("Invalid credentials");
      (err as any).statusCode = 401;
      throw err;
    }

    const token = signToken({ userId: user.id, email: user.email, role: user.role });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      },
    };
  }

  static async getUserProfile(userId: number) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) {
      const err = new Error("User not found");
      (err as any).statusCode = 404;
      throw err;
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
