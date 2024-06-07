import dynamic from 'next/dynamic';

export default dynamic(() => import('./MainPage'), { ssr: false });
