
export const dynamic = 'force-static';

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto py-10">
      <h1 className="text-2xl font-semibold mb-3">Privacy Policy</h1>
      <p className="text-sm text-neutral-600 mb-6">Last updated: 28 Oct 2025 • Jurisdiction: Commonwealth of Dominica</p>
      <section className="prose prose-sm max-w-none">
        <h2>1. Data We Process</h2>
        <ul>
          <li>Account data: email, name (optional).</li>
          <li>Billing data: handled by processors (e.g., Stripe). We do not store full card details.</li>
          <li>Usage analytics: collected only with your consent.</li>
          <li>Legal acceptance logs: version, timestamp, IP, user agent.</li>
        </ul>
        <h2>2. Purposes</h2>
        <ul>
          <li>Provide and secure the Service.</li>
          <li>Billing and subscription management.</li>
          <li>Compliance and abuse prevention.</li>
        </ul>
        <h2>3. Processors</h2>
        <p>We use reputable processors including Stripe (payments), NOWPayments (crypto payments), Postmark (email), and PostHog (analytics). Data is processed per their terms.</p>
        <h2>4. Cookies</h2>
        <p>Essential cookies are required for authentication and security. Optional analytics cookies are used only with consent. See our Cookies page for details.</p>
        <h2>5. International Transfers</h2>
        <p>Data may be processed in multiple regions by our processors. We take reasonable measures to protect information consistent with this Policy.</p>
        <h2>6. Your Rights</h2>
        <p>You may access or delete your account information, subject to authentication. For requests, contact support@yourdomain.com. We will respond within a reasonable timeframe.</p>
        <h2>7. Retention</h2>
        <p>We retain minimal data for the shortest time necessary for compliance and operations.</p>
        <h2>8. Changes</h2>
        <p>We may update this Policy. We log acceptance versions for compliance.</p>
      </section>
    </main>
  );
}
