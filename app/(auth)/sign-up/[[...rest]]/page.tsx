'use client';

import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <SignUp
      routing="path"
      path="/sign-up"
      forceRedirectUrl="/assessments/new"
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
