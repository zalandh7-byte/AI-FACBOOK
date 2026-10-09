import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
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
  Camera,
  Check,
  Compass,
  Edit3,
  Globe,
  Home,
  Image as ImageIcon,
  LogIn,
  LogOut,
  MapPin,
  MessageSquare,
  Plus,
  Search,
  Send,
  Smile,
  Sparkles,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  auth,
  BLUEPRINT_LIMITS,
  clampString,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  sanitizeId,
} from './firebase';
import { ActiveHabibLogo } from './components/ActiveHabibLogo';
import { PostCard, PostItem } from './components/PostCard';
import { OfflineIndicator, PWAInstallButton } from './components/PWAInstallButton';
import { PlayStoreGuideModal } from './components/PlayStoreGuideModal';

// Generated High-Resolution Assets
import coverMountainImg from './assets/images/pashtun_mountains_cover_1791366461899.jpg';
import storyKahwaImg from './assets/images/story_cultural_gathering_1791366480835.jpg';
import postCricketImg from './assets/images/post_cricket_match_1791366499263.jpg';
import avatarLeaderImg from './assets/images/avatar_community_leader_1791366519249.jpg';

interface UserProfileDoc {
  uid: string;
  displayName: string;
  bio: string;
  region: string;
  avatarUrl: string;
  coverUrl: string;
  visibility: 'public' | 'private';
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

interface StoryDoc {
  storyId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  caption: string;
  mediaUrl: string;
  themeColor: 'teal' | 'orange' | 'emerald' | 'slate';
  visibility: 'public' | 'private';
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

interface FriendshipDoc {
  friendshipId: string;
  requesterId: string;
  requesterName: string;
  requesterAvatar: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

type NavTab = 'feed' | 'stories' | 'hujra' | 'friends' | 'profile';
type LangCode = 'ur' | 'ps' | 'en';

const STORY_THEME_STYLES: Record<StoryDoc['themeColor'], string> = {
  teal: 'from-[#136168] via-[#0e4b51] to-[#072c30]',
  orange: 'from-[#FF6B1A] via-[#e0550b] to-[#8c2f00]',
  emerald: 'from-emerald-700 via-emerald-800 to-teal-950',
  slate: 'from-slate-800 via-slate-900 to-black',
};

const FEELING_OPTIONS = [
  { id: '', label: 'کوئی نہیں (None)' },
  { id: 'خوش و خرم 😊', label: 'خوش و خرم (Feeling Happy)' },
  { id: 'سبز قہوہ پی رہے ہیں 🍵', label: 'سبز قہوہ (Drinking Green Kahwa)' },
  { id: 'کرکٹ میچ دیکھ رہے ہیں 🏏', label: 'کرکٹ میچ (Watching Cricket)' },
  { id: 'حجرہ بیٹھک میں 🤝', label: 'حجرہ بیٹھک (In Hujra Gathering)' },
  { id: 'وطن سے محبت ❤️', label: 'وطن سے محبت (Feeling Proud)' },
];

const PHOTO_PRESETS = [
  { label: 'No Photo / بغیر تصویر', url: '' },
  { label: 'Mountain Valley (سوات اور پہاڑی وادی)', url: coverMountainImg },
  { label: 'Valley Cricket Match (کرکٹ میچ)', url: postCricketImg },
  { label: 'Traditional Kahwa (روایتی سبز قہوہ)', url: storyKahwaImg },
];

const HUJRA_GROUPS = [
  {
    id: 'hujra_culture',
    titleUr: 'پختون ثقافت، تاریخ اور حجرہ',
    titleEn: 'Pashtun Culture & Heritage Hujra',
    membersCount: 14820,
    category: 'culture' as const,
    description:
      'پختونولی، مہمان نوازی، جرگہ اور روایتی ثقافت پر مثبت گفتگو اور تصاویر کا مرکز۔',
    cover: coverMountainImg,
  },
  {
    id: 'hujra_cricket',
    titleUr: 'خیبر و کوئٹہ ٹیپ بال کرکٹ کلب',
    titleEn: 'Khyber & Quetta Cricket League',
    membersCount: 9340,
    category: 'sports' as const,
    description:
      'مقامی کرکٹ ٹورنامنٹس، کھلاڑیوں کی کارکردگی اور سپورٹس مقابلوں کی تازہ ترین اپڈیٹس۔',
    cover: postCricketImg,
  },
  {
    id: 'hujra_poetry',
    titleUr: 'پشتو اور اردو شاعری دیوان',
    titleEn: 'Pashto & Urdu Poetry Circle',
    membersCount: 11250,
    category: 'poetry' as const,
    description:
      'خوشحال خان خٹک، رحمان بابا، غنی خان اور جدید پشتو و اردو ادب کے خوبصورت اشعار۔',
    cover: storyKahwaImg,
  },
];

export default function App() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  // Navigation & Language
  const [activeTab, setActiveTab] = useState<NavTab>('feed');
  const [lang, setLang] = useState<LangCode>('ur');
  const [categoryFilter, setCategoryFilter] = useState<'all' | PostItem['category'] | 'saved'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Firestore Live State
  const [myProfile, setMyProfile] = useState<UserProfileDoc | null>(null);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [stories, setStories] = useState<StoryDoc[]>([]);
  const [profiles, setProfiles] = useState<UserProfileDoc[]>([]);
  const [friendships, setFriendships] = useState<FriendshipDoc[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [seededInitial, setSeededInitial] = useState(false);

  // Local interactive states (Saved posts, Joined Hujra groups, Quick Chat, Modals)
  const [savedPostIds, setSavedPostIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('active_habib_saved_posts');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [joinedGroups, setJoinedGroups] = useState<string[]>([
    'hujra_culture',
    'hujra_cricket',
  ]);
  const [rsvpEvents, setRsvpEvents] = useState<string[]>(['evt_cricket']);

  // Post Composer State
  const [postContent, setPostContent] = useState('');
  const [postCategory, setPostCategory] = useState<PostItem['category']>('general');
  const [postFeeling, setPostFeeling] = useState('');
  const [postMediaUrl, setPostMediaUrl] = useState('');
  const [showPhotoInput, setShowPhotoInput] = useState(false);
  const [publishingPost, setPublishingPost] = useState(false);

  // Story Modals State
  const [showCreateStoryModal, setShowCreateStoryModal] = useState(false);
  const [storyCaption, setStoryCaption] = useState('');
  const [storyTheme, setStoryTheme] = useState<StoryDoc['themeColor']>('teal');
  const [storyMediaUrl, setStoryMediaUrl] = useState(storyKahwaImg);
  const [publishingStory, setPublishingStory] = useState(false);
  const [activeStoryViewer, setActiveStoryViewer] = useState<StoryDoc | null>(null);

  // Edit Profile Modal State
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editRegion, setEditRegion] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editCoverUrl, setEditCoverUrl] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Selected Profile Inspection
  const [inspectedUserId, setInspectedUserId] = useState<string | null>(null);
  const [showPlayStoreGuide, setShowPlayStoreGuide] = useState(false);

  // Bottom-Right Quick Hujra Chat Drawer
  const [activeChatPartner, setActiveChatPartner] = useState<{
    name: string;
    region: string;
    avatar: string;
  } | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<
    { id: string; sender: 'me' | 'them'; text: string; time: string }[]
  >([
    {
      id: 'm1',
      sender: 'them',
      text: 'اسلام علیکم! پٹھان سوشل سایٹ (Active Habib) میں خوش آمدید، کیسے مزاج ہیں؟',
      time: '10:15 AM',
    },
  ]);

  // 1. Track Firebase Auth State & Bootstrap User Profile
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const uid = sanitizeId(user.uid);
        const profileRef = doc(db, 'profiles', uid);
        const privateRef = doc(db, 'users_private', uid);

