import { useApp } from '../../context/AppContext';
import HomeClientScreen from './HomeClientScreen';
import HomeWorkerScreen from './HomeWorkerScreen';

export default function HomeRouter() {
  const { role } = useApp();
  return role === 'worker' ? <HomeWorkerScreen /> : <HomeClientScreen />;
}
