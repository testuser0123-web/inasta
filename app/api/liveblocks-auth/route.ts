import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";

// Authenticating your Liveblocks application
// https://liveblocks.io/docs/authentication/access-token

const secretKey = process.env.LIVEBLOCKS_SECRET_KEY || "sk_dev_uK4lNsHirt9XhlxrqZf3S-3V7T32NxYbQ9C4g7itkr-IE7-7wcoKbAMfi7OIRcOh";

if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    console.warn("Using hardcoded Liveblocks secret key. Please set LIVEBLOCKS_SECRET_KEY in your environment variables.");
}

const liveblocks = new Liveblocks({
  secret: secretKey,
});

export async function POST(request: NextRequest) {
  // Get the current user from your database
  // Here we are using a fake user for demonstration
  // In a real app, you should use your session
  const userId = "user-" + Math.floor(Math.random() * 10000);
  const userInfo = {
      name: "Anonymous",
      color: "black",
  };

  // Start an auth session inside your endpoint
  const session = liveblocks.prepareSession(
    userId,
    { userInfo } // Optional
  );

  // Use a naming pattern to allow access to rooms with wildcards
  // Giving the user read access on their org, and write access on their room
  const { room } = await request.json();
  session.allow(room, session.FULL_ACCESS);

  // Authorize the user and return the result
  const { status, body } = await session.authorize();
  return new NextResponse(body, { status });
}
