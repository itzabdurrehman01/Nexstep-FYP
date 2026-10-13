import React, { useCallback, useEffect, useState } from 'react';
import { Search, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminFetch, formatDate, formatDateTime } from './adminApi.js';
import { Badge, Button, Card, ConfirmButton, Empty, Loading, Notice, PageHeader, inputClass } from './AdminUi.jsx';

export function AdminUsers() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState(null);

  useEffect(() => { const t = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [search]);

  const load = useCallback(async () => {
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (query) params.set('search', query);
      if (role) params.set('role', role);
      if (status) params.set('status', status);
      setData(await adminFetch(`/admin/users?${params}`));
    } catch (err) { setError(err.message); }
  }, [page, query, role, status]);

  useEffect(() => { load(); }, [load]);

  const update = async (u, body, okMessage) => {
    setBusyId(u.id); setError(''); setNotice('');
    try {
      await adminFetch(`/admin/users/${u.id}`, { method: 'PUT', body });
      setNotice(okMessage);
      await load();
    } catch (err) { setError(err.message); } finally { setBusyId(null); }
  };

  const remove = async (u) => {
    setBusyId(u.id); setError(''); setNotice('');
    try {
      await adminFetch(`/admin/users/${u.id}`, { method: 'DELETE' });
      setNotice(`${u.email} was deleted.`);
      await load();
    } catch (err) { setError(err.message); } finally { setBusyId(null); }
  };

  const users = data?.data ?? [];
  const name = (u) => `${u.first_name || ''} ${u.last_name || ''}`.trim() || '—';

  return (
    <div>
      <PageHeader title="Users" description="Everyone who signed in to NexStep as a student or mentor." />
      <Card>
        <div className="flex flex-col md:flex-row gap-2 mb-4">
          <label className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true" />
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email" className={`${inputClass} pl-9`} aria-label="Search users" />
          </label>
          <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className={`${inputClass} md:w-40`} aria-label="Filter by role">
            <option value="">All roles</option>
            <option value="STUDENT">Students</option>
            <option value="MENTOR">Mentors</option>
          </select>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={`${inputClass} md:w-40`} aria-label="Filter by status">
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        <div className="space-y-3 mb-3">
          <Notice>{error}</Notice>
          <Notice kind="success">{notice}</Notice>
        </div>

        {!data && !error ? <Loading /> : users.length === 0 ? (
          <Empty icon={Users} title="No users found" message={query || role || status ? 'Try a different search or filter.' : 'Users appear here after they sign in for the first time.'} />
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="text-left text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <th className="font-medium px-5 py-2">User</th>
                  <th className="font-medium px-3 py-2">Role</th>
                  <th className="font-medium px-3 py-2">Status</th>
                  <th className="font-medium px-3 py-2">Joined</th>
                  <th className="font-medium px-3 py-2">Last sign-in</th>
                  <th className="font-medium px-5 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((u) => (
                  <tr key={u.id} className="align-middle">
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-900 dark:text-white">{name(u)}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </td>
                    <td className="px-3 py-3">
                      <select value={u.role === 'MENTOR' ? 'MENTOR' : 'STUDENT'} disabled={busyId === u.id}
                        onChange={(e) => update(u, { role: e.target.value }, `${u.email} is now a ${e.target.value === 'MENTOR' ? 'mentor' : 'student'}.`)}
                        className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm" aria-label={`Role for ${u.email}`}>
                        <option value="STUDENT">Student</option>
                        <option value="MENTOR">Mentor</option>
                      </select>
                    </td>
                    <td className="px-3 py-3">{u.is_active ? <Badge tone="green">Active</Badge> : <Badge tone="red">Suspended</Badge>}</td>
                    <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{formatDate(u.joinedAt)}</td>
                    <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{formatDateTime(u.lastLogin)}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" loading={busyId === u.id}
                          onClick={() => update(u, { isActive: !u.is_active }, u.is_active ? `${u.email} was suspended.` : `${u.email} was re-activated.`)}>
                          {u.is_active ? 'Suspend' : 'Activate'}
                        </Button>
                        <ConfirmButton onConfirm={() => remove(u)} disabled={busyId === u.id} confirmLabel="Confirm delete">Delete</ConfirmButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.pages > 1 && (
          <div className="flex items-center justify-between pt-4 text-sm text-slate-500">
            <span>Page {data.page} of {data.pages} · {data.count} users</span>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></Button>
              <Button variant="secondary" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)} aria-label="Next page"><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default AdminUsers;
