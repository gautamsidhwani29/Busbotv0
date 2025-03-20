import React, { useEffect, useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import { createClient } from '@supabase/supabase-js'
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { MapPin, Plus, Edit, Trash2, Eye, Warehouse, Bus } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Slider } from "@/components/ui/slider"



const supabaseUrl = 'https://vouxrjvgsishauzfqlyz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvdXhyanZnc2lzaGF1emZxbHl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc2OTIyNzksImV4cCI6MjA1MzI2ODI3OX0.7FQ8Iifb4_8j39lpK9ckYjqnxjifGCCxAr73HhHJUfE'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Fix Leaflet default icon issues
const setupLeafletIcons = () => {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png"
  });
};

// Custom icons
const depotIcon = new L.Icon({
  iconUrl: "/images/depoticon.png",
  iconSize: [50, 50],
  iconAnchor: [25, 50],
  popupAnchor: [0, -50]
});

const busStopIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [0, -32]
});

const tempMarkerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconSize: [30, 49],
  iconAnchor: [15, 49],
  popupAnchor: [0, -49]
});

// Component to handle map clicks and temp marker display
function MapClickHandler({ onLocationClick }) {
  const [tempMarkerPosition, setTempMarkerPosition] = useState(null);
  const tempMarkerRef = useRef(null);
  
  const map = useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      console.log("Map clicked at:", lat, lng);
      setTempMarkerPosition({ lat, lng });
      onLocationClick(lat, lng);
    }
  });

  // Handle temp marker
  useEffect(() => {
    // Remove any existing temp marker
    if (tempMarkerRef.current) {
      tempMarkerRef.current.remove();
      tempMarkerRef.current = null;
    }

    // Add new temp marker if position exists
    if (tempMarkerPosition && map) {
      tempMarkerRef.current = L.marker(
        [tempMarkerPosition.lat, tempMarkerPosition.lng],
        { icon: tempMarkerIcon, opacity: 0.8 }
      ).addTo(map);
    }

    // Cleanup on unmount
    return () => {
      if (tempMarkerRef.current) {
        tempMarkerRef.current.remove();
      }
    };
  }, [tempMarkerPosition, map]);

  return null;
}

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

// Improved Routing Machine component with error handling
function RoutingMachine({ waypoints = [] }) {
  const map = useMap();
  const routingControlRef = useRef(null);
  const routingMachineLoadedRef = useRef(false);

  // Function to create routing control with error handling
  const createRoutingControl = useCallback(async () => {
    if (!waypoints || waypoints.length < 2 || !map || !map._loaded) return;
    
    try {
      // Only import once
      if (!routingMachineLoadedRef.current) {
        await import("leaflet-routing-machine");
        routingMachineLoadedRef.current = true;
        
        // Patch to prevent _clearLines error
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
      
      // Remove any existing control
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
      
      // Create routing control
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
        show: false,
        createMarker: () => null
      });
      
      routingControl.addTo(map);
      routingControlRef.current = routingControl;
      
      routingControl.on('routingerror', function(e) {
        console.log('Routing error:', e.error);
      });
      
    } catch (error) {
      console.error("Error setting up routing:", error);
    }
  }, [map, waypoints]);

  useEffect(() => {
    let isMounted = true;
    
    const timer = setTimeout(() => {
      if (isMounted) {
        createRoutingControl();
      }
    }, 100);
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
      
      if (routingControlRef.current && map && map._loaded) {
        try {
          map.removeControl(routingControlRef.current);
        } catch (e) {
          console.log("Error during cleanup:", e);
        }
        routingControlRef.current = null;
      }
    };
  }, [map, waypoints, createRoutingControl]);

  return null;
}

