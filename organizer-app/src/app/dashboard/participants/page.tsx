import { ParticipantsServer } from './participants-server'

// Force dynamic rendering since this page requires authentication and database access
export const dynamic = 'force-dynamic'

export default function ParticipantsPage() {
    return <ParticipantsServer />
}