import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { isOrganizer } from '@/lib/admin'

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth()
        
        if (!session || !isOrganizer(session.user?.email)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const data = await request.json()
        const { 
            name, 
            city, 
            company, 
            experienceLevel, 
            technologies, 
            cloudServices, 
            cloudProviders, 
            otherTechnologies, 
            otherCloudServices, 
            otherCloudProviders,
            teamId
        } = data

        // Find the participant
        const participant = await db.participant.findUnique({
            where: { id: params.id },
        })

        if (!participant) {
            return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
        }

        // Update participant
        const updatedParticipant = await db.participant.update({
            where: { id: params.id },
            data: {
                name,
                city,
                company,
                experienceLevel,
                technologies: JSON.stringify(technologies),
                cloudServices: JSON.stringify(cloudServices),
                cloudProviders: JSON.stringify(cloudProviders),
                otherTechnologies,
                otherCloudServices,
                otherCloudProviders,
                teamId: teamId || null,
            },
        })

        return NextResponse.json(updatedParticipant)
    } catch (error) {
        console.error('Error updating participant:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}