import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";

// Authenticating your Liveblocks application
// https://liveblocks.io/docs/authentication/access-token

const API_KEY = process.env.LIVEBLOCKS_SECRET_KEY;

if (!API_KEY) {
  throw new Error("LIVEBLOCKS_SECRET_KEY is not set");
}

const liveblocks = new Liveblocks({
  secret: API_KEY,
});

export async function POST(request: NextRequest) {
  // Get the current user from your database
  // Here we are using a fake user for demonstration
  // In a real app, you should use your session
  const userId = "user-" + Math.floor(Math.random() * 10000);
  const userInfo = {
      name: "Anonymous",
      color: "#D583F1",
  };

  // Start an auth session inside your endpoint
  const session = liveblocks.prepareSession(
    userId,
    { userInfo } // Optional
  );

  // Use a naming pattern to allow access to rooms with wildcards
  // Giving the user read access on their org, and write access on their room
  const body = await request.json();
  const { room } = body;

  if (room) {
    session.allow(room, session.FULL_ACCESS);
  }

  // Authorize the user and return the result
  const { status, body: authBody } = await session.authorize();
  return new NextResponse(authBody, { status });
}
