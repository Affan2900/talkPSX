import Header from "./components/Header"
import Hero from "./components/Hero"
import Features from "./components/Features"
import Footer from "./components/Footer"
import DynamicBackground from "./components/DynamicBackground"

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden">
      <DynamicBackground />
      <div className="relative z-10">
        <div className="min-h-screen flex flex-col">
          <Header />
          <Hero />
        </div>
        <Features />
        <Footer />
      </div>
    </div>
  )
}

