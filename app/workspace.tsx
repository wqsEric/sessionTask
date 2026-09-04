'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Bell, BriefcaseBusiness, CheckCircle2, ChevronRight, Clock3, HardHat, Inbox, MapPin, MessageCircle, RefreshCw, Search, ShieldCheck, SlidersHorizontal, UserRound, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ENGAGEMENTS, TRADES } from '@/lib/listings';

type Listing = { id: string; kind: 'hiring' | 'available'; trade: string; title: string; city: string; district: string; machineType?: string | null; engagement: string; startDate: string; durationText: string; payText: string; accommodation: string; description: string; status: string; verification: 'self_reported' | 'reviewed'; expiresAt: string; createdAt: string; contactName?: string; contactPhone?: string };
type Filters = { kind: string; trade: string; city: string; q: string };
type ContactRequest = { id: string; direction: 'incoming' | 'outgoing'; listingId: string; listingTitle: string; message: string; status: 'pending' | 'accepted' | 'declined'; createdAt: string; canChat: boolean };
type ChatMessage = { id: string; fromMe: boolean; body: string; createdAt: string };
const emptyFilters: Filters = { kind: '', trade: '', city: '', q: '' };
const initialForm = { kind: 'hiring', trade: '挖机司机', title: '', city: '', district: '', locationDetail: '', machineType: '', engagement: '短期', startDate: '', durationText: '', payText: '', accommodation: '不包吃住', description: '', contactName: '', contactPhone: '', expiryDays: '2' };

