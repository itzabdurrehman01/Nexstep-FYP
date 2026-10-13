import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  Heart,
  MessageCircle,
  Plus,
  Search,
  Send,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { COMMUNITY_POSTS } from '../../data/mockFullAppData.js';

const CATEGORIES = [
  ['All', 'All conversations', 'تمام گفتگو'],
  ['ECAT & Entry Tests', 'Entry tests', 'داخلہ ٹیسٹ'],
  ['Grade 8 & Matric', 'Matric & secondary school', 'میٹرک اور ثانوی تعلیم'],
  ['Scholarships', 'Scholarships', 'اسکالرشپس'],
  ['Transnational / O-A Levels', 'O & A Levels', 'او اور اے لیولز'],
  ['University Life', 'University life', 'یونیورسٹی کی زندگی'],
  ['Career Guidance', 'Career guidance', 'کیریئر رہنمائی'],
];

const categoryLabel = (key, lang) => {
  const match = CATEGORIES.find(([k]) => k === key);
  if (!match) return key;
  return lang === 'ur' ? match[2] : match[1];
};

const COPY = {
  en: {
    eyebrow: 'People who are figuring it out together',
    title: 'The NexStep community',
    description: 'Honest advice, real university experiences, and practical answers from students and alumni across Pakistan.',
    ask: 'Start a conversation',
    search: 'Search conversations, universities, or topics',
    discussions: 'active discussions',
    members: 'student voices',
    helpful: 'helpful answers',
    recent: 'Latest conversations',
    noResults: 'Nothing matched that search yet.',
    clear: 'Clear filters',
    solved: 'Answer found',
    helpfulLabel: 'helpful',
    replies: 'replies',
    justNow: 'Just now',
    modalEyebrow: 'Share the context',
    modalTitle: 'Start a conversation',
    topic: 'What would you like to ask?',
    topicPlaceholder: 'For example: Which CS universities fit my marks?',
    category: 'Choose a category',
    details: 'Add the details',
    detailsPlaceholder: 'Share your marks, goals, or anything the community should know…',
    cancel: 'Cancel',
    publish: 'Publish question',
  },
  ur: {
    eyebrow: 'وہ لوگ جو مل کر اپنا راستہ تلاش کر رہے ہیں',
    title: 'نیکسٹ اسٹیپ کمیونٹی',
    description: 'پاکستان بھر کے طلبہ اور سابق طلبہ سے سچا مشورہ، حقیقی یونیورسٹی تجربات اور مفید جواب حاصل کریں۔',
    ask: 'گفتگو شروع کریں',
    search: 'گفتگو، یونیورسٹی یا موضوع تلاش کریں',
    discussions: 'فعال گفتگوئیں',
    members: 'طلبہ کی آراء',
    helpful: 'مددگار جوابات',
    recent: 'تازہ گفتگوئیں',
    noResults: 'اس تلاش سے کوئی گفتگو نہیں ملی۔',
    clear: 'فلٹر ختم کریں',
    solved: 'جواب مل گیا',
    helpfulLabel: 'مددگار',
    replies: 'جوابات',
    justNow: 'ابھی ابھی',
    modalEyebrow: 'اپنی صورتحال بتائیں',
    modalTitle: 'گفتگو شروع کریں',
    topic: 'آپ کیا پوچھنا چاہتے ہیں؟',
    topicPlaceholder: 'مثال: میرے نمبروں کے مطابق سی ایس کی کون سی یونیورسٹیاں بہتر ہیں؟',
    category: 'زمرہ منتخب کریں',
    details: 'مزید تفصیل لکھیں',
    detailsPlaceholder: 'اپنے نمبر، مقصد اور متعلقہ معلومات شیئر کریں…',
    cancel: 'منسوخ کریں',
    publish: 'سوال شائع کریں',
  },
};

import { useAuth } from '../../context/AuthContext.jsx';
import { SampleDataNotice } from '../common/SearchableSelect.jsx';

