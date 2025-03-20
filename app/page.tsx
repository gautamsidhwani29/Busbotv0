import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import { Bus, MapPin, UserCog } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto py-4 px-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Bus className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-primary">Bus Route System</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto py-12 px-4">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Bus Route Management System</h2>
          <p className="text-lg text-muted-foreground mb-8">
            View routes, check schedules, and explore the transportation network
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-center mb-4">
                <MapPin className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-xl text-center">View Bus Stops</CardTitle>
              <CardDescription className="text-center">Visualize and explore optimized bus routes</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Link href="/map">
                <Button size="lg">View Map</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-center mb-4">
                <UserCog className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-xl text-center">Worker Dashboard</CardTitle>
              <CardDescription className="text-center">View your assigned routes and schedules</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Link href="/login">
                <Button size="lg">Login</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-center mb-4">
                <UserCog className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-xl text-center">Admin Dashboard</CardTitle>
              <CardDescription className="text-center">Manage stops, routes, and worker schedules</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Link href="/login">
                <Button size="lg">Login</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t border-border py-6">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2025 Bus Route Optimization System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
