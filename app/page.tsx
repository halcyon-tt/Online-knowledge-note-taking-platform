"use client";
import { redirect } from "next/navigation";

export default function Home() {
  // 项目展示页出现问题
  // const re = () => { setTimeout(() => { redirect("/dashboard"); }, 3000); return <p>刷新ing</p> }
  // const isFirstLoad = () => {
  //   const hasVisited = localStorage.getItem("hasVisited");
  //   if (!hasVisited) {
  //     localStorage.setItem("hasVisited", "true");
  //     return true;
  //   }
  //   return false;
  // }
  // return (<div className="h-screen w-screen flex items-center justify-center">
  //   {isFirstLoad() ? (<button onClick={re}>进入项目</button>) : re()}
  // </div>)
  redirect("/dashboard");
}
