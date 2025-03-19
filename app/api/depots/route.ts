import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client securely
const supabase = createClient(
  "https://vouxrjvgsishauzfqlyz.supabase.co",
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvdXhyanZnc2lzaGF1emZxbHl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc2OTIyNzksImV4cCI6MjA1MzI2ODI3OX0.7FQ8Iifb4_8j39lpK9ckYjqnxjifGCCxAr73HhHJUfE'
);

export async function GET() {
  try {
    // Fetch depots from Supabase
    const { data, error } = await supabase
      .from("depots")
      .select("id, name, latitude, longitude")
      .not("latitude", "is", null)
      .not("longitude", "is", null);

    if (error) {
      console.error("Error fetching depots:", error);
      return NextResponse.json({ error: "Failed to fetch depots" }, { status: 500 });
    }

    // Transform data for frontend
    const transformedData = data.map(depot => ({
      id: depot.id,
      name: depot.name,
      lat: depot.latitude,  // Frontend expects lat/lng
      lng: depot.longitude
    }));

    return NextResponse.json(transformedData, { status: 200 });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