function Field({ label, required = true, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-bold text-foreground/80"><span>{label}{required && <em className="ml-1 not-italic text-orange-600">*</em>}</span>{children}</label>;
}

function SelectField(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-3 focus:ring-primary/10" />;
}

export function Workspace({ user, signInHref }: { user: { displayName: string } | null; signInHref: string }) {
  const [listings, setListings] = useState<Listing[]>([]); const [myListings, setMyListings] = useState<Listing[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters); const [applied, setApplied] = useState<Filters>(emptyFilters);
  const [loading, setLoading] = useState(true); const [notice, setNotice] = useState(''); const [error, setError] = useState('');
  const [tab, setTab] = useState<'feed' | 'inbox' | 'mine'>('feed'); const [publishOpen, setPublishOpen] = useState(false); const [detail, setDetail] = useState<Listing | null>(null);
  const [form, setForm] = useState(initialForm); const [saving, setSaving] = useState(false); const [contactMessage, setContactMessage] = useState('我想进一步了解这条信息，请通过平台与我联系。');
  const [requests, setRequests] = useState<ContactRequest[]>([]); const [selectedRequest, setSelectedRequest] = useState<ContactRequest | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]); const [chatBody, setChatBody] = useState('');

  const loadListings = useCallback(async () => {
    setLoading(true); setError('');
    const params = new URLSearchParams(); Object.entries(applied).forEach(([k, v]) => v && params.set(k, v));
    try { const response = await fetch(`/api/listings?${params}`); const data = await response.json(); if (!response.ok) throw new Error(data.error); setListings(data.listings); }
    catch (e) { setError(e instanceof Error ? e.message : '信息加载失败'); } finally { setLoading(false); }
  }, [applied]);

  const loadMine = useCallback(async () => {
    if (!user) return;
    try { const response = await fetch('/api/my-listings'); const data = await response.json(); if (!response.ok) throw new Error(data.error); setMyListings(data.listings); }
    catch (e) { setError(e instanceof Error ? e.message : '我的发布加载失败'); }
  }, [user]);

  const loadInbox = useCallback(async () => {
    if (!user) return;
    try { const response = await fetch('/api/contact-requests/inbox'); const data = await response.json(); if (!response.ok) throw new Error(data.error); setRequests(data.requests); }
    catch (e) { setError(e instanceof Error ? e.message : '消息加载失败'); }
  }, [user]);

  useEffect(() => { void loadListings(); }, [loadListings]);
  useEffect(() => { if (tab === 'mine') void loadMine(); }, [tab, loadMine]);
  useEffect(() => { if (tab === 'inbox') void loadInbox(); }, [tab, loadInbox]);

  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool?: (tool: unknown, options?: { signal?: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return; const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({ name: 'search_local_work_listings', title: '搜索附近用工信息', description: '按信息类型、工种、城市和关键词筛选当前页面中的有效找人或找活信息。', inputSchema: { type: 'object', properties: { kind: { type: 'string', enum: ['', 'hiring', 'available'] }, trade: { type: 'string' }, city: { type: 'string' }, query: { type: 'string' } }, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: async (input: unknown) => { const value = input as { kind?: string; trade?: string; city?: string; query?: string }; const next = { kind: value.kind ?? '', trade: value.trade ?? '', city: value.city ?? '', q: value.query ?? '' }; setFilters(next); setApplied(next); setTab('feed'); return { applied: next }; } }, { signal: lifecycle.signal })).catch(() => undefined);
    void Promise.resolve(context.registerTool({ name: 'start_work_listing', title: '开始发布用工信息', description: '打开发布表单并选择工地找人或工人找活；只准备表单，不会自动发布。', inputSchema: { type: 'object', properties: { kind: { type: 'string', enum: ['hiring', 'available'] } }, required: ['kind'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: async (input: unknown) => { const kind = (input as { kind: 'hiring' | 'available' }).kind; setForm((old) => ({ ...old, kind })); setPublishOpen(true); return { staged: true, kind }; } }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  const stats = useMemo(() => ({ hiring: listings.filter((x) => x.kind === 'hiring').length, available: listings.filter((x) => x.kind === 'available').length }), [listings]);
  const updateForm = (key: string, value: string) => setForm((old) => ({ ...old, [key]: value }));

  async function submitListing(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError('');
    try { const response = await fetch('/api/listings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...form, expiryDays: Number(form.expiryDays) }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setPublishOpen(false); setForm(initialForm); setNotice('发布成功：信息标记为“用户自报”，到期后自动下架。'); setApplied(emptyFilters); await loadListings(); }
    catch (e) { setError(e instanceof Error ? e.message : '发布失败'); } finally { setSaving(false); }
  }

  async function requestContact() {
    if (!detail) return; setSaving(true);
    try { const response = await fetch('/api/contact-requests', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ listingId: detail.id, message: contactMessage }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setNotice(data.duplicate ? '你已经申请过联系，请等待发布者处理。' : '联系申请已提交，平台不会直接公开双方号码。'); setDetail(null); }
    catch (e) { setError(e instanceof Error ? e.message : '申请失败'); } finally { setSaving(false); }
  }

  async function reportListing() {
    if (!detail) return; const reason = window.prompt('请说明举报原因（虚假、过期、骚扰等）'); if (!reason) return;
    const response = await fetch('/api/reports', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ listingId: detail.id, reason }) }); const data = await response.json(); if (response.ok) { setNotice('举报已收到，管理员核实前不会自动判定信息虚假。'); setDetail(null); } else setError(data.error);
  }

  async function changeStatus(id: string, status: string) {
    const response = await fetch(`/api/listings/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status }) }); const data = await response.json(); if (response.ok) { setNotice('状态已更新'); await loadMine(); await loadListings(); } else setError(data.error);
  }

  async function handleRequest(id: string, status: 'accepted' | 'declined') {
    const response = await fetch(`/api/contact-requests/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status }) }); const data = await response.json();
    if (response.ok) { setNotice(status === 'accepted' ? '已同意，可以在平台内沟通。' : '已拒绝联系申请。'); await loadInbox(); } else setError(data.error);
  }

  async function openChat(request: ContactRequest) {
    setSelectedRequest(request); setChatMessages([]);
    const response = await fetch(`/api/messages?requestId=${encodeURIComponent(request.id)}`); const data = await response.json();
    if (response.ok) setChatMessages(data.messages); else setError(data.error);
  }

  async function sendChat() {
    if (!selectedRequest || !chatBody.trim()) return; setSaving(true);
    try { const response = await fetch('/api/messages', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ requestId: selectedRequest.id, body: chatBody.trim() }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setChatBody(''); await openChat(selectedRequest); }
    catch (e) { setError(e instanceof Error ? e.message : '消息发送失败'); } finally { setSaving(false); }
  }

  return (
    <main className="min-h-screen bg-background pb-28 text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/92 backdrop-blur-xl"><div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground"><HardHat className="size-5" /></div><div><p className="text-[11px] font-bold tracking-[0.18em] text-muted-foreground">区域用工信息</p><h1 className="text-lg font-black">工友直连</h1></div></div><div className="flex items-center gap-1"><Button variant="ghost" size="icon" aria-label="刷新" onClick={() => void loadListings()}><RefreshCw /></Button><Button variant="ghost" size="icon" aria-label="通知"><Bell /></Button></div></div></header>

      {notice && <div className="mx-auto mt-3 flex max-w-5xl items-center gap-2 px-4 text-sm text-emerald-700"><CheckCircle2 className="size-4" />{notice}<button className="ml-auto" onClick={() => setNotice('')}>关闭</button></div>}
      {error && <div className="mx-auto mt-3 flex max-w-5xl items-center gap-2 px-4 text-sm text-red-700"><AlertTriangle className="size-4" />{error}<button className="ml-auto" onClick={() => setError('')}>关闭</button></div>}

      {tab === 'feed' ? <>
        <section className="border-b border-border/60 bg-[linear-gradient(145deg,#132c37_0%,#193e49_70%,#255763_100%)] text-white"><div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-9"><p className="flex items-center gap-1.5 text-sm text-white/70"><MapPin className="size-4 text-amber-400" />按城市与区县筛选有效信息</p><h2 className="mt-2 text-2xl font-black sm:text-3xl">附近有活，及时看见</h2><p className="mt-2 text-sm leading-6 text-white/66">只展示未过期、状态为招募中的信息；联系方式不公开。</p><form className="mt-5 grid gap-2 rounded-2xl bg-white p-2 shadow-xl sm:grid-cols-[1fr_140px_140px_auto]" onSubmit={(e) => { e.preventDefault(); setApplied(filters); }}><div className="flex items-center gap-2 px-2 text-slate-500"><Search className="size-4" /><input value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="工种、机型或关键词" /></div><input value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })} className="h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-800 outline-none" placeholder="城市" /><select value={filters.trade} onChange={(e) => setFilters({ ...filters, trade: e.target.value })} className="h-10 rounded-xl border border-slate-200 px-2 text-sm text-slate-800 outline-none"><option value="">全部工种</option>{TRADES.map((x) => <option key={x}>{x}</option>)}</select><Button className="h-10 bg-amber-400 px-5 font-bold text-slate-950 hover:bg-amber-300">搜索</Button></form></div></section>
        <div className="mx-auto max-w-5xl px-4 sm:px-6"><section className="grid grid-cols-3 gap-2 py-5">{[['', '全部信息', listings.length, BriefcaseBusiness], ['hiring', '工地找人', stats.hiring, HardHat], ['available', '工人找活', stats.available, Users]].map(([value, label, count, Icon]) => <button key={String(label)} onClick={() => { const next = { ...filters, kind: String(value) }; setFilters(next); setApplied(next); }} className={`quick-card ${applied.kind === value ? 'quick-card-active' : ''}`}><Icon className="size-5" /><span className="mt-2 text-sm font-bold">{String(label)}</span><span className="mt-0.5 text-[11px] opacity-60">{Number(count)} 条有效</span></button>)}</section><div className="mb-3 flex items-end justify-between"><div><p className="text-xs font-bold tracking-widest text-primary">实时信息</p><h2 className="mt-1 text-xl font-black">区域动态</h2></div><span className="flex items-center gap-1 text-xs text-muted-foreground"><SlidersHorizontal className="size-3.5" />最多显示100条</span></div><ListingList listings={listings} loading={loading} onOpen={setDetail} /><aside className="mt-5 flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950"><ShieldCheck className="mt-0.5 size-5 shrink-0" /><div><p className="text-sm font-bold">隐私与真实性</p><p className="mt-1 text-xs leading-5 text-emerald-900/70">公开列表不返回联系人、手机号、精确工地地址或账号标识。“用户自报”只代表发布者填写，未经平台人工核验。</p></div></aside></div>
      </> : tab === 'inbox' ? <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6"><div className="mb-5"><p className="text-xs font-bold tracking-widest text-primary">站内沟通</p><h2 className="mt-1 text-2xl font-black">联系申请</h2><p className="mt-2 text-sm text-muted-foreground">同意申请后双方才能发站内消息，手机号和精确地址仍不公开。</p></div>{!user ? <div className="empty-panel"><ShieldCheck className="size-8" /><h3>登录后查看消息</h3><p>身份验证用于保护双方信息。</p><a href={signInHref} target="_top"><Button>登录</Button></a></div> : requests.length ? <div className="space-y-3">{requests.map((request) => <article key={request.id} className="job-card"><div className="flex items-start justify-between gap-3"><div><Badge variant="outline">{request.direction === 'incoming' ? '收到的申请' : '我发出的申请'}</Badge><h3 className="mt-3 font-black">{request.listingTitle}</h3></div><Badge>{({ pending: '待处理', accepted: '已同意', declined: '已拒绝' } as Record<string, string>)[request.status]}</Badge></div><p className="mt-3 rounded-xl bg-muted/60 p-3 text-sm leading-6">{request.message}</p><div className="mt-3 flex justify-end gap-2">{request.direction === 'incoming' && request.status === 'pending' && <><Button size="sm" variant="outline" onClick={() => void handleRequest(request.id, 'declined')}>拒绝</Button><Button size="sm" onClick={() => void handleRequest(request.id, 'accepted')}>同意沟通</Button></>}{request.canChat && <Button size="sm" onClick={() => void openChat(request)}><MessageCircle />进入沟通</Button>}</div></article>)}</div> : <div className="empty-panel"><MessageCircle className="size-8" /><h3>还没有联系申请</h3><p>从信息详情发起申请，或等待别人联系你。</p></div>}</div> : <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold tracking-widest text-primary">个人中心</p><h2 className="mt-1 text-2xl font-black">我的发布</h2></div><div className="flex items-center gap-2 text-sm text-muted-foreground"><UserRound className="size-4" />{user?.displayName ?? '未登录'}</div></div>{!user ? <div className="empty-panel"><ShieldCheck className="size-8" /><h3>登录后管理信息</h3><p>发布、更新状态和联系方式都需要身份验证。</p><a href={signInHref} target="_top"><Button>登录</Button></a></div> : myListings.length ? <div className="space-y-3">{myListings.map((item) => <article key={item.id} className="job-card"><div className="flex justify-between gap-2"><Badge>{item.kind === 'hiring' ? '工地找人' : '工人找活'}</Badge><Badge variant="outline">{({ active: '招募中', contacting: '沟通中', filled: '已招满/找到', closed: '已关闭' } as Record<string, string>)[item.status]}</Badge></div><h3 className="mt-3 font-black">{item.title}</h3><p className="mt-1 text-sm text-muted-foreground">{item.city} · {item.district} · {item.contactPhone}</p><div className="mt-3 flex flex-wrap gap-2">{item.status !== 'contacting' && <Button size="sm" variant="outline" onClick={() => void changeStatus(item.id, 'contacting')}>设为沟通中</Button>}{item.status !== 'filled' && <Button size="sm" variant="outline" onClick={() => void changeStatus(item.id, 'filled')}>已招满/已找到</Button>}{item.status !== 'closed' && <Button size="sm" variant="destructive" onClick={() => void changeStatus(item.id, 'closed')}>关闭</Button>}</div></article>)}</div> : <div className="empty-panel"><Inbox className="size-8" /><h3>还没有发布信息</h3><p>发布后可以在这里更新招募状态。</p><Button onClick={() => setPublishOpen(true)}>立即发布</Button></div>}</div>}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/96 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur-xl"><div className="mx-auto grid max-w-lg grid-cols-4 px-3"><button className={`bottom-link ${tab === 'feed' ? 'bottom-link-active' : ''}`} onClick={() => setTab('feed')}><BriefcaseBusiness /><span>信息</span></button><button onClick={() => user ? setPublishOpen(true) : window.location.assign(signInHref)} className="mx-auto -mt-7 grid size-16 place-items-center rounded-full border-[5px] border-background bg-amber-400 text-slate-950 shadow-lg" aria-label="发布信息"><span className="text-3xl font-light">＋</span></button><button className={`bottom-link ${tab === 'inbox' ? 'bottom-link-active' : ''}`} onClick={() => setTab('inbox')}><MessageCircle /><span>消息</span></button><button className={`bottom-link ${tab === 'mine' ? 'bottom-link-active' : ''}`} onClick={() => setTab('mine')}><UserRound /><span>我的</span></button></div></nav>

      <Dialog open={publishOpen} onOpenChange={setPublishOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>发布用工信息</DialogTitle><DialogDescription>公开页面不会显示联系人、电话和精确地址。带 * 的项目用于保持信息完整。</DialogDescription></DialogHeader><form id="publish-form" className="grid gap-4" onSubmit={submitListing}><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => updateForm('kind', 'hiring')} className={`choice-button ${form.kind === 'hiring' ? 'choice-button-active' : ''}`}>工地找人</button><button type="button" onClick={() => updateForm('kind', 'available')} className={`choice-button ${form.kind === 'available' ? 'choice-button-active' : ''}`}>工人找活</button></div><div className="grid gap-4 sm:grid-cols-2"><Field label="工种"><SelectField value={form.trade} onChange={(e) => updateForm('trade', e.target.value)}>{TRADES.map((x) => <option key={x}>{x}</option>)}</SelectField></Field><Field label="用工类型"><SelectField value={form.engagement} onChange={(e) => updateForm('engagement', e.target.value)}>{ENGAGEMENTS.map((x) => <option key={x}>{x}</option>)}</SelectField></Field></div><Field label="标题"><Input value={form.title} maxLength={60} onChange={(e) => updateForm('title', e.target.value)} placeholder={form.kind === 'hiring' ? '例如：急招小挖司机临时替班' : '例如：挖机司机找长期工作'} /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="城市"><Input value={form.city} onChange={(e) => updateForm('city', e.target.value)} placeholder="例如：成都" /></Field><Field label="区县"><Input value={form.district} onChange={(e) => updateForm('district', e.target.value)} placeholder="例如：双流区" /></Field></div><Field label="精确位置" required={false}><Input value={form.locationDetail} onChange={(e) => updateForm('locationDetail', e.target.value)} placeholder="仅平台保存，不公开展示" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="机型/设备" required={false}><Input value={form.machineType} onChange={(e) => updateForm('machineType', e.target.value)} placeholder="例如：60小挖、正手" /></Field><Field label="开始时间"><Input type="date" value={form.startDate} onChange={(e) => updateForm('startDate', e.target.value)} /></Field></div><div className="grid gap-4 sm:grid-cols-2"><Field label="预计时长"><Input value={form.durationText} onChange={(e) => updateForm('durationText', e.target.value)} placeholder="例如：3天、长期" /></Field><Field label="薪资/结算"><Input value={form.payText} onChange={(e) => updateForm('payText', e.target.value)} placeholder="例如：面议、日结" /></Field></div><div className="grid gap-4 sm:grid-cols-2"><Field label="食宿"><SelectField value={form.accommodation} onChange={(e) => updateForm('accommodation', e.target.value)}><option>不包吃住</option><option>包吃</option><option>包住</option><option>包吃住</option></SelectField></Field><Field label="有效期"><SelectField value={form.expiryDays} onChange={(e) => updateForm('expiryDays', e.target.value)}><option value="1">24小时</option><option value="2">48小时</option><option value="7">7天</option><option value="30">30天</option></SelectField></Field></div><Field label="详细说明"><Textarea value={form.description} maxLength={500} onChange={(e) => updateForm('description', e.target.value)} placeholder="说明经验要求、现场情况和注意事项" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="联系人"><Input value={form.contactName} onChange={(e) => updateForm('contactName', e.target.value)} /></Field><Field label="联系电话"><Input inputMode="tel" value={form.contactPhone} onChange={(e) => updateForm('contactPhone', e.target.value)} /></Field></div></form><DialogFooter><Button form="publish-form" disabled={saving} className="h-11">{saving ? '正在发布…' : '确认发布'}</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}><DialogContent className="sm:max-w-lg">{detail && <><DialogHeader><div className="flex gap-2"><Badge>{detail.kind === 'hiring' ? '工地找人' : '工人找活'}</Badge><Badge variant="outline">{detail.verification === 'reviewed' ? '平台已核验' : '用户自报'}</Badge></div><DialogTitle className="pt-2 text-xl">{detail.title}</DialogTitle><DialogDescription>{detail.city} · {detail.district} · {detail.trade}</DialogDescription></DialogHeader><dl className="grid grid-cols-2 gap-3 rounded-xl bg-muted/55 p-3 text-sm"><div><dt className="text-muted-foreground">开始时间</dt><dd className="mt-1 font-bold">{detail.startDate}</dd></div><div><dt className="text-muted-foreground">期限</dt><dd className="mt-1 font-bold">{detail.durationText}</dd></div><div><dt className="text-muted-foreground">薪资</dt><dd className="mt-1 font-bold">{detail.payText}</dd></div><div><dt className="text-muted-foreground">食宿</dt><dd className="mt-1 font-bold">{detail.accommodation}</dd></div></dl><p className="text-sm leading-6">{detail.description}</p><Textarea value={contactMessage} onChange={(e) => setContactMessage(e.target.value)} maxLength={200} aria-label="联系申请留言" /><div className="flex justify-between"><Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => void reportListing()}>举报信息</Button><Button onClick={() => void requestContact()} disabled={saving}><MessageCircle />申请联系</Button></div><p className="text-xs leading-5 text-muted-foreground">申请只会通知发布者；对方同意后，双方可在平台内发消息，号码仍不公开。</p></>}</DialogContent></Dialog>

      <Dialog open={Boolean(selectedRequest)} onOpenChange={(open) => !open && setSelectedRequest(null)}><DialogContent className="sm:max-w-lg">{selectedRequest && <><DialogHeader><DialogTitle>站内沟通</DialogTitle><DialogDescription>{selectedRequest.listingTitle} · 不公开手机号</DialogDescription></DialogHeader><div className="max-h-72 space-y-2 overflow-y-auto rounded-xl bg-muted/45 p-3">{chatMessages.length ? chatMessages.map((message) => <div key={message.id} className={`flex ${message.fromMe ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-6 ${message.fromMe ? 'bg-primary text-primary-foreground' : 'bg-background shadow-sm'}`}>{message.body}</div></div>) : <p className="py-8 text-center text-sm text-muted-foreground">还没有消息，先打个招呼吧。</p>}</div><div className="flex gap-2"><Input value={chatBody} maxLength={500} onChange={(e) => setChatBody(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void sendChat(); } }} placeholder="输入沟通内容" /><Button onClick={() => void sendChat()} disabled={saving || !chatBody.trim()}>发送</Button></div></>}</DialogContent></Dialog>
    </main>
  );
}

