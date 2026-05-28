'use client';

import { useMemo, useState } from 'react';
import { Lock, Plus, Trash2 } from 'lucide-react';
import { addSelfSelectableRole, removeSelfSelectableRole } from '@/app/actions/role';
import { ROLES, SELF_SELECTABLE_ROLE_IDS, isSelfSelectableRole } from '@/lib/roles';
import { RoleBadge } from '@/components/RoleBadge';

type Role = typeof ROLES[number];

type SelfRoleSelectorProps = {
  initialRoles: string[];
};

export function SelfRoleSelector({ initialRoles }: SelfRoleSelectorProps) {
  const [roles, setRoles] = useState(initialRoles);
  const [selectedRole, setSelectedRole] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [removableRoleIds, setRemovableRoleIds] = useState<Set<string>>(() => new Set());

  const selectableRoles = useMemo(
    () => SELF_SELECTABLE_ROLE_IDS
      .map((roleId) => ROLES.find((role) => role.id === roleId))
      .filter((role): role is Role => Boolean(role)),
    []
  );

  const currentRoles = roles.map((roleId) => ROLES.find((role) => role.id === roleId) ?? { id: roleId, name: roleId });
  const availableRolesToAdd = selectableRoles.filter((role) => !roles.includes(role.id));

  const handleAddRole = async () => {
    if (!selectedRole) return;

    const roleToAdd = selectedRole;

    setIsSaving(true);
    setError('');

    try {
      const result = await addSelfSelectableRole(roleToAdd);
      setRoles(result.roles);
      setRemovableRoleIds((current) => new Set(current).add(roleToAdd));
      setSelectedRole('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ロールの追加に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveRole = async (roleId: string) => {
    setIsSaving(true);
    setError('');

    try {
      const result = await removeSelfSelectableRole(roleId);
      setRoles(result.roles);
      setRemovableRoleIds((current) => {
        const next = new Set(current);
        next.delete(roleId);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ロールの削除に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border p-4 dark:border-gray-800">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">表示ロール</h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          プロフィールや投稿に表示するロールを選べます
        </p>
      </div>

      <div>
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">現在のロール</h4>
        {currentRoles.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {currentRoles.map((role) => {
              const canRemove = isSelfSelectableRole(role.id) && removableRoleIds.has(role.id);

              return (
              <div key={role.id} className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 dark:bg-gray-800">
                <RoleBadge roleId={role.id} />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{role.name}</span>
                {canRemove ? (
                  <button
                    type="button"
                    onClick={() => handleRemoveRole(role.id)}
                    disabled={isSaving}
                    className="rounded-full p-0.5 text-gray-500 transition-colors hover:bg-gray-200 hover:text-red-500 disabled:opacity-50 dark:hover:bg-gray-700"
                    title="ロールを削除"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : (
                  <Lock className="h-3.5 w-3.5 text-gray-400" aria-label="削除不可" />
                )}
              </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm italic text-gray-500">選択中のロールはありません</p>
        )}
      </div>

      <div className="border-t pt-4 dark:border-gray-800">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">ロールを追加</h4>
        <div className="flex gap-2">
          <select
            value={selectedRole}
            onChange={(event) => setSelectedRole(event.target.value)}
            disabled={isSaving || availableRolesToAdd.length === 0}
            className="flex-1 rounded-lg border px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="">ロールを選択...</option>
            {availableRolesToAdd.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAddRole}
            disabled={!selectedRole || isSaving}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-5 w-5" />
            追加
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
    </div>
  );
}
