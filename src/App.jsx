import { Navigate, Route, Routes } from 'react-router-dom'
import AppUpdatePrompt from './components/AppUpdatePrompt'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import { isSupabaseConfigured } from './lib/supabase'
import EventDetailPage from './pages/EventDetailPage'
import EventFormPage from './pages/EventFormPage'
import EventsPage from './pages/EventsPage'
import FreeOpinionPage from './pages/FreeOpinionPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import MembersPage from './pages/MembersPage'
import SignupPage from './pages/SignupPage'
import CompleteProfilePage from './pages/CompleteProfilePage'
import DiaryPage from './pages/DiaryPage'
import MemberListPage from './pages/MemberListPage'
import MyPage from './pages/MyPage'
import RankingPage from './pages/RankingPage'
import TennisNewsPage from './pages/TennisNewsPage'

export default function App() {
  if (!isSupabaseConfigured) {
    return (
      <main className="setup-shell">
        <section className="setup-panel">
          <p className="eyebrow">설정 필요</p>
          <h1>Supabase 연결 정보를 넣어주세요</h1>
          <p>
            프로젝트 루트의 <code>.env</code> 파일에 URL과 Publishable key를 입력한 뒤
            개발 서버를 다시 실행해 주세요.
          </p>
        </section>
      </main>
    )
  }

  return (
    <>
      <AppUpdatePrompt />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route element={<ProtectedRoute allowIncompleteProfile />}>
          <Route path="/complete-profile" element={<CompleteProfilePage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/events/:eventId" element={<EventDetailPage />} />
            <Route path="/events/new" element={<EventFormPage />} />
            <Route path="/events/:eventId/edit" element={<EventFormPage />} />
            <Route path="/members" element={<MemberListPage />} />
            <Route path="/mypage" element={<MyPage />} />
            <Route path="/ranking" element={<RankingPage />} />
            <Route path="/tennis-news" element={<TennisNewsPage />} />
            <Route path="/free-opinions" element={<FreeOpinionPage />} />
            <Route path="/diary" element={<DiaryPage />} />
            <Route path="/diary/:date" element={<DiaryPage />} />

            <Route element={<ProtectedRoute adminOnly />}>
              <Route path="/admin/members" element={<MembersPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
