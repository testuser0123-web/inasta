'use client';

import { useActionState } from 'react';
import { login } from '@/app/actions/auth';
import Link from 'next/link';

export default function LoginPage() {
  const [state, action, isPending] = useActionState(login, undefined);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-sm space-y-8 rounded-lg bg-white dark:bg-black p-6 shadow-md border dark:border-gray-800">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Sign in to INASTA</h1>
        </div>
        <form action={action} className="mt-8 space-y-6">
          <div className="-space-y-px rounded-md shadow-sm">
            <div>
              <label htmlFor="username" className="sr-only">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="relative block w-full rounded-t-md border-0 py-1.5 text-gray-900 dark:text-white dark:bg-gray-800 ring-1 ring-inset ring-gray-300 dark:ring-gray-700 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                placeholder="Username"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="relative block w-full rounded-b-md border-0 py-1.5 text-gray-900 dark:text-white dark:bg-gray-800 ring-1 ring-inset ring-gray-300 dark:ring-gray-700 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                placeholder="Password"
              />
            </div>
          </div>

          {state?.message && (
            <div className="text-sm text-red-500 text-center">{state.message}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={isPending}
              className="group relative flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
            >
              {isPending ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          Not a member?{' '}
          <Link href="/signup" className="font-semibold leading-6 text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
