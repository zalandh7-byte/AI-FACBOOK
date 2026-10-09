import React, { useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  Bookmark,
  Check,
  Edit3,
  Flame,
  Heart,
  Image as ImageIcon,
  MessageCircle,
  Send,
  Share2,
  ThumbsUp,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import {
  BLUEPRINT_LIMITS,
  clampString,
  db,
  handleFirestoreError,
  OperationType,
  sanitizeId,
} from '../firebase';

export interface PostItem {
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  mediaUrl: string;
  feeling: string;
  category: 'general' | 'culture' | 'sports' | 'news' | 'poetry' | 'hujra';
  visibility: 'public' | 'private';
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

interface PostLikeDoc {
  postId: string;
  userId: string;
  userName: string;
  reactionType: 'like' | 'love' | 'salam' | 'fire';
  visibility: 'public' | 'private';
  createdAt: Timestamp | null;
}

interface PostCommentDoc {
  commentId: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  visibility: 'public' | 'private';
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

interface PostCardProps {
  post: PostItem;
  currentUser: {
    uid: string;
    displayName: string;
    avatarUrl: string;
  } | null;
  isSaved: boolean;
  onToggleSave: (postId: string) => void;
  onSelectAuthor?: (authorId: string) => void;
  lang: 'ur' | 'ps' | 'en';
}

const CATEGORY_LABELS: Record<PostItem['category'], { ur: string; ps: string; en: string }> = {
  general: { ur: 'عام گفتگو', ps: 'عمومي خبرې', en: 'General' },
  culture: { ur: 'پختون ثقافت', ps: 'پښتون کلتور', en: 'Pashtun Culture' },
  sports: { ur: 'کرکٹ اور کھیل', ps: 'کرکټ او لوبې', en: 'Cricket & Sports' },
  news: { ur: 'علاقائی خبریں', ps: 'سیمه ییز خبرونه', en: 'Regional News' },
  poetry: { ur: 'شاعری اور ادب', ps: 'شاعري او ادب', en: 'Poetry & Literature' },
  hujra: { ur: 'حجرہ بیٹھک', ps: 'حجره مجلس', en: 'Hujra Council' },
};

const REACTION_META: Record<
  PostLikeDoc['reactionType'],
  { labelUr: string; labelEn: string; emoji: string; colorClass: string }
> = {
  like: {
    labelUr: 'پسند (Like)',
    labelEn: 'Like',
    emoji: '👍',
    colorClass: 'text-[#136168] bg-[#136168]/10',
  },
  love: {
    labelUr: 'مینه / پیار',
    labelEn: 'Love',
    emoji: '❤️',
    colorClass: 'text-rose-600 bg-rose-50',
  },
  salam: {
    labelUr: 'سلام (Salam)',
    labelEn: 'Salam',
    emoji: '🤝',
    colorClass: 'text-emerald-700 bg-emerald-50',
  },
  fire: {
    labelUr: 'زبردست',
    labelEn: 'Fire',
    emoji: '🔥',
    colorClass: 'text-[#FF6B1A] bg-orange-50',
  },
};

function isRtlText(text: string): boolean {
  const rtlChars = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return rtlChars.test(text);
}

function formatRelativeTime(ts: Timestamp | null): string {
  if (!ts) return 'Just now';
  const diffSec = Math.max(1, Math.floor((Date.now() - ts.toMillis()) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUser,
  isSaved,
  onToggleSave,
  onSelectAuthor,
  lang,
}) => {
  const [likes, setLikes] = useState<PostLikeDoc[]>([]);
  const [comments, setComments] = useState<PostCommentDoc[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  // Edit post state
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [savingEdit, setSavingEdit] = useState(false);

  // Edit comment state
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  // Image error resilience
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [mediaBroken, setMediaBroken] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  // Real-time listeners for Likes and Comments on this post
  useEffect(() => {
    if (!currentUser) return;

    const likesPath = `posts/${post.postId}/likes`;
    const likesQuery = query(
      collection(db, 'posts', post.postId, 'likes'),
      where('visibility', '==', 'public')
    );

    const unsubLikes = onSnapshot(
      likesQuery,
      (snap) => {
        const list: PostLikeDoc[] = [];
        snap.forEach((d) => list.push(d.data() as PostLikeDoc));
        setLikes(list);
      },
      (err) => handleFirestoreError(err, OperationType.GET, likesPath)
    );

    const commentsPath = `posts/${post.postId}/comments`;
    const commentsQuery = query(
      collection(db, 'posts', post.postId, 'comments'),
      where('visibility', '==', 'public')
    );

    const unsubComments = onSnapshot(
      commentsQuery,
      (snap) => {
        const list: PostCommentDoc[] = [];
        snap.forEach((d) => list.push(d.data() as PostCommentDoc));
        list.sort((a, b) => {
          const tA = a.createdAt?.toMillis() ?? 0;
          const tB = b.createdAt?.toMillis() ?? 0;
          return tA - tB;
        });
        setComments(list);
      },
      (err) => handleFirestoreError(err, OperationType.GET, commentsPath)
    );

    return () => {
      unsubLikes();
      unsubComments();
    };
  }, [post.postId, currentUser]);

  const myReaction = currentUser
    ? likes.find((l) => l.userId === currentUser.uid)
    : undefined;

  const handleReaction = async (reactionType: PostLikeDoc['reactionType']) => {
    if (!currentUser) return;
    setShowReactionPicker(false);
    const likeDocPath = `posts/${post.postId}/likes/${currentUser.uid}`;
    const likeRef = doc(db, 'posts', post.postId, 'likes', currentUser.uid);

    try {
      if (myReaction && myReaction.reactionType === reactionType) {
        await deleteDoc(likeRef);
      } else if (myReaction) {
        await updateDoc(likeRef, {
          reactionType,
          createdAt: serverTimestamp(),
        });
      } else {
        await setDoc(likeRef, {
          postId: sanitizeId(post.postId),
          userId: sanitizeId(currentUser.uid),
          userName: clampString(
            currentUser.displayName,
            BLUEPRINT_LIMITS.DISPLAY_NAME_MAX,
            'Member'
          ),
          reactionType,
          visibility: 'public',
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, likeDocPath);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !commentText.trim() || submittingComment) return;
    setSubmittingComment(true);

    const commentId = sanitizeId(`cmt_${Date.now()}_${currentUser.uid.slice(0, 6)}`);
    const commentPath = `posts/${post.postId}/comments/${commentId}`;

    try {
      await setDoc(doc(db, 'posts', post.postId, 'comments', commentId), {
        commentId,
        postId: sanitizeId(post.postId),
        authorId: sanitizeId(currentUser.uid),
        authorName: clampString(
          currentUser.displayName,
          BLUEPRINT_LIMITS.DISPLAY_NAME_MAX,
          'Member'
        ),
        authorAvatar: clampString(currentUser.avatarUrl, BLUEPRINT_LIMITS.URL_MAX),
        content: clampString(commentText, BLUEPRINT_LIMITS.COMMENT_CONTENT_MAX),
        visibility: 'public',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setCommentText('');
      setShowComments(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, commentPath);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSaveCommentEdit = async (commentId: string) => {
    if (!currentUser || !editingCommentText.trim()) return;
    const commentPath = `posts/${post.postId}/comments/${commentId}`;
    try {
      await updateDoc(doc(db, 'posts', post.postId, 'comments', commentId), {
        content: clampString(editingCommentText, BLUEPRINT_LIMITS.COMMENT_CONTENT_MAX),
        updatedAt: serverTimestamp(),
      });
      setEditingCommentId(null);
      setEditingCommentText('');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, commentPath);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!currentUser) return;
    const commentPath = `posts/${post.postId}/comments/${commentId}`;
    try {
      await deleteDoc(doc(db, 'posts', post.postId, 'comments', commentId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, commentPath);
    }
  };

  const handleSavePostEdit = async () => {
    if (!currentUser || !editContent.trim() || savingEdit) return;
    setSavingEdit(true);
    const postPath = `posts/${post.postId}`;
    try {
      await updateDoc(doc(db, 'posts', post.postId), {
        content: clampString(editContent, BLUEPRINT_LIMITS.POST_CONTENT_MAX),
        updatedAt: serverTimestamp(),
      });
      setIsEditingPost(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, postPath);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeletePost = async () => {
    if (!currentUser || currentUser.uid !== post.authorId) return;
    const postPath = `posts/${post.postId}`;
    try {
      await deleteDoc(doc(db, 'posts', post.postId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, postPath);
    }
  };

  const handleSharePost = () => {
    const shareUrl = `${window.location.origin}/#post-${post.postId}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).catch(() => {});
    }
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const rtlContent = isRtlText(post.content);
  const categoryText = CATEGORY_LABELS[post.category]?.[lang] || CATEGORY_LABELS.general.ur;

  return (
    <article
      id={`post-${post.postId}`}
      className="bg-white border border-slate-200/90 rounded-xl p-5 transition-colors"
    >
      {/* Post Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => onSelectAuthor?.(post.authorId)}
            className="w-11 h-11 rounded-full overflow-hidden bg-[#136168] text-white flex items-center justify-center font-semibold text-base shrink-0 focus-visible:ring-2 focus-visible:ring-[#136168]"
          >
            {post.authorAvatar && !avatarBroken ? (
              <img
                src={post.authorAvatar}
                alt={post.authorName}
                referrerPolicy="no-referrer"
                onError={() => setAvatarBroken(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{post.authorName.charAt(0).toUpperCase()}</span>
            )}
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => onSelectAuthor?.(post.authorId)}
                className="font-semibold text-[15px] text-slate-900 hover:text-[#136168] transition-colors truncate"
              >
                {post.authorName}
              </button>
              {post.feeling && (
                <span className="text-xs text-slate-500">
                  — {post.feeling}
                </span>
              )}
            </div>

            {/* Zero-Pill Unboxed Metadata with typographic separators */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
              <span>{categoryText}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{formatRelativeTime(post.createdAt)}</span>
              <span aria-hidden="true">·</span>
              <span>{post.visibility === 'public' ? 'Public' : 'Private'}</span>
            </div>
          </div>
        </div>

        {/* Owner / Save Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onToggleSave(post.postId)}
            title={isSaved ? 'Remove from Saved' : 'Save Post'}
            className={`p-2 rounded-lg transition-colors ${
              isSaved
                ? 'text-[#FF6B1A] bg-orange-50'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Bookmark className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
          </button>

          {currentUser && currentUser.uid === post.authorId && (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditContent(post.content);
                  setIsEditingPost((prev) => !prev);
                }}
                title="Edit Post"
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleDeletePost}
                title="Delete Post"
                className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Post Body Text or Edit Form */}
      <div className="mt-3.5">
        {isEditingPost ? (
          <div className="space-y-2.5">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              maxLength={BLUEPRINT_LIMITS.POST_CONTENT_MAX}
              rows={3}
              dir={isRtlText(editContent) ? 'rtl' : 'ltr'}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#136168]"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditingPost(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingEdit || !editContent.trim()}
                onClick={handleSavePostEdit}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-[#136168] hover:bg-[#0e4b51] rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <p
            dir={rtlContent ? 'rtl' : 'ltr'}
            className={`text-[15px] text-slate-800 whitespace-pre-line leading-relaxed ${
              rtlContent ? 'urdu-text text-right text-base' : 'text-left'
            }`}
          >
            {post.content}
          </p>
        )}
      </div>

      {/* Optional Post Media with Zero-Broken-Image Resilience */}
      {post.mediaUrl && (
        <div className="mt-4 rounded-lg overflow-hidden bg-slate-100 border border-slate-200/70">
          {!mediaBroken ? (
            <img
              src={post.mediaUrl}
              alt={post.content.slice(0, 60) || 'Community post media'}
              referrerPolicy="no-referrer"
              onError={() => setMediaBroken(true)}
              className="w-full max-h-[440px] object-cover"
            />
          ) : (
            <div className="h-48 w-full bg-gradient-to-br from-[#136168] to-[#0a383c] flex flex-col items-center justify-center text-white/90 p-6 text-center">
              <ImageIcon className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-sm font-medium">Active Habib Community Visual</p>
              <p className="text-xs text-white/70 mt-1">{categoryText}</p>
            </div>
          )}
        </div>
      )}

      {/* Engagement Counters Row */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 font-medium text-slate-700 tabular-nums">
            <span>👍 ❤️ 🤝</span>
            <span>{likes.length}</span>
            <span>{lang === 'en' ? 'Reactions' : 'پسندیدگی'}</span>
          </span>
          {likes.length > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate max-w-[200px]">
                {likes.slice(0, 2).map((l) => l.userName).join(', ')}
                {likes.length > 2 ? ` +${likes.length - 2}` : ''}
              </span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowComments((prev) => !prev)}
          className="hover:text-slate-900 transition-colors tabular-nums"
        >
          {comments.length} {lang === 'en' ? 'Comments' : 'تبصرے'}
        </button>
      </div>

      {/* Facebook-Style Action Bar */}
      <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-3 gap-1.5 relative">
        {/* Reaction Trigger + Picker Popover */}
        <div
          className="relative"
          onMouseEnter={() => setShowReactionPicker(true)}
          onMouseLeave={() => setShowReactionPicker(false)}
        >
          {showReactionPicker && (
            <div className="absolute bottom-full left-0 mb-1.5 bg-white border border-slate-200 rounded-xl shadow-lg px-2.5 py-1.5 flex items-center gap-1.5 z-20">
              {(Object.keys(REACTION_META) as PostLikeDoc['reactionType'][]).map((rKey) => {
                const meta = REACTION_META[rKey];
                return (
                  <button
                    key={rKey}
                    type="button"
                    onClick={() => handleReaction(rKey)}
                    className="px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-transform hover:scale-110 flex items-center gap-1 text-xs font-medium whitespace-nowrap"
                    title={meta.labelUr}
                  >
                    <span className="text-base">{meta.emoji}</span>
                    <span className="text-slate-700">{meta.labelEn}</span>
                  </button>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={() => handleReaction(myReaction ? myReaction.reactionType : 'like')}
            className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
              myReaction
                ? REACTION_META[myReaction.reactionType].colorClass
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {myReaction ? (
              <>
                <span className="text-sm">{REACTION_META[myReaction.reactionType].emoji}</span>
                <span>{REACTION_META[myReaction.reactionType].labelUr}</span>
              </>
            ) : (
              <>
                <ThumbsUp className="w-4 h-4" />
                <span>{lang === 'en' ? 'Like' : 'پسند کریں'}</span>
              </>
            )}
          </button>
        </div>

        {/* Comment Toggle Button */}
        <button
          type="button"
          onClick={() => setShowComments((prev) => !prev)}
          className="w-full py-2 px-3 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
        >
          <MessageCircle className="w-4 h-4" />
          <span>{lang === 'en' ? 'Comment' : 'کمنٹ کریں'}</span>
        </button>

        {/* Share Button */}
        <button
          type="button"
          onClick={handleSharePost}
          className="w-full py-2 px-3 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
        >
          {copiedShare ? (
            <>
              <Check className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-700">{lang === 'en' ? 'Link Copied' : 'لنک کاپی ہوگیا'}</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4" />
              <span>{lang === 'en' ? 'Share' : 'شیئر کریں'}</span>
            </>
          )}
        </button>
      </div>

      {/* Expandable Comments Section */}
      {(showComments || comments.length > 0) && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
          {/* Existing Comments List */}
          {comments.length > 0 && (
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {comments.map((c) => {
                const isCommentOwner = currentUser?.uid === c.authorId;
                const isEditingThis = editingCommentId === c.commentId;
                return (
                  <div
                    key={c.commentId}
                    className="flex items-start gap-2.5 text-xs bg-slate-50 rounded-lg p-2.5"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#136168] text-white flex items-center justify-center font-semibold shrink-0 text-xs overflow-hidden">
                      {c.authorAvatar ? (
                        <img
                          src={c.authorAvatar}
                          alt={c.authorName}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{c.authorName.charAt(0).toUpperCase()}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900">{c.authorName}</span>
                          <span aria-hidden="true" className="text-slate-400">·</span>
                          <span className="text-slate-400 tabular-nums">
                            {formatRelativeTime(c.createdAt)}
                          </span>
                        </div>

                        {isCommentOwner && !isEditingThis && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCommentId(c.commentId);
                                setEditingCommentText(c.content);
                              }}
                              className="text-slate-400 hover:text-slate-700 p-0.5"
                              title="Edit comment"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(c.commentId)}
                              className="text-slate-400 hover:text-red-600 p-0.5"
                              title="Delete comment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {isEditingThis ? (
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editingCommentText}
                            onChange={(e) => setEditingCommentText(e.target.value)}
                            maxLength={BLUEPRINT_LIMITS.COMMENT_CONTENT_MAX}
                            className="flex-1 bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-[#136168]"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveCommentEdit(c.commentId)}
                            className="px-2 py-1 bg-[#136168] text-white rounded text-xs font-medium whitespace-nowrap"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCommentId(null)}
                            className="p-1 text-slate-500 hover:text-slate-800"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <p
                          dir={isRtlText(c.content) ? 'rtl' : 'ltr'}
                          className={`text-slate-700 mt-1 break-words ${
                            isRtlText(c.content) ? 'urdu-text text-right text-sm' : ''
                          }`}
                        >
                          {c.content}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add New Comment Form */}
          {currentUser && (
            <form onSubmit={handleAddComment} className="flex items-center gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                maxLength={BLUEPRINT_LIMITS.COMMENT_CONTENT_MAX}
                placeholder={
                  lang === 'en'
                    ? 'Write a respectful comment...'
                    : 'اپنا تبصرہ لکھیں (Write a comment)...'
                }
                dir={isRtlText(commentText) ? 'rtl' : 'ltr'}
                className="flex-1 bg-slate-100 border border-transparent focus:bg-white focus:border-[#136168] rounded-lg px-3.5 py-2 text-xs text-slate-900 focus:outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={!commentText.trim() || submittingComment}
                className="px-3.5 py-2 bg-[#136168] hover:bg-[#0e4b51] disabled:opacity-40 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? 'Send' : 'بھیجیں'}</span>
              </button>
            </form>
          )}
        </div>
      )}
    </article>
  );
};
