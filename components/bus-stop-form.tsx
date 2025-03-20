"use client"

import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { MapPin, Plus, Edit, Trash2, Eye, Warehouse, Bus } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Slider } from "@/components/ui/slider"
import { createClient } from '@supabase/supabase-js'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// BusStop interface
export interface BusStop {
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
  priority: number;
}

// Depot interface
export interface Depot {
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
}

// Initialize Supabase client
const supabaseUrl = 'https://vouxrjvgsishauzfqlyz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvdXhyanZnc2lzaGF1emZxbHl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc2OTIyNzksImV4cCI6MjA1MzI2ODI3OX0.7FQ8Iifb4_8j39lpK9ckYjqnxjifGCCxAr73HhHJUfE'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function BusStopManager() {
  // Form state
  const [name, setName] = useState("")
  const [latitude, setLatitude] = useState("")
  const [longitude, setLongitude] = useState("")
  const [priority, setPriority] = useState<number>(5) // Default priority 5 (middle of 1-10 scale)
  const [locationType, setLocationType] = useState<"bus_stop" | "depot">("bus_stop")
  const [activeTab, setActiveTab] = useState<"bus_stops" | "depots">("bus_stops")
  
  // Data lists state
  const [stops, setStops] = useState<BusStop[]>([])
  const [depots, setDepots] = useState<Depot[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Dialog states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentStop, setCurrentStop] = useState<BusStop | null>(null)
  const [currentDepot, setCurrentDepot] = useState<Depot | null>(null)
  const [currentItemType, setCurrentItemType] = useState<"bus_stop" | "depot">("bus_stop")

  // Edit form state
  const [editName, setEditName] = useState("")
  const [editLatitude, setEditLatitude] = useState("")
  const [editLongitude, setEditLongitude] = useState("")
  const [editPriority, setEditPriority] = useState(5)

  // Fetch data on component mount and tab change
  useEffect(() => {
    if (activeTab === "bus_stops") {
      fetchBusStops()
    } else {
      fetchDepots()
    }
  }, [activeTab])

  const fetchBusStops = async () => {
    setLoading(true)
    setFetchError(null)
    
    try {
      // Get bus stops from Supabase
      const { data, error } = await supabase
        .from('bus_stops')
        .select('*')
        .order('priority', { ascending: false })
        .order('name')
      
      if (error) {
        setFetchError(`Error: ${error.message}`)
        throw error
      }
      
      if (data) {
        // Convert database fields to match interface
        const formattedData: BusStop[] = data.map(stop => ({
          id: stop.id,
          name: stop.name,
          latitude: stop.latitude,
          longitude: stop.longitude,
          priority: stop.priority
        }))
        
        setStops(formattedData)
      } else {
        console.log('No data found')
        setStops([])
      }
    } catch (error) {
      console.error('Error fetching bus stops:', error)
      toast({
        title: "Error",
        description: "Failed to load bus stops from database. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchDepots = async () => {
    setLoading(true)
    setFetchError(null)
    
    try {
      // Get depots from Supabase
      const { data, error } = await supabase
        .from('depots')
        .select('*')
        .order('name')
      
      if (error) {
        setFetchError(`Error: ${error.message}`)
        throw error
      }
      
      if (data) {
        // Convert database fields to match interface
        const formattedData: Depot[] = data.map(depot => ({
          id: depot.id,
          name: depot.name,
          latitude: depot.latitude,
          longitude: depot.longitude
        }))
        
        setDepots(formattedData)
      } else {
        console.log('No depots found')
        setDepots([])
      }
    } catch (error) {
      console.error('Error fetching depots:', error)
      toast({
        title: "Error",
        description: "Failed to load depots from database. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate inputs
    if (!name || !latitude || !longitude) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    // Validate coordinates
    const lat = Number.parseFloat(latitude)
    const lng = Number.parseFloat(longitude)

    if (isNaN(lat) || isNaN(lng)) {
      toast({
        title: "Error",
        description: "Latitude and longitude must be valid numbers",
        variant: "destructive",
      })
      return
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast({
        title: "Error",
        description: "Latitude must be between -90 and 90, longitude between -180 and 180",
        variant: "destructive",
      })
      return
    }

    // Handle based on type
    if (locationType === "bus_stop") {
      await addBusStop(name, lat, lng, priority)
    } else {
      await addDepot(name, lat, lng)
    }
  }

  const addBusStop = async (name: string, lat: number, lng: number, priority: number) => {
    // Create new bus stop
    const newStop: BusStop = {
      id: crypto.randomUUID(), // Generate UUID for the new stop
      name,
      latitude: lat,
      longitude: lng,
      priority
    }

    try {
      // Insert into Supabase - using only the column names that exist in the database
      const { data, error } = await supabase
        .from('bus_stops')
        .insert([{
          id: newStop.id,
          name: newStop.name,
          latitude: newStop.latitude,
          longitude: newStop.longitude,
          priority: newStop.priority
        }])
        .select()

      if (error) {
        throw error
      }

      // Set active tab to bus stops
      setActiveTab("bus_stops")
      
      // Refresh stops list
      fetchBusStops()

      // Reset form
      resetForm()

      // Show success message
      toast({
        title: "Success", 
        description: "Bus stop added successfully",
      })
    } catch (error) {
      console.error('Error adding bus stop:', error)
      toast({
        title: "Error",
        description: "Failed to add bus stop to database. Please try again.",
        variant: "destructive",
      })
    }
  }

  const addDepot = async (name: string, lat: number, lng: number) => {
    // Create new depot
    const newDepot: Depot = {
      id: crypto.randomUUID(), // Generate UUID for the new depot
      name,
      latitude: lat,
      longitude: lng
    }

    try {
      // Insert into Supabase
      const { data, error } = await supabase
        .from('depots')
        .insert([{
          id: newDepot.id,
          name: newDepot.name,
          latitude: newDepot.latitude,
          longitude: newDepot.longitude
        }])
        .select()

      if (error) {
        throw error
      }

      // Set active tab to depots
      setActiveTab("depots")
      
      // Refresh depots list
      fetchDepots()

      // Reset form
      resetForm()

      // Show success message
      toast({
        title: "Success", 
        description: "Depot added successfully",
      })
    } catch (error) {
      console.error('Error adding depot:', error)
      toast({
        title: "Error",
        description: "Failed to add depot to database. Please try again.",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setName("")
    setLatitude("")
    setLongitude("")
    setPriority(5)
  }

  const openEditDialog = (item: BusStop | Depot, type: "bus_stop" | "depot") => {
    setCurrentItemType(type)
    
    if (type === "bus_stop") {
      const stop = item as BusStop
      setCurrentStop(stop)
      setCurrentDepot(null)
      setEditName(stop.name)
      setEditLatitude(stop.latitude.toString())
      setEditLongitude(stop.longitude.toString())
      setEditPriority(stop.priority)
    } else {
      const depot = item as Depot
      setCurrentDepot(depot)
      setCurrentStop(null)
      setEditName(depot.name)
      setEditLatitude(depot.latitude.toString())
      setEditLongitude(depot.longitude.toString())
      setEditPriority(5) // Default, not used for depots
    }
    
    setIsEditDialogOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentStop && !currentDepot) return

    // Validate inputs
    if (!editName || !editLatitude || !editLongitude) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    // Validate coordinates
    const lat = Number.parseFloat(editLatitude)
    const lng = Number.parseFloat(editLongitude)

    if (isNaN(lat) || isNaN(lng)) {
      toast({
        title: "Error",
        description: "Latitude and longitude must be valid numbers",
        variant: "destructive",
      })
      return
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast({
        title: "Error",
        description: "Latitude must be between -90 and 90, longitude between -180 and 180",
        variant: "destructive",
      })
      return
    }

    if (currentItemType === "bus_stop" && currentStop) {
      await updateBusStop(currentStop, editName, lat, lng, editPriority)
    } else if (currentItemType === "depot" && currentDepot) {
      await updateDepot(currentDepot, editName, lat, lng)
    }
  }

  const updateBusStop = async (stop: BusStop, name: string, lat: number, lng: number, priority: number) => {
    try {
      // Update in Supabase
      const { error } = await supabase
        .from('bus_stops')
        .update({
          name: name,
          latitude: lat,
          longitude: lng,
          priority: priority
        })
        .eq('id', stop.id)

      if (error) {
        throw error
      }

      // Update local state
      setStops(stops.map(s => 
        s.id === stop.id 
          ? { ...s, name, latitude: lat, longitude: lng, priority }
          : s
      ))

      // Close dialog
      setIsEditDialogOpen(false)
      setCurrentStop(null)
      
      toast({
        title: "Success",
        description: "Bus stop updated successfully",
      })
    } catch (error) {
      console.error('Error updating bus stop:', error)
      toast({
        title: "Error",
        description: "Failed to update bus stop. Please try again.",
        variant: "destructive",
      })
    }
  }

  const updateDepot = async (depot: Depot, name: string, lat: number, lng: number) => {
    try {
      // Update in Supabase
      const { error } = await supabase
        .from('depots')
        .update({
          name: name,
          latitude: lat,
          longitude: lng
        })
        .eq('id', depot.id)

      if (error) {
        throw error
      }

      // Update local state
      setDepots(depots.map(d => 
        d.id === depot.id 
          ? { ...d, name, latitude: lat, longitude: lng }
          : d
      ))

      // Close dialog
      setIsEditDialogOpen(false)
      setCurrentDepot(null)
      
      toast({
        title: "Success",
        description: "Depot updated successfully",
      })
    } catch (error) {
      console.error('Error updating depot:', error)
      toast({
        title: "Error",
        description: "Failed to update depot. Please try again.",
        variant: "destructive",
      })
    }
  }

  const openDeleteDialog = (item: BusStop | Depot, type: "bus_stop" | "depot") => {
    setCurrentItemType(type)
    
    if (type === "bus_stop") {
      setCurrentStop(item as BusStop)
      setCurrentDepot(null)
    } else {
      setCurrentDepot(item as Depot)
      setCurrentStop(null)
    }
    
    setIsDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (currentItemType === "bus_stop" && currentStop) {
      await deleteBusStop(currentStop)
    } else if (currentItemType === "depot" && currentDepot) {
      await deleteDepot(currentDepot)
    }
  }

  const deleteBusStop = async (stop: BusStop) => {
    try {
      // Delete from Supabase
      const { error } = await supabase
        .from('bus_stops')
        .delete()
        .eq('id', stop.id)

      if (error) {
        throw error
      }

      // Remove the deleted stop from the state
      setStops(stops.filter(s => s.id !== stop.id))
      
      // Close dialog
      setIsDeleteDialogOpen(false)
      setCurrentStop(null)
      
      toast({
        title: "Success",
        description: "Bus stop deleted successfully",
      })
    } catch (error) {
      console.error('Error deleting bus stop:', error)
      toast({
        title: "Error",
        description: "Failed to delete bus stop. Please try again.",
        variant: "destructive",
      })
    }
  }

  const deleteDepot = async (depot: Depot) => {
    try {
      // Delete from Supabase
      const { error } = await supabase
        .from('depots')
        .delete()
        .eq('id', depot.id)

      if (error) {
        throw error
      }

      // Remove the deleted depot from the state
      setDepots(depots.filter(d => d.id !== depot.id))
      
      // Close dialog
      setIsDeleteDialogOpen(false)
      setCurrentDepot(null)
      
      toast({
        title: "Success",
        description: "Depot deleted successfully",
      })
    } catch (error) {
      console.error('Error deleting depot:', error)
      toast({
        title: "Error",
        description: "Failed to delete depot. Please try again.",
        variant: "destructive",
      })
    }
  }

  const viewOnMap = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank')
  }

  const getPriorityLabel = (priority: number) => {
    if (priority <= 3) return "Low"
    if (priority <= 7) return "Medium"
    return "High"
  }

  const getPriorityClass = (priority: number) => {
    if (priority <= 3) return "text-blue-500"
    if (priority <= 7) return "text-amber-500"
    return "text-red-500"
  }

  return (
    <div className="space-y-6">
      {/* Form Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-4">
          <CardHeader className="px-0 pt-0">
            <CardTitle>Add Location</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pt-0">
            <div className="mb-4">
              <Label htmlFor="locationType" className="mb-2 block">Location Type</Label>
              <Select 
                value={locationType} 
                onValueChange={(value: "bus_stop" | "depot") => setLocationType(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bus_stop"><div className="flex items-center"><Bus className="h-4 w-4 mr-2" /> Bus Stop</div></SelectItem>
                  <SelectItem value="depot"><div className="flex items-center"><Warehouse className="h-4 w-4 mr-2" /> Depot</div></SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder={`Enter ${locationType === "bus_stop" ? "stop" : "depot"} name`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude *</Label>
                  <Input
                    id="latitude"
                    placeholder="e.g. 40.7128"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude *</Label>
                  <Input
                    id="longitude"
                    placeholder="e.g. -74.0060"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              {/* Priority slider only for bus stops */}
              {locationType === "bus_stop" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="priority">Priority: {getPriorityLabel(priority)}</Label>
                    <span className={`text-sm font-medium ${getPriorityClass(priority)}`}>
                      {priority}/10
                    </span>
                  </div>
                  <Slider
                    id="priority"
                    min={1}
                    max={10}
                    step={1}
                    value={[priority]}
                    onValueChange={(value) => setPriority(value[0])}
                    className="cursor-pointer"
                  />
                </div>
              )}

              <Button type="submit" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add {locationType === "bus_stop" ? "Bus Stop" : "Depot"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div>
          <h3 className="text-lg font-medium mb-4">Guidelines for Adding Locations</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-primary mt-0.5" />
              <span>Ensure locations are placed on valid areas (not in water or on buildings)</span>
            </li>
            <li className="flex items-start gap-2">
              <Bus className="h-4 w-4 text-primary mt-0.5" />
              <span>Bus stops should be placed at logical locations like intersections or near important facilities</span>
            </li>
            <li className="flex items-start gap-2">
              <Warehouse className="h-4 w-4 text-primary mt-0.5" />
              <span>Depots should be placed in areas with sufficient space for parking and maintenance</span>
            </li>
            {locationType === "bus_stop" && (
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-primary mt-0.5" />
                <span>Set appropriate priority level (1-10) based on stop importance</span>
              </li>
            )}
            <li className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-primary mt-0.5" />
              <span>Add descriptive names to make locations easily identifiable</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Tabs for Bus Stops and Depots */}
      <Tabs defaultValue="bus_stops" value={activeTab} onValueChange={(value) => setActiveTab(value as "bus_stops" | "depots")}>
        <TabsList className="mb-4">
          <TabsTrigger value="bus_stops" className="flex items-center">
            <Bus className="h-4 w-4 mr-2" /> Bus Stops
          </TabsTrigger>
          <TabsTrigger value="depots" className="flex items-center">
            <Warehouse className="h-4 w-4 mr-2" /> Depots
          </TabsTrigger>
        </TabsList>
        
        {/* Bus Stops Table */}
        <TabsContent value="bus_stops">
          <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bus className="h-5 w-5" />
                Bus Stops
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchBusStops}
                disabled={loading}
              >
                Refresh List
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-6">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : fetchError ? (
                <div className="text-center py-6 text-destructive">
                  {fetchError}
                  <div className="mt-2">
                    <Button variant="outline" size="sm" onClick={fetchBusStops}>
                      Try Again
                    </Button>
                  </div>
                </div>
              ) : stops.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  No bus stops found. Add your first bus stop above.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Coordinates</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stops.map((stop) => (
                        <TableRow key={stop.id}>
                          <TableCell className="font-medium">{stop.name}</TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">
                              {stop.latitude.toFixed(6)}, {stop.longitude.toFixed(6)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className={`font-medium ${getPriorityClass(stop.priority)}`}>
                                {stop.priority}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({getPriorityLabel(stop.priority)})
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => viewOnMap(stop.latitude, stop.longitude)}
                                title="View on map"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(stop, "bus_stop")}
                                title="Edit bus stop"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openDeleteDialog(stop, "bus_stop")}
                                className="text-destructive hover:text-destructive"
                                title="Delete bus stop"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Depots Table */}
        <TabsContent value="depots">
          <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Warehouse className="h-5 w-5" />
                Depots
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchDepots}
                disabled={loading}
              >
                Refresh List
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-6">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : fetchError ? (
                <div className="text-center py-6 text-destructive">
                  {fetchError}
                  <div className="mt-2">
                    <Button variant="outline" size="sm" onClick={fetchDepots}>
                      Try Again
                    </Button>
                  </div>
                </div>
              ) : depots.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  No depots found. Add your first depot above.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Coordinates</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {depots.map((depot) => (
                        <TableRow key={depot.id}>
                          <TableCell className="font-medium">{depot.name}</TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">
                              {depot.latitude.toFixed(6)}, {depot.longitude.toFixed(6)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => viewOnMap(depot.latitude, depot.longitude)}
                                title="View on map"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(depot, "depot")}
                                title="Edit depot"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openDeleteDialog(depot, "depot")}
                                className="text-destructive hover:text-destructive"
                                title="Delete depot"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit {currentItemType === "bus_stop" ? "Bus Stop" : "Depot"}
            </DialogTitle>
            <DialogDescription>
              Make changes to the {currentItemType === "bus_stop" ? "bus stop" : "depot"} details below.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-latitude">Latitude</Label>
                <Input
                  id="edit-latitude"
                  value={editLatitude}
                  onChange={(e) => setEditLatitude(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-longitude">Longitude</Label>
                <Input
                  id="edit-longitude"
                  value={editLongitude}
                  onChange={(e) => setEditLongitude(e.target.value)}
                  required
                />
              </div>
            </div>
            
            {/* Priority slider only for bus stops */}
            {currentItemType === "bus_stop" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label htmlFor="edit-priority">Priority: {getPriorityLabel(editPriority)}</Label>
                  <span className={`text-sm font-medium ${getPriorityClass(editPriority)}`}>
                    {editPriority}/10
                  </span>
                </div>
                <Slider
                  id="edit-priority"
                  min={1}
                  max={10}
                  step={1}
                  value={[editPriority]}
                  onValueChange={(value) => setEditPriority(value[0])}
                  className="cursor-pointer"
                />
              </div>
            )}

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this {currentItemType === "bus_stop" ? "bus stop" : "depot"}?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}