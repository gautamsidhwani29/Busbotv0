"use client"

import React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { format } from "date-fns"
import { RefreshCw, Clock, ChevronDown, ChevronUp } from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { OptimizedRoute } from "@/lib/types"
import { Slider } from "@/components/ui/slider"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

// Create a constant for localStorage key
const SCHEDULER_FORM_STATE_KEY = "worker_scheduler_form_state"

export function WorkerScheduler() {
  const [routes, setRoutes] = useState<OptimizedRoute[]>([])
  const [generatedSchedules, setGeneratedSchedules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  
  // Default values
  const defaultFormState = {
    workStart: "06:00",
    workEnd: "01:00",
    peakHoursMorningStart: 8,
    peakHoursMorningEnd: 10,
    peakHoursMorningFreq: 30,
    peakHoursEveningStart: 17,
    peakHoursEveningEnd: 20,
    peakHoursEveningFreq: 30,
    morningShiftStart: 6,
    morningShiftEnd: 14,
    eveningShiftStart: 14,
    eveningShiftEnd: 25, // 1 AM next day
    requiredWorkTime: 420,
  }
  
  // Schedule generation parameters
  const [workStart, setWorkStart] = useState(defaultFormState.workStart)
  const [workEnd, setWorkEnd] = useState(defaultFormState.workEnd)
  const [peakHoursMorningStart, setPeakHoursMorningStart] = useState(defaultFormState.peakHoursMorningStart)
  const [peakHoursMorningEnd, setPeakHoursMorningEnd] = useState(defaultFormState.peakHoursMorningEnd)
  const [peakHoursMorningFreq, setPeakHoursMorningFreq] = useState(defaultFormState.peakHoursMorningFreq)
  const [peakHoursEveningStart, setPeakHoursEveningStart] = useState(defaultFormState.peakHoursEveningStart)
  const [peakHoursEveningEnd, setPeakHoursEveningEnd] = useState(defaultFormState.peakHoursEveningEnd)
  const [peakHoursEveningFreq, setPeakHoursEveningFreq] = useState(defaultFormState.peakHoursEveningFreq)
  const [morningShiftStart, setMorningShiftStart] = useState(defaultFormState.morningShiftStart)
  const [morningShiftEnd, setMorningShiftEnd] = useState(defaultFormState.morningShiftEnd)
  const [eveningShiftStart, setEveningShiftStart] = useState(defaultFormState.eveningShiftStart)
  const [eveningShiftEnd, setEveningShiftEnd] = useState(defaultFormState.eveningShiftEnd)
  const [requiredWorkTime, setRequiredWorkTime] = useState(defaultFormState.requiredWorkTime)
  
  // Stats
  const [morningEmployees, setMorningEmployees] = useState(0)
  const [eveningEmployees, setEveningEmployees] = useState(0)
  
  // Track open/closed state for collapsible items
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({})

  // Toggle open/closed state for a specific route
  const toggleOpenItem = (routeId: string) => {
    setOpenItems(prev => ({
      ...prev,
      [routeId]: !prev[routeId]
    }))
  }

  // Load saved form state from localStorage on initial mount
  useEffect(() => {
    // Only run in browser environment
    if (typeof window !== 'undefined') {
      try {
        const savedFormState = localStorage.getItem(SCHEDULER_FORM_STATE_KEY)
        if (savedFormState) {
          const parsedState = JSON.parse(savedFormState)
          
          // Set all form values from localStorage
          setWorkStart(parsedState.workStart || defaultFormState.workStart)
          setWorkEnd(parsedState.workEnd || defaultFormState.workEnd)
          setPeakHoursMorningStart(parsedState.peakHoursMorningStart || defaultFormState.peakHoursMorningStart)
          setPeakHoursMorningEnd(parsedState.peakHoursMorningEnd || defaultFormState.peakHoursMorningEnd)
          setPeakHoursMorningFreq(parsedState.peakHoursMorningFreq || defaultFormState.peakHoursMorningFreq)
          setPeakHoursEveningStart(parsedState.peakHoursEveningStart || defaultFormState.peakHoursEveningStart)
          setPeakHoursEveningEnd(parsedState.peakHoursEveningEnd || defaultFormState.peakHoursEveningEnd)
          setPeakHoursEveningFreq(parsedState.peakHoursEveningFreq || defaultFormState.peakHoursEveningFreq)
          setMorningShiftStart(parsedState.morningShiftStart || defaultFormState.morningShiftStart)
          setMorningShiftEnd(parsedState.morningShiftEnd || defaultFormState.morningShiftEnd)
          setEveningShiftStart(parsedState.eveningShiftStart || defaultFormState.eveningShiftStart)
          setEveningShiftEnd(parsedState.eveningShiftEnd || defaultFormState.eveningShiftEnd)
          setRequiredWorkTime(parsedState.requiredWorkTime || defaultFormState.requiredWorkTime)
        }
      } catch (error) {
        console.error("Error loading saved form state:", error)
        // If error loading saved state, we'll use the defaults already set
      }
    }
  }, [])

  // Save form state to localStorage whenever any form value changes
  useEffect(() => {
    // Only run in browser environment
    if (typeof window !== 'undefined') {
      try {
        const formState = {
          workStart,
          workEnd,
          peakHoursMorningStart,
          peakHoursMorningEnd,
          peakHoursMorningFreq,
          peakHoursEveningStart,
          peakHoursEveningEnd,
          peakHoursEveningFreq,
          morningShiftStart,
          morningShiftEnd,
          eveningShiftStart,
          eveningShiftEnd,
          requiredWorkTime,
        }
        
        localStorage.setItem(SCHEDULER_FORM_STATE_KEY, JSON.stringify(formState))
      } catch (error) {
        console.error("Error saving form state:", error)
      }
    }
  }, [
    workStart,
    workEnd,
    peakHoursMorningStart,
    peakHoursMorningEnd,
    peakHoursMorningFreq,
    peakHoursEveningStart,
    peakHoursEveningEnd,
    peakHoursEveningFreq,
    morningShiftStart,
    morningShiftEnd,
    eveningShiftStart,
    eveningShiftEnd,
    requiredWorkTime,
  ])

  useEffect(() => {
    // Fetch routes and then schedules
    supabase.from("optimized_routes").select("*").order("name")
      .then((routesResponse) => {
        if (routesResponse.error) throw routesResponse.error
        const loadedRoutes = routesResponse.data || []
        setRoutes(loadedRoutes)
        
        // Add some dummy data if no routes found
        if (!routesResponse.data || routesResponse.data.length === 0) {
          const dummyRoutes = [
            { id: "1", name: "Downtown Loop", duration: 45, avg_priority: 8 },
            { id: "2", name: "Airport Express", duration: 30, avg_priority: 9 },
            { id: "3", name: "Suburb Connector", duration: 60, avg_priority: 5 }
          ];
          setRoutes(dummyRoutes);
        }
        
        // After loading routes, fetch existing schedules
        return supabase.from("schedule").select("*")
          .then((schedulesResponse) => {
            if (schedulesResponse.error) throw schedulesResponse.error
            
            if (schedulesResponse.data && schedulesResponse.data.length > 0) {
              // Get the routes that are now in state
              const currentRoutes = loadedRoutes.length > 0 ? loadedRoutes : dummyRoutes;
              
              // Format the schedules to match our component's expected structure
              const formattedSchedules = schedulesResponse.data.map(schedule => {
                const matchingRoute = currentRoutes.find(r => r.id === schedule.route_id) || {};
                
                // Calculate frequency based on priority if available
                const normalized_priority = Math.max(1, Math.min(10, matchingRoute.avg_priority || 5))
                const frequency = Math.floor(40 - ((normalized_priority - 1) / 9) * 30)
                
                return {
                  route_id: schedule.route_id,
                  name: matchingRoute.name || `Route ${schedule.route_id.substring(0, 8)}`,
                  avg_priority: matchingRoute.avg_priority || 5,
                  estimated_time: matchingRoute.duration || 30,
                  frequency: frequency,
                  schedule: schedule.schedule || []
                };
              });
              
              setGeneratedSchedules(formattedSchedules);
              
              // Calculate employee counts
              const { morningEmp, eveningEmp } = calculateEmployeeRequirements(
                formattedSchedules,
                [morningShiftStart, morningShiftEnd],
                [eveningShiftStart, eveningShiftEnd],
                requiredWorkTime
              );
              
              setMorningEmployees(morningEmp);
              setEveningEmployees(eveningEmp);
            }
          });
      })
      .catch((error) => {
        console.error("Error loading data:", error)
        toast({
          title: "Error",
          description: "Failed to load data",
          variant: "destructive",
        })
        
        // Add dummy routes on error too
        const dummyRoutes = [
          { id: "1", name: "Downtown Loop", duration: 45, avg_priority: 8 },
          { id: "2", name: "Airport Express", duration: 30, avg_priority: 9 },
          { id: "3", name: "Suburb Connector", duration: 60, avg_priority: 5 }
        ];
        setRoutes(dummyRoutes);
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  // Helper function to calculate employee requirements
  const calculateEmployeeRequirements = (schedules, morningShift, eveningShift, requiredWorkTime) => {
    let totalMorningMinutes = 0;
    let totalEveningMinutes = 0;

    schedules.forEach(route => {
      route.schedule.forEach(departureTime => {
        const [hours, minutes] = departureTime.split(':').map(Number);
        let hour = hours;

        // Handle times after midnight
        if (hour < parseInt(workStart.split(':')[0])) {
          hour += 24;
        }

        const totalWorkMinutes = route.estimated_time;

        // Assign to morning or evening shift
        if (morningShift[0] <= hour && hour < morningShift[1]) {
          totalMorningMinutes += totalWorkMinutes;
        } else {
          totalEveningMinutes += totalWorkMinutes;
        }
      });
    });

    // Calculate required employees with a buffer
    const adjustedRequiredWorkTime = requiredWorkTime * 0.9;
    const morningEmployees = Math.ceil(totalMorningMinutes / adjustedRequiredWorkTime);
    const eveningEmployees = Math.ceil(totalEveningMinutes / adjustedRequiredWorkTime);

    return {
      morningEmp: morningEmployees,
      eveningEmp: eveningEmployees
    };
  };

  const generateSchedules = async () => {
    if (routes.length === 0) {
      toast({
        title: "Error",
        description: "No routes available to schedule",
        variant: "destructive",
      });
      return;
    }
  
    setGenerating(true);
  
    try {
      // Delete existing schedules before generating new ones
      const { error: deleteError } = await supabase.from("schedule").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  
      if (deleteError) throw deleteError;
  
      // Prepare parameters
      const peakHours = [
        [peakHoursMorningStart, peakHoursMorningEnd, peakHoursMorningFreq],
        [peakHoursEveningStart, peakHoursEveningEnd, peakHoursEveningFreq],
      ];
      const morningShift = [morningShiftStart, morningShiftEnd];
      const eveningShift = [eveningShiftStart, eveningShiftEnd];
  
      // Generate schedules
      const { scheduledRoutes, morningEmp, eveningEmp } = calculateSchedulesAndEmployees(
        routes,
        workStart,
        workEnd,
        peakHours,
        morningShift,
        eveningShift,
        requiredWorkTime
      );
  
      // Save schedules in the database
      const scheduleEntries = scheduledRoutes.map((route) => ({
        route_id: route.route_id,
        schedule: route.schedule
      }));
  
      const { error: insertError } = await supabase.from("schedule").insert(scheduleEntries);
  
      if (insertError) throw insertError;
  
      // Update state with the generated data
      setGeneratedSchedules(scheduledRoutes);
      setMorningEmployees(morningEmp);
      setEveningEmployees(eveningEmp);
  
      toast({
        title: "Success",
        description: "Schedules generated and saved successfully",
      });
    } catch (error) {
      console.error("Error generating schedules:", error);
      toast({
        title: "Error",
        description: "Failed to generate or save schedules",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };
  
  // Helper function to simulate the Python scheduling logic
  const calculateSchedulesAndEmployees = (routes, workStart, workEnd, peakHours, morningShift, eveningShift, requiredWorkTime) => {
    // Create schedule for routes
    const scheduledRoutes = routes.map(route => {
      // Prepare data structures similar to the Python code
      const routeObj = {
        route_id: route.id,
        estimated_time: route.duration || 30,
        length: route.distance || route.stops_number * 2 || 10,
        avg_priority: route.avg_priority || 5,
        name: route.name || `Route ${route.id.substring(0, 8)}`,
        schedule: []
      }

      // Calculate frequency based on priority
      const normalized_priority = Math.max(1, Math.min(10, routeObj.avg_priority))
      routeObj.frequency = Math.floor(40 - ((normalized_priority - 1) / 9) * 30)

      return routeObj
    })

    // Generate schedules - Simplified simulation of the Python logic
    // Parse start/end times
    let currentTime = new Date()
    currentTime.setHours(parseInt(workStart.split(":")[0]), parseInt(workStart.split(":")[1]), 0)

    let endTime = new Date()
    const endHour = parseInt(workEnd.split(":")[0])
    const endMinute = parseInt(workEnd.split(":")[1])
    
    // Handle next day scenario
    if (endHour < currentTime.getHours()) {
      endTime.setDate(endTime.getDate() + 1)
    }
    endTime.setHours(endHour, endMinute, 0)

    // Track when each route should be scheduled next
    const nextScheduleTime = {}
    scheduledRoutes.forEach(route => {
      nextScheduleTime[route.route_id] = new Date(currentTime)
      route.schedule = []
    })

    // Process all time slots in chronological order
    while (currentTime < endTime) {
      // Determine interval based on peak hours
      let interval = 10
      for (const [peakStart, peakEnd, peakMin] of peakHours) {
        if (peakStart <= currentTime.getHours() && currentTime.getHours() < peakEnd) {
          interval = Math.floor(peakMin / 2)
          break
        }
      }

      const timeSlot = `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`

      // Check which routes should be scheduled at this time
      scheduledRoutes.forEach(route => {
        if (currentTime >= nextScheduleTime[route.route_id]) {
          // Add to schedule
          route.schedule.push(timeSlot)

          // Calculate when to schedule this route next
          let peakFactor = 1.0
          for (const [peakStart, peakEnd] of peakHours) {
            if (peakStart <= currentTime.getHours() && currentTime.getHours() < peakEnd) {
              peakFactor = 0.7
              break
            }
          }

          // Set next schedule time
          const adjustedFrequency = Math.max(10, Math.floor(route.frequency * peakFactor))
          const nextTime = new Date(currentTime)
          nextTime.setMinutes(nextTime.getMinutes() + adjustedFrequency)
          nextScheduleTime[route.route_id] = nextTime
        }
      })

      // Move to next time slot
      currentTime.setMinutes(currentTime.getMinutes() + interval)
    }

    // Calculate required employees
    let totalMorningMinutes = 0
    let totalEveningMinutes = 0

    scheduledRoutes.forEach(route => {
      route.schedule.forEach(departureTime => {
        const [hours, minutes] = departureTime.split(':').map(Number)
        let hour = hours

        // Handle times after midnight
        if (hour < parseInt(workStart.split(':')[0])) {
          hour += 24
        }

        const totalWorkMinutes = route.estimated_time

        // Assign to morning or evening shift
        if (morningShift[0] <= hour && hour < morningShift[1]) {
          totalMorningMinutes += totalWorkMinutes
        } else {
          totalEveningMinutes += totalWorkMinutes
        }
      })
    })

    // Calculate required employees with a buffer
    const adjustedRequiredWorkTime = requiredWorkTime * 0.9
    const morningEmployees = Math.ceil(totalMorningMinutes / adjustedRequiredWorkTime)
    const eveningEmployees = Math.ceil(totalEveningMinutes / adjustedRequiredWorkTime)

    return {
      scheduledRoutes,
      morningEmp: morningEmployees,
      eveningEmp: eveningEmployees
    }
  }

  if (loading && !routes.length) {
    return <div className="text-center p-8">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate Route Schedules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label>Working Hours</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label htmlFor="work-start" className="text-sm">Start</Label>
                    <Input 
                      id="work-start" 
                      type="time" 
                      value={workStart} 
                      onChange={(e) => setWorkStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="work-end" className="text-sm">End</Label>
                    <Input 
                      id="work-end" 
                      type="time" 
                      value={workEnd} 
                      onChange={(e) => setWorkEnd(e.target.value)} 
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <Label>Morning Peak Hours</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div>
                    <Label htmlFor="morning-peak-start" className="text-sm">Start (hr)</Label>
                    <Input 
                      id="morning-peak-start" 
                      type="number" 
                      min="0" 
                      max="23" 
                      value={peakHoursMorningStart} 
                      onChange={(e) => setPeakHoursMorningStart(parseInt(e.target.value))} 
                    />
                  </div>
                  <div>
                    <Label htmlFor="morning-peak-end" className="text-sm">End (hr)</Label>
                    <Input 
                      id="morning-peak-end" 
                      type="number" 
                      min="0" 
                      max="23" 
                      value={peakHoursMorningEnd} 
                      onChange={(e) => setPeakHoursMorningEnd(parseInt(e.target.value))} 
                    />
                  </div>
                  <div>
                    <Label htmlFor="morning-peak-freq" className="text-sm">Freq (min)</Label>
                    <Input 
                      id="morning-peak-freq" 
                      type="number" 
                      min="5" 
                      max="60" 
                      value={peakHoursMorningFreq} 
                      onChange={(e) => setPeakHoursMorningFreq(parseInt(e.target.value))} 
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <Label>Evening Peak Hours</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div>
                    <Label htmlFor="evening-peak-start" className="text-sm">Start (hr)</Label>
                    <Input 
                      id="evening-peak-start" 
                      type="number" 
                      min="0" 
                      max="23" 
                      value={peakHoursEveningStart} 
                      onChange={(e) => setPeakHoursEveningStart(parseInt(e.target.value))} 
                    />
                  </div>
                  <div>
                    <Label htmlFor="evening-peak-end" className="text-sm">End (hr)</Label>
                    <Input 
                      id="evening-peak-end" 
                      type="number" 
                      min="0" 
                      max="23" 
                      value={peakHoursEveningEnd} 
                      onChange={(e) => setPeakHoursEveningEnd(parseInt(e.target.value))} 
                    />
                  </div>
                  <div>
                    <Label htmlFor="evening-peak-freq" className="text-sm">Freq (min)</Label>
                    <Input 
                      id="evening-peak-freq" 
                      type="number" 
                      min="5" 
                      max="60" 
                      value={peakHoursEveningFreq} 
                      onChange={(e) => setPeakHoursEveningFreq(parseInt(e.target.value))} 
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label>Morning Shift Hours</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label htmlFor="morning-shift-start" className="text-sm">Start (hr)</Label>
                    <Input 
                      id="morning-shift-start" 
                      type="number" 
                      min="0" 
                      max="23" 
                      value={morningShiftStart} 
                      onChange={(e) => setMorningShiftStart(parseInt(e.target.value))} 
                    />
                  </div>
                  <div>
                    <Label htmlFor="morning-shift-end" className="text-sm">End (hr)</Label>
                    <Input 
                      id="morning-shift-end" 
                      type="number" 
                      min="0" 
                      max="23" 
                      value={morningShiftEnd} 
                      onChange={(e) => setMorningShiftEnd(parseInt(e.target.value))} 
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <Label>Evening Shift Hours</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label htmlFor="evening-shift-start" className="text-sm">Start (hr)</Label>
                    <Input 
                      id="evening-shift-start" 
                      type="number" 
                      min="0" 
                      max="23" 
                      value={eveningShiftStart} 
                      onChange={(e) => setEveningShiftStart(parseInt(e.target.value))} 
                    />
                  </div>
                  <div>
                    <Label htmlFor="evening-shift-end" className="text-sm">End (hr)</Label>
                    <Input 
                      id="evening-shift-end" 
                      type="number" 
                      min="0" 
                      max="25" 
                      value={eveningShiftEnd} 
                      onChange={(e) => setEveningShiftEnd(parseInt(e.target.value))} 
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <Label htmlFor="required-work-time">
                  Required Work Time per Employee: {requiredWorkTime} minutes ({Math.floor(requiredWorkTime/60)} hours)
                </Label>
                <Slider 
                  id="required-work-time"
                  min={180}
                  max={600}
                  step={30}
                  value={[requiredWorkTime]} 
                  onValueChange={(value) => setRequiredWorkTime(value[0])}
                  className="mt-2"
                />
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <Button 
              onClick={generateSchedules}
              disabled={generating}
              className="w-full md:w-auto"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {generating ? "Generating..." : "Generate Schedule"}
            </Button>
          </div>
          
          {morningEmployees > 0 && eveningEmployees > 0 && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Morning Shift</h3>
                      <p className="text-sm text-muted-foreground">
                        {morningShiftStart}:00 - {morningShiftEnd}:00
                      </p>
                    </div>
                    <div className="text-4xl font-bold">{morningEmployees}</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Evening Shift</h3>
                      <p className="text-sm text-muted-foreground">
                        {eveningShiftStart}:00 - {eveningShiftEnd > 24 ? `${eveningShiftEnd - 24}:00` : `${eveningShiftEnd}:00`}
                      </p>
                    </div>
                    <div className="text-4xl font-bold">{eveningEmployees}</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Always display the Generated Route Schedules section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Generated Route Schedules</CardTitle>
        </CardHeader>
        <CardContent>
          {generatedSchedules.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Route</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Departures</TableHead>
                    <TableHead className="w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {generatedSchedules.map((route) => (
                    <React.Fragment key={route.route_id}>
                      <TableRow>
                        <TableCell>{route.name}</TableCell>
                        <TableCell>{route.avg_priority.toFixed(1)}</TableCell>
                        <TableCell>{route.frequency} min</TableCell>
                        <TableCell>{route.schedule.length}</TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => toggleOpenItem(route.route_id)}
                            className="p-0 h-8 w-8"
                          >
                            {openItems[route.route_id] ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {openItems[route.route_id] && (
                        <TableRow>
                          <TableCell colSpan={5} className="p-0 border-t-0">
                            <div className="bg-muted/30 p-4">
                              <h4 className="text-sm font-medium mb-2">Schedule Details</h4>
                              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                                {route.schedule.map((time, idx) => (
                                  <div key={idx} className="bg-secondary p-2 rounded flex items-center text-sm">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {time}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 border rounded-md">
              <p className="text-muted-foreground">No schedules generated yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Click the "Generate Schedule" button above to create route schedules
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      <Toaster />
    </div>
  );
}