function ListingList({ listings, loading, onOpen }: { listings: Listing[]; loading: boolean; onOpen: (listing: Listing) => void }) {
  if (loading) return <div className="empty-panel"><RefreshCw className="size-7 animate-spin" /><p>正在读取有效信息…</p></div>;
  if (!listings.length) return <div className="empty-panel"><Inbox className="size-8" /><h3>这个区域暂时没有有效信息</h3><p>调整筛选条件，或发布第一条真实需求。</p></div>;
  return <div className="space-y-3">{listings.map((job) => <article key={job.id} className="job-card"><div className="flex items-start justify-between gap-3"><div className="flex gap-2"><Badge className={job.kind === 'hiring' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}>{job.kind === 'hiring' ? '工地找人' : '工人找活'}</Badge><Badge variant="outline">{job.verification === 'reviewed' ? '已核验' : '用户自报'}</Badge></div><span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="size-3.5" />{new Date(job.createdAt).toLocaleDateString('zh-CN')}</span></div><h3 className="mt-3 text-[17px] font-black">{job.title}</h3><p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="size-4 text-primary" />{job.city} · {job.district}</p><p className="mt-2 text-sm font-medium text-foreground/75">{[job.machineType, job.engagement, job.durationText, job.accommodation].filter(Boolean).join('｜')}</p><div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3"><span className="text-sm font-bold text-primary">{job.payText}</span><Button variant="ghost" size="sm" onClick={() => onOpen(job)}>查看详情 <ChevronRight /></Button></div></article>)}</div>;
}
