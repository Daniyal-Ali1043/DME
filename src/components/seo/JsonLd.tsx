
'use client';
import React from 'react';
type Props = { json: Record<string, any> | Record<string, any>[]; nonce?: string; };
export default function JsonLd({ json, nonce }: Props) {
  const payload = JSON.stringify(json);
  return <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: payload }} />;
}
