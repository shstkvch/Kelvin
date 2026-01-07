import jwt from 'jsonwebtoken';

const DEFAULT_SECRET = 'kelvin-dev-secret-change-in-production';
const DEFAULT_EXPIRY = '7d';

export interface TokenPayload {
  userId: string;
  email: string;
  role?: string;
}

export function generateToken(payload: TokenPayload, secret?: string): string {
  return jwt.sign(payload, secret || DEFAULT_SECRET, {
    expiresIn: DEFAULT_EXPIRY,
  });
}

export function verifyToken(token: string, secret?: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, secret || DEFAULT_SECRET) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    return jwt.decode(token) as TokenPayload;
  } catch {
    return null;
  }
}