        try {
          const existingSnap = await getDoc(profileRef);
          if (!existingSnap.exists()) {
            const newProfile = {
              uid,
              displayName: clampString(
                user.displayName || 'Active Habib Member',
                BLUEPRINT_LIMITS.DISPLAY_NAME_MAX,
                'Active Habib Member'
              ),
              bio: 'پٹھان سوشل سایٹ (Active Habib) کا فعال رکن • امن، محبت اور بھائی چارہ',
              region: 'Peshawar / Quetta',
              avatarUrl: clampString(
                user.photoURL || avatarLeaderImg,
                BLUEPRINT_LIMITS.URL_MAX
              ),
              coverUrl: clampString(coverMountainImg, BLUEPRINT_LIMITS.URL_MAX),
              visibility: 'public' as const,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            await setDoc(profileRef, newProfile);
          }

          const existingPriv = await getDoc(privateRef);
          if (!existingPriv.exists() && user.email) {
            await setDoc(privateRef, {
              uid,
              email: clampString(user.email, BLUEPRINT_LIMITS.EMAIL_MAX, 'user@example.com'),
              language: 'ur',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `profiles/${uid}`);
        }
        setAuthUser(user);
        setAuthReady(true);
      } else {
        setAuthUser(null);
        setMyProfile(null);
        setLoadingFeed(false);
        setAuthReady(true);
      }
    });

    return () => unsub();
  }, []);

