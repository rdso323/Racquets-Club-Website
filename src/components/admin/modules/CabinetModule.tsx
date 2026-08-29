import { useEffect, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { ArrowDown, ArrowUp, Plus, Save, Trash2, Users } from 'lucide-react';
import { db } from '../../../lib/firebase';
import {
    CABINET_MEMBERS,
    CABINET_SETTINGS_COLLECTION,
    CABINET_SETTINGS_DOC_ID,
    CABINET_YEAR,
    buildMemberFromPreset,
    type CabinetMember,
    type CabinetRolePreset,
    rolePresetFromMember,
} from '../../../lib/cabinet';
import { SPORTS } from '../../../lib/sports';

interface CabinetModuleProps {
    cabinetYear: string;
    cabinetMembers: CabinetMember[];
    cabinetLoaded: boolean;
}

const ROLE_OPTIONS: { value: CabinetRolePreset; label: string }[] = [
    { value: 'co-president', label: 'Co-President' },
    { value: 'treasury', label: 'Treasury' },
    ...SPORTS.map((sport) => ({ value: sport as CabinetRolePreset, label: sport })),
];

const emptyAddForm = () => ({
    name: '',
    role: 'co-president' as CabinetRolePreset,
    photo: '',
});

const CabinetModule = ({ cabinetYear, cabinetMembers, cabinetLoaded }: CabinetModuleProps) => {
    const [year, setYear] = useState(cabinetYear || CABINET_YEAR);
    const [members, setMembers] = useState<CabinetMember[]>(cabinetMembers);
    const [addForm, setAddForm] = useState(emptyAddForm());
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
        if (!cabinetLoaded || dirty) return;
        setYear(cabinetYear || CABINET_YEAR);
        setMembers(cabinetMembers);
    }, [cabinetLoaded, cabinetYear, cabinetMembers, dirty]);

    const markDirty = () => setDirty(true);

    const updateMember = (id: string, patch: Partial<CabinetMember> & { rolePreset?: CabinetRolePreset }) => {
        markDirty();
        setMembers((prev) =>
            prev.map((m) => {
                if (m.id !== id) return m;
                const nextName = patch.name ?? m.name;
                const nextPhoto = patch.photo ?? m.photo;
                if (patch.rolePreset) {
                    return buildMemberFromPreset(nextName, patch.rolePreset, nextPhoto, m.id);
                }
                return buildMemberFromPreset(nextName, rolePresetFromMember(m), nextPhoto, m.id);
            }),
        );
    };

    const moveMember = (index: number, direction: -1 | 1) => {
        const target = index + direction;
        if (target < 0 || target >= members.length) return;
        markDirty();
        setMembers((prev) => {
            const next = [...prev];
            const [item] = next.splice(index, 1);
            next.splice(target, 0, item);
            return next;
        });
    };

    const removeMember = (id: string) => {
        if (!window.confirm('Remove this cabinet member from the draft?')) return;
        markDirty();
        setMembers((prev) => prev.filter((m) => m.id !== id));
    };

    const handleAddMember = (e: React.FormEvent) => {
        e.preventDefault();
        if (!addForm.name.trim()) {
            setMessage('Enter a name before adding.');
            return;
        }
        markDirty();
        const member = buildMemberFromPreset(addForm.name, addForm.role, addForm.photo);
        const uniqueId =
            members.some((m) => m.id === member.id) ? `${member.id}-${Date.now()}` : member.id;
        setMembers((prev) => [...prev, { ...member, id: uniqueId }]);
        setAddForm(emptyAddForm());
        setMessage('');
    };

    const loadBuiltIn = () => {
        markDirty();
        setYear(CABINET_YEAR);
        setMembers(CABINET_MEMBERS.map((m) => ({ ...m })));
        setMessage('Loaded built-in roster into the draft. Click Save to publish.');
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage('');
        try {
            await setDoc(
                doc(db, CABINET_SETTINGS_COLLECTION, CABINET_SETTINGS_DOC_ID),
                {
                    year: year.trim() || CABINET_YEAR,
                    members: members.map((m) => {
                        const payload: Record<string, string> = {
                            id: m.id,
                            name: m.name,
                            role: m.role,
                            kind: m.kind,
                            photo: m.photo,
                            initials: m.initials,
                        };
                        if (m.sport) payload.sport = m.sport;
                        return payload;
                    }),
                },
                { merge: true },
            );
            setDirty(false);
            setMessage(
                members.length === 0
                    ? 'Saved empty roster — public page will show the built-in fallback.'
                    : 'Cabinet published successfully!',
            );
            window.setTimeout(() => setMessage(''), 4000);
        } catch (error) {
            console.error('Error saving cabinet', error);
            setMessage('Error saving cabinet. Check admin permissions / Firestore rules.');
        } finally {
            setSaving(false);
        }
    };

    if (!cabinetLoaded) {
        return (
            <div className="flex min-h-[200px] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-court-accent border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="animate-fadeIn space-y-8">
            <div>
                <h2 className="mb-2 font-display text-2xl text-gray-900 dark:text-chalk">Cabinet Roster</h2>
                <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                    Publish the public <span className="font-medium">/cabinet</span> page without a code deploy.
                    An empty published roster falls back to the built-in list in the site code. Photo fields accept
                    a full URL or a site path like <code className="text-xs">/cabinet/name.jpg</code>.
                </p>

                <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-end">
                    <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-gray-500">
                            Academic year label
                        </label>
                        <input
                            type="text"
                            value={year}
                            onChange={(e) => {
                                markDirty();
                                setYear(e.target.value);
                            }}
                            className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:ring-1 focus:ring-court-accent dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
                            placeholder="2026–2027"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={loadBuiltIn}
                        className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-chalk/80 dark:hover:bg-court-900"
                    >
                        Load built-in roster
                    </button>
                </div>

                {members.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center text-gray-400 dark:border-gray-800 dark:text-gray-500">
                        <Users className="mx-auto mb-2 h-8 w-8 opacity-50" />
                        <p className="text-sm">
                            No members in this draft. The public page uses the built-in roster until you add and
                            save people here.
                        </p>
                    </div>
                ) : (
                    <ul className="space-y-4">
                        {members.map((member, index) => (
                            <li
                                key={member.id}
                                className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-court-950/40"
                            >
                                <div className="flex flex-col gap-4 sm:flex-row">
                                    <div className="h-20 w-16 shrink-0 overflow-hidden rounded-md bg-gray-100 dark:bg-court-900">
                                        {member.photo ? (
                                            <img
                                                src={member.photo}
                                                alt=""
                                                className="h-full w-full object-cover object-top"
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center font-display text-sm text-gray-400">
                                                {member.initials}
                                            </div>
                                        )}
                                    </div>
                                    <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-xs font-bold uppercase text-gray-500">
                                                Name
                                            </label>
                                            <input
                                                type="text"
                                                value={member.name}
                                                onChange={(e) =>
                                                    updateMember(member.id, { name: e.target.value })
                                                }
                                                className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-bold uppercase text-gray-500">
                                                Role
                                            </label>
                                            <select
                                                value={rolePresetFromMember(member)}
                                                onChange={(e) =>
                                                    updateMember(member.id, {
                                                        rolePreset: e.target.value as CabinetRolePreset,
                                                    })
                                                }
                                                className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
                                            >
                                                {ROLE_OPTIONS.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="mb-1 block text-xs font-bold uppercase text-gray-500">
                                                Photo URL or path
                                            </label>
                                            <input
                                                type="text"
                                                value={member.photo}
                                                onChange={(e) =>
                                                    updateMember(member.id, { photo: e.target.value })
                                                }
                                                className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
                                                placeholder="https://... or /cabinet/name.jpg"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 flex-row gap-1 sm:flex-col">
                                        <button
                                            type="button"
                                            aria-label="Move up"
                                            onClick={() => moveMember(index, -1)}
                                            disabled={index === 0}
                                            className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 disabled:opacity-30 dark:border-gray-700 dark:hover:bg-court-900"
                                        >
                                            <ArrowUp className="h-4 w-4" />
                                        </button>
                                        <button
                                            type="button"
                                            aria-label="Move down"
                                            onClick={() => moveMember(index, 1)}
                                            disabled={index === members.length - 1}
                                            className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 disabled:opacity-30 dark:border-gray-700 dark:hover:bg-court-900"
                                        >
                                            <ArrowDown className="h-4 w-4" />
                                        </button>
                                        <button
                                            type="button"
                                            aria-label="Remove"
                                            onClick={() => removeMember(member.id)}
                                            className="rounded-lg border border-red-200 p-2 text-red-500 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/30"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <hr className="border-gray-150 dark:border-gray-800" />

            <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-50/20 p-6 dark:border-gray-800 dark:bg-court-950/20">
                <div className="absolute left-0 top-0 h-full w-1.5 bg-court-accent" />
                <h3 className="flex items-center gap-2 font-display text-2xl text-gray-900 dark:text-chalk">
                    <Plus className="h-5 w-5 text-court-accent" />
                    Add Cabinet Member
                </h3>
                <form onSubmit={handleAddMember} className="mt-6 space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Name</label>
                            <input
                                type="text"
                                required
                                value={addForm.name}
                                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
                                placeholder="Full name"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Role</label>
                            <select
                                value={addForm.role}
                                onChange={(e) =>
                                    setAddForm({ ...addForm, role: e.target.value as CabinetRolePreset })
                                }
                                className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
                            >
                                {ROLE_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase text-gray-500">
                                Photo URL or path
                            </label>
                            <input
                                type="text"
                                value={addForm.photo}
                                onChange={(e) => setAddForm({ ...addForm, photo: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
                                placeholder="/cabinet/name.jpg"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            className="flex items-center rounded-lg bg-wimbledon-green px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#004d00]"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Add to draft
                        </button>
                    </div>
                </form>
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-200 pt-6 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                <span className={`text-sm ${message.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>
                    {message || (dirty ? 'Unsaved changes' : '')}
                </span>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="clay-gradient flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors hover:brightness-110 disabled:opacity-50"
                >
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? 'Saving…' : 'Save Cabinet'}
                </button>
            </div>
        </div>
    );
};

export default CabinetModule;
