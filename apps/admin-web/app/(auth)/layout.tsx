// docs/17's "no customer-facing surface" scope note applies here too —
// this centered, shell-less layout exists only for Clerk's own hosted
// sign-in/sign-up components, the entire "Login Page" surface this app has
// (frontend architecture review §3: no custom credential form is built,
// since the backend delegates 100% of identity to Clerk).
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-(--color-bg-canvas) flex min-h-screen flex-col items-center justify-center px-4">
      <div className="mb-8 flex flex-col items-center gap-2">
        <span className="text-h1 text-(--color-text-primary) font-semibold">Riznexia</span>
        <span className="text-(--color-text-secondary) text-sm">
          AI Website Factory — internal dashboard
        </span>
      </div>
      {children}
    </div>
  );
}
