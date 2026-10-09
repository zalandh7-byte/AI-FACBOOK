# Security Specification (`security_spec.md`)

## 1. Data Invariants & Master Sources of Truth

1. **Global Default-Deny Safety Net**: All unmatched paths are explicitly denied (`allow read, write: if false;`).
2. **PII Split Collection Isolation**:
   - Public profiles reside in `/profiles/{userId}` and NEVER contain `email`, `phone`, or street `address`.
   - Private user data (`email`, `language`) is strictly isolated in `/users_private/{userId}` where only `request.auth.uid == userId` may `get`, `create`, or `update` (and `list` is strictly forbidden).
3. **Master Gate Relational Sync**:
   - Subcollections `/posts/{postId}/likes/{likeUserId}` and `/posts/{postId}/comments/{commentId}` MUST verify the parent document `/posts/{postId}` exists and is accessible (`visibility == 'public'` or `authorId == request.auth.uid`) using `exists()` and `get()`.
   - Creating a post, story, or friendship requires that the creator has an active `/profiles/$(request.auth.uid)` document via `exists()`.
4. **Strict Validation Blueprints & Anti-Update-Gap**:
   - Every entity has a dedicated `isValid[Entity](data)` helper enforcing `keys().hasAll(...)`, `keys().hasOnly(...)`, string `.size()` bounds, regex ID patterns (`^[a-zA-Z0-9_\-]+$`), and identity integrity (`uid == request.auth.uid` / `authorId == request.auth.uid`).
   - Every `allow update` begins with `isValid[Entity](incoming())` and uses the Action-Based Update Pattern with `incoming().diff(existing()).affectedKeys().hasOnly(...)`.
5. **Terminal State Locking**:
   - In `/friendships/{friendshipId}`, once `existing().status` transitions from `'pending'` to `'accepted'` or `'declined'`, no subsequent updates are permitted (`existing().status == 'pending'`).
6. **Temporal Integrity & Immortal Fields**:
   - `createdAt` must equal `request.time` on `create` and remain immutable (`incoming().createdAt == existing().createdAt`) on `update`.
   - `updatedAt` must equal `request.time` on both `create` and `update`.
7. **Secure List Queries (Zero Client Delegation)**:
   - Every `allow list` rule explicitly evaluates `resource.data` (e.g., `resource.data.visibility == 'public' || resource.data.authorId == request.auth.uid`) and never uses `get()` or `exists()`.

---

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Payload 1 (Identity Spoofing on Post Create)**:
   `{ "postId": "post_1", "authorId": "victim_uid_999", "authorName": "Spoofer", "authorAvatar": "", "content": "Fake post", "mediaUrl": "", "feeling": "", "category": "general", "visibility": "public", "createdAt": "<SERVER_TIME>", "updatedAt": "<SERVER_TIME>" }` -> `PERMISSION_DENIED` (`authorId != request.auth.uid`).
2. **Payload 2 (Shadow Field Injection on Profile Update)**:
   `{ ..., "isAdmin": true, "isVerifiedBadge": true }` -> `PERMISSION_DENIED` (`hasOnly` and `affectedKeys().hasOnly` reject ghost fields).
3. **Payload 3 (Unverified Email Write Attempt)**:
   Auth token with `email_verified: false` attempting `create` on `/posts/post_1` -> `PERMISSION_DENIED` (`isVerifiedUser()` requires `request.auth.token.email_verified == true`).
4. **Payload 4 (PII Cross-User Read)**:
   Authenticated user `user_A` attempting `get` on `/users_private/user_B` -> `PERMISSION_DENIED` (`request.auth.uid == userId` fails).
5. **Payload 5 (Unfiltered Collection Scraping)**:
   Client executing `getDocs(collection(db, 'posts'))` without `where('visibility', '==', 'public')` -> `PERMISSION_DENIED` (`allow list` requires `resource.data.visibility == 'public'` or `resource.data.authorId == request.auth.uid`).
6. **Payload 6 (ID Poisoning / Oversized Path Variable)**:
   Document ID containing spaces/special characters `post/../../bad$id` or >128 chars -> `PERMISSION_DENIED` (`isValidId()` regex guard).
7. **Payload 7 (Denial-of-Wallet 1MB Content String)**:
   Post `content` with 50,000 characters -> `PERMISSION_DENIED` (`data.content.size() <= 2000` fails).
8. **Payload 8 (Orphaned Comment on Non-Existent Post)**:
   Creating `/posts/ghost_post_404/comments/c_1` -> `PERMISSION_DENIED` (`exists(/databases/$(database)/documents/posts/$(postId))` fails).
9. **Payload 9 (Terminal State Reversal on Friendship)**:
   Updating `/friendships/f_1` from `status: "accepted"` back to `status: "pending"` -> `PERMISSION_DENIED` (`existing().status == 'pending'` terminal lock fails).
10. **Payload 10 (Immortal Field Mutation on Post Update)**:
    Updating `createdAt` or `authorId` on an existing `/posts/post_1` -> `PERMISSION_DENIED` (`incoming().createdAt == existing().createdAt` and `affectedKeys().hasOnly(...)` fail).
11. **Payload 11 (Forged Client Timestamp)**:
    Creating `/stories/s_1` with `createdAt: Timestamp.fromMillis(1600000000000)` -> `PERMISSION_DENIED` (`incoming().createdAt == request.time` fails).
12. **Payload 12 (Value Poisoning on Whitelisted Update Key)**:
    Updating `/posts/post_1` field `category` to `"hacked_category"` or integer `123` -> `PERMISSION_DENIED` (`isValidPost(incoming())` wraps the entire `allow update` block and rejects invalid enum/type).
