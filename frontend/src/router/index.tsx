import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Navbar from '../components/Navbar'

const HomePage = lazy(() => import('../pages/HomePage'))
const FavoriteList = lazy(() => import('../pages/FavoriteList'))
const LoginPage = lazy(() => import('../pages/LoginPage'))
const RecipeDetailPage = lazy(() => import('../pages/RecipeDetailPage'))
const SearchPage = lazy(() => import('../pages/SearchPage'))
const UserProfilePage = lazy(() => import('../pages/UserProfilePage'))
const CreateRecipePage = lazy(() => import('../pages/CreateRecipePage'))

const Fallback = () => <div style={{ padding: 20, textAlign: 'center' }}>加载中...</div>

function Layout() {
  return (
    <>
      <Navbar />
      <Suspense fallback={<Fallback />}>
        <Outlet />
      </Suspense>
    </>
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
      { path: '/search', element: <SearchPage /> },
      { path: '/user/:id', element: <UserProfilePage /> },
    ]
  }
])

export default function Router() {
// @ts-expect-error TS2786 with TS 5.9 + @types/react 18.3 — harmless render types mismatch
  return <RouterProvider router={router} />
}