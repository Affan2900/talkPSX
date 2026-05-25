import HomeShell from "./components/HomeShell"
import Features from "./components/Features"
import About from "./components/About"
import Footer from "./components/Footer"
import DynamicBackground from "./components/DynamicBackground"

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <DynamicBackground />
      <div className="relative z-10">
        <div className="flex min-h-screen flex-col">
          <HomeShell />
        </div>
        <Features />
        <About />
        <Footer />
      </div>
    </div>
  )
}

