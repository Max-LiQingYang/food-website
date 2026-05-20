import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { lazy, Suspense } from 'react'

const HomePage = lazy(() => import('../pages/HomePage'))
const FavoriteList = lazy(() => import('../pages/FavoriteList'))

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <Suspense fallback={<div style={{ padding: 20, textAlign: 'center' }}>加载中...</div>}>
        <HomePage />
      </Suspense>
    )
  },
  {
    path: '/favorites',
    element: (
      <Suspense fallback={<div style={{ padding: 20, textAlign: 'center' }}>加载中...</div>}>
        <FavoriteList />
      </Suspense>
    )
  }
])

export default function Router() {
// @ts-expect-error TS2786 with TS 5.9 + @types/react 18.3 — harmless render types mismatch
  return <RouterProvider router={router} />
}
