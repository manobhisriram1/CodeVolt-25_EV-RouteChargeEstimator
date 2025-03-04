import React, { useState, useEffect } from 'react';
import { Car, Mountain, Route, TrafficCone, Battery, Navigation2, MapPin, AlertCircle, Info } from 'lucide-react';

interface RangeEstimationResult {
  estimatedRange: number;
  batteryConsumption: number;
  chargingStops: number;
  arrivalCharge: number;
}

interface RouteData {
  distance: number; // miles
  terrainFactor: number; // 1 = flat, 1.2 = hilly, 1.5 = mountainous
  trafficCondition: number; // 1 = light, 1.15 = moderate, 1.3 = heavy
  estimatedTime: string; // formatted time
  terrainType: string; // descriptive terrain type
  trafficLevel: string; // descriptive traffic level
}

// Common locations with predefined terrain and traffic characteristics
const knownLocations: Record<string, { terrain: number; traffic: number }> = {
  "new york": { terrain: 1, traffic: 1.3 },
  "san francisco": { terrain: 1.5, traffic: 1.15 },
  "denver": { terrain: 1.5, traffic: 1 },
  "chicago": { terrain: 1, traffic: 1.15 },
  "los angeles": { terrain: 1.2, traffic: 1.3 },
  "seattle": { terrain: 1.2, traffic: 1.15 },
  "miami": { terrain: 1, traffic: 1.15 },
  "austin": { terrain: 1.2, traffic: 1 },
  "boston": { terrain: 1.2, traffic: 1.15 },
  "las vegas": { terrain: 1, traffic: 1.15 },
  "portland": { terrain: 1.2, traffic: 1 },
  "phoenix": { terrain: 1, traffic: 1 },
  "atlanta": { terrain: 1.2, traffic: 1.15 },
  "dallas": { terrain: 1, traffic: 1.15 },
  "houston": { terrain: 1, traffic: 1.15 },
  "nashville": { terrain: 1.2, traffic: 1 },
  "salt lake city": { terrain: 1.5, traffic: 1 },
  "washington dc": { terrain: 1, traffic: 1.3 },
  "philadelphia": { terrain: 1, traffic: 1.15 },
  "pittsburgh": { terrain: 1.5, traffic: 1 }
};

