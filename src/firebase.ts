import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Validate connection to Firestore on boot per firebase-integration-rpc
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Verbatim validation constants synced with firebase-blueprint.json & firestore.rules
export const ID_PATTERN = /^[a-zA-Z0-9_\-]+$/;

export const BLUEPRINT_LIMITS = {
  ID_MAX: 128,
  DISPLAY_NAME_MAX: 80,
  BIO_MAX: 300,
  REGION_MAX: 80,
  URL_MAX: 500,
  EMAIL_MAX: 150,
  POST_CONTENT_MAX: 2000,
  FEELING_MAX: 60,
  COMMENT_CONTENT_MAX: 600,
  STORY_CAPTION_MAX: 140,
} as const;

export function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, BLUEPRINT_LIMITS.ID_MAX);
  return cleaned.length > 0 ? cleaned : `id_${Date.now()}`;
}

export function clampString(val: string, maxLength: number, fallback = ''): string {
  const trimmed = (val ?? '').trim();
  if (!trimmed && fallback) return fallback.slice(0, maxLength);
  return trimmed.slice(0, maxLength);
}
