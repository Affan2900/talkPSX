import HomeShell from "./components/HomeShell"
import Features from "./components/Features"
import Footer from "./components/Footer"
import DynamicBackground from "./components/DynamicBackground"

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden">
      <DynamicBackground />
      <div className="relative z-10">
        <div className="min-h-screen flex flex-col">
          <HomeShell />
        </div>
        <Features />
        <Footer />
      </div>
    </div>
  )
}

