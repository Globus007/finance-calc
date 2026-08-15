/**
 * Safe unwrap of supabase.auth.getUser().
 * Nested destructure `data: { user }` throws when `data` is null
 * (transport / Auth error). That surfaces as React #441 on the client.
 */
export function userFromGetUserResult<T>(result: {
  data: { user: T | null } | null;
  error: { message: string } | null;
}): T | null {
  if (result.data?.user) return result.data.user;
  // `{ data: { user: null }, error }` is "no session". `{ data: null, error }`
  // is the shape that crashed `const { data: { user } }` as React #441.
  if (result.data == null && result.error) {
    throw new Error(`Failed to load session: ${result.error.message}`);
  }
  return null;
}
