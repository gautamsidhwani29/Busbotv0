import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { MapIcon, ChevronDown, ChevronUp } from "lucide-react";

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const OptimizedRouteDisplay = () => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedRoute, setExpandedRoute] = useState(null);

  useEffect(() => {
    const fetchRoutes = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("optimized_routes")
          .select("id, name, stops");
        if (error) throw error;

        const processedData = data.map(route => ({
          ...route,
          processedStops: processStops(route.stops),
        }));

        setRoutes(processedData);
      } catch (err) {
        setError("Failed to load routes");
        console.error("Error fetching routes:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRoutes();
  }, []);

  const processStops = (stops) => {
    if (!stops) return [];
    try {
      if (typeof stops === "string") {
        const parsed = JSON.parse(stops);
        if (Array.isArray(parsed)) return parsed;
        if (parsed.waypoints && Array.isArray(parsed.waypoints)) return parsed.waypoints;
        if (parsed.lat && parsed.lng) return [parsed];
        return Object.values(parsed);
      }
      if (typeof stops === "object") {
        if (stops.lat && stops.lng) return [stops];
        if (stops.waypoints && Array.isArray(stops.waypoints)) return stops.waypoints;
        return Object.values(stops);
      }
      return Array.isArray(stops) ? stops : [];
    } catch (err) {
      console.error("Error processing stops:", err);
      return [];
    }
  };

  const handleViewRoute = (route) => {
    try {
      const routeData = JSON.stringify({
        name: route.name,
        waypoints: route.processedStops,
      });

      const mapWindow = window.open(
        `/route-map?data=${encodeURIComponent(routeData)}`,
        "_blank"
      );
      if (!mapWindow) console.error("Popup was blocked. Please allow popups.");
    } catch (err) {
      console.error("Error opening route map:", err);
    }
  };

  return (
    <div className="p-4 bg-jaguar text-white min-h-screen">
      <h2 className="text-xl font-bold mb-4">Optimized Routes</h2>
      {loading && <p>Loading routes...</p>}
      {error && <p className="text-red-500">{error}</p>}

      <div className="space-y-6">
        {routes.map((route) => (
          <div key={route.id} className="border p-4 rounded-lg shadow bg-gray-800">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{route.name || "Unnamed Route"}</h3>
              <button
                className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                onClick={() => handleViewRoute(route)}
              >
                <MapIcon size={16} />
                <span>Show Route</span>
              </button>
            </div>

            <div className="mt-3 flex justify-between items-center">
              <span className="text-sm text-gray-300">{route.processedStops.length} stops</span>
              <button
                onClick={() => setExpandedRoute(expandedRoute === route.id ? null : route.id)}
                className="flex items-center text-blue-400 hover:underline"
              >
                {expandedRoute === route.id ? (
                  <>
                    Hide Stops <ChevronUp size={18} className="ml-2" />
                  </>
                ) : (
                  <>
                    Show Stops <ChevronDown size={18} className="ml-2" />
                  </>
                )}
              </button>
            </div>

            {expandedRoute === route.id && (
              <div className="mt-4 overflow-y-auto max-h-64">
                {route.processedStops.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="p-2 text-left">#</th>
                        <th className="p-2 text-left">Latitude</th>
                        <th className="p-2 text-left">Longitude</th>
                      </tr>
                    </thead>
                    <tbody>
                      {route.processedStops.map((stop, index) => (
                        <tr key={`stop-${index}`} className="border-b border-gray-700 hover:bg-gray-700">
                          <td className="p-2">{index + 1}</td>
                          <td className="p-2">{stop.lat?.toFixed?.(6) || stop.lat || "N/A"}</td>
                          <td className="p-2">{stop.lng?.toFixed?.(6) || stop.lng || "N/A"}</td>
                          
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-gray-400 py-2">No stops available</p>
                )}
              </div>
            )}
          </div>
        ))}

        {routes.length === 0 && !loading && (
          <p className="text-center text-gray-400 py-8">No routes available</p>
        )}
      </div>
    </div>
  );
};

export default OptimizedRouteDisplay;
