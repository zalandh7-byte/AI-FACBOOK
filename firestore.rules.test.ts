/**
 * Security Rules Verification Suite for Active Habib - Patan Social
 * Verifies that all Dirty Dozen adversarial payloads return PERMISSION_DENIED.
 */

export interface DirtyPayloadTestCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: { uid: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TEST_CASES: DirtyPayloadTestCase[] = [
  {
    id: 1,
    name: 'Identity Spoofing on Post Create',
    collectionPath: '/posts/post_1',
    operation: 'create',
    auth: { uid: 'attacker_uid', email_verified: true },
    payload: {
      postId: 'post_1',
      authorId: 'victim_uid',
      authorName: 'Attacker',
      authorAvatar: '',
      content: 'Spoofed post',
      mediaUrl: '',
      feeling: '',
      category: 'general',
      visibility: 'public',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Shadow Field Injection on Profile Update',
    collectionPath: '/profiles/user_1',
    operation: 'update',
    auth: { uid: 'user_1', email_verified: true },
    payload: {
      uid: 'user_1',
      displayName: 'Habib',
      isAdmin: true,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Unverified Email Write Attempt',
    collectionPath: '/posts/post_2',
    operation: 'create',
    auth: { uid: 'user_1', email_verified: false },
    payload: {
      postId: 'post_2',
      authorId: 'user_1',
      content: 'Hello',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'PII Cross-User Read on users_private',
    collectionPath: '/users_private/victim_uid',
    operation: 'get',
    auth: { uid: 'attacker_uid', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Unfiltered Collection Scraping on users_private',
    collectionPath: '/users_private',
    operation: 'list',
    auth: { uid: 'attacker_uid', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'ID Poisoning with Invalid Characters',
    collectionPath: '/posts/bad$id!@#',
    operation: 'create',
    auth: { uid: 'user_1', email_verified: true },
    payload: { postId: 'bad$id!@#' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Denial of Wallet Oversized Post Content',
    collectionPath: '/posts/post_oversized',
    operation: 'create',
    auth: { uid: 'user_1', email_verified: true },
    payload: {
      postId: 'post_oversized',
      authorId: 'user_1',
      content: 'x'.repeat(5000),
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Orphaned Comment on Non-Existent Post',
    collectionPath: '/posts/non_existent_post/comments/c_1',
    operation: 'create',
    auth: { uid: 'user_1', email_verified: true },
    payload: {
      commentId: 'c_1',
      postId: 'non_existent_post',
      authorId: 'user_1',
      content: 'Orphan comment',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Terminal State Reversal on Accepted Friendship',
    collectionPath: '/friendships/f_1',
    operation: 'update',
    auth: { uid: 'user_2', email_verified: true },
    payload: {
      status: 'pending',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Immortal Field Mutation on Post AuthorId',
    collectionPath: '/posts/post_1',
    operation: 'update',
    auth: { uid: 'user_1', email_verified: true },
    payload: {
      authorId: 'user_2',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Forged Past Timestamp on Story Creation',
    collectionPath: '/stories/story_1',
    operation: 'create',
    auth: { uid: 'user_1', email_verified: true },
    payload: {
      storyId: 'story_1',
      authorId: 'user_1',
      createdAt: '2020-01-01T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Value Poisoning on Whitelisted Post Category',
    collectionPath: '/posts/post_1',
    operation: 'update',
    auth: { uid: 'user_1', email_verified: true },
    payload: {
      category: 'invalid_enum_value',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
];
