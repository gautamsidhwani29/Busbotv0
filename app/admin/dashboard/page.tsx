"use client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label";
import {Slider} from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { MapPin, Calendar, LogOut, Home, Route, Users } from "lucide-react"
import { busStops, busRoutes } from "@/lib/data"
import { BusStopManager } from "@/components/bus-stop-form"
import { WorkerScheduler } from "@/components/worker-scheduler"
import AdminMap from "@/components/admin-map"
import { RouteGenerator } from "@/components/route-generator"
import { WorkerManager } from "@/components/worker-manager"
import { useLocalStorage } from "@/lib/hooks"
import type { BusStop, BusRoute } from "@/lib/types"
import { ThemeToggle } from "@/components/theme-toggle"
import { useState, useEffect } from "react"
import { GlowingBorder } from "@/components/ui/glowing-border"
import { MagneticButton } from "@/components/ui/magnetic-button"
import { TextSpotlight } from "@/components/ui/text-spotlight"
import { ParticleBackground } from "@/components/ui/particle-background"
import OptimizedRouteDisplay from "@/components/OptimizedRouteDisplay"
import { TransportApp } from "@/components/Worker_Assignment_Component"

export default function AdminDashboard() {
  const [stops, setStops] = useLocalStorage<BusStop[]>("bus-stops", busStops)
  const [routes, setRoutes] = useLocalStorage<BusRoute[]>("bus-routes", busRoutes)
  const [isLoaded, setIsLoaded] = useState(false)
  const [minStops, setMinStops] = useState(5)
  const [maxStops, setMaxStops] = useState(20)
  const [maxDuration, setMaxDuration] = useState(60)
  const [maxDistance, setMaxDistance] = useState(15)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  const handleAddStop = (newStop: BusStop) => {
    setStops([...stops, newStop])
  }

  const handleRoutesGenerated = (newRoutes: BusRoute[]) => {
    setRoutes(newRoutes)
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary text-2xl font-bold pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <ParticleBackground />

      <header className="border-b border-border relative z-10">
        <div className="container mx-auto py-4 px-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold gradient-text fade-in">Admin Dashboard</h1>
          <div className="flex gap-2 items-center">
            <ThemeToggle />
            <Link href="/">
              <MagneticButton className="hover-glow">
                <Button variant="outline" size="sm">
                  <Home className="h-4 w-4 mr-2" />
                  Home
                </Button>
              </MagneticButton>
            </Link>
            <Link href="/login">
              <MagneticButton className="hover-glow">
                <Button variant="outline" size="sm">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </MagneticButton>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1 slide-in">
            <GlowingBorder>
              <Card className="border-0 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="gradient-text">Admin Panel</CardTitle>
                  <CardDescription>Manage bus routes and workers</CardDescription>
                </CardHeader>
                <CardContent>
                  <nav className="space-y-2">
                    <Link href="/map">
                      <Button variant="outline" className="w-full justify-start transition-all hover:scale-105">
                        <MapPin className="h-4 w-4 mr-2" />
                        View Map
                      </Button>
                    </Link>
                  </nav>
                </CardContent>
              </Card>
            </GlowingBorder>
          </div>

          <div className="md:col-span-3 slide-in" style={{ animationDelay: "0.2s" }}>
  <GlowingBorder>
    <Card className="border-0 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <TextSpotlight>
          <CardTitle className="gradient-text">Management Console</CardTitle>
          <CardDescription>Add bus stops, schedule workers, and generate routes</CardDescription>
        </TextSpotlight>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="map">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger
              value="map"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <MapPin className="h-4 w-4" />
              <span>Map</span>
            </TabsTrigger>
            <TabsTrigger
              value="stops"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <MapPin className="h-4 w-4" />
              <span>Bus Stops</span>
            </TabsTrigger>
            <TabsTrigger
              value="routes"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Route className="h-4 w-4" />
              <span>Routes</span>
            </TabsTrigger>
            <TabsTrigger
              value="workers"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Users className="h-4 w-4" />
              <span>Workers</span>
            </TabsTrigger>
            <TabsTrigger
              value="schedule"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Calendar className="h-4 w-4" />
              <span>Schedule</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="map" className="fade-in">
            <AdminMap onAddStop={handleAddStop} />
          </TabsContent>

          <TabsContent value="stops" className="fade-in">
            <BusStopManager onAddStop={handleAddStop} />
          </TabsContent>

          <TabsContent value="routes" className="fade-in">
            <OptimizedRouteDisplay/>
          </TabsContent>
          {/* <TabsContent value="routes" className="fade-in">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="routeName">Route Name (Optional)</Label>
                  <Input id="routeName" placeholder="Enter route name" />
                </div>
                <div>
                  <Label htmlFor="depotName">Depot Name</Label>
                  <Input id="depotName" placeholder="Enter depot name" required />
                </div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between">
                    <Label>Min Stops : {minStops}</Label>
                    <span className="text-sm text-muted-foreground">0-20</span>
                  </div>
                  <Slider 
                    defaultValue={[5]} 
                    max={20} 
                    step={1}
                    onValueChange={(x)=>setMinStops(x[0])}
                    className="mt-2" 
                  />
                </div>
                
                <div>
                  <div className="flex justify-between">
                    <Label>Max Stops : {maxStops}</Label>
                    <span className="text-sm text-muted-foreground">0-40</span>
                  </div>
                  <Slider 
                    defaultValue={[20]} 
                    max={40} 
                    step={1}
                    className="mt-2" 
                    onValueChange={(x)=>setMaxStops(x[0])}
                  />
                </div>
                
                <div>
                  <div className="flex justify-between">
                    <Label>Max Duration (minutes) : {maxDuration} Minutes</Label>
                    <span className="text-sm text-muted-foreground">0-120 mins</span>
                  </div>
                  <Slider 
                    defaultValue={[60]} 
                    max={120} 
                    onValueChange={(x)=>setMaxDuration(x[0])}
                    step={5}
                    className="mt-2" 
                  />
                </div>
                
                <div>
                  <div className="flex justify-between">
                    <Label>Max Distance : {maxDistance} Kms</Label>
                    <span className="text-sm text-muted-foreground">0-30 kms</span>
                  </div>
                  <Slider 
                    defaultValue={[15]} 
                    onValueChange={(x)=>setMaxDistance(x[0])}
                    max={30} 
                    step={1}
                    className="mt-2" 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="priorityWeight">Priority Weight</Label>
                  <Input id="priorityWeight" type="number" min="1" max="10" defaultValue="5" />
                </div>
                <div>
                  <Label htmlFor="numberOfBuses">Number of Buses</Label>
                  <Input id="numberOfBuses" type="number" min="1" defaultValue="1" />
                </div>
                <div>
                  <Label htmlFor="frequency">Frequency (mins)</Label>
                  <Input id="frequency" type="number" min="5" defaultValue="30" />
                </div>
              </div>
              
              
            </div>
          </TabsContent> */}
          {/* // Route Displayer Ends Here  */}


          <TabsContent value="workers" className="fade-in">
            <WorkerManager />
          </TabsContent>

          <TabsContent value="schedule" className="fade-in">
            <TransportApp />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  </GlowingBorder>
</div>
        </div>
      </main>
    </div>
  )
}

