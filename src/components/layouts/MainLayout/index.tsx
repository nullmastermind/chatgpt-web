import dynamic from 'next/dynamic';

export default dynamic(() => import('./MainLayout'), {
  ssr: false,
});
