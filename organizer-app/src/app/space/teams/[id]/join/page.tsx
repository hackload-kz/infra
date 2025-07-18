import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db'
import PersonalCabinetLayout from '@/components/personal-cabinet-layout'
import { JoinRequestForm } from '@/components/join-request-form'
import { TeamJoinErrorBanner } from '@/components/team-join-error'
import { getJoinBlockReason } from '@/lib/team-join-errors'
import Link from 'next/link'
import { 
  ArrowLeft,
  Users,
  Clock,
  AlertCircle,
  Info,
  UserPlus
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{
    id: string
  }>
}

export default async function JoinTeamPage({ params }: Props) {
  const resolvedParams = await params
  const session = await auth()

  if (!session?.user?.email) {
    redirect('/login')
  }

  const [participant, team, hackathon] = await Promise.all([
    db.participant.findFirst({
      where: { 
        user: { email: session.user.email } 
      },
      include: {
        user: true,
        team: true,
        ledTeam: true,
        joinRequests: {
          where: { 
            teamId: resolvedParams.id,
            status: 'PENDING' 
          }
        }
      },
    }),
    db.team.findUnique({
      where: { id: resolvedParams.id },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        leader: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        _count: {
          select: {
            members: true,
          }
        }
      }
    }),
    db.hackathon.findFirst({
      where: { slug: 'hackload-2025' }
    })
  ])

  if (!participant) {
    redirect('/login')
  }

  if (!team) {
    notFound()
  }

  const user = {
    name: participant.name,
    email: participant.email,
    image: session.user?.image || undefined
  }

  // Check if user can join and get specific error reason
  const existingRequest = participant.joinRequests.length > 0 ? participant.joinRequests[0] : null
  const blockReason = getJoinBlockReason(participant, team, hackathon, existingRequest)
  
  const canJoin = !blockReason

  const statusLabels = {
    NEW: 'Новая',
    INCOMPLETED: 'Не завершена',
  }

  return (
    <PersonalCabinetLayout user={user}>
      {/* Back Navigation */}
      <div className="mb-6">
        <Link
          href={`/space/teams/${resolvedParams.id}`}
          className="inline-flex items-center space-x-2 text-slate-400 hover:text-amber-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Назад к команде</span>
        </Link>
      </div>

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Подать заявку в <span className="text-amber-400">команду</span>
        </h1>
        <div className="w-16 h-1 bg-amber-400 rounded-full"></div>
      </div>

      {/* Team Info */}
      <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">{team.name}</h2>
            <p className="text-slate-400">@{team.nickname}</p>
          </div>
          <div className="flex items-center space-x-2">
            {team.status === 'NEW' && <Clock className="w-4 h-4 text-blue-400" />}
            {team.status === 'INCOMPLETED' && <AlertCircle className="w-4 h-4 text-yellow-400" />}
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
              team.status === 'NEW' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
            }`}>
              {statusLabels[team.status as keyof typeof statusLabels]}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-700/30 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <Users className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-slate-400 text-sm">Участники</p>
                <p className="text-white font-semibold">{team.members.length} / 4</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-700/30 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <UserPlus className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-slate-400 text-sm">Свободных мест</p>
                <p className="text-white font-semibold">{4 - team.members.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-700/30 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full flex items-center justify-center">
                <span className="text-slate-900 font-bold text-xs">
                  {team.leader?.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Лидер</p>
                <p className="text-white font-semibold">{team.leader?.name || 'Не назначен'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Block */}
      <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-6 mb-8">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <h3 className="text-blue-200 font-medium mb-2">Как происходит вступление в команду</h3>
            <ul className="text-blue-200 text-sm space-y-1">
              <li>• Ваша заявка будет отправлена лидеру команды</li>
              <li>• Лидер рассмотрит вашу заявку и примет решение</li>
              <li>• При одобрении вы автоматически станете участником команды</li>
              <li>• Вы можете добавить сообщение, чтобы рассказать о себе</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Join Request Form or Error */}
      {canJoin ? (
        <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
          <h3 className="text-xl font-semibold text-white mb-6">Заявка на вступление</h3>
          <JoinRequestForm teamId={resolvedParams.id} participantId={participant.id} />
        </div>
      ) : (
        <div className="space-y-4">
          {blockReason && (
            <TeamJoinErrorBanner 
              error={blockReason}
              actionButton={
                <Link
                  href={`/space/teams/${resolvedParams.id}`}
                  className="inline-flex items-center px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Вернуться к команде
                </Link>
              }
            />
          )}
        </div>
      )}
    </PersonalCabinetLayout>
  )
}