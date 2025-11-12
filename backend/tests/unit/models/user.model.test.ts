import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../../../models/User.model';

describe('User model validation', () => {
  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('rejects non-bcrypt password values', async () => {
    const user = new User({
      email: 'test@example.com',
      password: 'plain-password',
      role: 'graduate',
    });

    await expect(user.validate()).rejects.toThrow('Password must be stored as a bcrypt hash');
  });

  it('accepts valid bcrypt hashes', async () => {
    const hashed = await bcrypt.hash('Password123!', 10);

    const user = new User({
      email: 'hash@example.com',
      password: hashed,
      role: 'graduate',
    });

    await expect(user.validate()).resolves.toBeUndefined();
  });
});



