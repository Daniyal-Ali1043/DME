
'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';

export default function SignupForm() {
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const disabled = !(agreeTerms && agreePrivacy);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm max-w-md">
      <h2 className="text-lg font-semibold mb-2">Create your account</h2>
      <div className="text-sm text-neutral-700 mb-4">
        Continue with Google or Email. You must accept our Terms and Privacy to proceed.
      </div>

      <div className="space-y-2 mb-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} />
          I agree to the <a className="underline" href="/legal/terms" target="_blank" rel="noreferrer">Terms</a>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)} />
          I agree to the <a className="underline" href="/legal/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <button
          disabled={disabled}
          onClick={() => signIn('google')}
          className="rounded-lg bg-black text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
        >
          Continue with Google
        </button>
        <button
          disabled={disabled}
          onClick={() => signIn('email')}
          className="rounded-lg border border-neutral-300 text-sm font-medium px-4 py-2 disabled:opacity-50"
        >
          Continue with Email
        </button>
      </div>
    </div>
  );
}
