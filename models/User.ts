import mongoose, { Schema, Document } from 'mongoose'

export interface IUser extends Document {
  email: string
  password?: string // optional because of OAuth
  name?: string
  createdAt: Date
}

const UserSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String }, // For credentials
  name: { type: String },
  createdAt: { type: Date, default: Date.now },
})

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema)
