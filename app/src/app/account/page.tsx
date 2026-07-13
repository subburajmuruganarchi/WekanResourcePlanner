import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader, Section, FormField } from '@/components/patterns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api-client';
import { getHomeRoute } from '@/lib/home-route';

export default function AccountSettingsPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (newPassword.length < 8) {
            setError('New password must be at least 8 characters.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('New password and confirmation do not match.');
            return;
        }

        setSaving(true);
        try {
            await api.post('/auth/change-password', {
                currentPassword,
                newPassword,
            });
            setSuccess('Password updated successfully. Please sign in again with your new password.');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => {
                logout();
                navigate('/login', { replace: true, state: { passwordChanged: true } });
            }, 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update password.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <PageContainer className="max-w-lg">
            <PageHeader
                eyebrow="Account"
                title="Password & security"
                description="Update your sign-in password. If an admin reset your account, sign in with the temporary password first, then set a new one here."
                action={
                    <Button variant="outline" size="sm" onClick={() => navigate(getHomeRoute(user?.role))}>
                        Back to dashboard
                    </Button>
                }
            />

            <Section title="Change password">
                {user?.passwordMustChange && (
                    <div
                        role="status"
                        className="mb-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-500/30 px-4 py-3 text-sm text-amber-900 dark:text-amber-100"
                    >
                        Your account is using a temporary password. Please set a new password below.
                    </div>
                )}
                {error && (
                    <div role="alert" className="mb-4 rounded-lg border border-critical-border bg-critical-bg px-4 py-3 text-sm text-critical">
                        {error}
                    </div>
                )}
                {success && (
                    <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-500/30 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
                        {success}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <FormField label="Current password" htmlFor="current-password" required>
                        <Input
                            id="current-password"
                            type="password"
                            autoComplete="current-password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                        />
                    </FormField>
                    <FormField label="New password" htmlFor="new-password" required>
                        <Input
                            id="new-password"
                            type="password"
                            autoComplete="new-password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            minLength={8}
                        />
                    </FormField>
                    <FormField label="Confirm new password" htmlFor="confirm-password" required>
                        <Input
                            id="confirm-password"
                            type="password"
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={8}
                        />
                    </FormField>
                    <Button type="submit" disabled={saving}>
                        {saving ? 'Saving…' : 'Update password'}
                    </Button>
                </form>
            </Section>
        </PageContainer>
    );
}
