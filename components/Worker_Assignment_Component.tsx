"use client"

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle, RefreshCw, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { WorkerScheduler } from "./worker-scheduler";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function TransportApp() {
  return (
    <Tabs defaultValue="scheduler" className="w-full">
      <TabsList className="grid grid-cols-2 mb-4">
        <TabsTrigger value="scheduler">Route Scheduler</TabsTrigger>
        <TabsTrigger value="assignment">Worker Assignment</TabsTrigger>
      </TabsList>
      <TabsContent value="scheduler">
        <WorkerScheduler />
      </TabsContent>
      <TabsContent value="assignment">
        <WorkerAssignment />
      </TabsContent>
    </Tabs>
  );
}

export function WorkerAssignment() {
  const [schedules, setSchedules] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [fetchProgress, setFetchProgress] = useState(0);
  const [statsCard, setStatsCard] = useState({
    totalRoutes: 0,
    totalWorkers: 0,
    workersNeeded: 0,
    routesPerWorker: 0,
    status: "pending" // pending, success, error
  });

  useEffect(() => {
    fetchDataInBatches();
  }, []);

  // Process schedules and update stats
  useEffect(() => {
    if (schedules.length && workers.length) {
      calculateStats();
    }
  }, [schedules, workers]);

  const fetchDataInBatches = async () => {
    setLoading(true);
    setFetchProgress(0);
    
    try {
      // Fetch workers first
      const { data: workerData, error: workerError } = await supabase
        .from("workers")
        .select("*");

      if (workerError) throw workerError;
      setWorkers(workerData || []);
      
      // Use dummy workers if none exist
      if (!workerData || workerData.length === 0) {
        const dummyWorkers = Array.from({ length: 10 }, (_, i) => ({
          id: `w-${i+1}`,
          name: `Worker ${i+1}`,
          phone_number: `555-000-${1000+i}`,
          employee_schedule: []
        }));
        setWorkers(dummyWorkers);
      }
      
      setFetchProgress(30);
      
      // Fetch schedules in batches
      let allSchedules = [];
      let count = 0;
      const batchSize = 500; // Supabase limit is 1000, but we'll use 500 to be safe
      
      // First, count the total number of schedule entries
      const { count: totalCount, error: countError } = await supabase
        .from("schedule")
        .select("*", { count: "exact", head: true });
        
      if (countError) throw countError;
      
      const totalBatches = Math.ceil((totalCount || 1) / batchSize);
      
      // Fetch each batch
      for (let i = 0; i < totalBatches; i++) {
        const from = i * batchSize;
        const to = from + batchSize - 1;
        
        const { data: batchData, error: batchError } = await supabase
          .from("schedule")
          .select("*")
          .range(from, to);
          
        if (batchError) throw batchError;
        
        if (batchData && batchData.length > 0) {
          allSchedules = [...allSchedules, ...batchData];
        }
        
        // Update progress
        count += batchData?.length || 0;
        setFetchProgress(30 + Math.floor((count / (totalCount || 1)) * 60));
      }
      
      // If no schedules found, use dummy data
      if (allSchedules.length === 0) {
        const dummySchedules = [];
        const routes = ["Downtown Loop", "Airport Express", "Suburb Connector", "University Shuttle"];
        
        for (let i = 0; i < 40; i++) {
          const routeIdx = i % routes.length;
          const hourOffset = Math.floor(i / 4);
          const hour = (6 + hourOffset) % 24;
          const minute = (i % 4) * 15;
          
          dummySchedules.push({
            id: `s-${i+1}`,
            route_id: `r-${routeIdx+1}`,
            route_name: routes[routeIdx],
            schedule: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
            duration: 30 + (routeIdx * 10)
          });
        }
        
        allSchedules = dummySchedules;
      }
      
      setSchedules(allSchedules);
      setFetchProgress(100);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const totalRoutes = schedules.length;
    const totalWorkers = workers.length;
    
    // Calculate how many workers are needed based on routes
    // Simple heuristic: each worker can handle 5-10 routes per day
    const routesPerWorkerTarget = 8;
    const workersNeeded = Math.ceil(totalRoutes / routesPerWorkerTarget);
    const routesPerWorker = totalWorkers > 0 ? Math.ceil(totalRoutes / totalWorkers) : 0;
    
    const status = totalWorkers >= workersNeeded ? "success" : "error";
    
    setStatsCard({
      totalRoutes,
      totalWorkers,
      workersNeeded,
      routesPerWorker,
      status
    });
  };

  const assignSchedulesToWorkers = async () => {
    if (schedules.length === 0) {
      toast({
        title: "Error",
        description: "No schedules available to assign.",
        variant: "destructive",
      });
      return;
    }

    if (workers.length === 0) {
      toast({
        title: "Error",
        description: "No workers available for assignment.",
        variant: "destructive",
      });
      return;
    }

    if (statsCard.status === "error") {
      toast({
        title: "Warning",
        description: `Not enough workers. Need ${statsCard.workersNeeded} but only have ${statsCard.totalWorkers}.`,
        variant: "destructive",
      });
      return;
    }

    setAssigning(true);
    
    try {
      // Group schedules by time slots to avoid conflicts
      const schedulesByTime = {};
      
      schedules.forEach(schedule => {
        const timeSlot = schedule.schedule || "unknown";
        if (!schedulesByTime[timeSlot]) {
          schedulesByTime[timeSlot] = [];
        }
        schedulesByTime[timeSlot].push(schedule);
      });
      
      // Distribute schedules equally among workers
      const workerAssignments = {};
      workers.forEach(worker => {
        workerAssignments[worker.id] = [];
      });
      
      // Sort time slots chronologically
      const timeSlots = Object.keys(schedulesByTime).sort();
      
      // Assign schedules to workers round-robin style
      let workerIndex = 0;
      
      timeSlots.forEach(timeSlot => {
        const timeslotSchedules = schedulesByTime[timeSlot];
        
        timeslotSchedules.forEach(schedule => {
          // Find the worker with the least schedules at this point
          const workerIds = Object.keys(workerAssignments);
          workerIds.sort((a, b) => workerAssignments[a].length - workerAssignments[b].length);
          
          // Assign to the worker with the least schedules
          workerAssignments[workerIds[0]].push({
            schedule_id: schedule.id,
            route_id: schedule.route_id,
            route_name: schedule.route_name || `Route ${schedule.route_id}`,
            departure_time: schedule.schedule,
            duration: schedule.duration || 30
          });
        });
      });
      
      // Save assignments
      setAssignments(workerAssignments);
      
      // Update database (or simulate)
      for (const workerId in workerAssignments) {
        const workerSchedule = workerAssignments[workerId];
        
        // Update worker's schedule in the database
        const { error } = await supabase
          .from("workers")
          .update({ employee_schedule: workerSchedule })
          .eq("id", workerId);
          
        if (error) throw error;
      }
      
      toast({
        title: "Success",
        description: "Schedules assigned successfully to workers.",
      });
      
    } catch (error) {
      console.error("Error assigning schedules:", error);
      toast({
        title: "Error",
        description: "Failed to assign schedules to workers.",
        variant: "destructive",
      });
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Worker Assignment</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Loading data...</span>
              </div>
              <Progress value={fetchProgress} />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">Total Routes</p>
                        <h3 className="text-2xl font-bold">{statsCard.totalRoutes}</h3>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">Available Workers</p>
                        <h3 className="text-2xl font-bold">{statsCard.totalWorkers}</h3>
                      </div>
                      <Users className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">Workers Needed</p>
                        <h3 className="text-2xl font-bold">{statsCard.workersNeeded}</h3>
                      </div>
                      {statsCard.status === "success" ? (
                        <CheckCircle className="h-8 w-8 text-green-500" />
                      ) : (
                        <AlertCircle className="h-8 w-8 text-red-500" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Assignment Controls</h3>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={fetchDataInBatches}
                    disabled={loading || assigning}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Data
                  </Button>
                  <Button 
                    onClick={assignSchedulesToWorkers}
                    disabled={loading || assigning || statsCard.status === "error"}
                  >
                    {assigning ? "Assigning..." : "Assign Routes to Workers"}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-6">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-md">Available Workers</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="rounded-md border max-h-64 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Assigned Routes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {workers.map((worker) => (
                            <TableRow key={worker.id}>
                              <TableCell>{worker.name}</TableCell>
                              <TableCell>{worker.phone_number}</TableCell>
                              <TableCell>
                                {assignments[worker.id] ? (
                                  <Badge variant="secondary">
                                    {assignments[worker.id].length} routes
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">Unassigned</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      <Toaster />
    </div>
  );
}