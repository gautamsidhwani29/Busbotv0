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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { WorkerScheduler } from "./worker-scheduler";


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

class ScheduleEntry {
  constructor(entry_id, route_id, schedule_time, duration) {
    this.entry_id = entry_id;
    this.route_id = route_id;
    this.schedule_time = schedule_time;
    this.duration = duration;
    this.shift = this._calculate_shift();
  }

  _calculate_shift() {
    try {
      const hour = parseInt(this.schedule_time.split(':')[0]);
      return (6 <= hour && hour < 14) ? 'morning' : 'evening';
    } catch (error) {
      return 'evening';
    }
  }
}

class Worker {
  constructor(worker_id, name, phone_number) {
    this.worker_id = worker_id;
    this.name = name;
    this.shift = (parseInt(phone_number.slice(-1)) % 2 === 0) ? 'morning' : 'evening';
    this.assignments = [];
    this.total_work_minutes = 0;
  }
}

export function WorkerAssignment() {
  const [schedules, setSchedules] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [statsCard, setStatsCard] = useState({
    totalRoutes: 0,
    totalWorkers: 0,
    workersNeeded: 0,
    routesPerWorker: 0,
    status: "pending"
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (schedules.length && workers.length) {
      calculateStats();
    }
  }, [schedules, workers]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const scheduleEntries = await fetchScheduleData();
      const workersData = await fetchWorkersInBatches();
      setSchedules(scheduleEntries);
      setWorkers(workersData);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchScheduleData = async () => {
    const { data, error } = await supabase
      .from("schedule")
      .select("*, optimized_routes(duration)");

    if (error) throw error;

    const entries = [];
    data.forEach(item => {
      try {
        const scheduleData = item.schedule || '[]';
        const times = typeof scheduleData === 'string' ? JSON.parse(scheduleData) : scheduleData;
        const routeData = item.optimized_routes;

        times.forEach(time_str => {
          entries.push(new ScheduleEntry(
            item.id.toString(),
            item.route_id.toString(),
            time_str,
            routeData.duration
          ));
        });
      } catch (e) {
        console.error("Skipping invalid schedule entry:", e);
      }
    });
    return entries;
  };

  const fetchWorkersInBatches = async () => {
    const batchSize = 500; // Number of rows to fetch per batch
    let allWorkers = [];
    let from = 0;
    let to = from + batchSize - 1;

    while (true) {
      const { data, error } = await supabase
        .from("workers")
        .select("*")
        .range(from, to);

      if (error) throw error;

      if (data.length === 0) break; // No more data to fetch

      allWorkers = allWorkers.concat(data);
      from += batchSize;
      to += batchSize;
    }

    return allWorkers.map(worker => new Worker(
      worker.id.toString(),
      worker.name,
      worker.phone_number
    ));
  };

  const assignSchedulesToWorkers = async () => {
    if (schedules.length === 0 || workers.length === 0) {
      toast({
        title: "Error",
        description: "No schedules or workers available to assign.",
        variant: "destructive",
      });
      return;
    }

    setAssigning(true);
    try {
      const updatedWorkers = assignSchedules(schedules, workers);
      await saveWorkerSchedules(updatedWorkers);
      setAssignments(updatedWorkers.reduce((acc, worker) => {
        acc[worker.worker_id] = worker.assignments;
        return acc;
      }, {}));
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

  const assignSchedules = (scheduleEntries, workers) => {
    const shiftWorkers = workers.reduce((acc, worker) => {
      acc[worker.shift] = acc[worker.shift] || [];
      acc[worker.shift].push(worker);
      return acc;
    }, {});

    const shiftSchedules = scheduleEntries.reduce((acc, entry) => {
      acc[entry.shift] = acc[entry.shift] || [];
      acc[entry.shift].push(entry);
      return acc;
    }, {});

    Object.entries(shiftSchedules).forEach(([shift, entries]) => {
      const availableWorkers = shiftWorkers[shift] || [];
      if (availableWorkers.length === 0) {
        console.log(`No workers available for ${shift} shift!`);
        return;
      }

      entries.sort((a, b) => new Date(`1970/01/01 ${a.schedule_time}`) - new Date(`1970/01/01 ${b.schedule_time}`));
      availableWorkers.sort((a, b) => a.total_work_minutes - b.total_work_minutes);

      entries.forEach(entry => {
        const worker = availableWorkers.reduce((prev, curr) => 
          prev.total_work_minutes < curr.total_work_minutes ? prev : curr
        );

        const endTime = new Date(`1970/01/01 ${entry.schedule_time}`);
        endTime.setMinutes(endTime.getMinutes() + entry.duration);

        worker.assignments.push({
          route_id: entry.route_id,
          start_time: entry.schedule_time,
          end_time: endTime.toTimeString().slice(0, 5),
          duration: entry.duration
        });

        worker.total_work_minutes += entry.duration;
      });
    });

    return workers;
  };

  const saveWorkerSchedules = async (workers) => {
    for (const worker of workers) {
      const { error } = await supabase
        .from("workers")
        .update({ employee_schedule: worker.assignments })
        .eq('id', worker.worker_id);

      if (error) throw error;
    }
  };

  const calculateStats = () => {
    const totalRoutes = schedules.length;
    const totalWorkers = workers.length;
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
              <Progress value={statsCard.totalRoutes} />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">Total Trips</p>
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
                    onClick={fetchData}
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
                            <TableHead>Assigned Routes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {workers.map((worker) => (
                            <TableRow key={worker.worker_id}>
                              <TableCell>{worker.name}</TableCell>
                              <TableCell>
                                {assignments[worker.worker_id] ? (
                                  <Badge variant="secondary">
                                    {assignments[worker.worker_id].length} routes
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