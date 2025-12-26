"use server";

import { db } from "@/lib/db";
import { encrypt } from "@/lib/auth";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { USERNAME_REGEX, PASSWORD_REGEX } from "@/lib/validation";
import { v4 as uuidv4 } from "uuid";

export async function guestLogin() {
  let guestUser = await db.user.findUnique({
    where: { username: "guest" },
  });

  if (!guestUser) {
    const hashedPassword = await bcrypt.hash(uuidv4(), 10);
    guestUser = await db.user.create({
      data: {
        username: "guest",
        password: hashedPassword,
        isVerified: false,
        bio: "Guest User",
      },
    });
  }

  const session = await encrypt({ id: guestUser.id, username: guestUser.username });
  const cookieStore = await cookies();
  cookieStore.set("session", session, {
    httpOnly: true,
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  redirect("/");
}

export async function signup(prevState: unknown, formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { message: "ユーザー名とパスワードが必要です" };
  }

  if (!USERNAME_REGEX.test(username)) {
    return {
      message: "ユーザー名には英数字、日本語、記号（_ @ . - = ( ) （ ））が使えます",
    };
  }

  if (username.length > 50) {
    return {
      message: "ユーザー名は50文字以内で入力してください",
    };
  }

  if (!PASSWORD_REGEX.test(password)) {
    return {
      message: "パスワードには英数字、記号が使えます",
    };
  }

  const existingUser = await db.user.findUnique({
    where: { username },
  });

  if (existingUser) {
    return { message: "ユーザー名はすでに使われています" };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await db.user.create({
    data: {
      username,
      password: hashedPassword,
    },
  });

  const session = await encrypt({ id: user.id, username: user.username });
  const cookieStore = await cookies();
  cookieStore.set("session", session, {
    httpOnly: true,
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  redirect("/");
}

export async function login(prevState: unknown, formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { message: "ユーザー名とパスワードが必要です" };
  }

  const user = await db.user.findUnique({
    where: { username },
  });

  if (!user) {
    return { message: "ログイン情報が間違っています" };
  }

  const isValid = await bcrypt.compare(password, user.password);

  if (!isValid) {
    return { message: "ログイン情報が間違っています" };
  }

  const session = await encrypt({ id: user.id, username: user.username });
  const cookieStore = await cookies();
  cookieStore.set("session", session, {
    httpOnly: true,
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  redirect("/");
}
