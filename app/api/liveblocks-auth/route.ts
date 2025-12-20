import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

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
  // Get the current user from the session
  const userSession = await getSession();

  let userId: string;
  let userInfo: { name: string; color: string };

  if (userSession) {
    userId = String(userSession.id); // Use DB ID as Liveblocks ID
    userInfo = {
      name: userSession.username, // Use username as display name
      color: "#" + Math.floor(Math.random()*16777215).toString(16), // Random color for now, could be persistent
    };
  } else {
    // Fallback for unauthenticated (shouldn't happen on protected route, but good for safety)
    userId = "user-" + Math.floor(Math.random() * 10000);
    userInfo = {
      name: "Anonymous",
      color: "#D583F1",
    };
  }

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
