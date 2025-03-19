import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";


// Fix Leaflet default icon issues
const setupLeafletIcons = () => {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png"
  });
};

// Create a custom depot icon
const depotIcon = new L.Icon({
  iconUrl: "/images/depoticon.png",
  iconSize: [50, 50],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

  
// Component to handle map view adjustments
function MapAdjuster({ bounds }) {
  const map = useMap();
  
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds);
    }
  }, [bounds, map]);
  
  return null;
}

// Patched version of the Routing Machine component
function RoutingMachine({ waypoints = [] }) {
  const map = useMap();
  const routingControlRef = useRef(null);
  const routingMachineLoadedRef = useRef(false);

  // Function to safely create a routing control
  const createRoutingControl = async () => {
    if (!waypoints || waypoints.length < 2 || !map || !map._loaded) return;
    
    try {
      // Only import once
      if (!routingMachineLoadedRef.current) {
        await import("leaflet-routing-machine");
        routingMachineLoadedRef.current = true;
        
        // Apply patch to prevent _clearLines error
        // This is the key fix: we're patching the _clearLines method in L.Routing.Line.prototype
        const originalClearLines = L.Routing.Line.prototype._clearLines;
        L.Routing.Line.prototype._clearLines = function() {
          try {
            if (this._routes && this._map) {
              originalClearLines.apply(this, arguments);
            }
          } catch (e) {
            console.log("Prevented _clearLines error");
          }
        };
      }
      
      // Safely remove any existing control
      if (routingControlRef.current) {
        try {
          map.removeControl(routingControlRef.current);
        } catch (e) {
          console.log("Error removing routing control:", e);
        }
        routingControlRef.current = null;
      }
      
      // Create new waypoints
      const routeWaypoints = waypoints.map(point => L.latLng(point.lat, point.lng));
      
      // Create the routing control with error handling
      const routingControl = L.Routing.control({
        waypoints: routeWaypoints,
        lineOptions: { 
          styles: [{ color: "#6FA1EC", weight: 4 }],
          missingRouteStyles: [{ color: "#CCCCCC", opacity: 0.8, weight: 3 }]
        },
        addWaypoints: false,
        routeWhileDragging: false,
        fitSelectedRoutes: false,
        showAlternatives: false,
        show: false, // Hide the instructions panel
        createMarker: () => null // Use our own markers
      });
      
      // Add the control to the map
      routingControl.addTo(map);
      routingControlRef.current = routingControl;
      
      // Handle route calculation errors
      routingControl.on('routingerror', function(e) {
        console.log('Routing error:', e.error);
      });
      
    } catch (error) {
      console.error("Error setting up routing:", error);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    // Create the routing control with a small delay to ensure the map is ready
    const timer = setTimeout(() => {
      if (isMounted) {
        createRoutingControl();
      }
    }, 100);
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
      
      // Safe cleanup
      if (routingControlRef.current && map && map._loaded) {
        try {
          map.removeControl(routingControlRef.current);
        } catch (e) {
          console.log("Error during cleanup:", e);
        }
        routingControlRef.current = null;
      }
    };
  }, [map, waypoints]);

  return null;
}

