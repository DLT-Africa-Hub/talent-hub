import mongoose, { HydratedDocument, Model, Schema, Types } from 'mongoose';
import { isBcryptHash } from '../utils/security.utils';

export interface IUser {
  _id: Types.ObjectId;
  email: string;
  password: string;
  role: 'graduate' | 'company' | 'admin';
  emailVerified: boolean;
  emailVerifiedAt?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<IUser>;

type UserModel = Model<IUser>;

const UserSchema: Schema<IUser, UserModel> = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      validate: {
        validator: (value: string) => isBcryptHash(value),
        message: 'Password must be stored as a bcrypt hash',
      },
    },
    role: {
      type: String,
      enum: ['graduate', 'company', 'admin'],
      required: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    emailVerifiedAt: {
      type: Date,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
UserSchema.index({ role: 1 });
UserSchema.index({ createdAt: -1 });

export default mongoose.model<IUser, UserModel>('User', UserSchema);

