import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <SignUp
      fallbackRedirectUrl="/"
      appearance={{
        variables: {
          colorPrimary: '#c99a3e',
        },
      }}
    />
  );
}
