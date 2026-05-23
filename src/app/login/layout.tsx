export const metadata = {
  title: 'Login - Kas Keluarga',
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="auth-shell">
      {children}
    </main>
  );
}
