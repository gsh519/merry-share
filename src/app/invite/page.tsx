import InviteForm from '@/components/InviteForm'
import ProtectedRoute from '@/components/ProtectedRoute'
import HomeClient from '@/components/HomeClient'

export default function InvitePage() {
  return (
    <ProtectedRoute>
      <HomeClient showUploadButton={false}>
        <div className="max-w-3xl mx-auto px-4 py-8">
          <InviteForm />
        </div>
      </HomeClient>
    </ProtectedRoute>
  )
}
