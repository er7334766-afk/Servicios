//ProfileRouter.tsx
import { useApp } from '../../context/AppContext';
import ClientProfileScreen from './ClientProfileScreen';
import WorkerOwnProfileScreen from './WorkerOwnProfileScreen';

export default function ProfileRouter() {
  const { role } = useApp();
  return role === 'worker' ? <WorkerOwnProfileScreen /> : <ClientProfileScreen />;
}
