import mongoose, { HydratedDocument, Model, Schema } from 'mongoose';

export interface ISession {
  user: mongoose.Types.ObjectId;
  refreshTokenHash: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionMethods {
  isActive: () => boolean;
}

export type SessionDocument = HydratedDocument<ISession, SessionMethods>;

type SessionModel = Model<ISession, Record<string, never>, SessionMethods>;

const SessionSchema: Schema<ISession, SessionModel, SessionMethods> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    userAgent: {
      type: String,
    },
    ipAddress: {
      type: String,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    revokedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

SessionSchema.methods.isActive = function (this: SessionDocument): boolean {
  if (this.revokedAt) {
    return false;
  }
  return this.expiresAt.getTime() > Date.now();
};

SessionSchema.index({ user: 1, expiresAt: -1 });

export default mongoose.model<ISession, SessionModel>('Session', SessionSchema);


