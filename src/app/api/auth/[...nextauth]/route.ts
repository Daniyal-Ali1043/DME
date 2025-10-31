import { handlers } from "@/auth";

// ✅ Forces Node.js runtime (required for Nodemailer & crypto)
export const runtime = "nodejs";

// ✅ Export NextAuth route handlers
export const GET: typeof handlers.GET = handlers.GET;
export const POST: typeof handlers.POST = handlers.POST;
