import MainPage from "@/components/pages/MainPage/MainPage";
import dynamic from "next/dynamic";

export default dynamic(() => import("./MainPage"), { ssr: false });