export function CommunityTab({ profile, lang = 'en' }) {
  const copy = COPY[lang === 'ur' ? 'ur' : 'en'];
  const { apiFetch, user } = useAuth();
  const [posts, setPosts]         = useState(COMMUNITY_POSTS);
  const [dbLoaded, setDbLoaded]   = useState(false);
  const [selectedTag, setSelectedTag] = useState('All');
  const [query, setQuery]         = useState('');
  const [showAskModal, setShowAskModal] = useState(false);
  const [newTitle, setNewTitle]   = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTag, setNewTag]       = useState('ECAT & Entry Tests');
  const [submitting, setSubmitting] = useState(false);

  // Load posts from DB on mount + on tag change
  const loadPosts = useCallback(async (tag) => {
    try {
      const params = new URLSearchParams({ limit: '30' });
      if (tag && tag !== 'All') params.set('category', tag);
      const res = await fetch(`/api/forum/posts?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (data.data?.length > 0) {
          const dbPosts = data.data.map(p => ({
            id:           p.id,
            author:       p.author_name || 'NexStep Student',
            avatar:       (p.author_name || 'N')[0],
            timeAgo:      new Date(p.created_at).toLocaleDateString('en-PK', { month:'short', day:'numeric', year:'2-digit' }),
            category:     p.category,
            title:        p.title,
            content:      p.body,
            likes:        p.vote_count || 0,
            commentsCount: p.reply_count || 0,
            solved:       p.is_solved || false,
            _dbId:        p.id,
          }));
          setPosts(dbPosts);
          setDbLoaded(true);
        }
      }
    } catch { /* fall back to mock posts */ }
  }, []);

  useEffect(() => { loadPosts(selectedTag); }, [selectedTag]);

  const visiblePosts = useMemo(() => {
    const term = query.trim().toLowerCase();
    return posts.filter((post) => {
      const categoryMatch = selectedTag === 'All' || post.category === selectedTag;
      const searchMatch = !term || [post.title, post.content, post.author, post.category, ...(post.tags || [])]
        .join(' ').toLowerCase().includes(term);
      return categoryMatch && searchMatch;
    });
  }, [posts, query, selectedTag]);

  const handleLike = async (id) => {
    setPosts((current) => current.map((post) => (
      post.id === id ? { ...post, likes: post.likes + 1 } : post
    )));
    // Persist vote to backend if it's a DB post
    if (user) {
      apiFetch(`/api/forum/posts/${id}/vote`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ value: 1 }) }).catch(()=>{});
    }
  };

  const handleCreatePost = async (event) => {
    event.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    setSubmitting(true);
    try {
      // Try DB first (requires auth)
      if (user) {
        const res = await apiFetch('/api/forum/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle.trim(), body: newContent.trim(), category: newTag }),
        });
        if (res.ok) {
          await loadPosts(selectedTag);
          setShowAskModal(false);
          setNewTitle(''); setNewContent('');
          return;
        }
      }
      // Fallback: add locally
      const displayName = (
        profile?.name?.trim() ||
        user?.name?.trim() ||
        (user?.firstName && `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`.trim()) ||
        'NexStep Student'
      );
      setPosts((current) => [{
        id: `p-${Date.now()}`,
        author: displayName,
        avatar: displayName[0],
        timeAgo: copy.justNow,
        category: newTag,
        title: newTitle.trim(),
        content: newContent.trim(),
        likes: 0,
        commentsCount: 0,
        solved: false,
      tags: [newTag, 'NexStep Community'],
    }, ...current]);
    setNewTitle('');
    setNewContent('');
    setShowAskModal(false);
    } finally { setSubmitting(false); }
  };

  return (
    <div className="community-workspace space-y-6 pb-8">
      <SampleDataNotice lang={lang} />
      <motion.section
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="community-hero relative overflow-hidden rounded-2xl border border-emerald-400/20 ns-hero px-5 py-7 text-white shadow-2xl sm:px-8 sm:py-9"
      >
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-emerald-400/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/4 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-emerald-300">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-400/15"><Users className="h-4 w-4" /></span>
              {copy.eyebrow}
            </div>
            <h1 className="text-3xl font-black tracking-[-0.055em] text-white sm:text-5xl">{copy.title}</h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">{copy.description}</p>
          </div>
          <button onClick={() => setShowAskModal(true)} className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-extrabold text-slate-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-300">
            <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
            {copy.ask}
          </button>
        </div>
        <div className="relative mt-8 grid grid-cols-1 gap-2 border-t border-white/10 pt-5 sm:max-w-md sm:gap-5">
          {[[posts.length, copy.discussions]].map(([value, label]) => (
            <div key={label} className="min-w-0"><b className="block text-lg font-black text-white sm:text-xl">{value}</b><span className="block text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</span></div>
          ))}
        </div>
      </motion.section>

      <section className="community-toolbar rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-3 shadow-sm backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/85 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-slate-500 transition focus-within:border-emerald-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-400 dark:focus-within:bg-slate-950">
            <Search className="h-4 w-4 shrink-0" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.search} className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500" />
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1 lg:max-w-[52%] lg:pb-0">
            {CATEGORIES.map(([key, english, urdu]) => {
              const active = selectedTag === key;
              return <button key={key} onClick={() => setSelectedTag(key)} className={`shrink-0 rounded-xl px-3 py-2 text-xs font-extrabold transition ${active ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-emerald-500/15 dark:hover:text-emerald-300'}`}>{lang === 'ur' ? urdu : english}</button>;
            })}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3 px-1">
          <h2 className="text-lg font-black tracking-[-0.035em] text-slate-900 dark:text-white">{copy.recent}</h2>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{visiblePosts.length} {copy.discussions}</span>
        </div>
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {visiblePosts.map((post, index) => (
              <motion.article key={post.id} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.32, delay: Math.min(index * 0.06, 0.24) }} className="group rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg dark:border-slate-700/80 dark:bg-slate-900/90 dark:hover:border-emerald-500/50 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-300 text-sm font-black text-slate-950 shadow-inner">{post.avatar}</span>
                    <div className="min-w-0"><h3 className="truncate text-xs font-extrabold text-slate-800 dark:text-slate-100">{post.author}</h3><p className="mt-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{post.timeAgo} <span className="px-1">•</span> {categoryLabel(post.category, lang)}</p></div>
                  </div>
                  {post.solved && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-extrabold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{copy.solved}</span></span>}
                </div>
                <h3 className="mt-5 text-base font-black tracking-[-0.025em] text-slate-900 dark:text-white sm:text-lg">{post.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{post.content}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">{post.tags?.map((tag) => <span key={tag} className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">#{categoryLabel(tag, lang)}</span>)}</div>
                <div className="mt-5 flex items-center gap-5 border-t border-slate-100 pt-3.5 dark:border-slate-800">
                  <button onClick={() => handleLike(post.id)} className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-500 transition hover:text-rose-500 dark:text-slate-400"><Heart className="h-4 w-4" /> {post.likes} {copy.helpfulLabel}</button>
                  <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-500 dark:text-slate-400"><MessageCircle className="h-4 w-4" /> {post.commentsCount} {copy.replies}</span>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
          {!visiblePosts.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/70"><Sparkles className="mx-auto h-6 w-6 text-emerald-500" /><p className="mt-3 font-bold text-slate-700 dark:text-slate-200">{copy.noResults}</p><button onClick={() => { setSelectedTag('All'); setQuery(''); }} className="mt-4 text-xs font-extrabold text-emerald-600 hover:text-emerald-500">{copy.clear}</button></div>}
        </div>
      </section>

      <AnimatePresence>
        {showAskModal && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" onMouseDown={() => setShowAskModal(false)}>
          <motion.div initial={{ opacity: 0, y: 22, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }} transition={{ type: 'spring', stiffness: 280, damping: 25 }} className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:p-7" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">{copy.modalEyebrow}</p><h3 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-900 dark:text-white">{copy.modalTitle}</h3></div><button onClick={() => setShowAskModal(false)} aria-label={copy.cancel} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"><X className="h-5 w-5" /></button></div>
            <form onSubmit={handleCreatePost} className="mt-6 space-y-4">
              <label className="block"><span className="mb-1.5 block text-xs font-extrabold text-slate-700 dark:text-slate-200">{copy.topic}</span><input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder={copy.topicPlaceholder} required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500" /></label>
              <label className="block"><span className="mb-1.5 block text-xs font-extrabold text-slate-700 dark:text-slate-200">{copy.category}</span><select value={newTag} onChange={(event) => setNewTag(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-medium text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white">{CATEGORIES.slice(1).map(([key]) => <option key={key} value={key}>{categoryLabel(key, lang)}</option>)}</select></label>
              <label className="block"><span className="mb-1.5 block text-xs font-extrabold text-slate-700 dark:text-slate-200">{copy.details}</span><textarea rows="5" value={newContent} onChange={(event) => setNewContent(event.target.value)} placeholder={copy.detailsPlaceholder} required className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500" /></label>
              <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setShowAskModal(false)} className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-extrabold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">{copy.cancel}</button><button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-extrabold text-white shadow-md hover:bg-emerald-400"><Send className="h-3.5 w-3.5" />{copy.publish}</button></div>
            </form>
          </motion.div>
        </motion.div>}
      </AnimatePresence>
    </div>
  );
}
