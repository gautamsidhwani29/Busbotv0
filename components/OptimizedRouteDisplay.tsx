import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { MapIcon, ChevronDown, ChevronUp } from "lucide-react";

// Initialize Supabase
const supabase = createClient(
  'https://vouxrjvgsishauzfqlyz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvdXhyanZnc2lzaGF1emZxbHl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc2OTIyNzksImV4cCI6MjA1MzI2ODI3OX0.7FQ8Iifb4_8j39lpK9ckYjqnxjifGCCxAr73HhHJUfE'
);

// Progress Bar Component
const ProgressBar = ({ progress = 0 }) => {
  return (
    <div className="w-full bg-gray-700 rounded-full h-2.5 mb-4 overflow-hidden">
      <div 
        className="bg-blue-500 h-2.5 rounded-full transition-all duration-500 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

const OptimizedRouteDisplay = () => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState(null);
  const [expandedRoute, setExpandedRoute] = useState(null);
  const [stopsWithNames, setStopsWithNames] = useState({});

  useEffect(() => {
    const fetchRoutes = async () => {
      setLoading(true);
      setLoadingProgress(10); // Start progress
      
      try {
        // Simulate network delay for the progress bar to be visible
        const { data, error } = await supabase.from("optimized_routes").select("id, name, stops");
        setLoadingProgress(40); // Update progress after routes fetch
        
        if (error) throw error;
        
        const allStops = new Set();
        const processedRoutes = data.map((route) => {
          const stops = processStops(route.stops);
          stops.forEach((stop) => allStops.add(stop.id));
          return { ...route, processedStops: stops };
        });

        setRoutes(processedRoutes);
        setLoadingProgress(60); // Update progress after processing
        
        // Only fetch stop names if we have stops to fetch
        if (allStops.size > 0) {
          await fetchStopNames(Array.from(allStops));
        }
        
        setLoadingProgress(100); // Complete progress
      } catch (err) {
        setError("Failed to load routes");
        console.error("Error fetching routes:", err);
      } finally {
        // Short delay before hiding the progress bar for better UX
        setTimeout(() => {
          setLoading(false);
        }, 500);
      }
    };
    fetchRoutes();
  }, []);

  const fetchStopNames = async (stopIds) => {
    if (!stopIds.length) return;
    
    try {
      const namesMap = {};
      
      // Break stopIds into chunks to avoid URL length limitations
      // Supabase can handle around 100 IDs per request safely
      const chunkSize = 50;
      
      // Function to process a chunk of IDs
      const processChunk = async (ids, chunkIndex, totalChunks) => {
        // Update progress based on chunk progress
        const progressIncrement = 35 / totalChunks; // 35% of the total progress allocated to fetching names
        setLoadingProgress(60 + (chunkIndex * progressIncrement));
        
        // Fetch bus stops for this chunk
        const { data: stopsData, error: stopsError } = await supabase
          .from("bus_stops")
          .select("id, name")
          .in("id", ids);
        
        if (stopsError) {
          console.error("Error fetching bus stops:", stopsError);
          return;
        }
        
        // Fetch depots for this chunk
        const { data: depotsData, error: depotsError } = await supabase
          .from("depots")
          .select("id, name")
          .in("id", ids);
        
        if (depotsError) {
          console.error("Error fetching depots:", depotsError);
          return;
        }
        
        // Add results to the names map
        stopsData?.forEach((stop) => {
          namesMap[stop.id] = { name: stop.name, type: "Bus Stop" };
        });
        
        depotsData?.forEach((depot) => {
          namesMap[depot.id] = { name: depot.name, type: "Depot" };
        });
      };
      
      // Calculate total chunks
      const totalChunks = Math.ceil(stopIds.length / chunkSize);
      
      // Process all IDs in chunks
      for (let i = 0; i < stopIds.length; i += chunkSize) {
        const chunk = stopIds.slice(i, i + chunkSize);
        await processChunk(chunk, Math.floor(i / chunkSize), totalChunks);
      }
      
      setStopsWithNames(namesMap);
    } catch (err) {
      console.error("Error fetching stop names:", err);
    }
  };

  const processStops = (stops) => {
    try {
      if (typeof stops === "string") {
        stops = JSON.parse(stops);
      }
      
      // Handle different possible data structures
      if (Array.isArray(stops)) {
        return stops;
      } else if (stops?.waypoints && Array.isArray(stops.waypoints)) {
        return stops.waypoints;
      } else {
        return [];
      }
    } catch (err) {
      console.error("Error processing stops:", err);
      return [];
    }
  };

  const getStopName = (stop) => {
    if (!stop || !stop.id) return { name: "Invalid Stop", type: "Unknown" };
    return stopsWithNames[stop.id] || { name: `Location ${stop.id.slice(0, 6)}`, type: "Unidentified" };
  };

  const handleViewRoute = (route) => {
    try {
      const routeData = JSON.stringify({ name: route.name, waypoints: route.processedStops });
      window.open(`/route-map?data=${encodeURIComponent(routeData)}`, "_blank");
    } catch (err) {
      console.error("Error opening route map:", err);
    }
  };

  return (
    <div className="p-4 bg-jaguar text-white min-h-screen">
      <h2 className="text-xl font-bold mb-4">Optimized Routes</h2>
      
      {loading && (
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-300 mb-1">
            <span>Loading routes...</span>
            <span>{Math.round(loadingProgress)}%</span>
          </div>
          <ProgressBar progress={loadingProgress} />
        </div>
      )}
      
      {error && <p className="text-red-500 mb-4">{error}</p>}
      
      <div className="space-y-6">
        {routes.map((route) => (
          <div key={route.id} className="border p-4 rounded-lg shadow bg-gray-800">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{route.name || "Unnamed Route"}</h3>
              <button onClick={() => handleViewRoute(route)} className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center">
                <MapIcon size={16} className="mr-2" /> <span>Show Route</span>
              </button>
            </div>
            <div className="mt-3 flex justify-between items-center">
              <span className="text-sm text-gray-300">{route.processedStops.length} stops</span>
              <button onClick={() => setExpandedRoute(expandedRoute === route.id ? null : route.id)} className="text-blue-400 hover:underline flex items-center">
                {expandedRoute === route.id ? (
                  <><span>Hide Stops</span><ChevronUp size={18} className="ml-2" /></>
                ) : (
                  <><span>Show Stops</span><ChevronDown size={18} className="ml-2" /></>
                )}
              </button>
            </div>
            {expandedRoute === route.id && (
              <div className="mt-4 overflow-y-auto max-h-64">
                {route.processedStops.length ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="p-2 text-left">#</th>
                        <th className="p-2 text-left">Name</th>
                        <th className="p-2 text-left">Type</th>
                        <th className="p-2 text-left">Latitude</th>
                        <th className="p-2 text-left">Longitude</th>
                      </tr>
                    </thead>
                    <tbody>
                      {route.processedStops.map((stop, index) => {
                        const stopInfo = getStopName(stop);
                        return (
                          <tr key={index} className="border-b border-gray-700 hover:bg-gray-700">
                            <td className="p-2">{index + 1}</td>
                            <td className="p-2">{stopInfo.name}</td>
                            <td className="p-2">{stopInfo.type}</td>
                            <td className="p-2">{stop.lat?.toFixed(6) || "N/A"}</td>
                            <td className="p-2">{stop.lng?.toFixed(6) || "N/A"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : <p className="text-gray-400 py-2">No stops available</p>}
              </div>
            )}
          </div>
        ))}
        {!routes.length && !loading && <p className="text-center text-gray-400 py-8">No routes available</p>}
      </div>
    </div>
  );
};

export default OptimizedRouteDisplay;