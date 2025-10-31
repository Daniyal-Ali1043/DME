import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { acceptanceLogs } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { TERMS_VERSION, PRIVACY_VERSION } from "@/lib/legal";
import { ServerClient } from "postmark";

const fromEmail = process.env.POSTMARK_FROM_EMAIL || "no-reply@example.com";
const postmarkToken = process.env.POSTMARK_SERVER_TOKEN || "";

// Only create Postmark client if token exists
const postmark = postmarkToken ? new ServerClient(postmarkToken) : null;

// ✅ Explicitly type providers to avoid type mismatch
const providers: any[] = [
  Google({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    allowDangerousEmailAccountLinking: true,
  }),
];

// ✅ Add EmailProvider only for dev if Postmark or dummy config exists
providers.push(
  EmailProvider({
    // Fake SMTP config to prevent build crash
    server: {
      host: "localhost",
      port: 1025,
      auth: { user: "test", pass: "test" },
    },
    from: fromEmail,
    async sendVerificationRequest({ identifier, url }) {
      if (!postmark) {
        console.warn("Postmark not configured, skipping real email send");
        return;
      }
      const result = await postmark.sendEmail({
        From: fromEmail,
        To: identifier,
        Subject: "Sign in to Daily Macro Edge",
        HtmlBody: `<div>Click to sign in: <a href="${url}">${url}</a></div>`,
      });
      if (result.ErrorCode)
        throw new Error(`Postmark error: ${result.Message}`);
    },
  })
);

export default {
  providers,
  adapter: DrizzleAdapter(db),
  session: { strategy: "database" },
  trustHost: true,
  callbacks: {
    async session({ session, user }) {
      (session.user as any).id = user.id;
      const row = await db.query.acceptanceLogs.findFirst({
        where: eq(acceptanceLogs.userId, user.id),
        orderBy: [desc(acceptanceLogs.createdAt)],
      });
      const accepted =
        !!row &&
        row.termsVersion === TERMS_VERSION &&
        row.privacyVersion === PRIVACY_VERSION;
      (session.user as any).acceptedLegal = accepted;
      (session.user as any).requiredLegal = {
        terms: TERMS_VERSION,
        privacy: PRIVACY_VERSION,
      };
      return session;
    },
  },
  pages: { signIn: "/signin" },
} satisfies NextAuthConfig;
