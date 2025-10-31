
export const dynamic = 'force-static';

export default function BlockedRegionPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-2xl font-semibold mb-3">Access Restricted</h1>
      <p className="text-sm text-neutral-700 mb-4">
        We’re sorry — this service isn’t available in your region due to legal and compliance requirements.
      </p>
      <p className="text-sm text-neutral-600">
        If you believe this is an error, please contact support with your IP and country so we can review.
      </p>
    </main>
  );
}
