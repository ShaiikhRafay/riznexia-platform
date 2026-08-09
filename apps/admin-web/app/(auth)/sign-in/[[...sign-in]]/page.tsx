import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <SignIn
      fallbackRedirectUrl="/"
      appearance={{
        variables: {
          colorPrimary: '#c99a3e',
        },
      }}
    />
  );
}
