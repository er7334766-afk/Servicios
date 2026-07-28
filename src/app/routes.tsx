//routes.tsx
import { createBrowserRouter, Navigate } from 'react-router';
import { lazy, Suspense, type ReactNode } from 'react';
import { MobileShell } from './components/layout/MobileShell';

import ServiceManagementScreen from './components/screens/ServiceManagementScreen';

const LandingScreen = lazy(
  () =>
    import(
      './components/screens/LandingScreen'
    )
);

const AuthScreen = lazy(
  () =>
    import(
      './components/screens/AuthScreen'
    )
);

const HomeRouter = lazy(
  () =>
    import(
      './components/screens/HomeRouter'
    )
);

const SearchScreen = lazy(
  () =>
    import(
      './components/screens/SearchScreen'
    )
);

const ClientServiceDetailScreen = lazy(
  () =>
    import(
      './components/screens/ClientServiceDetailScreen'
    )
);

const WorkerProfileScreen = lazy(
  () =>
    import(
      './components/screens/WorkerProfileScreen'
    )
);

const WorkerServiceDetailScreen = lazy(
  () =>
    import(
      './components/screens/WorkerServiceDetailScreen'
    )
);

const ProfileRouter = lazy(
  () =>
    import(
      './components/screens/ProfileRouter'
    )
);

const ChatListScreen = lazy(
  () =>
    import(
      './components/screens/ChatListScreen'
    )
);

const ChatScreen = lazy(
  () =>
    import(
      './components/screens/ChatScreen'
    )
);

const AgendaScreen = lazy(
  () =>
    import(
      './components/screens/AgendaScreen'
    )
);

const ReviewScreen = lazy(
  () =>
    import(
      './components/screens/ReviewScreen'
    )
);

const ReportScreen = lazy(
  () =>
    import(
      './components/screens/ReportScreen'
    )
);

const NotificationsScreen = lazy(
  () =>
    import(
      './components/screens/NotificationsScreen'
    )
);

const PaymentMethodScreen = lazy(
  () =>
    import(
      './components/screens/PaymentMethodScreen'
    )
);

function Loader() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1A56DB] border-t-transparent" />
    </div>
  );
}

function S({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense fallback={<Loader />}>
      {children}
    </Suspense>
  );
}

export const router =
  createBrowserRouter([
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
      path: 'solicitud/:idServicio',
      element: (
        <S>
          <WorkerServiceDetailScreen />
        </S>
      ),
    },

    {
      path: 'mis-solicitudes/:idServicio',
      element: (
        <S>
          <ClientServiceDetailScreen />
        </S>
      ),
    },

    // ===============================
    // NUEVAS RUTAS
    // ===============================

    {
      path: 'trabajo/:idServicio',
      element: (
        <S>
          <ServiceManagementScreen />
        </S>
      ),
    },

    {
      path: 'contratacion/:idServicio',
      element: (
        <S>
          <ServiceManagementScreen />
        </S>
      ),
    },

    // ===============================

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
      element: (
        <Navigate
          to="/"
          replace
        />
      ),
    },
  ]);