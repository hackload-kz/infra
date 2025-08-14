import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { isOrganizer } from '@/lib/admin'
import PersonalCabinetLayout from '@/components/personal-cabinet-layout'
import MarkdownRenderer from '@/components/markdown-renderer'
import { FileText, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import fs from 'fs'
import path from 'path'
import { getDocsFileInfo } from '@/lib/file-utils'

export const dynamic = 'force-dynamic'

export default async function ProjectRequirementsPage() {
  const session = await auth()

  if (!session?.user?.email) {
    redirect('/login')
  }

  // Check if user is an organizer
  const userIsOrganizer = isOrganizer(session.user.email)

  const participant = await db.participant.findFirst({
    where: { 
      user: { email: session.user.email } 
    },
    include: {
      user: true,
      team: true,
      ledTeam: true,
    },
  })

  // If no participant found and user is not an organizer, redirect to login
  if (!participant && !userIsOrganizer) {
    redirect('/login')
  }

  // For organizers without participant data, create a fallback user object
  const user = participant ? {
    name: participant.name,
    email: participant.email,
    image: session.user?.image || undefined
  } : {
    name: session.user.name || 'Organizer',
    email: session.user.email || '',
    image: session.user?.image || undefined
  }

  const hasTeam = !!(participant?.team || participant?.ledTeam)

  // Get file information and content
  const fileInfo = await getDocsFileInfo('project-requirements.md')
  const docsPath = path.join(process.cwd(), 'public', 'docs', 'project-requirements.md')
  let markdownContent = ''
  
  try {
    markdownContent = fs.readFileSync(docsPath, 'utf8')
  } catch (error) {
    console.error('Error reading project requirements documentation:', error)
    markdownContent = '# Требования к проекту\n\nДокументация недоступна. Обратитесь в техническую поддержку.'
  }

  return (
    <PersonalCabinetLayout user={user} hasTeam={hasTeam}>
      {/* Navigation */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="text-slate-400 hover:text-white">
          <Link href="/space/tasks" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Назад к заданиям
          </Link>
        </Button>
      </div>

      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-orange-400/20 rounded-lg flex items-center justify-center">
            <FileText className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">
              Требования к проекту
            </h1>
            <p className="text-slate-400">
              Техническое задание и критерии оценки проектов
            </p>
          </div>
        </div>
        <div className="w-16 h-1 bg-orange-400 rounded-full"></div>
      </div>

      {/* Documentation Content */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/30 p-8">
        <MarkdownRenderer 
          content={markdownContent} 
          lastModified={fileInfo.commitDate || fileInfo.lastModified}
        />
      </div>
    </PersonalCabinetLayout>
  )
}