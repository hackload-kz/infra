import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import PersonalCabinetLayout from '@/components/personal-cabinet-layout'
import { SpaceEditProfileForm } from '@/components/space-edit-profile-form'

export const dynamic = 'force-dynamic'

// Type for the participant data expected by the form
interface FormParticipant {
  id: string
  name: string
  email: string
  city: string | null
  company: string | null
  telegram?: string | null
  githubUrl?: string | null
  linkedinUrl?: string | null
  experienceLevel?: string | null
  technologies?: string | null
  cloudServices?: string | null
  cloudProviders?: string | null
  otherTechnologies?: string | null
  otherCloudServices?: string | null
  otherCloudProviders?: string | null
}

interface SpaceEditProfilePageProps {
  searchParams: Promise<{
    first?: string;
  }>;
}

export default async function SpaceEditProfilePage({ searchParams }: SpaceEditProfilePageProps) {
  const session = await auth()
  const { first } = await searchParams;

  if (!session?.user?.email) {
    redirect('/login')
  }

  // Check if user exists and has a participant profile
  const user = await db.user.findUnique({
    where: { email: session.user.email },
    include: {
      participant: {
        include: {
          user: true,
          team: true,
          ledTeam: true,
        },
      },
    },
  })

  // User should exist because OAuth creates them in auth.config.ts
  if (!user) {
    console.error('User not found in database after OAuth login:', session.user.email);
    redirect('/login');
  }

  // If user doesn't have a participant profile and this is NOT their first time, redirect to info
  if (!user.participant && !first) {
    redirect('/space/info');
  }

  // If user doesn't have a participant profile, we'll show the form for first-time registration
  let participant: FormParticipant;

  // For first-time users, create a minimal participant object for the form
  if (!user.participant) {
    participant = {
      id: '',
      name: session.user.name || '',
      email: session.user.email,
      city: null,
      company: null,
      telegram: null,
      githubUrl: null,
      linkedinUrl: null,
      experienceLevel: null,
      technologies: null,
      cloudServices: null,
      cloudProviders: null,
      otherTechnologies: null,
      otherCloudServices: null,
      otherCloudProviders: null,
    };
  } else {
    // Map existing participant data to form format
    participant = {
      id: user.participant.id,
      name: user.participant.name,
      email: user.participant.email,
      city: user.participant.city,
      company: user.participant.company,
      telegram: user.participant.telegram,
      githubUrl: user.participant.githubUrl,
      linkedinUrl: user.participant.linkedinUrl,
      experienceLevel: user.participant.experienceLevel,
      technologies: user.participant.technologies,
      cloudServices: user.participant.cloudServices,
      cloudProviders: user.participant.cloudProviders,
      otherTechnologies: user.participant.otherTechnologies,
      otherCloudServices: user.participant.otherCloudServices,
      otherCloudProviders: user.participant.otherCloudProviders,
    };
  }

  const userForLayout = {
    name: participant.name,
    email: participant.email,
    image: session.user?.image || undefined
  }

  const isFirstTime = !user.participant && first === 'true';

  return (
    <PersonalCabinetLayout user={userForLayout}>
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          {isFirstTime ? (
            <>Завершите <span className="text-amber-400">регистрацию</span></>
          ) : (
            <>Редактирование <span className="text-amber-400">профиля</span></>
          )}
        </h1>
        <div className="w-16 h-1 bg-amber-400 rounded-full"></div>
      </div>

      <SpaceEditProfileForm participant={participant} userEmail={session.user.email} />
    </PersonalCabinetLayout>
  )
}