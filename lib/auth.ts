import { SignJWT, jwtVerify, JWTPayload } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const secretKey = "secret"; // In a real app, use process.env.SESSION_SECRET
const key = new TextEncoder().encode(secretKey);

export async function encrypt(payload: JWTPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1 week") // Session duration
    .sign(key);
}

export async function decrypt(input: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(input, key, {
    algorithms: ["HS256"],
  });
  return payload;
}

export type Session = {
  id: number;
  username: string;
  expires: Date;
  [key: string]: unknown;
};

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) return null;
  try {
    return (await decrypt(session)) as Session;
  } catch (_error) {
    return null;
  }
}

export async function login(_formData: FormData) {
  // Verify credentials... (Implemented in server action)
  // This helper mainly sets the cookie
}


export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}

export async function updateSession(request: NextRequest) {
  const session = request.cookies.get("session")?.value;
  if (!session) return;

  // Refresh session expiry
  const parsed = await decrypt(session);
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  parsed.expires = expires;
  
  const res = NextResponse.next();
  res.cookies.set({
    name: "session",
    value: await encrypt(parsed),
    httpOnly: true,
    expires: expires,
  });
  return res;
}