  // 2. Attach Real-Time Firestore Listeners when Authenticated
  useEffect(() => {
    if (!authReady || !authUser) return;

    const uid = sanitizeId(authUser.uid);

    // Listen to my own profile
    const unsubMyProfile = onSnapshot(
      doc(db, 'profiles', uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as UserProfileDoc;
          setMyProfile(data);
          setEditDisplayName(data.displayName);
          setEditBio(data.bio);
          setEditRegion(data.region);
          setEditAvatarUrl(data.avatarUrl);
          setEditCoverUrl(data.coverUrl);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `profiles/${uid}`)
    );

    // Listen to public posts
    const postsQuery = query(collection(db, 'posts'), where('visibility', '==', 'public'));
    const unsubPosts = onSnapshot(
      postsQuery,
      (snap) => {
        const list: PostItem[] = [];
        snap.forEach((d) => list.push(d.data() as PostItem));
        list.sort((a, b) => {
          const tA = a.createdAt?.toMillis() ?? Date.now();
          const tB = b.createdAt?.toMillis() ?? Date.now();
          return tB - tA;
        });
        setPosts(list);
        setLoadingFeed(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'posts')
    );

    // Listen to public stories
    const storiesQuery = query(collection(db, 'stories'), where('visibility', '==', 'public'));
    const unsubStories = onSnapshot(
      storiesQuery,
      (snap) => {
        const list: StoryDoc[] = [];
        snap.forEach((d) => list.push(d.data() as StoryDoc));
        list.sort((a, b) => {
          const tA = a.createdAt?.toMillis() ?? Date.now();
          const tB = b.createdAt?.toMillis() ?? Date.now();
          return tB - tA;
        });
        setStories(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'stories')
    );

    // Listen to public profiles
    const profilesQuery = query(
      collection(db, 'profiles'),
      where('visibility', '==', 'public')
    );
    const unsubProfiles = onSnapshot(
      profilesQuery,
      (snap) => {
        const list: UserProfileDoc[] = [];
        snap.forEach((d) => list.push(d.data() as UserProfileDoc));
        setProfiles(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'profiles')
    );

    // Listen to friendships where user is requester or receiver
    const sentQuery = query(
      collection(db, 'friendships'),
      where('requesterId', '==', uid)
    );
    const receivedQuery = query(
      collection(db, 'friendships'),
      where('receiverId', '==', uid)
    );

    let sentList: FriendshipDoc[] = [];
    let recList: FriendshipDoc[] = [];

    const mergeFriendships = () => {
      const map = new Map<string, FriendshipDoc>();
      [...sentList, ...recList].forEach((f) => map.set(f.friendshipId, f));
      setFriendships(Array.from(map.values()));
    };

    const unsubSent = onSnapshot(
      sentQuery,
      (snap) => {
        sentList = [];
        snap.forEach((d) => sentList.push(d.data() as FriendshipDoc));
        mergeFriendships();
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'friendships')
    );

    const unsubRec = onSnapshot(
      receivedQuery,
      (snap) => {
        recList = [];
        snap.forEach((d) => recList.push(d.data() as FriendshipDoc));
        mergeFriendships();
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'friendships')
    );

    return () => {
      unsubMyProfile();
      unsubPosts();
      unsubStories();
      unsubProfiles();
      unsubSent();
      unsubRec();
    };
  }, [authReady, authUser]);

  // 3. Seed Starter Community Posts & Stories if Database is Empty on First Sign-In
  useEffect(() => {
    if (!authUser || !myProfile || loadingFeed || seededInitial) return;
    if (posts.length === 0) {
      setSeededInitial(true);
      const seedCommunityContent = async () => {
        const uid = sanitizeId(authUser.uid);
        const starterPosts = [
          {
            postId: sanitizeId(`welcome_habib_${uid.slice(0, 6)}`),
            authorId: uid,
            authorName: 'Active Habib • پٹھان سوشل سایٹ',
            authorAvatar: avatarLeaderImg,
            content:
              'پخیر راغلے! السلام علیکم تمام دوستوں کو Active Habib - Patan Social (پٹھان سوشل سایٹ) میں خوش آمدید۔ یہ پلیٹ فارم آپ سب کو آپس میں جوڑنے، ثقافت، کھیل، شاعری اور مثبت خبروں کو شیئر کرنے کے لیے بنایا گیا ہے۔ اپنی پہلی پوسٹ اور رائے ضرور شیئر کریں!',
            mediaUrl: coverMountainImg,
            feeling: 'خوش و خرم 😊',
            category: 'culture' as const,
            visibility: 'public' as const,
          },
          {
            postId: sanitizeId(`cricket_match_${uid.slice(0, 6)}`),
            authorId: uid,
            authorName: 'Khyber & Quetta Sports Club',
            authorAvatar: avatarLeaderImg,
            content:
              'آج شام پہاڑی وادی کے خوبصورت گراؤنڈ میں شاندار ٹیپ بال کرکٹ فائنل میچ کھیلا گیا! آخری اوور میں دو چھکوں نے میچ کا پانسہ پلٹ دیا۔ آپ کی پسندیدہ ٹیم کون سی ہے؟ 🏏🔥',
            mediaUrl: postCricketImg,
            feeling: 'کرکٹ میچ دیکھ رہے ہیں 🏏',
            category: 'sports' as const,
            visibility: 'public' as const,
          },
          {
            postId: sanitizeId(`kahwa_hujra_${uid.slice(0, 6)}`),
            authorId: uid,
            authorName: 'حجرہ ادب و مہمان نوازی',
            authorAvatar: avatarLeaderImg,
            content:
              'شام کی ٹھنڈی ہوا، دوستوں کی محفل اور الائچی والا گرم سبز قہوہ! پختون ثقافت میں مہمان نوازی اور حجرے کی روایت ہماری پہچان ہے۔ \n"ملگرو سرہ د شنو چایو مجلس بيله خوند لري"',
            mediaUrl: storyKahwaImg,
            feeling: 'سبز قہوہ پی رہے ہیں 🍵',
            category: 'hujra' as const,
            visibility: 'public' as const,
          },
        ];

        try {
          for (const p of starterPosts) {
            await setDoc(doc(db, 'posts', p.postId), {
              ...p,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }

          const starterStories = [
            {
              storyId: sanitizeId(`story_kahwa_${uid.slice(0, 6)}`),
              authorId: uid,
              authorName: 'Active Habib Official',
              authorAvatar: avatarLeaderImg,
              caption: 'شام کا سبز قہوہ اور حجرہ محفل 🍵✨',
              mediaUrl: storyKahwaImg,
              themeColor: 'teal' as const,
              visibility: 'public' as const,
            },
            {
              storyId: sanitizeId(`story_swat_${uid.slice(0, 6)}`),
              authorId: uid,
              authorName: myProfile.displayName,
              authorAvatar: myProfile.avatarUrl || avatarLeaderImg,
              caption: 'وطن کے خوبصورت پہاڑ اور وادیاں 🏔️',
              mediaUrl: coverMountainImg,
              themeColor: 'emerald' as const,
              visibility: 'public' as const,
            },
          ];

          for (const s of starterStories) {
            await setDoc(doc(db, 'stories', s.storyId), {
              ...s,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'posts');
        }
      };

      seedCommunityContent();
    }
  }, [authUser, myProfile, loadingFeed, posts.length, seededInitial]);

  // Handlers
  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setAuthNotice(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthNotice(
        err instanceof Error
          ? err.message
          : 'Google sign-in was cancelled or blocked by popup settings.'
      );
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const handleToggleSavePost = (postId: string) => {
    setSavedPostIds((prev) => {
      const next = prev.includes(postId)
        ? prev.filter((id) => id !== postId)
        : [...prev, postId];
      try {
        localStorage.setItem('active_habib_saved_posts', JSON.stringify(next));
      } catch {
        // ignore storage quota
      }
      return next;
    });
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !myProfile || !postContent.trim() || publishingPost) return;
    setPublishingPost(true);

    const postId = sanitizeId(`post_${Date.now()}_${authUser.uid.slice(0, 6)}`);
    const postPath = `posts/${postId}`;

    try {
      await setDoc(doc(db, 'posts', postId), {
        postId,
        authorId: sanitizeId(authUser.uid),
        authorName: clampString(
          myProfile.displayName,
          BLUEPRINT_LIMITS.DISPLAY_NAME_MAX,
          'Member'
        ),
        authorAvatar: clampString(
          myProfile.avatarUrl || avatarLeaderImg,
          BLUEPRINT_LIMITS.URL_MAX
        ),
        content: clampString(postContent, BLUEPRINT_LIMITS.POST_CONTENT_MAX),
        mediaUrl: clampString(postMediaUrl, BLUEPRINT_LIMITS.URL_MAX),
        feeling: clampString(postFeeling, BLUEPRINT_LIMITS.FEELING_MAX),
        category: postCategory,
        visibility: 'public',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setPostContent('');
      setPostMediaUrl('');
      setPostFeeling('');
      setShowPhotoInput(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, postPath);
    } finally {
      setPublishingPost(false);
    }
  };

  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !myProfile || !storyCaption.trim() || publishingStory) return;
    setPublishingStory(true);

    const storyId = sanitizeId(`st_${Date.now()}_${authUser.uid.slice(0, 6)}`);
    const storyPath = `stories/${storyId}`;

    try {
      await setDoc(doc(db, 'stories', storyId), {
        storyId,
        authorId: sanitizeId(authUser.uid),
        authorName: clampString(
          myProfile.displayName,
          BLUEPRINT_LIMITS.DISPLAY_NAME_MAX,
          'Member'
        ),
        authorAvatar: clampString(
          myProfile.avatarUrl || avatarLeaderImg,
          BLUEPRINT_LIMITS.URL_MAX
        ),
        caption: clampString(storyCaption, BLUEPRINT_LIMITS.STORY_CAPTION_MAX),
        mediaUrl: clampString(storyMediaUrl, BLUEPRINT_LIMITS.URL_MAX),
        themeColor: storyTheme,
        visibility: 'public',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setStoryCaption('');
      setShowCreateStoryModal(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, storyPath);
    } finally {
      setPublishingStory(false);
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    if (!authUser) return;
    try {
      await deleteDoc(doc(db, 'stories', storyId));
      setActiveStoryViewer(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `stories/${storyId}`);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !myProfile || savingProfile) return;
    setSavingProfile(true);
    const uid = sanitizeId(authUser.uid);
    const profilePath = `profiles/${uid}`;

    try {
      await updateDoc(doc(db, 'profiles', uid), {
        displayName: clampString(
          editDisplayName,
          BLUEPRINT_LIMITS.DISPLAY_NAME_MAX,
          myProfile.displayName
        ),
        bio: clampString(editBio, BLUEPRINT_LIMITS.BIO_MAX),
        region: clampString(editRegion, BLUEPRINT_LIMITS.REGION_MAX),
        avatarUrl: clampString(editAvatarUrl, BLUEPRINT_LIMITS.URL_MAX),
        coverUrl: clampString(editCoverUrl, BLUEPRINT_LIMITS.URL_MAX),
        visibility: 'public',
        updatedAt: serverTimestamp(),
      });
      setShowEditProfileModal(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, profilePath);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSendFriendRequest = async (targetProfile: UserProfileDoc) => {
    if (!authUser || !myProfile || targetProfile.uid === authUser.uid) return;
    const myUid = sanitizeId(authUser.uid);
    const targetUid = sanitizeId(targetProfile.uid);
    const friendshipId = sanitizeId(`fr_${myUid.slice(0, 12)}_${targetUid.slice(0, 12)}`);
    const path = `friendships/${friendshipId}`;

    try {
      await setDoc(doc(db, 'friendships', friendshipId), {
        friendshipId,
        requesterId: myUid,
        requesterName: clampString(
          myProfile.displayName,
          BLUEPRINT_LIMITS.DISPLAY_NAME_MAX,
          'Member'
        ),
        requesterAvatar: clampString(myProfile.avatarUrl, BLUEPRINT_LIMITS.URL_MAX),
        receiverId: targetUid,
        receiverName: clampString(
          targetProfile.displayName,
          BLUEPRINT_LIMITS.DISPLAY_NAME_MAX,
          'Member'
        ),
        receiverAvatar: clampString(targetProfile.avatarUrl, BLUEPRINT_LIMITS.URL_MAX),
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  const handleRespondFriendRequest = async (
    friendshipId: string,
    newStatus: 'accepted' | 'declined'
  ) => {
    if (!authUser) return;
    const path = `friendships/${friendshipId}`;
    try {
      await updateDoc(doc(db, 'friendships', friendshipId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatMessages((prev) => [
      ...prev,
      {
        id: `m_${Date.now()}`,
        sender: 'me',
        text: userMsg,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setChatInput('');
  };

  // Filtered Posts for Feed
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      if (categoryFilter === 'saved' && !savedPostIds.includes(p.postId)) return false;
      if (
        categoryFilter !== 'all' &&
        categoryFilter !== 'saved' &&
        p.category !== categoryFilter
      ) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchContent = p.content.toLowerCase().includes(q);
        const matchAuthor = p.authorName.toLowerCase().includes(q);
        return matchContent || matchAuthor;
      }
      return true;
    });
  }, [posts, categoryFilter, savedPostIds, searchQuery]);

  const inspectedProfile = useMemo(() => {
    if (!inspectedUserId) return myProfile;
    return profiles.find((p) => p.uid === inspectedUserId) || myProfile;
  }, [inspectedUserId, profiles, myProfile]);

  // If Auth is still initializing
  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#F4F6F7] flex flex-col items-center justify-center p-6">
        <ActiveHabibLogo size="lg" className="animate-pulse" />
        <p className="mt-4 text-sm font-medium text-slate-600">
          Loading Active Habib • پٹھان سوشل سایٹ...
        </p>
      </div>
    );
  }

  // ===========================================================================
  // UNAUTHENTICATED FACEBOOK-STYLE WELCOME & SIGN-IN VIEW
  // ===========================================================================
  if (!authUser) {
    return (
      <div className="min-h-screen bg-[#F4F6F7] flex flex-col justify-between">
        {/* Top Bar Contract (3 Zones) */}
        <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between">
          <a
            href="#top"
            className="text-lg font-bold tracking-tight text-[#136168] font-display whitespace-nowrap"
          >
            Active Habib · پٹھان سوشل سایٹ
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-[#136168] transition-colors whitespace-nowrap">
              News Feed
            </a>
            <a href="#features" className="hover:text-[#136168] transition-colors whitespace-nowrap">
              Stories
            </a>
            <a href="#features" className="hover:text-[#136168] transition-colors whitespace-nowrap">
              Hujra Groups
            </a>
            <a href="#features" className="hover:text-[#136168] transition-colors whitespace-nowrap">
              Community
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <PWAInstallButton />
            <button
              type="button"
              onClick={() => setShowPlayStoreGuide(true)}
              className="px-3.5 py-2 text-xs font-semibold text-[#136168] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              پلے سٹور گائیڈ (Play Store)
            </button>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={signingIn}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#136168] hover:bg-[#0e4b51] rounded-lg transition-colors whitespace-nowrap"
            >
              {signingIn ? 'Connecting...' : 'Sign In / لاگ ان'}
            </button>
          </div>
        </header>

        {/* Main Split Hero Layout (Facebook-style Left Brand + Right Login Card) */}
        <main className="max-w-6xl w-full mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column: Exact Uploaded Icon + Value Proposition */}
          <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <ActiveHabibLogo size="xl" />
              <div className="space-y-2">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-display">
                  ACTIVE HABIB
                </h1>
                <p className="text-xl font-bold text-[#136168]">
                  Patan facbook · <span className="urdu-text">پٹھان سوشل سایٹ</span>
                </p>
                <p className="text-sm text-slate-600 max-w-md leading-relaxed">
                  فیس بک جیسا مکمل کمیونٹی سوشل نیٹ ورک — دوستوں کے ساتھ جڑیں، تصاویر اور سٹوریز شیئر کریں، اور حجرہ گروپس میں حصہ لیں۔
                </p>
              </div>
            </div>

            {/* Community Preview Image Banner */}
            <div
              id="features"
              className="w-full rounded-xl overflow-hidden border border-slate-200 bg-white"
            >
              <div className="relative h-56 w-full">
                <img
                  src={coverMountainImg}
                  alt="Pashtun mountain valley community banner"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent flex flex-col justify-end p-5 text-left">
                  <p className="text-white font-semibold text-base urdu-text">
                    پختون ثقافت، کھیل، شاعری اور بھائی چارے کا اپنا ڈیجیٹل حجرہ
                  </p>
                  <p className="text-white/80 text-xs mt-1">
                    Real-time Feed · Stories Reel · 4 Cultural Reactions (👍 ❤️ 🤝 🔥) · Hujra Groups
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Facebook-Style Sign-In Card */}
          <div className="lg:col-span-5">
            <div className="bg-white border border-slate-200 rounded-xl p-7 space-y-6">
              <div className="text-center space-y-1.5">
                <h2 className="text-xl font-bold text-slate-900 urdu-text">
                  پٹھان سوشل سایٹ میں شامل ہوں
                </h2>
                <p className="text-xs text-slate-500">
                  Sign in with your Google account to create posts, share stories, and connect with friends.
                </p>
              </div>

              {authNotice && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  {authNotice}
                </div>
              )}

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={signingIn}
                className="w-full py-3 px-4 bg-[#136168] hover:bg-[#0e4b51] text-white font-semibold text-sm rounded-lg flex items-center justify-center gap-3 transition-colors cursor-pointer whitespace-nowrap"
              >
                <LogIn className="w-5 h-5" />
                <span>
                  {signingIn
                    ? 'Signing in...'
                    : 'Continue with Google / گوگل سے لاگ ان کریں'}
                </span>
              </button>

              <div className="pt-4 border-t border-slate-100 space-y-3 text-xs text-slate-600">
                <a
                  href="/active-habib-source-code.zip"
                  download="active-habib-patan-social-code.zip"
                  className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
                >
                  <span>تمام کوڈ فائلز کمپیوٹر پر سیو کریں (Download Code .ZIP)</span>
                </a>
                <div className="flex items-center justify-between">
                  <span>پوسٹس اور تصاویر (Photo & Text Posts)</span>
                  <span className="font-semibold text-[#136168]">Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>سٹوریز ریل (24h Visual Stories)</span>
                  <span className="font-semibold text-[#136168]">Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>حجرہ گروپس اور دوست (Hujra & Friends)</span>
                  <span className="font-semibold text-[#136168]">Active</span>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Quiet Footer */}
        <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500">
          Active Habib · Patan Social (پٹھان سوشل سایٹ) · Built for Community Connection
        </footer>

        <OfflineIndicator />
        <PlayStoreGuideModal
          isOpen={showPlayStoreGuide}
          onClose={() => setShowPlayStoreGuide(false)}
        />
      </div>
    );
  }

  // ===========================================================================
  // AUTHENTICATED FACEBOOK-STYLE 3-COLUMN WORKSPACE
  // ===========================================================================
  const currentUserSummary = {
    uid: authUser.uid,
    displayName: myProfile?.displayName || authUser.displayName || 'Member',
    avatarUrl: myProfile?.avatarUrl || authUser.photoURL || avatarLeaderImg,
  };

  const pendingIncomingRequests = friendships.filter(
    (f) => f.receiverId === authUser.uid && f.status === 'pending'
  );

  const acceptedFriends = friendships.filter((f) => f.status === 'accepted');

  return (
    <div className="min-h-screen bg-[#F4F6F7] flex flex-col">
      {/* =====================================================================
          TOP BAR CONTRACT (Strictly 1 Row, 3 Zones)
          Zone 1: Brand Wordmark | Zone 2: 5 Nav Links | Zone 3: 2 Actions
         ===================================================================== */}
      <header className="sticky top-0 z-30 bg-[#136168] text-white border-b border-[#0d464b] px-4 lg:px-8 h-14 flex items-center justify-between">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#feed"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('feed');
            setInspectedUserId(null);
          }}
          className="text-base sm:text-lg font-extrabold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          ACTIVE HABIB · پٹھان سوشل
        </a>

        {/* Zone 2: 5 Clean Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <button
            type="button"
            onClick={() => {
              setActiveTab('feed');
              setInspectedUserId(null);
            }}
            className={`py-4 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'feed'
                ? 'border-[#FF6B1A] text-white font-semibold'
                : 'border-transparent text-white/80 hover:text-white'
            }`}
          >
            {lang === 'en' ? 'News Feed' : 'نیوز فیڈ (Feed)'}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stories')}
            className={`py-4 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'stories'
                ? 'border-[#FF6B1A] text-white font-semibold'
                : 'border-transparent text-white/80 hover:text-white'
            }`}
          >
            {lang === 'en' ? 'Stories' : 'سٹوریز (Stories)'}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('hujra')}
            className={`py-4 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'hujra'
                ? 'border-[#FF6B1A] text-white font-semibold'
                : 'border-transparent text-white/80 hover:text-white'
            }`}
          >
            {lang === 'en' ? 'Hujra Groups' : 'حجرہ گروپس'}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('friends')}
            className={`py-4 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'friends'
                ? 'border-[#FF6B1A] text-white font-semibold'
                : 'border-transparent text-white/80 hover:text-white'
            }`}
          >
            {lang === 'en' ? 'Friends' : 'ملگري / دوست'}
            {pendingIncomingRequests.length > 0 && (
              <span className="ml-1.5 text-[#B4F156] tabular-nums">
                ({pendingIncomingRequests.length})
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setInspectedUserId(authUser.uid);
              setActiveTab('profile');
            }}
            className={`py-4 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'profile'
                ? 'border-[#FF6B1A] text-white font-semibold'
                : 'border-transparent text-white/80 hover:text-white'
            }`}
          >
            {lang === 'en' ? 'My Profile' : 'میری پروفائل'}
          </button>
        </nav>

        {/* Zone 3: 2 Primary Actions (Language Switcher + Sign Out) */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() =>
              setLang((prev) => (prev === 'ur' ? 'ps' : prev === 'ps' ? 'en' : 'ur'))
            }
            className="px-3 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            title="Switch Language (اردو / پښتو / English)"
          >
            {lang === 'ur' ? 'زبان: اردو' : lang === 'ps' ? 'ژبه: پښتو' : 'Lang: EN'}
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            className="px-3.5 py-1.5 text-xs font-semibold bg-[#FF6B1A] hover:bg-[#e55a0d] text-white rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{lang === 'en' ? 'Sign Out' : 'باہر نکلیں'}</span>
          </button>
        </div>
      </header>

      {/* Mobile Secondary Navigation Strip (Visible only on small screens, compact) */}
      <div className="md:hidden bg-white border-b border-slate-200 px-3 py-2 flex items-center justify-around text-xs font-medium text-slate-600">
        <button
          type="button"
          onClick={() => setActiveTab('feed')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap ${
            activeTab === 'feed' ? 'bg-[#136168] text-white font-semibold' : ''
          }`}
        >
          نیوز فیڈ
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('stories')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap ${
            activeTab === 'stories' ? 'bg-[#136168] text-white font-semibold' : ''
          }`}
        >
          سٹوریز
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('hujra')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap ${
            activeTab === 'hujra' ? 'bg-[#136168] text-white font-semibold' : ''
          }`}
        >
          حجرہ
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('friends')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap ${
            activeTab === 'friends' ? 'bg-[#136168] text-white font-semibold' : ''
          }`}
        >
          دوست
        </button>
        <button
          type="button"
          onClick={() => {
            setInspectedUserId(authUser.uid);
            setActiveTab('profile');
          }}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap ${
            activeTab === 'profile' ? 'bg-[#136168] text-white font-semibold' : ''
          }`}
        >
          پروفائل
        </button>
      </div>

      {/* =====================================================================
          MAIN 1440px 3-COLUMN FACEBOOK WORKSPACE
         ===================================================================== */}
      <div className="max-w-[1400px] w-full mx-auto px-4 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* -------------------------------------------------------------------
            LEFT SIDEBAR (3 Cols on Desktop): Brand Crest + Shortcuts + Filters
           ------------------------------------------------------------------- */}
        <aside className="hidden lg:block lg:col-span-3 space-y-5">
          {/* Active Habib Brand Identity Card with the exact uploaded icon */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-5 flex flex-col items-center text-center">
            <ActiveHabibLogo size="md" />
            <h2 className="mt-3 text-base font-bold text-slate-900">
              Active Habib · Patan Social
            </h2>
            <p className="text-sm font-semibold text-[#136168] urdu-text mt-0.5">
              پٹھان سوشل سایٹ
            </p>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              اپنی کمیونٹی، ثقافت، کھیل اور دوستوں کے ساتھ جڑے رہنے کا مرکز۔
            </p>

            {/* Current User Mini Profile Row */}
            <div className="w-full mt-4 pt-4 border-t border-slate-100 flex items-center gap-3 text-left">
              <img
                src={currentUserSummary.avatarUrl}
                alt={currentUserSummary.displayName}
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full object-cover bg-[#136168] shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {currentUserSummary.displayName}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {myProfile?.region || 'Peshawar / Quetta'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditProfileModal(true)}
                className="p-1.5 text-slate-400 hover:text-[#136168] rounded-lg hover:bg-slate-100 transition-colors"
                title="Edit Profile"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Facebook-Style Left Navigation Shortcuts */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-3 space-y-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('feed');
                setCategoryFilter('all');
              }}
              className={`w-full px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                activeTab === 'feed' && categoryFilter === 'all'
                  ? 'bg-[#136168] text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>نیوز فیڈ (All News Feed)</span>
              <span className="tabular-nums opacity-80">{posts.length}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('feed');
                setCategoryFilter('culture');
              }}
              className={`w-full px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                activeTab === 'feed' && categoryFilter === 'culture'
                  ? 'bg-[#136168] text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>پختون ثقافت (Culture)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('feed');
                setCategoryFilter('sports');
              }}
              className={`w-full px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                activeTab === 'feed' && categoryFilter === 'sports'
                  ? 'bg-[#136168] text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>کرکٹ اور کھیل (Cricket & Sports)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('feed');
                setCategoryFilter('poetry');
              }}
              className={`w-full px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                activeTab === 'feed' && categoryFilter === 'poetry'
                  ? 'bg-[#136168] text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>شاعری اور ادب (Poetry)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('feed');
                setCategoryFilter('hujra');
              }}
              className={`w-full px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                activeTab === 'feed' && categoryFilter === 'hujra'
                  ? 'bg-[#136168] text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>حجرہ بیٹھک (Hujra Council)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('feed');
                setCategoryFilter('saved');
              }}
              className={`w-full px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                activeTab === 'feed' && categoryFilter === 'saved'
                  ? 'bg-[#FF6B1A] text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>محفوظ پوسٹس (Saved Posts)</span>
              <span className="tabular-nums">{savedPostIds.length}</span>
            </button>
          </div>
        </aside>

        {/* -------------------------------------------------------------------
            CENTER MAIN VIEWPORT (6 Cols on Desktop)
           ------------------------------------------------------------------- */}
        <main className="lg:col-span-6 space-y-5">
          {/* =================================================================
              TAB 1: NEWS FEED (Stories Reel + Post Composer + Filter + Feed)
             ================================================================= */}
          {activeTab === 'feed' && (
            <>
              {/* Facebook-Style Stories Reel */}
              <section aria-label="Community Stories" className="bg-white border border-slate-200/90 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-slate-900">
                    {lang === 'en' ? 'Stories Reel' : 'تازہ ترین سٹوریز (Stories)'}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowCreateStoryModal(true)}
                    className="text-xs font-semibold text-[#136168] hover:text-[#FF6B1A] transition-colors inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{lang === 'en' ? 'Add Story' : 'نئی سٹوری لگائیں'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-3 overflow-x-auto pb-1">
                  {/* Create Story Card */}
                  <button
                    type="button"
                    onClick={() => setShowCreateStoryModal(true)}
                    className="w-28 h-44 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors flex flex-col justify-between p-3 text-left shrink-0 relative group cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#FF6B1A] text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                      <Plus className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 leading-snug">
                        سٹوری بنائیں
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Create Story</p>
                    </div>
                  </button>

                  {/* Live Firestore Story Cards */}
                  {stories.map((st) => (
                    <button
                      key={st.storyId}
                      type="button"
                      onClick={() => setActiveStoryViewer(st)}
                      className={`w-28 h-44 rounded-xl overflow-hidden relative shrink-0 text-left p-3 flex flex-col justify-between bg-gradient-to-b ${
                        STORY_THEME_STYLES[st.themeColor] || STORY_THEME_STYLES.teal
                      } text-white group cursor-pointer`}
                    >
                      {st.mediaUrl && (
                        <img
                          src={st.mediaUrl}
                          alt={st.caption}
                          referrerPolicy="no-referrer"
                          className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-200"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                      <div className="relative z-10 w-8 h-8 rounded-full border-2 border-[#FF6B1A] overflow-hidden bg-[#136168] flex items-center justify-center text-xs font-bold">
                        {st.authorAvatar ? (
                          <img
                            src={st.authorAvatar}
                            alt={st.authorName}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{st.authorName.charAt(0)}</span>
                        )}
                      </div>

                      <div className="relative z-10">
                        <p className="text-[11px] font-semibold line-clamp-2 leading-tight">
                          {st.caption}
                        </p>
                        <p className="text-[10px] text-white/75 truncate mt-1">
                          {st.authorName}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              {/* Facebook-Style Post Composer ("What's on your mind?") */}
              <section className="bg-white border border-slate-200/90 rounded-xl p-5">
                <form onSubmit={handleCreatePost} className="space-y-3.5">
                  <div className="flex items-start gap-3">
                    <img
                      src={currentUserSummary.avatarUrl}
                      alt={currentUserSummary.displayName}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-full object-cover bg-[#136168] shrink-0"
                    />
                    <div className="flex-1">
                      <textarea
                        value={postContent}
                        onChange={(e) => setPostContent(e.target.value)}
                        maxLength={BLUEPRINT_LIMITS.POST_CONTENT_MAX}
                        rows={3}
                        placeholder={
                          lang === 'en'
                            ? `What's on your mind, ${currentUserSummary.displayName}?`
                            : `آج آپ کے ذہن میں کیا ہے، ${currentUserSummary.displayName}؟ (پشتو، اردو یا انگلش میں لکھیں)...`
                        }
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#136168] rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none transition-colors resize-none"
                      />
                    </div>
                  </div>

                  {/* Optional Photo & Feeling Picker Drawer */}
                  {showPhotoInput && (
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Select Community Photo Preset / تصویر منتخب کریں
                          </label>
                          <select
                            value={postMediaUrl}
                            onChange={(e) => setPostMediaUrl(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#136168]"
                          >
                            {PHOTO_PRESETS.map((preset) => (
                              <option key={preset.label} value={preset.url}>
                                {preset.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Or Paste Image URL / تصویر کا لنک
                          </label>
                          <input
                            type="url"
                            value={postMediaUrl}
                            onChange={(e) => setPostMediaUrl(e.target.value)}
                            placeholder="https://..."
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#136168]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Feeling or Activity / احساس یا سرگرمی
                          </label>
                          <select
                            value={postFeeling}
                            onChange={(e) => setPostFeeling(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#136168]"
                          >
                            {FEELING_OPTIONS.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Topic Category / موضوع
                          </label>
                          <select
                            value={postCategory}
                            onChange={(e) =>
                              setPostCategory(e.target.value as PostItem['category'])
                            }
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#136168]"
                          >
                            <option value="general">عام گفتگو (General)</option>
                            <option value="culture">پختون ثقافت (Pashtun Culture)</option>
                            <option value="sports">کرکٹ اور کھیل (Cricket & Sports)</option>
                            <option value="poetry">شاعری اور ادب (Poetry)</option>
                            <option value="hujra">حجرہ بیٹھک (Hujra Council)</option>
                            <option value="news">علاقائی خبریں (Regional News)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Composer Bottom Toolbar */}
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowPhotoInput((prev) => !prev)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <ImageIcon className="w-4 h-4 text-emerald-600" />
                        <span>تصویر / Photo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowPhotoInput((prev) => !prev)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <Smile className="w-4 h-4 text-[#FF6B1A]" />
                        <span>احساس / Feeling</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-slate-400 tabular-nums">
                        {postContent.length}/{BLUEPRINT_LIMITS.POST_CONTENT_MAX}
                      </span>
                      <button
                        type="submit"
                        disabled={!postContent.trim() || publishingPost}
                        className="px-5 py-2 bg-[#136168] hover:bg-[#0e4b51] disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                      >
                        {publishingPost
                          ? 'پوسٹ ہو رہا ہے...'
                          : lang === 'en'
                          ? 'Publish Post'
                          : 'پوسٹ شیئر کریں'}
                      </button>
                    </div>
                  </div>
                </form>
              </section>

              {/* Search & Segmented Category Filter Bar */}
              <section className="bg-white border border-slate-200/90 rounded-xl p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      lang === 'en'
                        ? 'Search posts or members...'
                        : 'پوسٹس یا دوستوں کو تلاش کریں...'
                    }
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-100 focus:bg-white border border-transparent focus:border-[#136168] rounded-lg text-xs text-slate-900 focus:outline-none transition-colors"
                  />
                </div>

                {/* Interactive Segmented Filter Controls */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
                  {(
                    [
                      { id: 'all', label: 'سب (All)' },
                      { id: 'culture', label: 'ثقافت' },
                      { id: 'sports', label: 'کرکٹ' },
                      { id: 'poetry', label: 'شاعری' },
                      { id: 'hujra', label: 'حجرہ' },
                      { id: 'saved', label: 'محفوظ' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setCategoryFilter(tab.id)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                        categoryFilter === tab.id
                          ? 'bg-white text-slate-900 shadow-sm font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </section>

              {/* Feed Stream States: Loading, Empty, or Populated */}
              {loadingFeed ? (
                <div className="space-y-4">
                  {[1, 2].map((n) => (
                    <div
                      key={n}
                      className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 animate-pulse"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-slate-200" />
                        <div className="space-y-2 flex-1">
                          <div className="h-3.5 w-36 bg-slate-200 rounded" />
                          <div className="h-2.5 w-24 bg-slate-100 rounded" />
                        </div>
                      </div>
                      <div className="h-16 bg-slate-100 rounded-lg" />
                    </div>
                  ))}
                </div>
              ) : filteredPosts.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
                  <p className="text-base font-semibold text-slate-800 urdu-text">
                    اس حصے میں ابھی کوئی پوسٹ موجود نہیں ہے
                  </p>
                  <p className="text-xs text-slate-500">
                    No posts match your current filter. Reset the filter or share a new post above!
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryFilter('all');
                      setSearchQuery('');
                    }}
                    className="px-4 py-2 bg-[#136168] text-white text-xs font-semibold rounded-lg hover:bg-[#0e4b51] transition-colors whitespace-nowrap"
                  >
                    Show All Posts / تمام پوسٹس دیکھیں
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredPosts.map((post) => (
                    <PostCard
                      key={post.postId}
                      post={post}
                      currentUser={currentUserSummary}
                      isSaved={savedPostIds.includes(post.postId)}
                      onToggleSave={handleToggleSavePost}
                      onSelectAuthor={(authorId) => {
                        setInspectedUserId(authorId);
                        setActiveTab('profile');
                      }}
                      lang={lang}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* =================================================================
              TAB 2: STORIES GALLERY VIEW
             ================================================================= */}
          {activeTab === 'stories' && (
            <section className="bg-white border border-slate-200/90 rounded-xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Active Habib Stories · پٹھان سوشل سٹوریز
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Share moments, poetry, and visual updates with the community.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateStoryModal(true)}
                  className="px-4 py-2 bg-[#FF6B1A] hover:bg-[#e55a0d] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>نئی سٹوری لگائیں</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {stories.map((st) => (
                  <button
                    key={st.storyId}
                    type="button"
                    onClick={() => setActiveStoryViewer(st)}
                    className={`h-64 rounded-xl overflow-hidden relative text-left p-4 flex flex-col justify-between bg-gradient-to-b ${
                      STORY_THEME_STYLES[st.themeColor] || STORY_THEME_STYLES.teal
                    } text-white group cursor-pointer`}
                  >
                    {st.mediaUrl && (
                      <img
                        src={st.mediaUrl}
                        alt={st.caption}
                        referrerPolicy="no-referrer"
                        className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-200"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                    <div className="relative z-10 flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full border-2 border-[#FF6B1A] overflow-hidden bg-[#136168] flex items-center justify-center text-xs font-bold shrink-0">
                        {st.authorAvatar ? (
                          <img
                            src={st.authorAvatar}
                            alt={st.authorName}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{st.authorName.charAt(0)}</span>
                        )}
                      </div>
                      <span className="text-xs font-semibold truncate">{st.authorName}</span>
                    </div>

                    <div className="relative z-10">
                      <p className="text-sm font-bold leading-snug urdu-text">{st.caption}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* =================================================================
              TAB 3: HUJRA GROUPS (Community Circles)
             ================================================================= */}
          {activeTab === 'hujra' && (
            <section className="space-y-4">
              <div className="bg-white border border-slate-200/90 rounded-xl p-5">
                <h2 className="text-lg font-bold text-slate-900">
                  Community Hujra Groups · حجرہ اور کمیونٹی گروپس
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Join specialized circles for Pashtun culture, cricket tournaments, and classic poetry.
                </p>
              </div>

              {HUJRA_GROUPS.map((grp) => {
                const isJoined = joinedGroups.includes(grp.id);
                return (
                  <div
                    key={grp.id}
                    className="bg-white border border-slate-200/90 rounded-xl overflow-hidden"
                  >
                    <div className="h-40 w-full relative">
                      <img
                        src={grp.cover}
                        alt={grp.titleEn}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-4 text-white">
                        <h3 className="text-base font-bold urdu-text">{grp.titleUr}</h3>
                        <p className="text-xs text-white/80">
                          {grp.titleEn} ·{' '}
                          <span className="tabular-nums">
                            {grp.membersCount.toLocaleString()}
                          </span>{' '}
                          members
                        </p>
                      </div>
                    </div>

                    <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <p className="text-xs text-slate-600 urdu-text leading-relaxed">
                        {grp.description}
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            setJoinedGroups((prev) =>
                              prev.includes(grp.id)
                                ? prev.filter((id) => id !== grp.id)
                                : [...prev, grp.id]
                            )
                          }
                          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                            isJoined
                              ? 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                              : 'bg-[#136168] text-white hover:bg-[#0e4b51]'
                          }`}
                        >
                          {isJoined ? '✓ شامل ہیں (Joined)' : '+ گروپ میں شامل ہوں'}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setPostCategory(grp.category);
                            setActiveTab('feed');
                          }}
                          className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#FF6B1A] text-white hover:bg-[#e55a0d] transition-colors whitespace-nowrap cursor-pointer"
                        >
                          پوسٹ کریں (Post)
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          {/* =================================================================
              TAB 4: FRIENDS & COMMUNITY DIRECTORY
             ================================================================= */}
          {activeTab === 'friends' && (
            <section className="space-y-5">
              {/* Incoming Friend Requests */}
              {pendingIncomingRequests.length > 0 && (
                <div className="bg-white border border-slate-200/90 rounded-xl p-5 space-y-3">
                  <h2 className="text-sm font-bold text-slate-900">
                    Friend Requests · دوستی کی درخواستیں ({pendingIncomingRequests.length})
                  </h2>
                  <div className="space-y-2.5">
                    {pendingIncomingRequests.map((req) => (
                      <div
                        key={req.friendshipId}
                        className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={req.requesterAvatar || avatarLeaderImg}
                            alt={req.requesterName}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-full object-cover bg-[#136168]"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {req.requesterName}
                            </p>
                            <p className="text-xs text-slate-500">Sent you a friend request</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              handleRespondFriendRequest(req.friendshipId, 'accepted')
                            }
                            className="px-3 py-1.5 bg-[#136168] text-white text-xs font-semibold rounded-lg hover:bg-[#0e4b51] whitespace-nowrap"
                          >
                            قبول کریں (Accept)
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleRespondFriendRequest(req.friendshipId, 'declined')
                            }
                            className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-300 whitespace-nowrap"
                          >
                            رد کریں
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Community Members Directory */}
              <div className="bg-white border border-slate-200/90 rounded-xl p-5 space-y-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Active Habib Community Members · کمیونٹی ممبران
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Connect with registered members across the Patan Social network.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {profiles.map((prof) => {
                    const isMe = prof.uid === authUser.uid;
                    const existingRel = friendships.find(
                      (f) =>
                        (f.requesterId === authUser.uid && f.receiverId === prof.uid) ||
                        (f.receiverId === authUser.uid && f.requesterId === prof.uid)
                    );

                    return (
                      <div
                        key={prof.uid}
                        className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={prof.avatarUrl || avatarLeaderImg}
                            alt={prof.displayName}
                            referrerPolicy="no-referrer"
                            className="w-12 h-12 rounded-full object-cover bg-[#136168] shrink-0"
                          />
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => {
                                setInspectedUserId(prof.uid);
                                setActiveTab('profile');
                              }}
                              className="text-sm font-bold text-slate-900 hover:text-[#136168] truncate block text-left"
                            >
                              {prof.displayName} {isMe ? '(You)' : ''}
                            </button>
                            <p className="text-xs text-slate-500 truncate">
                              {prof.region || 'Peshawar / Quetta'}
                            </p>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-2 urdu-text">
                          {prof.bio || 'پٹھان سوشل سایٹ رکن'}
                        </p>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setInspectedUserId(prof.uid);
                              setActiveTab('profile');
                            }}
                            className="text-xs font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap"
                          >
                            پروفائل دیکھیں
                          </button>

                          {!isMe && (
                            <>
                              {!existingRel ? (
                                <button
                                  type="button"
                                  onClick={() => handleSendFriendRequest(prof)}
                                  className="px-3 py-1.5 bg-[#136168] hover:bg-[#0e4b51] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                                >
                                  <UserPlus className="w-3.5 h-3.5" />
                                  <span>دوست بنائیں</span>
                                </button>
                              ) : existingRel.status === 'accepted' ? (
                                <span className="text-xs font-semibold text-emerald-700 inline-flex items-center gap-1">
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>دوست (Friends)</span>
                                </span>
                              ) : (
                                <span className="text-xs text-slate-500">
                                  {existingRel.status === 'pending'
                                    ? 'درخواست بھیج دی گئی'
                                    : 'Declined'}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* =================================================================
              TAB 5: FACEBOOK-STYLE USER PROFILE VIEW
             ================================================================= */}
          {activeTab === 'profile' && inspectedProfile && (
            <section className="space-y-5">
              {/* Profile Cover & Avatar Header Card */}
              <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden">
                <div className="h-48 sm:h-56 w-full relative bg-[#136168]">
                  <img
                    src={inspectedProfile.coverUrl || coverMountainImg}
                    alt="Profile cover"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                </div>

                <div className="px-6 pb-6">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 relative z-10">
                    <div className="flex items-end gap-4">
                      <img
                        src={inspectedProfile.avatarUrl || avatarLeaderImg}
                        alt={inspectedProfile.displayName}
                        referrerPolicy="no-referrer"
                        className="w-24 h-24 rounded-full border-4 border-white object-cover bg-[#136168] shadow-md"
                      />
                      <div className="pb-1">
                        <h2 className="text-xl font-bold text-slate-900">
                          {inspectedProfile.displayName}
                        </h2>
                        <p className="text-xs text-slate-500">
                          {inspectedProfile.region || 'Peshawar / Quetta'} · Active Habib Member
                        </p>
                      </div>
                    </div>

                    {inspectedProfile.uid === authUser.uid && (
                      <button
                        type="button"
                        onClick={() => setShowEditProfileModal(true)}
                        className="px-4 py-2 bg-[#136168] hover:bg-[#0e4b51] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap self-start sm:self-end cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>پروفائل تبدیل کریں (Edit Profile)</span>
                      </button>
                    )}
                  </div>

                  <p className="mt-4 text-sm text-slate-700 urdu-text leading-relaxed">
                    {inspectedProfile.bio}
                  </p>
                </div>
              </div>

              {/* User's Authored Posts */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 px-1">
                  {inspectedProfile.displayName}&apos;s Posts · پوسٹس
                </h3>
                {posts
                  .filter((p) => p.authorId === inspectedProfile.uid)
                  .map((post) => (
                    <PostCard
                      key={post.postId}
                      post={post}
                      currentUser={currentUserSummary}
                      isSaved={savedPostIds.includes(post.postId)}
                      onToggleSave={handleToggleSavePost}
                      lang={lang}
                    />
                  ))}
              </div>
            </section>
          )}
        </main>

        {/* -------------------------------------------------------------------
            RIGHT SIDEBAR (3 Cols on Desktop): Community Events & Active Hujra Chat
           ------------------------------------------------------------------- */}
        <aside className="hidden lg:block lg:col-span-3 space-y-5">
          {/* Mobile App Install & Google Play Store Guide Card */}
          <PWAInstallButton
            variant="card"
            onOpenPlayStoreGuide={() => setShowPlayStoreGuide(true)}
          />

          {/* Community Events Card */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-4 space-y-3.5">
            <h3 className="text-xs font-bold text-slate-900">
              آئندہ پروگرامز · Upcoming Events
            </h3>

            {[
              {
                id: 'evt_cricket',
                title: 'پشاور بمقابلہ کوئٹہ دوستانہ کرکٹ ٹورنامنٹ',
                date: 'This Sunday · 4:00 PM',
                location: 'Swat Valley Sports Ground',
              },
              {
                id: 'evt_mushaira',
                title: 'سالانہ پشتو و اردو مشاعرہ اور قہوہ نائٹ',
                date: 'Friday · 8:00 PM',
                location: 'Active Habib Hujra Live',
              },
            ].map((ev) => {
              const going = rsvpEvents.includes(ev.id);
              return (
                <div
                  key={ev.id}
                  className="p-3 rounded-lg bg-slate-50 border border-slate-200/60 space-y-2"
                >
                  <p className="text-xs font-bold text-slate-900 urdu-text leading-snug">
                    {ev.title}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {ev.date} · {ev.location}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setRsvpEvents((prev) =>
                        prev.includes(ev.id)
                          ? prev.filter((i) => i !== ev.id)
                          : [...prev, ev.id]
                      )
                    }
                    className={`w-full py-1.5 px-3 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      going
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-[#136168] text-white hover:bg-[#0e4b51]'
                    }`}
                  >
                    {going ? '✓ شرکت کر رہے ہیں (Going)' : 'شرکت کریں (Join Event)'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Active Hujra Contacts (Click to open Facebook-style Messenger Drawer) */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900">
                آن لائن ملگري · Hujra Messenger
              </h3>
              <span className="text-[11px] text-emerald-700 font-medium">
                Active ({acceptedFriends.length + 3})
              </span>
            </div>

            <div className="space-y-1.5">
              {[
                {
                  name: 'Habib Khan (Admin)',
                  region: 'Quetta / Chaman',
                  avatar: avatarLeaderImg,
                },
                {
                  name: 'Zarak Khan Afridi',
                  region: 'Peshawar',
                  avatar: avatarLeaderImg,
                },
                {
                  name: 'Hamza Yousafzai',
                  region: 'Swat Mingora',
                  avatar: avatarLeaderImg,
                },
              ].map((contact) => (
                <button
                  key={contact.name}
                  type="button"
                  onClick={() => setActiveChatPartner(contact)}
                  className="w-full p-2 rounded-lg hover:bg-slate-100 flex items-center justify-between gap-2.5 text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={contact.avatar}
                        alt={contact.name}
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full object-cover bg-[#136168]"
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white absolute bottom-0 right-0"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">
                        {contact.name}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">{contact.region}</p>
                    </div>
                  </div>
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* =====================================================================
          MODAL 1: CREATE STORY MODAL
         ===================================================================== */}
      {showCreateStoryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                نئی سٹوری شامل کریں · Create Story
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateStoryModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Story Caption / سٹوری کا پیغام
                </label>
                <input
                  type="text"
                  required
                  value={storyCaption}
                  onChange={(e) => setStoryCaption(e.target.value)}
                  maxLength={BLUEPRINT_LIMITS.STORY_CAPTION_MAX}
                  placeholder="آج کا خوبصورت لمحہ شیئر کریں..."
                  className="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#136168]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Background Photo / پس منظر کی تصویر
                </label>
                <select
                  value={storyMediaUrl}
                  onChange={(e) => setStoryMediaUrl(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#136168]"
                >
                  <option value={storyKahwaImg}>Traditional Green Kahwa (سبز قہوہ)</option>
                  <option value={coverMountainImg}>Mountain Valley (پہاڑی وادی)</option>
                  <option value={postCricketImg}>Cricket Match (کرکٹ میچ)</option>
                  <option value="">Solid Color Only (صرف رنگ)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Theme Color / رنگ منتخب کریں
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['teal', 'orange', 'emerald', 'slate'] as const).map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setStoryTheme(color)}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold capitalize border ${
                        storyTheme === color
                          ? 'border-slate-900 ring-2 ring-[#136168]/30'
                          : 'border-slate-200'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateStoryModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!storyCaption.trim() || publishingStory}
                  className="px-5 py-2 bg-[#FF6B1A] hover:bg-[#e55a0d] text-white text-xs font-semibold rounded-lg disabled:opacity-40 whitespace-nowrap"
                >
                  {publishingStory ? 'Sharing...' : 'Share Story / سٹوری لگائیں'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: FULLSCREEN STORY VIEWER LIGHTBOX
         ===================================================================== */}
      {activeStoryViewer && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div
            className={`relative w-full max-w-sm h-[540px] rounded-2xl overflow-hidden flex flex-col justify-between p-5 text-white bg-gradient-to-b ${
              STORY_THEME_STYLES[activeStoryViewer.themeColor] || STORY_THEME_STYLES.teal
            }`}
          >
            {activeStoryViewer.mediaUrl && (
              <img
                src={activeStoryViewer.mediaUrl}
                alt={activeStoryViewer.caption}
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/60" />

            {/* Top Bar inside Story Viewer */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src={activeStoryViewer.authorAvatar || avatarLeaderImg}
                  alt={activeStoryViewer.authorName}
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-full border-2 border-[#FF6B1A] object-cover"
                />
                <div>
                  <p className="text-xs font-bold">{activeStoryViewer.authorName}</p>
                  <p className="text-[10px] text-white/75">Active Habib Story</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {activeStoryViewer.authorId === authUser.uid && (
                  <button
                    type="button"
                    onClick={() => handleDeleteStory(activeStoryViewer.storyId)}
                    className="p-2 text-white/80 hover:text-red-400 rounded-lg"
                    title="Delete Story"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveStoryViewer(null)}
                  className="p-2 text-white/80 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Bottom Caption inside Story Viewer */}
            <div className="relative z-10 text-center space-y-3">
              <p className="text-lg font-bold urdu-text leading-relaxed">
                {activeStoryViewer.caption}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: EDIT PROFILE MODAL
         ===================================================================== */}
      {showEditProfileModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                پروفائل میں ترمیم کریں · Edit Profile
              </h3>
              <button
                type="button"
                onClick={() => setShowEditProfileModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Display Name / آپ کا نام
                </label>
                <input
                  type="text"
                  required
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  maxLength={BLUEPRINT_LIMITS.DISPLAY_NAME_MAX}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#136168]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Region or City / شہر یا علاقہ
                </label>
                <input
                  type="text"
                  value={editRegion}
                  onChange={(e) => setEditRegion(e.target.value)}
                  maxLength={BLUEPRINT_LIMITS.REGION_MAX}
                  placeholder="e.g. Peshawar, Quetta, Swat, Mardan"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#136168]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bio / مختصر تعارف
                </label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  maxLength={BLUEPRINT_LIMITS.BIO_MAX}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#136168]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile || !editDisplayName.trim()}
                  className="px-5 py-2 bg-[#136168] hover:bg-[#0e4b51] text-white text-xs font-semibold rounded-lg disabled:opacity-40 whitespace-nowrap"
                >
                  {savingProfile ? 'Saving...' : 'Save Profile / محفوظ کریں'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          FACEBOOK-STYLE FLOATING MESSENGER / HUJRA CHAT WINDOW
         ===================================================================== */}
      {activeChatPartner && (
        <div className="fixed bottom-0 right-6 z-40 w-80 bg-white border border-slate-300 rounded-t-xl shadow-xl overflow-hidden">
          <div className="bg-[#136168] text-white px-3.5 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={activeChatPartner.avatar}
                alt={activeChatPartner.name}
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-full object-cover"
              />
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">{activeChatPartner.name}</p>
                <p className="text-[10px] text-white/80 truncate">
                  {activeChatPartner.region}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveChatPartner(null)}
              className="p-1 text-white/80 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 h-56 overflow-y-auto space-y-2.5 bg-slate-50">
            {chatMessages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${
                  m.sender === 'me' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`px-3 py-2 rounded-xl max-w-[85%] text-xs urdu-text ${
                    m.sender === 'me'
                      ? 'bg-[#136168] text-white'
                      : 'bg-white border border-slate-200 text-slate-800'
                  }`}
                >
                  {m.text}
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 tabular-nums">
                  {m.time}
                </span>
              </div>
            ))}
          </div>

          <form
            onSubmit={handleSendChatMessage}
            className="p-2 bg-white border-t border-slate-200 flex items-center gap-1.5"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="پیغام لکھیں (Write a message)..."
              className="flex-1 bg-slate-100 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none"
            />
            <button
              type="submit"
              className="p-1.5 bg-[#FF6B1A] text-white rounded-lg hover:bg-[#e55a0d] transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      <OfflineIndicator />
      <PlayStoreGuideModal
        isOpen={showPlayStoreGuide}
        onClose={() => setShowPlayStoreGuide(false)}
      />
    </div>
  );
}
