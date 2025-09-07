import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">ShiftLink</h1>
        <p className="text-lg mb-8">스마트한 근무 일정 관리 시스템</p>
        <div className="flex gap-4 justify-center">
          <Link 
            href="/login"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            로그인
          </Link>
          <Link 
            href="/signup"
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            회원가입
          </Link>
        </div>
      </div>
    </div>
  )
}