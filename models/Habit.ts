import mongoose, { Schema, Document } from 'mongoose'

export interface IHabit extends Document {
  user: mongoose.Types.ObjectId
  name: string
  color: string
  dailyGoal: number // in minutes
  starred: boolean
  completions: Map<string, number> // Map of ISO Date String -> Minutes logged
  createdAt: Date
}

const HabitSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  color: { type: String, required: true },
  dailyGoal: { type: Number, default: 120 },
  starred: { type: Boolean, default: false },
  completions: { type: Map, of: Number, default: {} },
  createdAt: { type: Date, default: Date.now },
})

export default mongoose.models.Habit || mongoose.model<IHabit>('Habit', HabitSchema)
