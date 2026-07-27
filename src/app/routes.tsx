import { createBrowserRouter, Navigate } from 'react-router';
import { lazy, Suspense, type ReactNode } from 'react';
import { MobileShell } from './components/layout/MobileShell';

const LandingScreen = lazy(
  () => import('./components/screens/LandingScreen')
);

const AuthScreen = lazy(
  () => import('./components/screens/AuthScreen')
);

const HomeRouter = lazy(
  () => import('./components/screens/HomeRouter')
);

const SearchScreen = lazy(
  () => import('./components/screens/SearchScreen')
);

const WorkerProfileScreen = lazy(
  () => import('./components/screens/WorkerProfileScreen')
);

const ProfileRouter = lazy(
  () => import('./components/screens/ProfileRouter')
);

const ChatListScreen = lazy(
  () => import('./components/screens/ChatListScreen')
);

const ChatScreen = lazy(
  () => import('./components/screens/ChatScreen')
);

const AgendaScreen = lazy(
  () => import('./components/screens/AgendaScreen')
);

const ReviewScreen = lazy(
  () => import('./components/screens/ReviewScreen')
);

const ReportScreen = lazy(
  () => import('./components/screens/ReportScreen')
);

const NotificationsScreen = lazy(
  () => import('./components/screens/NotificationsScreen')
);

const PaymentMethodScreen = lazy(
  () => import('./components/screens/PaymentMethodScreen')
);

function Loader() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-[#1A56DB] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function S({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<Loader />}>
      {children}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <S>
        <LandingScreen />
      </S>
    ),
  },
  {
    path: '/auth',
    element: (
      <S>
        <AuthScreen />
      </S>
    ),
  },
  {
    path: '/home',
    Component: MobileShell,
    children: [
      {
        index: true,
        element: (
          <S>
            <HomeRouter />
          </S>
        ),
      },
      {
        path: 'search',
        element: (
          <S>
            <SearchScreen />
          </S>
        ),
      },
      {
        path: 'worker/:id',
        element: (
          <S>
            <WorkerProfileScreen />
          </S>
        ),
      },
      {
        path: 'profile',
        element: (
          <S>
            <ProfileRouter />
          </S>
        ),
      },
      {
        path: 'chat',
        element: (
          <S>
            <ChatListScreen />
          </S>
        ),
      },
      {
        path: 'chat/:id',
        element: (
          <S>
            <ChatScreen />
          </S>
        ),
      },
      {
        path: 'agenda',
        element: (
          <S>
            <AgendaScreen />
          </S>
        ),
      },
      {
        path: 'review/:bookingId',
        element: (
          <S>
            <ReviewScreen />
          </S>
        ),
      },
      {
        path: 'report',
        element: (
          <S>
            <ReportScreen />
          </S>
        ),
      },
      {
        path: 'notifications',
        element: (
          <S>
            <NotificationsScreen />
          </S>
        ),
      },
      {
        path: 'payment',
        element: (
          <S>
            <PaymentMethodScreen />
          </S>
        ),
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);