const AdminMap = () => {
  const [allWaypoints, setAllWaypoints] = useState([]);
  const [displayWaypoints, setDisplayWaypoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState(null);
  const [chunkIndex, setChunkIndex] = useState(0);
  const [bounds, setBounds] = useState(null);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [routeProgress, setRouteProgress] = useState(0);
  const [depots, setDepots] = useState([]);
  // Number of waypoints to display at once
  const CHUNK_SIZE = 15; // Reduced for better routing performance
  
  const handleGenerateRoutes = async () => {
    setLoadingRoutes(true);
    setRouteProgress(0);
    
    try {
      // Start progress animation
      const progressInterval = setInterval(() => {
        setRouteProgress(prev => {
          // Slowly increase progress up to 90% while waiting for API
          if (prev < 90) {
            return prev + (Math.random() * 3);
          }
          return prev;
        });
      }, 300);
      setRouteProgress(10);
      
      const response = await fetch(
        "https://lkh3-service-431706900070.asia-south1.run.app/optimize"
      );
      if (!response.ok) throw new Error("Failed to fetch optimized routes");
      setRouteProgress(85);
      await response.json();
      clearInterval(progressInterval);
      
      // Set progress to 100% when complete
      setRouteProgress(100);

      
      // Success message
      setTimeout(() => {
        alert("Routes have been optimized successfully!");
      }, 500);
      
    } catch (error) {
      console.error("Error fetching optimized routes:", error);
      alert("Error optimizing routes: " + error.message);
    } finally {
      // Reset after a delay to show the completed progress bar
      setTimeout(() => {
        setLoadingRoutes(false);
        setRouteProgress(0);
        window.location.reload();
      }, 1000);
    }
  };

  // Fetch depots data
  const fetchDepots = async () => {
    try {
      const response = await fetch("/api/depots/");
      if (!response.ok) throw new Error("Failed to fetch depots");
      const data = await response.json();
      // console.log(data)
      
      if (data && Array.isArray(data)) {
        // Filter out any invalid depot data
        const validDepots = data.filter(depot => 
          depot && typeof depot === 'object' && 
          typeof depot.lat === 'number' && 
          typeof depot.lng === 'number'
        );
        setDepots(validDepots);
      } else {
        console.error("Invalid depots data structure");
        setDepots([]);
      }
    } catch (error) {
      console.error("Error fetching depots:", error);
      setDepots([]);
    }
  };
  
  useEffect(() => {
    // Setup Leaflet icons only on client-side
    if (typeof window !== "undefined") {
      setupLeafletIcons();
      setMapReady(true);
    }
  }, []);

  useEffect(() => {
    const fetchRoutes = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch routes data
        const response = await fetch("/api/optimized-routes/");
        if (!response.ok) throw new Error("Failed to fetch routes");
        const data = await response.json();
        
        // Also fetch depots data
        await fetchDepots();
        
        // Handle the single object with waypoints array structure
        if (data && Array.isArray(data.waypoints) && data.waypoints.length > 0) {
          // Filter out any invalid waypoints
          const validWaypoints = data.waypoints.filter(wp => 
            wp && typeof wp === 'object' && 
            typeof wp.lat === 'number' && 
            typeof wp.lng === 'number'
          );
          
          setAllWaypoints(validWaypoints);
          
          // Calculate bounds for the first chunk
          if (validWaypoints.length > 0) {
            const firstChunkWaypoints = validWaypoints.slice(0, CHUNK_SIZE);
            
            // Set initial waypoints
            setDisplayWaypoints(firstChunkWaypoints);
            
            // Create bounds for the map
            const latLngs = firstChunkWaypoints.map(wp => [wp.lat, wp.lng]);
            setBounds(latLngs);
          } else {
            setError("No valid waypoints found in the data");
          }
        } else {
          setError("Invalid data structure received from API");
          setAllWaypoints([]);
          setDisplayWaypoints([]);
        }
      } catch (error) {
        console.error("Error fetching routes:", error);
        setError(`Error fetching routes: ${error.message}`);
        setAllWaypoints([]);
        setDisplayWaypoints([]);
      } finally {
        setLoading(false);
      }
    };

    if (mapReady) {
      fetchRoutes();
    }
  }, [mapReady]);

  // Helper function to check if a waypoint is a depot
  const isDepot = (waypoint) => {
    return depots.some(depot => 
      Math.abs(depot.lat - waypoint.lat) < 0.0001 && 
      Math.abs(depot.lng - waypoint.lng) < 0.0001
    );
  };

  // Handle chunk navigation with proper cleanup
  const navigateChunk = (direction) => {
    const maxChunks = Math.ceil(allWaypoints.length / CHUNK_SIZE);
    let newIndex;
    
    if (direction === 'next') {
      newIndex = (chunkIndex + 1) % maxChunks;
    } else {
      newIndex = (chunkIndex - 1 + maxChunks) % maxChunks;
    }
    
    // Clear current waypoints first
    setDisplayWaypoints([]);
    
    // Wait for cleanup to complete
    setTimeout(() => {
      setChunkIndex(newIndex);
      
      // Update waypoints with the new chunk
      const startIdx = newIndex * CHUNK_SIZE;
      const nextChunk = allWaypoints.slice(startIdx, startIdx + CHUNK_SIZE);
      setDisplayWaypoints(nextChunk);
      
      // Create bounds for the map
      const latLngs = nextChunk.map(wp => [wp.lat, wp.lng]);
      setBounds(latLngs);
    }, 300);
  };

  const mapCenter = displayWaypoints.length > 0 
    ? [displayWaypoints[0].lat, displayWaypoints[0].lng] 
    : [19.22, 72.87];

  const totalChunks = Math.ceil(allWaypoints.length / CHUNK_SIZE);

  if (!mapReady) {
    return <div>Initializing map...</div>;
  }

  return (
    <div className="admin-map-container">
      {loading ? (
        <div className="flex justify-center items-center h-screen">
        <p className="text-lg font-semibold text-white">Loading routes...</p>
      </div>
      ) : error ? (
        <div className="error-message p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      ) : (
        <>
          <div className="route-controls flex items-center justify-center mb-4">
            <button 
              onClick={() => navigateChunk('prev')} 
              disabled={totalChunks <= 1}
              className="px-4 py-2 mr-2 border-2 bg-jaguar-200 rounded-[10px] disabled:opacity-50"
            >
              Previous
            </button>
            <span className="mx-2">
              Showing waypoints {chunkIndex * CHUNK_SIZE + 1} to {Math.min((chunkIndex + 1) * CHUNK_SIZE, allWaypoints.length)} of {allWaypoints.length}
              {totalChunks > 1 ? ` (${chunkIndex + 1}/${totalChunks})` : ''}
            </span>
            <button 
              onClick={() => navigateChunk('next')} 
              disabled={totalChunks <= 1}
              className="px-4 py-2 ml-2 border-2 bg-jaguar-200 rounded-[10px] disabled:opacity-50"
            >
              Next
            </button>
          </div>
  
          <div>
            <MapContainer 
              center={mapCenter} 
              zoom={12} 
              style={{ height: "500px", width: "100%" }}
            >
              <TileLayer 
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                attribution="&copy; OpenStreetMap contributors" 
              />
  
              {displayWaypoints.length > 0 && 
                displayWaypoints.map((stop, index) => (
                  <Marker 
                    key={`marker-${chunkIndex}-${index}`} 
                    position={[stop.lat, stop.lng]}
                    icon={isDepot(stop) ? depotIcon : new L.Icon.Default()}
                  />
                ))
              }
  
              {displayWaypoints.length > 1 && (
                <RoutingMachine waypoints={displayWaypoints} />
              )}
  
              {bounds && bounds.length > 0 && (
                <MapAdjuster bounds={bounds} />
              )}
            </MapContainer>
          </div>
        </>
      )}
       <div className="p-4 flex flex-col items-center justify-center">
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded font-semibold text-lg transition duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center w-64"
          onClick={handleGenerateRoutes}
          disabled={loadingRoutes}
        >
          {loadingRoutes ? "Optimizing Routes..." : "Generate Optimized Routes"}
        </button>

        {loadingRoutes && (
          <div className="mt-4 w-full max-w-lg">
            <div className="bg-gray-200 rounded-full h-4 w-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300 flex items-center justify-center"
                style={{ width: `${routeProgress}%` }}
              ></div>
            </div>
            <div className="text-center mt-2 text-sm font-medium text-gray-700">
              {Math.round(routeProgress)}% Complete
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMap;