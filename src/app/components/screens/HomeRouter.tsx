import { useApp } from '../../context/AppContext';
import HomeClientScreen from './HomeClientScreen';
import HomeWorkerScreen from './HomeWorkerScreen';
import AdminDashboardScreen from './AdminDashboardScreen';

export default function HomeRouter() {
  const { role } = useApp();
  //para cuando tengamos rol admin
  // if (role === 'admin') {
  //   return <AdminDashboardScreen onBack={() => {}} />;
  // }

  return role === 'worker' ? <HomeWorkerScreen /> : <HomeClientScreen />;
}
