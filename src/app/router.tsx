import { createBrowserRouter } from 'react-router-dom'
import { NotFoundPage } from '@/pages/not-found-page'
export const router = createBrowserRouter([{ path: '*', element: <NotFoundPage /> }])
