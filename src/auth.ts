import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  pages: { signIn: "/admin/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;
        const user = await db.user.findUnique({ where: { email } });
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = (user as { role: Role }).role;
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub!;
      (session.user as { role?: Role }).role = token.role as Role;
      return session;
    },
  },
});

/** What each role may do. Checked on the server in every admin page and action. */
const PERMISSIONS = {
  "dashboard.read": ["SUPER_ADMIN", "MANAGER", "RESERVATIONS", "EDITOR", "AUDITOR"],
  "reservations.read": ["SUPER_ADMIN", "MANAGER", "RESERVATIONS", "AUDITOR"],
  "reservations.write": ["SUPER_ADMIN", "MANAGER", "RESERVATIONS"],
  "rooms.write": ["SUPER_ADMIN", "MANAGER"],
  "content.read": ["SUPER_ADMIN", "MANAGER", "EDITOR", "AUDITOR"],
  "content.write": ["SUPER_ADMIN", "MANAGER", "EDITOR"],
  "media.read": ["SUPER_ADMIN", "MANAGER", "EDITOR", "AUDITOR"],
  "media.write": ["SUPER_ADMIN", "MANAGER", "EDITOR"],
  "messages.read": ["SUPER_ADMIN", "MANAGER", "RESERVATIONS", "AUDITOR"],
  "messages.write": ["SUPER_ADMIN", "MANAGER", "RESERVATIONS"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export const can = (role: Role | undefined, permission: Permission) =>
  Boolean(role && (PERMISSIONS[permission] as readonly Role[]).includes(role));

/** Signed-in user with the permission, or a redirect to the login page / dashboard. */
export async function requirePermission(permission: Permission) {
  const session = await auth();
  const user = session?.user as { id: string; name?: string | null; email?: string | null; role?: Role } | undefined;
  if (!user) redirect("/admin/login");
  if (!can(user.role, permission)) redirect("/admin?denied=1");
  return user as { id: string; name?: string | null; email?: string | null; role: Role };
}

export const audit = (userId: string, action: string, entity: string, entityId?: string) =>
  db.auditEvent.create({ data: { userId, action, entity, entityId } });
