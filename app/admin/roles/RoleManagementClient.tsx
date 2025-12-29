'use client';

import { useState } from 'react';
import { Search, Trash2, Plus, UserCog } from 'lucide-react';
import { searchUserByUsername, addRole, removeRole } from '@/app/actions/role';
import { ROLES, RoleId } from '@/lib/roles';

interface UserData {
  id: number;
  username: string;
  avatarUrl: string | null;
  roles: string[];
}

interface RoleManagementClientProps {
    isGlobalAdmin: boolean;
}

export default function RoleManagementClient({ isGlobalAdmin }: RoleManagementClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError('');
    setUser(null);

    try {
      const result = await searchUserByUsername(searchQuery);
      if (result) {
        setUser(result);
      } else {
        setError('ユーザーが見つかりませんでした');
      }
    } catch (err) {
      setError('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async () => {
    if (!user || !selectedRole) return;

    try {
      await addRole(user.id, selectedRole);
      // Refresh user data locally
      setUser(prev => prev ? ({ ...prev, roles: [...prev.roles, selectedRole] }) : null);
      setSelectedRole('');
    } catch (err: any) {
       alert(err.message || 'ロールの追加に失敗しました');
    }
  };

  const handleRemoveRole = async (roleId: string) => {
    if (!user) return;
    if (!confirm('本当にこのロールを削除しますか？')) return;

    try {
      await removeRole(user.id, roleId);
      // Refresh user data locally
      setUser(prev => prev ? ({ ...prev, roles: prev.roles.filter(r => r !== roleId) }) : null);
    } catch (err: any) {
      alert(err.message || 'ロールの削除に失敗しました');
    }
  };

  // Filter roles available to add
  const availableRolesToAdd = ROLES.filter(role => {
      // Don't show if user already has it
      if (user?.roles.includes(role.id)) return false;
      // Don't show role_manager unless global admin
      if (role.id === 'role_manager' && !isGlobalAdmin) return false;
      return true;
  });

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-3 mb-8">
        <UserCog className="w-8 h-8 text-primary" />
        <h1 className="text-2xl font-bold">ロール管理</h1>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ユーザー名を入力..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-primary outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors font-medium"
        >
          {loading ? '検索中...' : '検索'}
        </button>
      </form>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg">
          {error}
        </div>
      )}

      {user && (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border dark:border-gray-800 overflow-hidden">
          <div className="p-6 border-b dark:border-gray-800 flex items-center gap-4">
             {user.avatarUrl ? (
                 <img src={user.avatarUrl} crossOrigin="anonymous" alt={user.username} className="w-16 h-16 rounded-full object-cover shrink-0" />
             ) : (
                 <div className="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center shrink-0">
                     <span className="text-2xl text-gray-500">{user.username[0].toUpperCase()}</span>
                 </div>
             )}
             <div>
                 <h2 className="text-xl font-bold">{user.username}</h2>
                 <p className="text-gray-500 text-sm">ID: {user.id}</p>
             </div>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">現在のロール</h3>
              {user.roles.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {user.roles.map(roleId => {
                    const roleDef = ROLES.find(r => r.id === roleId);
                    const roleName = roleDef ? roleDef.name : roleId;
                    const isRoleManagerRole = roleId === 'role_manager';
                    const canRemove = !isRoleManagerRole || isGlobalAdmin;

                    return (
                      <div key={roleId} className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                        <span className="font-medium">{roleName}</span>
                        {canRemove && (
                            <button
                                onClick={() => handleRemoveRole(roleId)}
                                className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500 hover:text-red-500 transition-colors"
                                title="ロールを削除"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 italic">ロールが付与されていません</p>
              )}
            </div>

            <div className="pt-6 border-t dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">ロールを追加</h3>
                <div className="flex gap-2">
                    <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="flex-1 px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 outline-none focus:ring-2 focus:ring-primary"
                    >
                        <option value="">ロールを選択...</option>
                        {availableRolesToAdd.map(role => (
                            <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                    </select>
                    <button
                        onClick={handleAddRole}
                        disabled={!selectedRole}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                        <Plus className="w-5 h-5" />
                        追加
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
