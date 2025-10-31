
import SignupForm from '@/components/auth/signup-form';

export const dynamic = 'force-static';

export default function SignInPage() {
  return (
    <main className="min-h-[70vh] grid place-items-center p-8">
      <SignupForm />
    </main>
  );
}
