"use client"

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Home, AlertCircle, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ThemeToggle } from "@/components/theme-toggle";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";

// Define the marker icon
const markerIcon = new L.Icon({
  iconUrl: "/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Custom component to handle markers separately from routing
function RouteMarkers({ waypoints }) {
  const map = useMap();
  
  useEffect(() => {
    if (!map || !waypoints.length) return;
    
    const markers = [];
    
    // Add markers for each waypoint
    waypoints.forEach((stop, index) => {
      const marker = L.marker([stop.lat, stop.lng], { icon: markerIcon })
        .addTo(map);
      
      // Add popup with stop information
      marker.bindPopup(`
        <b>${stop.name || `Stop ${index + 1}`}</b><br>
        ${stop.id ? `ID: ${stop.id}` : ''}
        ${stop.address ? `<br>Address: ${stop.address}` : ''}
      `);
      
      markers.push(marker);
    });
    
    // Clean up function to remove markers
    return () => {
      markers.forEach(marker => {
        if (marker && map) {
          map.removeLayer(marker);
        }
      });
    };
  }, [map, waypoints]);
  
  return null;
}

// Separate component to handle just the routing line
function RouteLine({ waypoints }) {
  const map = useMap();
  
  useEffect(() => {
    if (!map || !waypoints.length || waypoints.length < 2) return;
    
    // Wrap routing machine initialization in try/catch
    try {
      const routingControl = L.Routing.control({
        waypoints: waypoints.map(stop => L.latLng(stop.lat, stop.lng)),
        routeWhileDragging: false,
        createMarker: () => null, // Don't create markers
        addWaypoints: false,
        showAlternatives: false,
        show: false, // Hide the UI
        fitSelectedRoutes: true,
        lineOptions: {
          styles: [{ color: "red", weight: 4 }],
        },
        router: L.Routing.osrmv1({
          serviceUrl: "https://router.project-osrm.org/route/v1",
        }),
      }).addTo(map);
      
      // Hide the routing container
      const container = routingControl.getContainer();
      if (container) {
        container.style.display = 'none';
      }
      
      // Handle route finding
      routingControl.on("routesfound", function(e) {
        try {
          // Fit bounds to the route
          if (e.routes && e.routes.length > 0) {
            map.fitBounds(L.latLngBounds(e.routes[0].coordinates));
          }
        } catch (error) {
          console.error("Error in routesfound handler:", error);
        }
      });
      
      // Return cleanup function
      return () => {
        try {
          if (routingControl && map) {
            map.removeControl(routingControl);
          }
        } catch (error) {
          console.error("Error cleaning up routing control:", error);
        }
      };
    } catch (error) {
      console.error("Error initializing routing control:", error);
      return () => {};
    }
  }, [map, waypoints]);
  
  return null;
}

export default function WorkerDashboard() {
  const searchParams = useSearchParams();
  const workerId = searchParams.get("worker_id");
  const [worker, setWorker] = useState(null);
  const [workerSchedule, setWorkerSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast } = useToast();
  const [routeData, setRouteData] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    if (!workerId || workerId.length !== 36) {
      setError("Invalid or missing Worker ID.");
      setLoading(false);
      return;
    }

    const fetchWorkerDetails = async () => {
      setError(null);
      try {
        const { data, error } = await supabase
          .from("workers")
          .select("id, name, phone_number, role, depot_id, employee_schedule")
          .eq("id", workerId)
          .single();

        if (error || !data) throw new Error("Worker details not found.");
        setWorker(data);
        setWorkerSchedule(data.employee_schedule || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkerDetails();
  }, [workerId]);

  const fetchRoute = async (routeId) => {
    try {
      const { data, error } = await supabase
        .from("optimized_routes")
        .select("stops")
        .eq("id", routeId)
        .single();

      if (error || !data) {
        toast({ title: "Error", description: "Route not found", variant: "destructive" });
        return;
      }

      try {
        const parsedStops = JSON.parse(data.stops);
        setRouteData(parsedStops.waypoints || []);
        setMapError(false);
        setModalOpen(true);
      } catch (parseError) {
        toast({ title: "Error", description: "Invalid route data format", variant: "destructive" });
        console.error("Parse error:", parseError);
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to fetch route", variant: "destructive" });
      console.error("Fetch error:", err);
    }
  };

  // Error boundary for map
  const handleMapError = () => {
    setMapError(true);
    console.error("Map rendering error occurred");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 shadow-sm p-4 flex justify-between">
        <h1 className="text-2xl font-bold text-primary">Worker Dashboard</h1>
        <div className="flex gap-2">
          <ThemeToggle />
          <Link href="/">
            <Button variant="outline"><Home className="h-4 w-4 mr-2" /> Home</Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {worker && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Worker Information</CardTitle>
              <CardDescription>Details of the logged-in worker</CardDescription>
            </CardHeader>
            <CardContent>
              <p><strong>Name:</strong> {worker.name}</p>
              <p><strong>Phone Number:</strong> {worker.phone_number}</p>
              <p><strong>Role:</strong> {worker.role}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Your Schedule</CardTitle>
            <CardDescription>View assigned shifts</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading schedule...</p>
            ) : workerSchedule.length === 0 ? (
              <p>No schedules assigned.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Start Time</TableHead>
                    <TableHead>End Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workerSchedule.map((schedule, index) => (
                    <TableRow key={index}>
                      <TableCell>{schedule.start_time}</TableCell>
                      <TableCell>{schedule.end_time}</TableCell>
                      <TableCell>{schedule.duration} min</TableCell>
                      <TableCell>
                        <Button onClick={() => fetchRoute(schedule.route_id)}>Show Route</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Route Map Modal */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Route Details</h2>
                <div className="flex items-center gap-2">
                  <div className="flex items-center mr-4">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
                    <span className="text-sm">Route</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-5 h-5 bg-contain bg-no-repeat mr-1" style={{ backgroundImage: "url('/images/marker-icon.png')" }}></div>
                    <span className="text-sm">Bus Stop</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {routeData.length > 0 ? (
                mapError ? (
                  <div className="h-96 w-full rounded-md flex items-center justify-center bg-slate-100 dark:bg-slate-700">
                    <div className="text-center">
                      <AlertCircle className="h-12 w-12 mx-auto mb-2 text-amber-500" />
                      <p>There was an error displaying the map.</p>
                      <Button className="mt-4" onClick={() => setMapError(false)}>Try Again</Button>
                    </div>
                  </div>
                ) : (
                  <div className="h-96 w-full rounded-md overflow-hidden">
                    <MapContainer 
                      center={[routeData[0].lat, routeData[0].lng]} 
                      zoom={13} 
                      style={{ height: "100%", width: "100%" }}
                      key={`map-${routeData.length}`}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      {/* Split the functionality into separate components */}
                      <RouteMarkers waypoints={routeData} />
                      {routeData.length > 1 && <RouteLine waypoints={routeData} />}
                    </MapContainer>
                  </div>
                )
              ) : (
                <p>No route data available</p>
              )}
              
              {/* Bus Stop List */}
              <div className="mt-4">
                <h3 className="font-medium mb-2">Bus Stops ({routeData.length})</h3>
                <div className="max-h-32 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Stop #</TableHead>
                        <TableHead>Name/ID</TableHead>
                        <TableHead>Coordinates</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {routeData.map((stop, index) => (
                        <TableRow key={index}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{stop.name || stop.id || `Stop ${index + 1}`}</TableCell>
                          <TableCell>{stop.lat.toFixed(6)}, {stop.lng.toFixed(6)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}