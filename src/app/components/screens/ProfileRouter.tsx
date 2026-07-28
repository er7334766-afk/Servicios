//ProfileRouter.tsx
import { useApp } from '../../context/AppContext';
import ClientProfileScreen from './ClientProfileScreen';
import WorkerOwnProfileScreen from './WorkerOwnProfileScreen';

export default function ProfileRouter() {
  const { role, currentUser } = useApp();
  const rolActivo = currentUser?.role ?? role;

  return rolActivo === 'worker' ? <WorkerOwnProfileScreen /> : <ClientProfileScreen />;
}
