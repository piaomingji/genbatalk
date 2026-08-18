import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

/**
 * Sign-in, so a plan can belong to a person rather than to a browser.
 *
 * Usage is otherwise counted against a cookie and an IP address, which is fine for handing out a
 * free allowance but cannot support paying for anything: clearing site data would produce a new
 * customer, and the same person on a second device would look like a stranger.
 *
 * Sessions are JWT-based, so there is no user table to run. Everything the app needs -- who this is,
 * and therefore whose usage to count -- travels in the session cookie itself.
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // Only what is needed to recognise a returning customer.
      authorization: { params: { scope: 'openid email profile', prompt: 'select_account' } },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, profile }) {
      // Google's subject id is stable even if the person changes their email address.
      if (profile?.sub) token.sub = profile.sub;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as { id?: string }).id = token.sub;
      }
      return session;
    },
  },
  pages: {
    // Sign-in happens from the header, so send failures back to the app rather than to a bare
    // error page the user has no way out of.
    error: '/',
  },
  trustHost: true,
});
