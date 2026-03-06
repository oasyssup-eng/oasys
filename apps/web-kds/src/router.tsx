import { createBrowserRouter, Navigate } from 'react-router-dom';
import { App } from './App';
import { Login } from './pages/Login';
import { KDSQueue } from './pages/KDSQueue';
import { KDSStats } from './pages/KDSStats';
import { PickupBoard } from './pages/PickupBoard';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/queue" replace /> },
      { path: 'queue', element: <KDSQueue /> },
      { path: 'stats', element: <KDSStats /> },
    ],
  },
  { path: '/login', element: <Login /> },
  { path: '/:slug/pickup', element: <PickupBoard /> },
]);
