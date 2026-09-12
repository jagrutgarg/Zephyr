// A compass/star emblem for the auth pages — four-pointed star burst inside
// a thin ring, with small orbiting sparkles, matching the light "parchment
// sky" theme applied to Login/Signup/Forgot Password via .aetheria-auth.
export function AuthEmblem() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="19" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <path
        d="M32 6 L36 28 L58 32 L36 36 L32 58 L28 36 L6 32 L28 28 Z"
        fill="currentColor"
      />
      <circle cx="50" cy="14" r="2" fill="currentColor" opacity="0.8" />
      <circle cx="12" cy="48" r="1.5" fill="currentColor" opacity="0.6" />
      <path d="M50 10 L51 13 L54 14 L51 15 L50 18 L49 15 L46 14 L49 13 Z" fill="currentColor" opacity="0.9" />
    </svg>
  );
}
