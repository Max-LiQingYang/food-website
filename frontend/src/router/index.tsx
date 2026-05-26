import { createBrowserRouter, RouterProvider, Outlet, Navigate } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar'
import MobileBottomNav from '../components/MobileBottomNav'
import BackToTop from '../components/BackToTop'
import Breadcrumb from '../components/Breadcrumb'
import ErrorBoundary from '../components/ErrorBoundary'
import PWAInstallPrompt from '../components/PWAInstallPrompt'
import SkipLink from '../components/SkipLink'
import KeyboardShortcutsProvider from '../components/KeyboardShortcuts'
import WelcomeTour from '../components/WelcomeTour'
import Footer from '../components/Footer'
import '../components/PageTransition.css'

const HomePage = lazy(() => import('../pages/HomePage'))
const FavoriteList = lazy(() => import('../pages/FavoriteList'))
const LoginPage = lazy(() => import('../pages/LoginPage'))
const RecipeDetailPage = lazy(() => import('../pages/RecipeDetailPage'))
const CookingModePage = lazy(() => import('../pages/CookingModePage'))
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
const SettingsPage = lazy(() => import('../pages/SettingsPage'))
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'))
const ComparePage = lazy(() => import('../pages/ComparePage'))
const PreferencesPage = lazy(() => import('../pages/PreferencesPage'))
const PreferenceRecommendations = lazy(() => import('../pages/PreferenceRecommendations'))
const ChallengesPage = lazy(() => import('../pages/ChallengesPage'))
const ChallengeDetailPage = lazy(() => import('../pages/ChallengeDetailPage'))
const IngredientSearchPage = lazy(() => import('../pages/IngredientSearchPage'))
const KitchenToolsPage = lazy(() => import('../pages/KitchenToolsPage'))
const MyToolsPage = lazy(() => import('../pages/MyToolsPage'))
const TagsPage = lazy(() => import('../pages/TagsPage'))
const DraftsPage = lazy(() => import('../pages/DraftsPage'))
const DashboardPage = lazy(() => import('../pages/DashboardPage'))
const AdminReviewPage = lazy(() => import('../pages/AdminReviewPage'))
const NotificationsPage = lazy(() => import('../pages/NotificationsPage'))
const PantryPage = lazy(() => import('../pages/PantryPage'))
const NutritionDashboard = lazy(() => import('../pages/NutritionDashboard'))
const RecipeDiffPage = lazy(() => import('../pages/RecipeDiffPage'))
const CookingAnalyticsPage = lazy(() => import('../pages/CookingAnalyticsPage'))

const Fallback = () => <div style={{ padding: 20, textAlign: 'center' }}>加载中...</div>

/** 路由切换时自动滚动到顶部 */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])
  return null
}

function Layout() {
  return (
    <KeyboardShortcutsProvider>
      <ErrorBoundary>
        <SkipLink />
        <ScrollToTop />
        <Navbar />
        <Breadcrumb />
        <main id="main-content">
          <Suspense fallback={<Fallback />}>
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </Suspense>
        </main>
        <Footer />
        <MobileBottomNav />
        <BackToTop />
        <PWAInstallPrompt />
      <WelcomeTour />
      </ErrorBoundary>
    </KeyboardShortcutsProvider>
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
      { path: '/challenges', element: <ChallengesPage /> },
      { path: '/challenges/:id', element: <ChallengeDetailPage /> },
      { path: '/ingredient-search', element: <IngredientSearchPage /> },
      { path: '/tools', element: <KitchenToolsPage /> },
      { path: '/my-tools', element: <MyToolsPage /> },
      { path: '/tags', element: <TagsPage /> },
      { path: '/drafts', element: <DraftsPage /> },
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/admin/review', element: <AdminReviewPage /> },
      { path: '/admin/review-history', element: <AdminReviewPage /> },
      { path: '/notifications', element: <NotificationsPage /> },
      { path: '/pantry', element: <PantryPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/nutrition', element: <NutritionDashboard /> },
      { path: '/recipe/:id/versions', element: <RecipeDiffPage /> },
      { path: '/cooking/analytics', element: <CookingAnalyticsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  { path: '/recipe/:id/cook', element: <CookingModePage /> },
])

export default function Router() {
  // @ts-expect-error TS2786 with TS 5.9 + @types/react 18.3 — harmless render types mismatch
  return <RouterProvider router={router} />
}