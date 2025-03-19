"use client";

import { useEffect, useState, useRef } from "react";

const MapPage = () => {
  const [busStops, setBusStops] = useState([]);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routingControlRef = useRef(null);
  const leafletLoaded = useRef(false);

  // Fetch bus stops
  useEffect(() => {
    const fetchBusStops = async () => {
      try {
        const response = await fetch("/api/bus_stops");
        const data = await response.json();
        setBusStops(data);
        console.log(data)
      } catch (error) {
        console.error("Error fetching bus stops:", error);
      }
    };

    fetchBusStops();
  }, []);

  // Initialize map on client-side only
  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;

    // Clean up function to handle HMR properly
    const cleanupMap = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      if (routingControlRef.current) {
        routingControlRef.current = null;
      }
    };

    // Initialize map
    const initMap = async () => {
      try {
        // Clean up existing map instance first
        cleanupMap();
        
        // Import Leaflet and related modules
        const L = await import('leaflet');
        await import('leaflet/dist/leaflet.css');
        
        // We need to create a separate import for Leaflet Routing Machine
        // This ensures it's properly registered as a Leaflet plugin
        const RoutingMachine = await import('leaflet-routing-machine');
        
        leafletLoaded.current = true;
        
        // Create map instance
        if (!mapInstanceRef.current && mapContainerRef.current) {
          mapInstanceRef.current = L.map(mapContainerRef.current).setView([19.076, 72.8777], 12);
          
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }).addTo(mapInstanceRef.current);
          
          // Add bus stops if they're available
          if (busStops.length > 0) {
            addRoutesToMap(L);
          }
        }
      } catch (error) {
        console.error("Error initializing map:", error);
      }
    };

    initMap();
    
    // Cleanup on unmount
    return cleanupMap;
  }, []);

  // Add routes to map
  const addRoutesToMap = async (L) => {
    if (!mapInstanceRef.current || !L || busStops.length === 0) return;
    
    try {
      // Ensure Leaflet and Routing Machine are loaded
      if (!leafletLoaded.current) {
        L = await import('leaflet');
        await import('leaflet-routing-machine');
        leafletLoaded.current = true;
      }
      
      // Remove existing routing control if it exists
      if (routingControlRef.current) {
        mapInstanceRef.current.removeControl(routingControlRef.current);
        routingControlRef.current = null;
      }
      
      const waypoints = busStops.map((stop) => L.latLng(stop.lat, stop.lng));
      
      // Check if Routing is available
      if (!L.Routing) {
        console.error("Leaflet Routing Machine not available");
        return;
      }
      
      routingControlRef.current = L.Routing.control({
        waypoints,
        createMarker: (i, waypoint) => 
          L.marker(waypoint.latLng, {
            icon: L.icon({
              iconUrl: "/bus-stop-icon.png",
              iconSize: [25, 25],
              iconAnchor: [12, 25],
            }),
          }).bindPopup(`Bus Stop ${i + 1}: ${busStops[i]?.name || ''}`),
        routeWhileDragging: true,
        lineOptions: {
          styles: [{ color: '#0066CC', weight: 4 }]
        },
        show: false // Hide the routing control panel
      }).addTo(mapInstanceRef.current);
    } catch (error) {
      console.error("Error adding routes to map:", error);
    }
  };

  // Update routes when bus stops change
  useEffect(() => {
    if (busStops.length > 0 && mapInstanceRef.current && typeof window !== 'undefined') {
      const updateRoutes = async () => {
        const L = await import('leaflet');
        addRoutesToMap(L);
      };
      
      updateRoutes();
    }
  }, [busStops]);

  return (
    <div className="relative w-full h-screen">
      <div ref={mapContainerRef} className="w-full h-screen"></div>
      {busStops.length === 0 && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-4 rounded shadow">
          Loading bus stops...
        </div>
      )}
    </div>
  );
};

export default MapPage;