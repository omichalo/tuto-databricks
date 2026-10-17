import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV !== 'production';
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '';
const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';
if (useEmulators && process.env.APP_ENV === 'production') {
  throw new Error('NEXT_PUBLIC_USE_FIREBASE_EMULATORS est interdit pour un build de production');
}

function contentSecurityPolicy(): string {
  const firebaseConnect = [
    'https://identitytoolkit.googleapis.com',
    'https://securetoken.googleapis.com',
    'https://firebaseinstallations.googleapis.com',
    'https://content-firebaseappcheck.googleapis.com',
    'https://www.google.com',
  ];
  const emulatorHosts = useEmulators ? ['http://127.0.0.1:9099', 'http://localhost:9099'] : [];
  const devConnect = [...emulatorHosts, ...(isDev ? ['ws:'] : [])];
  const frameHosts = ['https://www.google.com', 'https://recaptcha.google.com', ...emulatorHosts];
  if (authDomain !== '') frameHosts.push(`https://${authDomain}`);

  // 'unsafe-inline' pour les scripts : Next.js injecte des scripts inline et les nonces exigent un
  // middleware, exclu par la base de sécurité. Suivi dans docs/status.md (durcissement phase 8).
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    "'wasm-unsafe-eval'",
    'https://apis.google.com',
    'https://www.google.com/recaptcha/',
    'https://www.gstatic.com/recaptcha/',
  ];
  if (isDev) scriptSrc.push("'unsafe-eval'");

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self' ${[...firebaseConnect, ...devConnect].join(' ')}`,
    `frame-src ${frameHosts.join(' ')}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: { unoptimized: true },
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  serverExternalPackages: ['firebase-admin', '@duckdb/node-api', '@duckdb/duckdb-wasm'],
  async headers() {
    await Promise.resolve();
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy() },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ];
  },
};

export default nextConfig;
