import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { lazy, Suspense } from 'react'

const HomePage = lazy(() => import('../pages/HomePage'))
const FavoriteList = lazy(() => import('../pages/FavoriteList'))
const LoginPage = lazy(() => import('../pages/LoginPage'))
const RecipeDetailPage = lazy(() => import('../pages/RecipeDetailPage'))
const SearchPage = lazy(() => import('../pages/SearchPage'))

const Fallback = () => <div style={{ padding: 20, textAlign: 'center' }}>加载中...</div>

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <Suspense fallback={<Fallback />}>
        <HomePage />
      </Suspense>
    )
  },
  {
    path: '/login',
    element: (
      <Suspense fallback={<Fallback />}>
        <LoginPage />
      </Suspense>
    )
  },
  {
    path: '/favorites',
    element: (
      <Suspense fallback={<Fallback />}>
        <FavoriteList />
      </Suspense>
    )
  },
  {
    path: '/recipe/:id',
    element: (
      <Suspense fallback={<Fallback />}>
        <RecipeDetailPage />
      </Suspense>
    )
  },
  {
    path: '/search',
    element: (
      <Suspense fallback={<Fallback />}>
        <SearchPage />
      </Suspense>
    )
  }
])

export default function Router() {
// @ts-expect-error TS2786 with TS 5.9 + @types/react 18.3 — harmless render types mismatch
  return <RouterProvider router={router} />
}
