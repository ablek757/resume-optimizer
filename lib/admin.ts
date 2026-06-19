export function verifyAdminPassword(password: string | null): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.warn('ADMIN_PASSWORD not configured');
    return false;
  }

  return password === `Bearer ${adminPassword}`;
}

export function unauthorizedResponse() {
  return new Response(
    JSON.stringify({ error: '未授权访问' }),
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  );
}
