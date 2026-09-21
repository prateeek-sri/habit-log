import { getHabits } from './actions'
import ClientPage from './ClientPage'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const habits = await getHabits()

  return (
    <ClientPage initialHabits={habits} />
  )
}