const EVRangeEstimator: React.FC = () => {
  const [startLocation, setStartLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [batteryCapacity, setBatteryCapacity] = useState(75); // kWh
  const [currentCharge, setCurrentCharge] = useState(100); // percentage
  const [vehicleEfficiency, setVehicleEfficiency] = useState(4.5); // miles/kWh
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [result, setResult] = useState<RangeEstimationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [showSimulationInfo, setShowSimulationInfo] = useState(false);

  // Function to fetch route data (simulated)
  const fetchRouteData = async (start: string, end: string) => {
    if (!start || !end) {
      setRouteError("Please enter both start location and destination");
      return null;
    }

    setIsLoadingRoute(true);
    setRouteError(null);

    try {
      // Simulating API call to a mapping service
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Normalize location names for lookup
      const normalizedStart = start.toLowerCase().trim();
      const normalizedEnd = end.toLowerCase().trim();
      
      // Check if locations are in our known database
      const startData = Object.keys(knownLocations).find(loc => 
        normalizedStart.includes(loc) || loc.includes(normalizedStart)
      );
      
      const endData = Object.keys(knownLocations).find(loc => 
        normalizedEnd.includes(loc) || loc.includes(normalizedEnd)
      );
      
      // If we don't recognize the locations, provide feedback
      if (!startData && !endData) {
        setRouteError("Location not recognized. Try using major city names like 'New York' or 'San Francisco'.");
        setIsLoadingRoute(false);
        return null;
      }
      
      // Use known location data if available, otherwise use defaults
      const startTerrain = startData ? knownLocations[startData].terrain : 1;
      const startTraffic = startData ? knownLocations[startData].traffic : 1;
      const endTerrain = endData ? knownLocations[endData].terrain : 1;
      const endTraffic = endData ? knownLocations[endData].traffic : 1;
      
      // Calculate average terrain and traffic between start and end
      const terrainFactor = (startTerrain + endTerrain) / 2;
      const trafficCondition = (startTraffic + endTraffic) / 2;
      
      // Calculate distance based on locations
      // In a real app, this would come from a mapping API
      let distance = 0;
      
      if (startData && endData) {
        // If both locations are known, calculate a somewhat realistic distance
        const locationPair = `${startData}-${endData}`;
        
        // Some predefined distances for common routes
        const knownDistances: Record<string, number> = {
          "new york-boston": 215,
          "new york-washington dc": 225,
          "los angeles-san francisco": 380,
          "chicago-detroit": 280,
          "miami-orlando": 235,
          "seattle-portland": 175,
          "dallas-houston": 240,
          "phoenix-las vegas": 300,
          "denver-salt lake city": 370,
          "atlanta-nashville": 250
        };
        
        // Check if we have this route in our known distances
        const normalizedPair1 = `${startData}-${endData}`;
        const normalizedPair2 = `${endData}-${startData}`;
        
        if (knownDistances[normalizedPair1]) {
          distance = knownDistances[normalizedPair1];
        } else if (knownDistances[normalizedPair2]) {
          distance = knownDistances[normalizedPair2];
        } else {
          // Otherwise generate a plausible distance
          distance = 150 + Math.floor((startData.length + endData.length) * 10);
        }
      } else {
        // Generate a distance based on string lengths
        distance = 100 + Math.floor((start.length + end.length) * 5);
      }
      
      // Calculate estimated time based on distance and conditions
      const avgSpeed = 65 / trafficCondition; // Adjust speed based on traffic
      const timeInHours = distance / avgSpeed;
      const hours = Math.floor(timeInHours);
      const minutes = Math.round((timeInHours - hours) * 60);
      const estimatedTime = `${hours}h ${minutes}m`;
      
      // Get descriptive labels for terrain and traffic
      let terrainType = "Flat";
      if (terrainFactor > 1.3) terrainType = "Mountainous";
      else if (terrainFactor > 1.1) terrainType = "Hilly";
      
      let trafficLevel = "Light";
      if (trafficCondition > 1.2) trafficLevel = "Heavy";
      else if (trafficCondition > 1.1) trafficLevel = "Moderate";
      
      const newRouteData: RouteData = {
        distance,
        terrainFactor,
        trafficCondition,
        estimatedTime,
        terrainType,
        trafficLevel
      };
      
      setRouteData(newRouteData);
      return newRouteData;
    } catch (error) {
      setRouteError("Failed to fetch route data. Please try again.");
      return null;
    } finally {
      setIsLoadingRoute(false);
    }
  };

  const calculateRange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // First get route data if not already available
    let currentRouteData = routeData;
    if (!currentRouteData) {
      currentRouteData = await fetchRouteData(startLocation, destination);
      if (!currentRouteData) return; // Exit if route data couldn't be fetched
    }
    
    setIsCalculating(true);
    
    // Simulate API call or complex calculation
    setTimeout(() => {
      const availableEnergy = batteryCapacity * (currentCharge / 100);
      const adjustedEfficiency = vehicleEfficiency / (currentRouteData.terrainFactor * currentRouteData.trafficCondition);
      const maxRange = availableEnergy * adjustedEfficiency;
      
      const energyRequired = currentRouteData.distance / adjustedEfficiency;
      const batteryPercentageRequired = (energyRequired / batteryCapacity) * 100;
      const arrivalCharge = currentCharge - batteryPercentageRequired;
      
      const chargingStops = arrivalCharge < 10 ? Math.ceil((10 - arrivalCharge) / 70) : 0;
      
      setResult({
        estimatedRange: maxRange,
        batteryConsumption: batteryPercentageRequired,
        chargingStops,
        arrivalCharge: Math.max(arrivalCharge, 10) // Assuming we want at least 10% on arrival
      });
      
      setIsCalculating(false);
    }, 1500);
  };

  // Reset route data when locations change
  useEffect(() => {
    setRouteData(null);
    setResult(null);
    setRouteError(null);
  }, [startLocation, destination]);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Battery className="h-8 w-8 text-green-600 mr-2" />
          <h2 className="text-2xl font-bold text-gray-800">EV Range Estimator</h2>
        </div>
        <button 
          onClick={() => setShowSimulationInfo(!showSimulationInfo)}
          className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
        >
          <Info className="h-4 w-4 mr-1" />
          How this works
        </button>
      </div>
      
      {showSimulationInfo && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg text-sm text-gray-700">
          <h4 className="font-medium text-blue-800 mb-2">Simulation Information</h4>
          <p className="mb-2">
            This is a demonstration that simulates route data based on location names. In a production environment, 
            this would connect to mapping APIs like Google Maps or Mapbox to get real route data.
          </p>
          <p className="mb-2">
            <strong>Try these known locations:</strong> New York, Boston, San Francisco, Los Angeles, Chicago, 
            Denver, Seattle, Miami, Austin, Las Vegas, Portland, Phoenix, Atlanta, Dallas, Houston, Nashville, 
            Salt Lake City, Washington DC, Philadelphia, Pittsburgh
          </p>
          <p>
            <strong>How it works:</strong> The system recognizes major city names and assigns appropriate terrain 
            and traffic conditions. Mountainous regions like Denver and San Francisco have higher terrain factors, 
            while cities like New York and Los Angeles have heavier traffic conditions.
          </p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 p-5 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Navigation2 className="h-5 w-5 mr-2 text-blue-600" />
            Route Information
          </h3>
          
          <form onSubmit={calculateRange}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Location
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={startLocation}
                  onChange={(e) => setStartLocation(e.target.value)}
                  className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter city name (e.g., New York)"
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Destination
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter city name (e.g., Boston)"
                />
              </div>
            </div>
            
            {routeError && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                <span>{routeError}</span>
              </div>
            )}
            
            {routeData && (
              <div className="mb-6 p-4 bg-blue-50 rounded-md">
                <h4 className="font-medium text-blue-800 mb-2">Route Details</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Distance:</span>
                    <span className="ml-2 font-medium">{routeData.distance.toFixed(1)} miles</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Est. Time:</span>
                    <span className="ml-2 font-medium">{routeData.estimatedTime}</span>
                  </div>
                  <div className="flex items-center">
                    <Mountain className="h-4 w-4 text-gray-600 mr-1" />
                    <span className="text-gray-600">Terrain:</span>
                    <span className="ml-2 font-medium">{routeData.terrainType}</span>
                  </div>
                  <div className="flex items-center">
                    <TrafficCone className="h-4 w-4 text-gray-600 mr-1" />
                    <span className="text-gray-600">Traffic:</span>
                    <span className="ml-2 font-medium">{routeData.trafficLevel}</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vehicle Efficiency (miles/kWh)
              </label>
              <input
                type="number"
                value={vehicleEfficiency}
                onChange={(e) => setVehicleEfficiency(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                step="0.1"
                min="1"
                max="10"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Battery Capacity (kWh)
              </label>
              <input
                type="number"
                value={batteryCapacity}
                onChange={(e) => setBatteryCapacity(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                step="1"
                min="10"
                max="200"
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Charge ({currentCharge}%)
              </label>
              <input
                type="range"
                value={currentCharge}
                onChange={(e) => setCurrentCharge(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                min="1"
                max="100"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => fetchRouteData(startLocation, destination)}
                className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition duration-200 flex items-center justify-center"
                disabled={isLoadingRoute || !startLocation || !destination}
              >
                {isLoadingRoute ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Route className="h-5 w-5 mr-2" />
                    Get Route
                  </span>
                )}
              </button>
              
              <button
                type="submit"
                className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-200 flex items-center justify-center"
                disabled={isCalculating || !routeData}
              >
                {isCalculating ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Calculating...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Battery className="h-5 w-5 mr-2" />
                    Calculate Range
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
        
        <div className="bg-gray-50 p-5 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Car className="h-5 w-5 mr-2 text-blue-600" />
            Range Estimation Results
          </h3>
          
          {result && routeData ? (
            <div className="space-y-6">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 font-medium">Maximum Range:</span>
                  <span className="text-xl font-bold text-blue-700">{result.estimatedRange.toFixed(1)} miles</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                  <div 
                    className={`h-2.5 rounded-full ${routeData.distance <= result.estimatedRange ? 'bg-green-600' : 'bg-red-600'}`}
                    style={{ width: `${Math.min(100, (result.estimatedRange / (routeData.distance || result.estimatedRange)) * 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0</span>
                  <span>{routeData.distance > 0 ? `${routeData.distance.toFixed(1)} miles (trip)` : 'Trip distance'}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="text-gray-600 font-medium mb-1">Battery Consumption</div>
                  <div className="text-2xl font-bold text-blue-700">{result.batteryConsumption.toFixed(1)}%</div>
                  <div className="text-sm text-gray-500">of total capacity</div>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="text-gray-600 font-medium mb-1">Arrival Charge</div>
                  <div className={`text-2xl font-bold ${result.arrivalCharge < 20 ? 'text-orange-600' : 'text-green-600'}`}>
                    {result.arrivalCharge.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-500">remaining battery</div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-gray-600 font-medium mb-2">Charging Stops Needed</div>
                <div className="flex items-center">
                  {Array.from({ length: result.chargingStops }).map((_, i) => (
                    <Battery key={i} className="h-6 w-6 text-blue-600 mr-1" />
                  ))}
                  {result.chargingStops === 0 && (
                    <span className="text-green-600 font-medium">No stops needed!</span>
                  )}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {result.chargingStops > 0 
                    ? `Recommended ${result.chargingStops} charging stop${result.chargingStops > 1 ? 's' : ''}`
                    : 'You can complete this trip without charging'}
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-gray-600 font-medium mb-2">Trip Assessment</div>
                <div className={`text-lg font-semibold ${routeData.distance <= result.estimatedRange ? 'text-green-600' : 'text-red-600'}`}>
                  {routeData.distance <= result.estimatedRange 
                    ? 'Trip is within range' 
                    : 'Trip exceeds current range'}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {routeData.distance <= result.estimatedRange 
                    ? `You have approximately ${(result.estimatedRange - routeData.distance).toFixed(1)} miles of buffer` 
                    : `You need approximately ${(routeData.distance - result.estimatedRange).toFixed(1)} more miles of range`}
                </div>
              </div>
              
              <div className="text-sm text-gray-500 italic mt-2">
                Note: Actual range may vary based on driving style, weather conditions, and other factors.
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Route className="h-12 w-12 mb-4 text-gray-400" />
              <p className="text-center">Enter your route details and calculate to see range estimation results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EVRangeEstimator;