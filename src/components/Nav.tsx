import Link from "next/link";
import { logoutAction } from "@/actions/auth";
import type { SessionUser } from "@/lib/session";

export function Nav({ user }: { user: SessionUser | null }) {
  return (
    <nav className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/" className="nav-brand text-2xl font-black">
          Pickonomics
        </Link>
        {user && (
          <>
            <Link href="/leagues/new" className="btn">
              Create League
            </Link>
            {user.isAdmin && (
              <Link href="/admin" className="btn btn-admin">
                Admin
              </Link>
            )}
          </>
        )}
      </div>
      <div className="flex items-center gap-3">
        {user ? (
          <>
            <span className="pill">@{user.username}</span>
            <Link href="/stats" className="btn">
              Stats
            </Link>
            <Link href="/settings" className="btn">
              Settings
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="btn btn-danger">
                Logout
              </button>
            </form>
          </>
        ) : (
          <>
            <Link href="/login" className="btn">
              Login
            </Link>
            <Link href="/register" className="btn btn-primary">
              Sign up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
