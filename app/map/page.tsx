"use client"
import { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const MapPage = () => {
  const [busStops, setBusStops] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routingControlRef = useRef(null);

  useEffect(() => {
    const fetchBusStops = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase.from("bus_stops").select("*");
        if (error) throw error;
        setBusStops(data || []);
      } catch (error) {
        setError("Failed to load bus stops.");
        console.error("Error fetching bus stops:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBusStops();
  }, []);

  useEffect(() => {
    // Don't proceed if we're in SSR or the container ref isn't available
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    let L;
    
    const initMap = async () => {
      try {
        // Check if there's already a map instance - if so, remove it
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }
        
        // Check if the container already has a Leaflet map
        if (mapContainerRef.current._leaflet_id) {
          console.log("Container already has a map, cleaning up...");
          // Reset the container to ensure it's clean
          mapContainerRef.current.innerHTML = '';
          delete mapContainerRef.current._leaflet_id;
        }

        // Import Leaflet
        L = await import("leaflet");
        await import("leaflet/dist/leaflet.css");
        await import("leaflet-routing-machine");
        
        // Create a new map instance
        mapInstanceRef.current = L.map(mapContainerRef.current, {
          // Explicitly set this to prevent errors
          preferCanvas: true
        }).setView([19.076, 72.8777], 12);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(mapInstanceRef.current);
        
        // If we have bus stops, add them to the map
        if (busStops.length > 0) {
          addBusStopsToMap(L);
        }
      } catch (error) {
        console.error("Error initializing map:", error);
        setError("Failed to initialize map.");
      }
    };

    const addBusStopsToMap = (leaflet) => {
      try {
        if (!mapInstanceRef.current) return;
        
        // Remove existing routes
        if (routingControlRef.current) {
          mapInstanceRef.current.removeControl(routingControlRef.current);
          routingControlRef.current = null;
        }

        const waypoints = busStops.map((stop) => 
          leaflet.latLng(stop.latitude, stop.longitude)
        );

        routingControlRef.current = leaflet.Routing.control({
          waypoints,
          createMarker: (i, waypoint) =>
            leaflet.marker(waypoint.latLng, {
              icon: leaflet.icon({
                iconUrl: "/bus-stop-icon.png",
                iconSize: [25, 25],
                iconAnchor: [12, 25],
              }),
            }).bindPopup(`Bus Stop ${i + 1}: ${busStops[i]?.name || "Unknown"}`),
          routeWhileDragging: true,
          lineOptions: { styles: [{ color: "#0066CC", weight: 4 }] },
          show: false,
        }).addTo(mapInstanceRef.current);
      } catch (error) {
        console.error("Error adding bus stops to map:", error);
      }
    };

    initMap();

    // Cleanup on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mapContainerRef]); // Only depend on the container ref

  // Separate useEffect for updating bus stops on the map
  useEffect(() => {
    if (!mapInstanceRef.current || busStops.length === 0) return;

    const updateBusStops = async () => {
      const L = await import("leaflet");
      
      // Remove existing routes
      if (routingControlRef.current) {
        mapInstanceRef.current.removeControl(routingControlRef.current);
        routingControlRef.current = null;
      }

      const waypoints = busStops.map((stop) => 
        L.latLng(stop.latitude, stop.longitude)
      );

      routingControlRef.current = L.Routing.control({
        waypoints,
        createMarker: (i, waypoint) =>
          L.marker(waypoint.latLng, {
            icon: L.icon({
              iconUrl: "/images/marker-icon.png",
              iconSize: [25, 25],
              iconAnchor: [12, 25],
            }),
          }).bindPopup(`Bus Stop ${i + 1}: ${busStops[i]?.name || "Unknown"}`),
        routeWhileDragging: true,
        lineOptions: { styles: [{ color: "#0066CC", weight: 4 }] },
        show: false,
      }).addTo(mapInstanceRef.current);
    };

    updateBusStops();
  }, [busStops]);

  return (
    <div className="relative w-full h-screen">
      <div ref={mapContainerRef} className="w-full h-screen"></div>
      {isLoading && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-4 rounded shadow">
          Loading bus stops...
        </div>
      )}
      {error && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-500 text-white p-4 rounded shadow">
          {error}
        </div>
      )}
    </div>
  );
};

export default MapPage;