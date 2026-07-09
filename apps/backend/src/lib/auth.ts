import jwt from "jsonwebtoken";

const _jwtSecret = process.env.SESSION_SECRET;
if (!_jwtSecret) {
  throw new Error("SESSION_SECRET environment variable is required but was not provided.");
}
const JWT_SECRET: string = _jwtSecret;

export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, JWT_SECRET);
  if (typeof decoded !== "object" || decoded === null) {
    throw new Error("Invalid token payload");
  }
  return decoded as JwtPayload;
}

