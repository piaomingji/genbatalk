'use client';

import React from 'react';
import { SessionProvider } from 'next-auth/react';

/**
 * Makes the signed-in state available to the whole app.
 *
 * It lives at the root rather than inside the account button because other parts of the interface
 * need to know too -- notably the message shown when the free allowance runs out, which should offer
 * signing in to someone who has not, and say something different to someone who has.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
