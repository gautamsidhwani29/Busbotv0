import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Clock, Users, Calendar, RefreshCw, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { WorkerScheduler } from "./";

const RouteScheduleGenerator = () => {
  // Schedule parameters
  const [workStart, setWorkStart] = useState("06:00");
  const [workEnd, setWorkEnd] = useState("01:00");
  const [peakHours, setPeakHours] = useState([
    { startHour: 8, endHour: 10, frequency: 30 },
    { startHour: 17, endHour: 20, frequency: 30 }
  ]);
  const [morningShift, setMorningShift] = useState({ start: 6, end: 14 });
  const [eveningShift, setEveningShift] = useState({ start: 14, end: 25 });
  const [requiredWorkTime, setRequiredWorkTime] = useState(420);
  
  // Generated schedule data
  const [routes, setRoutes] = useState([]);
  const [generatedSchedules, setGeneratedSchedules] = useState([]);
  const [morningEmployees, setMorningEmployees] = useState(0);
  const [eveningEmployees, setEveningEmployees] = useState(0);
  const [morningMinutes, setMorningMinutes] = useState(0);
  const [eveningMinutes, setEveningMinutes] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Fetch routes on component mount
  useEffect(() => {
    fetchRoutes();
  }, []);
  
  const fetchRoutes = async () => {
    try {
      const { data, error } = await supabase.from('optimized_routes').select('*');
      
      if (error) throw error;
      
      const routesData = data.map((route, index) => ({
        id: route.id,
        estimatedTime: route.duration || 30,
        length: route.distance || (route.stops_number * 2 || 10),
        avgPriority: route.avg_priority || 5,
        name: route.name || `R${index + 1}`,
        schedule: [],
        frequency: calculateFrequency(route.avg_priority || 5)
      }));
      
      setRoutes(routesData);
    } catch (error) {
      console.error('Error fetching routes:', error);
      toast({
        title: "Error",
        description: "Failed to load routes data",
        variant: "destructive",
      });
    }
  };
  
  const calculateFrequency = (priority) => {
    const normalizedPriority = Math.max(1, Math.min(10, priority));
    return Math.round(40 - ((normalizedPriority - 1) / 9) * 30);
  };
  
  const generateSchedule = () => {
    setIsGenerating(true);
    
    try {
      // Parse times to ensure proper format
      const startTime = workStart;
      const endTime = workEnd;
      
      // Create a master schedule with all possible time slots
      const current = new Date();
      current.setHours(parseInt(startTime.split(':')[0], 10));
      current.setMinutes(parseInt(startTime.split(':')[1], 10));
      current.setSeconds(0);
      
      const end = new Date();
      const endHour = parseInt(endTime.split(':')[0], 10);
      const endMinute = parseInt(endTime.split(':')[1], 10);
      end.setHours(endHour);
      end.setMinutes(endMinute);
      end.setSeconds(0);
      
      // Handle next day scenario
      if (end < current) {
        end.setDate(end.getDate() + 1);
      }
      
      // Reset route schedules
      const updatedRoutes = routes.map(route => ({
        ...route,
        schedule: [],
        lastAssignedTime: null
      }));
      
      // Create a dictionary to track when each route should be scheduled next
      const nextScheduleTime = {};
      updatedRoutes.forEach(route => {
        nextScheduleTime[route.id] = new Date(current);
      });
      
      // Process all time slots in chronological order
      const currentTime = new Date(current);
      while (currentTime < end) {
        // Determine the time interval to the next slot
        let interval = 10;
        for (const peak of peakHours) {
          if (peak.startHour <= currentTime.getHours() && currentTime.getHours() < peak.endHour) {
            interval = Math.floor(peak.frequency / 2);
            break;
          }
        }
        
        const timeSlot = `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`;
        
        // Check which routes should be scheduled at this time
        for (const route of updatedRoutes) {
          // If it's time to schedule this route
          if (currentTime >= nextScheduleTime[route.id]) {
            // Add to schedule
            route.schedule.push(timeSlot);
            route.lastAssignedTime = timeSlot;
            
            // Calculate when to schedule this route next
            let peakFactor = 1.0;
            for (const peak of peakHours) {
              if (peak.startHour <= currentTime.getHours() && currentTime.getHours() < peak.endHour) {
                // Routes run more frequently during peak hours
                peakFactor = 0.7;
                break;
              }
            }
            
            // Set the next time to schedule this route
            const adjustedFrequency = Math.max(10, Math.floor(route.frequency * peakFactor));
            const nextTime = new Date(currentTime);
            nextTime.setMinutes(nextTime.getMinutes() + adjustedFrequency);
            nextScheduleTime[route.id] = nextTime;
          }
        }
        
        // Move to next time slot
        currentTime.setMinutes(currentTime.getMinutes() + interval);
      }
      
      // Calculate required employees
      let totalMorningMinutes = 0;
      let totalEveningMinutes = 0;
      
      for (const route of updatedRoutes) {
        for (const departureTime of route.schedule) {
          const [hours, minutes] = departureTime.split(':').map(Number);
          let hour = hours;
          
          // Handle times after midnight
          if (hour < parseInt(workStart.split(':')[0], 10)) {
            hour += 24;
          }
          
          const totalWorkMinutes = route.estimatedTime;
          if (morningShift.start <= hour && hour < morningShift.end) {
            totalMorningMinutes += totalWorkMinutes;
          } else {
            totalEveningMinutes += totalWorkMinutes;
          }
        }
      }
      
      // Calculate required employees with a buffer
      const adjustedRequiredWorkTime = requiredWorkTime * 0.9; // Add 10% buffer
      const morning = Math.ceil(totalMorningMinutes / adjustedRequiredWorkTime);
      const evening = Math.ceil(totalEveningMinutes / adjustedRequiredWorkTime);
      
      // Update state with calculated values
      setGeneratedSchedules(updatedRoutes);
      setMorningEmployees(morning);
      setEveningEmployees(evening);
      setMorningMinutes(totalMorningMinutes);
      setEveningMinutes(totalEveningMinutes);
      
      toast({
        title: "Success",
        description: "Route schedules generated successfully",
      });
    } catch (error) {
      console.error('Error generating schedules:', error);
      toast({
        title: "Error",
        description: "Failed to generate schedules",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const saveSchedulesToDatabase = async () => {
    setIsSaving(true);
    
    try {
      // First delete existing schedule entries
      const { error: deleteError } = await supabase
        .from('route_schedules')
        .delete()
        .neq('id', '0');
      
      if (deleteError) throw deleteError;
      
      // Then insert new schedules
      for (const route of generatedSchedules) {
        // Create end times for each departure
        const departuresWithEndTimes = route.schedule.map(departure => {
          const [hours, minutes] = departure.split(':').map(Number);
          const startDate = new Date();
          startDate.setHours(hours, minutes, 0);
          
          const endDate = new Date(startDate);
          endDate.setMinutes(endDate.getMinutes() + route.estimatedTime);
          
          const endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
          
          return {
            start_time: departure,
            end_time: endTime
          };
        });
        
        const scheduleData = {
          departures: route.schedule,
          departures_with_end_times: departuresWithEndTimes,
          frequency: route.frequency,
          priority: route.avgPriority,
          estimated_time: route.estimatedTime,
          display_id: route.name
        };
        
        const { error } = await supabase
          .from('route_schedules')
          .insert({
            route_id: route.id,
            schedule: scheduleData,
            morning_staff: morningEmployees,
            evening_staff: eveningEmployees
          });
        
        if (error) throw error;
      }
      
      toast({
        title: "Success",
        description: "Schedules saved to database successfully",
      });
    } catch (error) {
      console.error('Error saving schedules:', error);
      toast({
        title: "Error",
        description: "Failed to save schedules to database",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const updatePeakHour = (index, field, value) => {
    const updatedPeakHours = [...peakHours];
    updatedPeakHours[index][field] = parseInt(value, 10);
    setPeakHours(updatedPeakHours);
  };
  
  return (
    <div className="space-y-6">
      <Tabs defaultValue="scheduler">
        <TabsList className="mb-4">
          <TabsTrigger value="scheduler">
            <Calendar className="h-4 w-4 mr-2" />
            Worker Scheduler
          </TabsTrigger>
          <TabsTrigger value="routes">
            <RefreshCw className="h-4 w-4 mr-2" />
            Route Generator
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="scheduler">
          <WorkerScheduler />
        </TabsContent>
        
        <TabsContent value="routes">
          <Card>
            <CardHeader>
              <CardTitle>Route Schedule Generator</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible defaultValue="parameters">
                <AccordionItem value="parameters">
                  <AccordionTrigger>
                    <Clock className="h-4 w-4 mr-2" />
                    Schedule Parameters
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="workStart">Work Start Time</Label>
                        <Input 
                          id="workStart" 
                          type="time" 
                          value={workStart} 
                          onChange={(e) => setWorkStart(e.target.value)} 
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="workEnd">Work End Time</Label>
                        <Input 
                          id="workEnd" 
                          type="time" 
                          value={workEnd} 
                          onChange={(e) => setWorkEnd(e.target.value)} 
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="requiredWorkTime">Required Work Time (minutes)</Label>
                        <Input 
                          id="requiredWorkTime" 
                          type="number" 
                          value={requiredWorkTime} 
                          onChange={(e) => setRequiredWorkTime(parseInt(e.target.value, 10))} 
                        />
                      </div>
                      
                      <div className="md:col-span-2">
                        <div className="space-y-2">
                          <Label>Morning Shift Hours</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <Input 
                              type="number" 
                              value={morningShift.start} 
                              onChange={(e) => setMorningShift({...morningShift, start: parseInt(e.target.value, 10)})} 
                              placeholder="Start Hour" 
                            />
                            <Input 
                              type="number" 
                              value={morningShift.end} 
                              onChange={(e) => setMorningShift({...morningShift, end: parseInt(e.target.value, 10)})} 
                              placeholder="End Hour" 
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="md:col-span-2">
                        <div className="space-y-2">
                          <Label>Evening Shift Hours</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <Input 
                              type="number" 
                              value={eveningShift.start} 
                              onChange={(e) => setEveningShift({...eveningShift, start: parseInt(e.target.value, 10)})} 
                              placeholder="Start Hour" 
                            />
                            <Input 
                              type="number" 
                              value={eveningShift.end} 
                              onChange={(e) => setEveningShift({...eveningShift, end: parseInt(e.target.value, 10)})} 
                              placeholder="End Hour" 
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="md:col-span-2">
                        <Label>Peak Hours</Label>
                        {peakHours.map((peak, index) => (
                          <div key={index} className="grid grid-cols-3 gap-2 mt-2">
                            <Input 
                              type="number" 
                              value={peak.startHour} 
                              onChange={(e) => updatePeakHour(index, 'startHour', e.target.value)} 
                              placeholder="Start Hour" 
                            />
                            <Input 
                              type="number" 
                              value={peak.endHour} 
                              onChange={(e) => updatePeakHour(index, 'endHour', e.target.value)} 
                              placeholder="End Hour" 
                            />
                            <Input 
                              type="number" 
                              value={peak.frequency} 
                              onChange={(e) => updatePeakHour(index, 'frequency', e.target.value)} 
                              placeholder="Frequency (min)" 
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              
              <div className="flex justify-between mt-6">
                <Button 
                  onClick={generateSchedule} 
                  disabled={isGenerating || routes.length === 0}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                  Generate Route Schedules
                </Button>
                
                <Button 
                  onClick={saveSchedulesToDatabase} 
                  disabled={isSaving || generatedSchedules.length === 0}
                  variant="outline"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Schedules
                </Button>
              </div>
              
              {generatedSchedules.length > 0 && (
                <div className="mt-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Generated Schedule Statistics</CardTitle>
                        <div className="flex items-center space-x-2">
                          <Users className="h-5 w-5 text-primary" />
                          <span className="font-bold">
                            Required Staff: {morningEmployees + eveningEmployees}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 border rounded-md">
                          <h4 className="font-medium mb-2">Morning Shift</h4>
                          <p>Required Staff: {morningEmployees}</p>
                          <p>Total Work: {morningMinutes} minutes ({(morningMinutes/60).toFixed(1)} hours)</p>
                        </div>
                        <div className="p-4 border rounded-md">
                          <h4 className="font-medium mb-2">Evening Shift</h4>
                          <p>Required Staff: {eveningEmployees}</p>
                          <p>Total Work: {eveningMinutes} minutes ({(eveningMinutes/60).toFixed(1)} hours)</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-4">Route Schedules</h3>
                    
                    <Accordion type="multiple">
                      {generatedSchedules.map((route) => (
                        <AccordionItem key={route.id} value={route.id}>
                          <AccordionTrigger>
                            <div className="flex items-center justify-between w-full pr-4">
                              <span>Route {route.name} ({route.schedule.length} departures)</span>
                              <span className="text-sm text-muted-foreground">
                                Priority: {route.avgPriority.toFixed(1)}, Frequency: {route.frequency} min
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="rounded-md border mt-2">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Start Time</TableHead>
                                    <TableHead>End Time</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead>Shift</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {route.schedule.length === 0 ? (
                                    <TableRow>
                                      <TableCell colSpan={4} className="text-center py-4">
                                        No departures scheduled
                                      </TableCell>
                                    </TableRow>
                                  ) : (
                                    route.schedule.map((time, index) => {
                                      // Calculate end time
                                      const [hours, minutes] = time.split(':').map(Number);
                                      const startDate = new Date();
                                      startDate.setHours(hours, minutes, 0, 0);
                                      
                                      const endDate = new Date(startDate);
                                      endDate.setMinutes(endDate.getMinutes() + route.estimatedTime);
                                      
                                      const endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
                                      
                                      // Determine shift
                                      let hour = hours;
                                      if (hour < parseInt(workStart.split(':')[0], 10)) {
                                        hour += 24;
                                      }
                                      
                                      const shift = (morningShift.start <= hour && hour < morningShift.end) 
                                        ? "Morning" 
                                        : "Evening";
                                      
                                      return (
                                        <TableRow key={`${route.id}-${index}`}>
                                          <TableCell>{time}</TableCell>
                                          <TableCell>{endTime}</TableCell>
                                          <TableCell>{route.estimatedTime} min</TableCell>
                                          <TableCell>{shift}</TableCell>
                                        </TableRow>
                                      );
                                    })
                                  )}
                                </TableBody>
                              </Table>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RouteScheduleGenerator;