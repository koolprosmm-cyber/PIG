'use client';

import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <SignIn
      routing="path"
      path="/sign-in"
      fallbackRedirectUrl="/dashboard"
      appearance={{
        variables: {
          colorPrimary: '#6cc4b3',
          colorBackground: '#1d2433',
          colorInputBackground: '#141925',
          colorInputText: '#f0f2f6',
          colorText: '#f0f2f6',
          colorTextSecondary: '#aab2c4',
          colorNeutral: '#323b4d',
        },
      }}
    />
  );
}
