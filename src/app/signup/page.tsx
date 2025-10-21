import SignUpForm from '@/components/SignUpForm'
import { Heart } from 'lucide-react'

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-amber-50">
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="bg-gradient-to-br from-rose-400 to-pink-400 p-2 sm:p-3 rounded-xl shadow-lg">
              <Heart className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="white" />
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent">
              Merry Share
            </h1>
          </div>
          <p className="text-gray-600 text-lg">
            結婚式の思い出を共有しましょう
          </p>
        </div>

        <SignUpForm />
      </div>
    </div>
  )
}
