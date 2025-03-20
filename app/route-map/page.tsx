"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "leaflet-routing-machine";

// Custom marker icon
const defaultIcon = L.icon({
  iconUrl: "/images/marker-icon.png",
  shadowUrl: "/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Routing component
const RoutingMachine = ({ waypoints }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || waypoints.length < 2) return;

    // Create custom plan to disable text instructions
    const plan = new L.Routing.Plan(
      waypoints.map((wp) => L.latLng(wp.lat, wp.lng)),
      {
        createMarker: () => null,
        draggableWaypoints: false,
        addWaypoints: false,
      }
    );

    // Create custom router to disable text instructions
    const router = L.Routing.osrmv1({
      serviceUrl: 'https://router.project-osrm.org/route/v1',
      profile: 'driving',
    });

    // Create routing control with custom options
    let routingControl = L.Routing.control({
      plan: plan,
      router: router,
      routeWhileDragging: false,
      showAlternatives: false,
      lineOptions: { styles: [{ color: "#3388ff", weight: 4 }] },
      // Disable itinerary (text instructions)
      show: false,
      collapsible: true,
      collapsed: true,
      // Hide the control elements
      fitSelectedRoutes: false,
      // Additional options to suppress text
      addWaypoints: false,
      draggableWaypoints: false,
    }).addTo(map);

    // Additional cleanup of UI elements
    routingControl.on('routesfound', function() {
      // Hide any itinerary containers
      const containers = document.querySelectorAll('.leaflet-routing-container');
      containers.forEach(container => {
        container.style.display = 'none';
      });
    });

    return () => {
      if (map && routingControl) {
        routingControl.setWaypoints([]);
        map.removeControl(routingControl);
      }
    };
  }, [map, waypoints]);

  return null;
};

// Custom CSS to hide routing instructions
const RoutingCSS = () => {
  useEffect(() => {
    // Create a style element
    const style = document.createElement('style');
    // Add CSS to hide routing instructions
    style.textContent = `
      .leaflet-routing-container {
        display: none !important;
      }
      .leaflet-routing-alt {
        display: none !important;
      }
      .leaflet-routing-geocoders {
        display: none !important;
      }
      .leaflet-routing-error {
        display: none !important;
      }
    `;
    // Append the style to the document head
    document.head.appendChild(style);

    // Cleanup
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return null;
};

const RouteMap = () => {
  const searchParams = useSearchParams();
  const [route, setRoute] = useState(null);
  const [waypoints, setWaypoints] = useState([]);

  useEffect(() => {
    const routeData = searchParams.get("data");
    if (routeData) {
      try {
        const parsedRoute = JSON.parse(decodeURIComponent(routeData));
        console.log("Parsed Route:", parsedRoute); // Debugging

        // Fix: Parse waypoints if it's still a string
        const waypointsArray =
          typeof parsedRoute.waypoints === "string"
            ? JSON.parse(parsedRoute.waypoints)
            : parsedRoute.waypoints;

        if (Array.isArray(waypointsArray)) {
          setWaypoints(waypointsArray);
        } else {
          console.warn("Waypoints are missing or invalid.");
        }
        setRoute(parsedRoute);
      } catch (err) {
        console.error("Error parsing route data:", err);
      }
    }
  }, [searchParams]);

  if (!route) {
    return <div>Loading route...</div>;
  }

  if (!waypoints.length) {
    return <div>No waypoints found</div>;
  }

  const center = [waypoints[0].lat, waypoints[0].lng];

  return (
    <div className="h-96 w-full rounded-lg overflow-hidden">
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Add custom CSS to hide routing instructions */}
        <RoutingCSS />
        
        {waypoints.map((wp, index) => (
          <Marker
            key={index}
            position={[wp.lat, wp.lng]}
            icon={defaultIcon}
          >
            <Popup>
              Stop: {wp.lat.toFixed(4)}, {wp.lng.toFixed(4)}
            </Popup>
          </Marker>
        ))}
        
        {waypoints.length >= 2 && <RoutingMachine waypoints={waypoints} />}
      </MapContainer>
    </div>
  );
};

export default RouteMap;