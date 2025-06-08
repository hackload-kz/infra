'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function createTeam(formData: FormData) {
    const name = formData.get('name') as string
    const nickname = formData.get('nickname') as string

    if (!name || !nickname) {
        throw new Error('Name and nickname are required')
    }

    try {
        await db.team.create({
            data: {
                name,
                nickname,
            },
        })

        revalidatePath('/dashboard/teams')
    } catch (error) {
        console.error('Error creating team:', error)
        throw new Error('Failed to create team')
    }
}

export async function updateTeam(formData: FormData) {
    const id = formData.get('id') as string
    const name = formData.get('name') as string
    const nickname = formData.get('nickname') as string

    if (!id || !name || !nickname) {
        throw new Error('ID, name and nickname are required')
    }

    try {
        await db.team.update({
            where: { id },
            data: {
                name,
                nickname,
            },
        })

        revalidatePath('/dashboard/teams')
    } catch (error) {
        console.error('Error updating team:', error)
        throw new Error('Failed to update team')
    }
}

export async function deleteTeam(formData: FormData) {
    const id = formData.get('id') as string

    if (!id) {
        throw new Error('ID is required')
    }

    try {
        await db.team.update({
            where: { id },
            data: {
                isDeleted: true,
            },
        })

        revalidatePath('/dashboard/teams')
    } catch (error) {
        console.error('Error deleting team:', error)
        throw new Error('Failed to delete team')
    }
}
