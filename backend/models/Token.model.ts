import mongoose, { HydratedDocument, Model, Schema, Types } from 'mongoose';

export const TOKEN_TYPES = {
  EMAIL_VERIFICATION: 'email-verification',
  PASSWORD_RESET: 'password-reset',
} as const;

export type TokenType = (typeof TOKEN_TYPES)[keyof typeof TOKEN_TYPES];

export interface IToken {
  user: Types.ObjectId;
  tokenHash: string;
  type: TokenType;
  metadata?: Record<string, unknown>;
  expiresAt: Date;
  consumedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TokenMethods {
  isActive: () => boolean;
}

export type TokenDocument = HydratedDocument<IToken, TokenMethods>;

type TokenModel = Model<IToken, Record<string, never>, TokenMethods>;

const TokenSchema: Schema<IToken, TokenModel, TokenMethods> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: Object.values(TOKEN_TYPES),
      required: true,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    consumedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

TokenSchema.methods.isActive = function (this: TokenDocument): boolean {
  if (this.consumedAt) {
    return false;
  }
  return this.expiresAt.getTime() > Date.now();
};

TokenSchema.index({ user: 1, type: 1, expiresAt: -1 });

export default mongoose.model<IToken, TokenModel>('Token', TokenSchema);


