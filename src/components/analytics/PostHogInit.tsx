'use client';
import { useEffect, useRef } from 'react';
import posthog from 'posthog-js';

type Props = { enabled: boolean; apiHost?: string; nonce?: string };

export default function PostHogInit({ enabled, apiHost = '/ingest' }: Props) {
  const inited = useRef(false);

  useEffect(() => {
    if (!enabled || inited.current) return;

    const key =
      process.env.NEXT_PUBLIC_POSTHOG_KEY ||
      process.env.POSTHOG_KEY ||
      '';

    if (!key) return;

    posthog.init(key, {
      api_host: apiHost,
      capture_pageview: true,
      capture_pageleave: true,
      persistence: 'cookie',
      autocapture: true,
      person_profiles: 'identified_only',
    });

    inited.current = true;

    // ✅ official and type-safe cleanup method
    return () => {
      try {
        posthog.reset();
      } catch {
        // ignore cleanup errors
      }
    };
  }, [enabled, apiHost]);

  return null;
}
