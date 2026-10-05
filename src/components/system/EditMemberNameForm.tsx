import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { suggestedMemberName } from '../../lib/memberNames';

interface EditMemberNameFormProps {
    onCancel: () => void;
    onSaved: () => void;
}

const fieldClass =
    'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-court-accent dark:border-chalk/15 dark:bg-court-900 dark:text-chalk dark:placeholder-chalk/40';

const EditMemberNameForm = ({ onCancel, onSaved }: EditMemberNameFormProps) => {
    const { user, memberName, saveMemberName } = useAuth();
    const suggested = suggestedMemberName(user?.email, user?.displayName, memberName);
    const [firstName, setFirstName] = useState(suggested.firstName);
    const [lastName, setLastName] = useState(suggested.lastName);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);
        setSaving(true);
        try {
            await saveMemberName(firstName, lastName);
            onSaved();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Enter a first and last name.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={(event) => void handleSubmit(event)} className="px-3 py-2.5">
            <p className="px-1 text-xs font-medium text-gray-500 dark:text-chalk/50">
                Your court spot shows your full name, with the first name above the last name.
            </p>
            <label className="mt-2 block">
                <span className="sr-only">First name</span>
                <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    placeholder="First name"
                    autoComplete="given-name"
                    className={fieldClass}
                />
            </label>
            <label className="mt-2 block">
                <span className="sr-only">Last name</span>
                <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    placeholder="Last name"
                    autoComplete="family-name"
                    className={fieldClass}
                />
            </label>
            {error && <p className="mt-2 px-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
            <div className="mt-2.5 flex gap-2">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={saving}
                    className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:text-chalk/70 dark:hover:bg-chalk/5"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 rounded-lg bg-[#001440] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#000a20] disabled:opacity-50 dark:bg-white dark:text-wimbledon-navy dark:hover:bg-gray-100"
                >
                    {saving ? 'Saving…' : 'Save'}
                </button>
            </div>
        </form>
    );
};

export default EditMemberNameForm;
