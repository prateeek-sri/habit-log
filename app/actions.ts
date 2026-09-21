'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import connectToDatabase from '@/lib/db'
import Habit from '@/models/Habit'
import { revalidatePath } from 'next/cache'

async function getUserId() {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error('Unauthorized')
  return (session.user as any).id
}

export async function getHabits() {
  try {
    const userId = await getUserId()
    await connectToDatabase()
    const habits = await Habit.find({ user: userId }).lean()
    
    return habits.map(h => ({
      id: h._id.toString(),
      name: h.name,
      color: h.color,
      dailyGoal: h.dailyGoal,
      starred: h.starred,
      completions: h.completions || {},
      createdAt: h.createdAt.toISOString()
    }))
  } catch (error) {
    console.error(error)
    return []
  }
}

export async function createHabit(data: { name: string, color: string, dailyGoal: number }) {
  const userId = await getUserId()
  await connectToDatabase()
  await Habit.create({
    user: userId,
    ...data
  })
  revalidatePath('/')
}

export async function updateHabit(id: string, data: { name?: string, color?: string, dailyGoal?: number }) {
  const userId = await getUserId()
  await connectToDatabase()
  await Habit.findOneAndUpdate({ _id: id, user: userId }, data)
  revalidatePath('/')
}

export async function toggleStarHabit(id: string, currentStarred: boolean) {
  const userId = await getUserId()
  await connectToDatabase()
  await Habit.findOneAndUpdate({ _id: id, user: userId }, { starred: !currentStarred })
  revalidatePath('/')
}

export async function deleteHabit(id: string) {
  const userId = await getUserId()
  await connectToDatabase()
  await Habit.findOneAndDelete({ _id: id, user: userId, starred: false })
  revalidatePath('/')
}

export async function logTime(id: string, dateStr: string, minutes: number) {
  const userId = await getUserId()
  await connectToDatabase()
  
  if (minutes <= 0) {
    await Habit.findOneAndUpdate({ _id: id, user: userId }, { $unset: { [`completions.${dateStr}`]: 1 } })
  } else {
    await Habit.findOneAndUpdate({ _id: id, user: userId }, { $set: { [`completions.${dateStr}`]: minutes } })
  }
  revalidatePath('/')
}
