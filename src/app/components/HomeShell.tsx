"use client";

import { useState } from "react";
import Header from "./Header";
import Hero from "./Hero";
import Sidebar from "./Sidebar";

export default function HomeShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen((open) => !open);

  return (
    <>
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      <Header sidebarOpen={sidebarOpen} />
      <Hero sidebarOpen={sidebarOpen} />
    </>
  );
}