// Improved location form component
const LocationForm = ({ position, onClose, onSubmit }) => {
  const [locationType, setLocationType] = useState("bus_stop");
  const [name, setName] = useState("");
  const [priority, setPriority] = useState(5);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    const formData = {
      type: locationType,
      name,
      lat: position.lat,
      lng: position.lng,
      ...(locationType === "bus_stop" && { priority })
    };
    
    onSubmit(formData);
  };
  
  // Close form when Escape key is pressed
  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    
    window.addEventListener("keydown", handleEscapeKey);
    return () => window.removeEventListener("keydown", handleEscapeKey);
  }, [onClose]);
  
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-[1000]">
      <div className="bg-jaguar p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-white">Add New Location</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-2 font-medium text-white">Location Type</label>
            <select 
              className="w-full p-2 border rounded bg-gray-800 text-white"
              value={locationType}
              onChange={(e) => setLocationType(e.target.value)}
            >
              <option value="bus_stop">Bus Stop</option>
              <option value="depot">Depot</option>
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block mb-2 font-medium text-white">Name</label>
            <input 
              type="text" 
              className="w-full p-2 border rounded bg-gray-700 text-white placeholder-gray-400"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              placeholder="Enter location name"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block mb-2 font-medium text-white">Latitude</label>
              <input 
                type="text" 
                className="w-full p-2 border rounded bg-gray-800 text-white"
                value={position.lat.toFixed(6)}
                readOnly
              />
            </div>
            <div>
              <label className="block mb-2 font-medium text-white">Longitude</label>
              <input 
                type="text" 
                className="w-full p-2 border rounded bg-gray-800 text-white"
                value={position.lng.toFixed(6)}
                readOnly
              />
            </div>
          </div>
          
          {locationType === "bus_stop" && (
            <div className="mb-4">
              <label className="block mb-2 font-medium text-white">Priority (1-10)</label>
              <input 
                type="number" 
                className="w-full p-2 border rounded bg-gray-700 text-white placeholder-gray-400"
                min="1"
                max="10"
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value))}
                required
                placeholder="Enter priority level"
              />
            </div>
          )}
          
          <div className="flex justify-end space-x-2">
            <button 
              type="button"
              className="px-4 py-2 border rounded bg-gray-600 text-white hover:bg-gray-500"
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600"
            >
              Save Location
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Main AdminMap component
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
  
  // State for form display
  const [showForm, setShowForm] = useState(false);
  const [clickedLocation, setClickedLocation] = useState(null);
  const [customLocations, setCustomLocations] = useState([]);
  
  // Number of waypoints to display at once
  const CHUNK_SIZE = 15;
  
  // Handle map click for adding new location
  const handleLocationClick = useCallback((lat, lng) => {
    console.log("Location click handler called:", lat, lng);
    setClickedLocation({ lat, lng });
    setShowForm(true);
  }, []);
  
  // Close form
  const handleFormClose = useCallback(() => {
    setShowForm(false);
    setClickedLocation(null);
  }, []);
  
  // Handle form submission
  const handleFormSubmit = useCallback(async (formData) => {
    try {
      // If it's a bus stop, use the Supabase integration
      if (formData.type === "bus_stop") {
        const { name, lat, lng, priority } = formData;
        
        // Generate UUID for the new stop
        const id = crypto.randomUUID();
        
        // Insert into Supabase
        const { data, error } = await supabase
          .from('bus_stops')
          .insert([{
            id,
            name,
            latitude: lat,
            longitude: lng,
            priority
          }])
          .select();
          
        if (error) throw error;
        
        // Add to custom locations for display on map
        setCustomLocations(prev => [...prev, {
          ...formData,
          id
        }]);
        
        // Show success message
        toast({
          title: "Success",
          description: `Bus stop "${formData.name}" added successfully!`,
        });
      } 
      // If it's a depot, insert into the depots table in Supabase
      else if (formData.type === "depot") {
        const { name, lat, lng } = formData;
        
        // Generate UUID for the new depot
        const id = crypto.randomUUID();
        
        // Insert into Supabase depots table
        const { data, error } = await supabase
          .from('depots')
          .insert([{
            id,
            name,
            latitude: lat,
            longitude: lng
          }])
          .select();
          
        if (error) throw error;
        
        // Add to custom locations for display on map
        setCustomLocations(prev => [...prev, {
          ...formData,
          id
        }]);
        
        // Also add to local depots state for immediate display
        setDepots(prev => [...prev, { 
          id,
          lat: formData.lat, 
          lng: formData.lng, 
          name: formData.name 
        }]);
        
        console.log("New depot added:", formData);
        
        // Show success message
        toast({
          title: "Success",
          description: `Depot "${formData.name}" added successfully!`,
        });
      }
      
      // Close the form
      setShowForm(false);
      setClickedLocation(null);
      
    } catch (error) {
      console.error("Error saving location:", error);
      
      // Show error message
      toast({
        title: "Error",
        description: `Failed to save location: ${error.message}`,
        variant: "destructive",
      });
    }
  }, []);
  
  // Generate optimized routes
  const handleGenerateRoutes = async () => {
    setLoadingRoutes(true);
    setRouteProgress(0);
    
    try {
      // Progress animation
      const progressInterval = setInterval(() => {
        setRouteProgress(prev => {
          return prev < 90 ? prev + (Math.random() * 3) : prev;
        });
      }, 300);
      setRouteProgress(10);
      
      // API call to optimize routes
      const response = await fetch(
        "https://lkh3-service-431706900070.asia-south1.run.app/optimize"
      );
      
      if (!response.ok) throw new Error("Failed to fetch optimized routes");
      setRouteProgress(85);
      
      await response.json();
      clearInterval(progressInterval);
      
      // Set progress to 100%
      setRouteProgress(100);
      
      // Success message
      setTimeout(() => {
        alert("Routes have been optimized successfully!");
      }, 500);
      
    } catch (error) {
      console.error("Error fetching optimized routes:", error);
      alert("Error optimizing routes: " + error.message);
    } finally {
      // Reset after delay
      setTimeout(() => {
        setLoadingRoutes(false);
        setRouteProgress(0);
        window.location.reload();
      }, 1000);
    }
  };

  // Fetch depots data
  const fetchDepots = useCallback(async () => {
    try {
      // Try to fetch from Supabase first
      const { data: supabaseDepots, error: supabaseError } = await supabase
        .from('depots')
        .select('*');
      
      if (supabaseError) {
        console.error("Error fetching depots from Supabase:", supabaseError);
        throw supabaseError;
      }
      
      if (supabaseDepots && Array.isArray(supabaseDepots) && supabaseDepots.length > 0) {
        // Transform data to match expected format
        const formattedDepots = supabaseDepots.map(depot => ({
          id: depot.id,
          name: depot.name,
          lat: depot.latitude,
          lng: depot.longitude
        }));
        
        setDepots(formattedDepots);
        return;
      }
      
      // Fall back to API if no depots in Supabase
      const response = await fetch("/api/depots/");
      if (!response.ok) throw new Error("Failed to fetch depots");
      const data = await response.json();
      
      if (data && Array.isArray(data)) {
        // Filter valid depots
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
  }, []);
  
  // Setup Leaflet icons
  useEffect(() => {
    if (typeof window !== "undefined") {
      setupLeafletIcons();
      setMapReady(true);
    }
  }, []);

  // Fetch routes data
  useEffect(() => {
    const fetchRoutes = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch routes
        const response = await fetch("/api/optimized-routes/");
        if (!response.ok) throw new Error("Failed to fetch routes");
        const data = await response.json();
        
        // Fetch depots
        await fetchDepots();
        
        // Process waypoints
        if (data && Array.isArray(data.waypoints) && data.waypoints.length > 0) {
          // Filter valid waypoints
          const validWaypoints = data.waypoints.filter(wp => 
            wp && typeof wp === 'object' && 
            typeof wp.lat === 'number' && 
            typeof wp.lng === 'number'
          );
          
          setAllWaypoints(validWaypoints);
          
          // Set first chunk
          if (validWaypoints.length > 0) {
            const firstChunkWaypoints = validWaypoints.slice(0, CHUNK_SIZE);
            setDisplayWaypoints(firstChunkWaypoints);
            
            // Create bounds
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
  }, [mapReady, fetchDepots]);

  // Check if a waypoint is a depot
  const isDepot = useCallback((waypoint) => {
    return depots.some(depot => 
      Math.abs(depot.lat - waypoint.lat) < 0.0001 && 
      Math.abs(depot.lng - waypoint.lng) < 0.0001
    );
  }, [depots]);

  // Navigate between chunks
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
    
    // Wait for cleanup
    setTimeout(() => {
      setChunkIndex(newIndex);
      
      // Update waypoints
      const startIdx = newIndex * CHUNK_SIZE;
      const nextChunk = allWaypoints.slice(startIdx, startIdx + CHUNK_SIZE);
      setDisplayWaypoints(nextChunk);
      
      // Update bounds
      const latLngs = nextChunk.map(wp => [wp.lat, wp.lng]);
      setBounds(latLngs);
    }, 300);
  };

  const mapCenter = displayWaypoints.length > 0 
    ? [displayWaypoints[0].lat, displayWaypoints[0].lng] 
    : [19.22, 72.87];

  const totalChunks = Math.ceil(allWaypoints.length / CHUNK_SIZE);

  // Add a test button for debugging form issues
  const addTestLocation = () => {
    const testLat = mapCenter[0];
    const testLng = mapCenter[1];
    console.log("Test button clicked, adding location at:", testLat, testLng);
    setClickedLocation({ lat: testLat, lng: testLng });
    setShowForm(true);
  };

  if (!mapReady) {
    return <div className="flex justify-center items-center h-64">
      <p className="text-lg font-semibold">Initializing map...</p>
    </div>;
  }

  return (
    <div className="admin-map-container">
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-lg font-semibold">Loading routes...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-100 text-red-700 rounded mb-4">
          {error}
        </div>
      ) : (
        <>
          {/* Navigation controls */}
          <div className="flex items-center justify-center mb-4 p-2 bg-jaguar-100 rounded">
            <button 
              onClick={() => navigateChunk('prev')} 
              disabled={totalChunks <= 1}
              className="px-4 py-2 mr-2 border rounded bg-jaguar-100 hover:bg-jaguar-200 disabled:opacity-50 disabled:bg-jaguar-100"
            >
              Previous
            </button>
            <span className="mx-2 text-sm md:text-base">
              Showing waypoints {chunkIndex * CHUNK_SIZE + 1} to {Math.min((chunkIndex + 1) * CHUNK_SIZE, allWaypoints.length)} of {allWaypoints.length}
              {totalChunks > 1 ? ` (${chunkIndex + 1}/${totalChunks})` : ''}
            </span>
            <button 
              onClick={() => navigateChunk('next')} 
              disabled={totalChunks <= 1}
              className="px-4 py-2 ml-2 border rounded bg-jaguar-100 hover:bg-jaguar-200 disabled:opacity-50 disabled:bg-jaguar-100"
            >
              Next
            </button>
          </div>

  
          {/* Map container */}
          <div className="relative">
            <MapContainer 
              center={mapCenter} 
              zoom={12} 
              style={{ height: "600px", width: "100%" }}
              className="rounded-lg shadow-lg z-0"
            >
              <TileLayer 
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                attribution="&copy; OpenStreetMap contributors" 
              />
  
              {/* Waypoints */}
              {displayWaypoints.length > 0 && 
                displayWaypoints.map((stop, index) => (
                  <Marker 
                    key={`marker-${chunkIndex}-${index}`} 
                    position={[stop.lat, stop.lng]}
                    icon={isDepot(stop) ? depotIcon : busStopIcon}
                  />
                ))
              }
              
              {/* Custom locations */}
              {customLocations.map((location, index) => (
                <Marker 
                  key={`custom-${index}`} 
                  position={[location.lat, location.lng]}
                  icon={location.type === "depot" ? depotIcon : busStopIcon}
                />
              ))}
  
              {/* Routing */}
              {displayWaypoints.length > 1 && (
                <RoutingMachine waypoints={displayWaypoints} />
              )}
  
              {/* Map adjuster */}
              {bounds && bounds.length > 0 && (
                <MapAdjuster bounds={bounds} />
              )}
              
              {/* Map click handler */}
              <MapClickHandler onLocationClick={handleLocationClick} />
            </MapContainer>
            
            {/* Map instructions overlay */}
            <div className="absolute top-4 right-4 bg-blue-500 p-2 rounded shadow z-10 text-sm text-white">
              <p>Click on the map to add a new bus stop or depot</p>
            </div>
          </div>
          
          {/* Route generation controls */}
          <div className="p-4 mt-4 flex flex-col items-center justify-center bg-jaguar-100 rounded-lg">
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded font-semibold text-lg transition duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center w-64"
              onClick={handleGenerateRoutes}
              disabled={loadingRoutes}
            >
              {loadingRoutes ? "Optimizing Routes..." : "Generate Optimized Routes"}
            </button>

            {loadingRoutes && (
              <div className="mt-4 w-full max-w-lg">
                <div className="bg-jaguar-200 rounded-full h-4 w-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-300 flex items-center justify-center"
                    style={{ width: `${routeProgress}%` }}
                  ></div>
                </div>
                <div className="text-center mt-2 text-sm font-medium text-jaguar-700">
                  {Math.round(routeProgress)}% Complete
                </div>
              </div>
            )}
          </div>
        </>
      )}
      
      {/* Location form modal - Render separately outside of the conditionals */}
      {showForm && clickedLocation && (
        <LocationForm 
          position={clickedLocation}
          onClose={handleFormClose}
          onSubmit={handleFormSubmit}
        />
      )}
      
      <Toaster />
    </div>
  );
};

export default AdminMap;