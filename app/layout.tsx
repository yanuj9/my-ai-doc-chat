// app/layout.tsx
import { 
  ClerkProvider, 
  SignInButton, 
  UserButton 
} from '@clerk/nextjs'; 
import { auth } from '@clerk/nextjs/server';
import './globals.css';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  return (
    <ClerkProvider>
      <html lang="en">
        <body className="antialiased">
          <div className="min-h-screen flex flex-col">
            <header className="flex justify-between items-center p-4 bg-slate-900 text-white border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold">
                  A
                </div>
                <span className="font-semibold tracking-tight">AI Doc Chat</span>
              </div>

              <div className="flex items-center gap-4">
                {!userId && (
                  <SignInButton mode="modal">
                    <button className="text-sm bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg transition">
                      Sign In
                    </button>
                  </SignInButton>
                )}

                {userId && (
                  <UserButton />
                )}
              </div>
            </header>

            <main className="flex-1">{children}</main>
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}