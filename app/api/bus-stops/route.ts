import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(
  "https://vouxrjvgsishauzfqlyz.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvdXhyanZnc2lzaGF1emZxbHl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc2OTIyNzksImV4cCI6MjA1MzI2ODI3OX0.7FQ8Iifb4_8j39lpK9ckYjqnxjifGCCxAr73HhHJUfE"
);

export async function GET() {
  try {
    // Fetch all depots with latitude and longitude
    const { data, error } = await supabase
      .from("depots")
      .select("id, name, latitude, longitude")
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);
    
    if (error) throw error;
    
    // Transform the data to match the format expected by the frontend
    const transformedData = data.map(depot => ({
      id: depot.id,
      name: depot.name,
      lat: depot.latitude,  // Map latitude to lat for frontend compatibility
      lng: depot.longitude  // Map longitude to lng for frontend compatibility
    }));
    
    return NextResponse.json(transformedData, { status: 200 });
  } catch (error) {
    console.error("Error fetching depots:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}