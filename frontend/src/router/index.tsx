import { createBrowserRouter, RouterProvider, Outlet, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Navbar from '../components/Navbar'
import MobileBottomNav from '../components/MobileBottomNav'
import BackToTop from '../components/BackToTop'
import Breadcrumb from '../components/Breadcrumb'
import ErrorBoundary from '../components/ErrorBoundary'
import PWAInstallPrompt from '../components/PWAInstallPrompt'
import SkipLink from '../components/SkipLink'
import '../components/PageTransition.css'

const HomePage = lazy(() => import('../pages/HomePage'))
const FavoriteList = lazy(() => import('../pages/FavoriteList'))
const LoginPage = lazy(() => import('../pages/LoginPage'))
const RecipeDetailPage = lazy(() => import('../pages/RecipeDetailPage'))
const SearchPage = lazy(() => import('../pages/SearchPage'))
const UserProfilePage = lazy(() => import('../pages/UserProfilePage'))
const CreateRecipePage = lazy(() => import('../pages/CreateRecipePage'))
const RecommendPage = lazy(() => import('../pages/RecommendPage'))
const CollectionsPage = lazy(() => import('../pages/CollectionsPage'))
const CollectionsDetailPage = lazy(() => import('../pages/CollectionsDetailPage'))
const ShoppingListPage = lazy(() => import('../pages/ShoppingListPage'))
const RankingsPage = lazy(() => import('../pages/RankingsPage'))
const MealPlannerPage = lazy(() => import('../pages/MealPlannerPage'))
const CookingJournalPage = lazy(() => import('../pages/CookingJournalPage'))
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'))
const ComparePage = lazy(() => import('../pages/ComparePage'))
const PreferencesPage = lazy(() => import('../pages/PreferencesPage'))
const PreferenceRecommendations = lazy(() => import('../pages/PreferenceRecommendations'))
const ChallengesPage = lazy(() => import('../pages/ChallengesPage'))
const ChallengeDetailPage = lazy(() => import('../pages/ChallengeDetailPage'))
const IngredientSearchPage = lazy(() => import('../pages/IngredientSearchPage'))
const KitchenToolsPage = lazy(() => import('../pages/KitchenToolsPage'))
const MyToolsPage = lazy(() => import('../pages/MyToolsPage'))

const Fallback = () => <div style={{ padding: 20, textAlign: 'center' }}>加载中...</div>

function Layout() {
  return (
    <ErrorBoundary>
      <SkipLink />
      <Navbar />
      <Breadcrumb />
      <main id="main-content">
        <Suspense fallback={<Fallback />}>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </Suspense>
      </main>
      <MobileBottomNav />
      <BackToTop />
      <PWAInstallPrompt />
    </ErrorBoundary>
  )
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/favorites', element: <FavoriteList /> },
      { path: '/recipe/:id', element: <RecipeDetailPage /> },
      { path: '/recipe/:id/edit', element: <CreateRecipePage /> },
      { path: '/recipe/new', element: <CreateRecipePage /> },
      { path: '/create', element: <Navigate to="/recipe/new" replace /> },
      { path: '/search', element: <SearchPage /> },
      { path: '/user/:id', element: <UserProfilePage /> },
      { path: '/recommend', element: <RecommendPage /> },
      { path: '/collections', element: <CollectionsPage /> },
      { path: '/collections/:id', element: <CollectionsDetailPage /> },
      { path: '/shopping-list', element: <ShoppingListPage /> },
      { path: '/rankings', element: <RankingsPage /> },
      { path: '/compare', element: <ComparePage /> },
      { path: '/preferences', element: <PreferencesPage /> },
      { path: '/preferences/recommendations', element: <PreferenceRecommendations /> },
          { path: '/meal-planner', element: <MealPlannerPage /> },
  { path: '/cooking-journal', element: <CookingJournalPage /> },
      // 迭代#34: 挑战赛系统
      { path: '/challenges', element: <ChallengesPage /> },
      { path: '/challenges/:id', element: <ChallengeDetailPage /> },
      // 迭代#34: 智能食材搜索
      { path: '/ingredient-search', element: <IngredientSearchPage /> },
      // 迭代#34: 厨房工具管理
      { path: '/tools', element: <KitchenToolsPage /> },
      { path: '/my-tools', element: <MyToolsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

export default function Router() {
  // @ts-expect-error TS2786 with TS 5.9 + @types/react 18.3 — harmless render types mismatch
  return <RouterProvider router={router} />
}
