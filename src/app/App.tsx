import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { router } from './routes';
import { AppProvider } from './context/AppContext';

export default function App() {
  return (
    <AppProvider>
      <RouterProvider router={router} />
      <Toaster position="top-center" richColors />
    </AppProvider>
  );
}
