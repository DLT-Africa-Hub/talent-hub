import { useState } from 'react';
import { authApi } from '../api/auth';
import { Input, Button } from './ui';

const ChangePassword = () => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const isFormValid =
    oldPassword.trim().length > 0 &&
    newPassword.trim().length >= 8 &&
    confirmPassword.trim().length > 0 &&
    newPassword === confirmPassword &&
    oldPassword !== newPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }

    if (oldPassword === newPassword) {
      setError('New password must be different from current password');
      return;
    }

    setLoading(true);

    try {
      await authApi.changePassword(oldPassword, newPassword);
      setSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err: any) {
      console.error('Change password error:', err);
      setError(
        err.response?.data?.message ||
          'Failed to change password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-[24px] border border-fade bg-white p-[24px] flex flex-col gap-[24px]">
      <div>
        <p className="text-[22px] font-semibold text-[#1C1C1C]">
          Change Password
        </p>
        <p className="text-[14px] text-[#1C1C1C80]">
          Update your account password
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Current Password"
          type="password"
          name="oldPassword"
          placeholder="Enter current password"
          value={oldPassword}
          onChange={(e) => {
            setOldPassword(e.target.value);
            if (error) setError('');
          }}
          required
        />

        <Input
          label="New Password"
          type="password"
          name="newPassword"
          placeholder="Enter new password"
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            if (error) setError('');
          }}
          required
        />

        <Input
          label="Confirm New Password"
          type="password"
          name="confirmPassword"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (error) setError('');
          }}
          required
        />

        {error && (
          <p className="text-center text-red-500 text-[14px] font-normal">
            {error}
          </p>
        )}

        {success && (
          <p className="text-center text-green-600 text-[14px] font-normal">
            Password changed successfully!
          </p>
        )}

        <Button type="submit" fullWidth disabled={!isFormValid || loading}>
          {loading ? 'Changing...' : 'Change Password'}
        </Button>
      </form>
    </div>
  );
};

export default ChangePassword;

