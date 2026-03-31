import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

// Normalize JWT_PRIVATE_KEY: Convex CLI mangles multiline PEM keys
// (escaped \n, spaces instead of newlines, wrapping quotes).
if (process.env.JWT_PRIVATE_KEY) {
  let key = process.env.JWT_PRIVATE_KEY;
  // Strip wrapping quotes (JSON.stringify artifact)
  key = key.replace(/^["']|["']$/g, "");
  // Replace literal \n strings with real newlines
  key = key.replace(/\\n/g, "\n");
  // Fix space-separated PEM (CLI collapses newlines to spaces)
  if (!key.includes("\n")) {
    key = key
      .replace(/(-----BEGIN PRIVATE KEY-----)\s+/, "$1\n")
      .replace(/\s+(-----END PRIVATE KEY-----)/, "\n$1")
      .replace(/\s+/g, "\n");
  }
  process.env.JWT_PRIVATE_KEY = key;
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
});
