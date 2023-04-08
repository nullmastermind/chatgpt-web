import dynamic from "next/dynamic";

export default dynamic(() => import("@/components/pages/MainPage/MainPage"), {
  ssr: false,
});
