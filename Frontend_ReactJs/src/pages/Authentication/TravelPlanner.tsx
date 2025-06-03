import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { JSX } from 'react/jsx-runtime';

// Correction pour les icônes Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Icônes personnalisées
const hotelIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3170/3170765.png',
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -35],
});

const activityIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3208/3208615.png',
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -35],
});

const restaurantIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/4320/4320247.png',
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -35],
});

interface TravelResult {
  type: 'Hôtel' | 'Vol' | 'Activité' | 'Restaurant';
  title: string;
  image?: string;
  description?: string;
  price?: string;
  currency?: string;
  duration?: string;
  departure?: string;
  arrival?: string;
  airline?: string;
  address?: string;
  rating?: number;
  amenities?: string[];
  departureTime?: string;
  arrivalTime?: string;
  stops?: number;
  terminal?: string;
  bookingUrl?: string;
  rawData?: any;
  id?: string;
  date?: string;
  priority?: number;
  location?: {
    lat: number;
    lng: number;
  };
  timeEstimate?: string;
  distanceEstimate?: string;
}

interface FavoritesType {
  hotels: TravelResult[];
  flights: TravelResult[];
  activities: TravelResult[];
  restaurants: TravelResult[];
  [key: string]: TravelResult[];
}

interface PlanningType {
  [date: string]: TravelResult[];
}

interface TravelDates {
  startDate: string;
  endDate: string;
}

interface RouteInfo {
  distance: string;
  duration: string;
  points: [number, number][];
}

// Add these interfaces after the existing interfaces
interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface WeatherInfo {
  location: string;
  condition: string;
  temperature: number;
  icon: string;
  forecast: {
    date: string;
    condition: string;
    temperature: number;
    icon: string;
  }[];
  clothingRecommendations: string[];
}

interface TravelCost {
  flights: number;
  hotels: number;
  activities: number;
  transport: number;
  meals: number;
  total: number;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.6,
      when: "beforeChildren",
      staggerChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5 }
  }
};

const TravelPlanner = () => {
  const navigate = useNavigate();
  const [description, setDescription] = useState('');
  const [hotels, setHotels] = useState<TravelResult[]>([]);
  const [flights, setFlights] = useState<TravelResult[]>([]);
  const [activities, setActivities] = useState<TravelResult[]>([]);
  const [restaurants, setRestaurants] = useState<TravelResult[]>([]);
  const [selectedType, setSelectedType] = useState<'Hôtel' | 'Vol' | 'Activité' | 'Restaurant' | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState<{[key: number]: boolean}>({});
  const [favorites, setFavorites] = useState<FavoritesType>({ 
    hotels: [], 
    flights: [], 
    activities: [],
    restaurants: []
  });
  const [planning, setPlanning] = useState<PlanningType>({});
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showFavorites, setShowFavorites] = useState(false);
  const [travelDates, setTravelDates] = useState<TravelDates>({
    startDate: '',
    endDate: ''
  });
  const [showPlanningModal, setShowPlanningModal] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [selectedDayForMap, setSelectedDayForMap] = useState<string>('');
  const [mapRoutes, setMapRoutes] = useState<{[date: string]: RouteInfo[]}>({});
  const [showMap, setShowMap] = useState(false);
  const [destination, setDestination] = useState<string>('');
  const [suggestedRestaurants, setSuggestedRestaurants] = useState<TravelResult[]>([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(false);
  const [showRestaurantModal, setShowRestaurantModal] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([48.8566, 2.3522]); // Paris par défaut

  // Add these state variables in the TravelPlanner component
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [weatherInfo, setWeatherInfo] = useState<WeatherInfo | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [travelCost, setTravelCost] = useState<TravelCost>({
    flights: 0,
    hotels: 0,
    activities: 0,
    transport: 0,
    meals: 0,
    total: 0
  });
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<TravelResult[]>([]);
  const [weatherRefreshInterval, setWeatherRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // API Keys (replace with your actual keys)
  const UNSPLASH_ACCESS_KEY = 'CPrVvlz2iWy1B3wTunH5n0HtxdyxcdEMVGpBml4IVRA';
  const OPENROUTE_API_KEY = '5b3ce3597851110001cf6248e4ea272e8d32439a890c2e8d3813bc9a'; // Remplacez par votre clé API
  const MISTRAL_API_KEY = '4ZwSQdPSQjyWsdCbdfhITIVIEVXot3n7'; // Replace with your Mistral API key

  // Affichage simple des résultats
  const displayedResults = selectedType === 'Hôtel' ? hotels
    : selectedType === 'Vol' ? flights
    : selectedType === 'Activité' ? activities
    : selectedType === 'Restaurant' ? restaurants
    : [];

  const toggleDescription = (index: number) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const openBookingLink = (url: string) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const openGoogleImages = (title: string) => {
    const query = encodeURIComponent(title);
    window.open(`https://www.google.com/search?tbm=isch&q=${query}`, '_blank', 'noopener,noreferrer');
  };

  const checkImageExists = async (imageUrl: string): Promise<boolean> => {
    if (!imageUrl || imageUrl === '/hotel.jpg' || imageUrl === '/flight.jpg' || imageUrl === '/activity.jpg') {
      return false;
    }
    
    try {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = imageUrl;
        setTimeout(() => resolve(false), 3000);
      });
    } catch {
      return false;
    }
  };

  const searchActivityImage = async (activityName: string): Promise<string | null> => {
    if (!activityName) return null;
    
    // Try Unsplash first
    try {
      const query = encodeURIComponent(`${activityName} activity tourism`);
      const unsplashUrl = `https://api.unsplash.com/search/photos?query=${query}&client_id=${UNSPLASH_ACCESS_KEY}&per_page=1`;
      const unsplashResponse = await fetch(unsplashUrl);
      const unsplashData = await unsplashResponse.json();
      if (unsplashData.results?.[0]?.urls?.regular) {
        const isValid = await checkImageExists(unsplashData.results[0].urls.regular);
        if (isValid) return unsplashData.results[0].urls.regular;
      }
    } catch (error) {
      console.error('Unsplash API error:', error);
    }

    // Final fallback to generic activity images
    const fallbackImages = [
      'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=600&fit=crop'
    ];
    const randomImage = fallbackImages[Math.floor(Math.random() * fallbackImages.length)];
    return randomImage;
  };

  const searchHotelImage = async (hotelName: string): Promise<string | null> => {
    if (!hotelName) return null;
    
    // Try Unsplash first
    try {
      const query = encodeURIComponent(`${hotelName} hotel`);
      const unsplashUrl = `https://api.unsplash.com/search/photos?query=${query}&client_id=${UNSPLASH_ACCESS_KEY}&per_page=1`;
      const unsplashResponse = await fetch(unsplashUrl);
      const unsplashData = await unsplashResponse.json();
      if (unsplashData.results?.[0]?.urls?.regular) {
        const isValid = await checkImageExists(unsplashData.results[0].urls.regular);
        if (isValid) return unsplashData.results[0].urls.regular;
      }
    } catch (error) {
      console.error('Unsplash API error:', error);
    }

    // Final fallback to generic hotel images
    const fallbackImages = [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&h=600&fit=crop'
    ];
    const randomImage = fallbackImages[Math.floor(Math.random() * fallbackImages.length)];
    return randomImage;
  };

  const searchRestaurantImage = async (restaurantName: string): Promise<string | null> => {
    if (!restaurantName) return null;
    
    // Try Unsplash first
    try {
      const query = encodeURIComponent(`${restaurantName} restaurant food`);
      const unsplashUrl = `https://api.unsplash.com/search/photos?query=${query}&client_id=${UNSPLASH_ACCESS_KEY}&per_page=1`;
      const unsplashResponse = await fetch(unsplashUrl);
      const unsplashData = await unsplashResponse.json();
      if (unsplashData.results?.[0]?.urls?.regular) {
        const isValid = await checkImageExists(unsplashData.results[0].urls.regular);
        if (isValid) return unsplashData.results[0].urls.regular;
      }
    } catch (error) {
      console.error('Unsplash API error:', error);
    }

    // Final fallback to generic restaurant images
    const fallbackImages = [
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&h=600&fit=crop'
    ];
    const randomImage = fallbackImages[Math.floor(Math.random() * fallbackImages.length)];
    return randomImage;
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Helper function to create enhanced booking URL with flight details
  const createFlightBookingUrl = (flight: TravelResult) => {
    if (flight.bookingUrl) {
      return flight.bookingUrl;
    }
    
    // Create a more detailed booking URL with flight information
    const params = new URLSearchParams();
    if (flight.departure) params.append('from', flight.departure);
    if (flight.arrival) params.append('to', flight.arrival);
    if (flight.airline) params.append('airline', flight.airline);
    if (flight.departureTime) {
      const depDate = new Date(flight.departureTime);
      params.append('departure_date', depDate.toISOString().split('T')[0]);
    }
    
    // Enhanced URL with flight details
    const baseUrl = 'https://www.amadeus.com/en/booking/flights';
    const flightDetails = `${flight.departure || ''}-${flight.arrival || ''}-${flight.airline || ''}`;
    const searchParams = params.toString();
    
    return `${baseUrl}?${searchParams}&search=${encodeURIComponent(flightDetails)}`;
  };

  // Fonction pour géolocaliser une adresse
  const geocodeAddress = async (address: string): Promise<{lat: number, lng: number} | null> => {
    try {
      // Extraire le nom de la ville/pays pour une recherche plus précise
      let searchTerm = address;
      if (destination) {
        searchTerm = `${address}, ${destination}`;
      }
      
      const encodedAddress = encodeURIComponent(searchTerm);
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }
      return null;
    } catch (error) {
      console.error('Erreur lors de la géolocalisation:', error);
      return null;
    }
  };

  // Fonction pour calculer l'itinéraire entre deux points
  const calculateRoute = async (start: [number, number], end: [number, number]): Promise<RouteInfo | null> => {
    try {
      const response = await fetch(`https://api.openrouteservice.org/v2/directions/driving-car?api_key=${OPENROUTE_API_KEY}&start=${start[1]},${start[0]}&end=${end[1]},${end[0]}`);
      const data = await response.json();
      
      if (data && data.features && data.features.length > 0) {
        const route = data.features[0];
        const geometry = route.geometry;
        const properties = route.properties;
        
        // Convertir les coordonnées du format GeoJSON [lng, lat] à [lat, lng] pour Leaflet
        const points: [number, number][] = [];
        if (geometry.coordinates) {
          geometry.coordinates.forEach((coord: [number, number]) => {
            points.push([coord[1], coord[0]]);
          });
        }
        
        // Extraire la distance et la durée
        const distance = (properties.summary.distance / 1000).toFixed(1) + ' km';
        const duration = Math.round(properties.summary.duration / 60) + ' min';
        
        return { distance, duration, points };
      }
      return null;
    } catch (error) {
      console.error('Erreur lors du calcul de l\'itinéraire:', error);
      return null;
    }
  };

  // Fonction pour générer des itinéraires pour une journée
  const generateDayRoutes = async (date: string) => {
    const dayActivities = planning[date] || [];
    if (dayActivities.length < 2) return; // Besoin d'au moins 2 points pour un itinéraire
    
    const routes: RouteInfo[] = [];
    
    // Trier les activités par leur ordre dans la journée
    const sortedActivities = [...dayActivities].sort((a, b) => {
      const indexA = dayActivities.findIndex(item => item.id === a.id);
      const indexB = dayActivities.findIndex(item => item.id === b.id);
      return indexA - indexB;
    });
    
    // Calculer les itinéraires entre chaque point consécutif
    for (let i = 0; i < sortedActivities.length - 1; i++) {
      const current = sortedActivities[i];
      const next = sortedActivities[i + 1];
      
      if (current.location && next.location) {
        const startPoint: [number, number] = [current.location.lat, current.location.lng];
        const endPoint: [number, number] = [next.location.lat, next.location.lng];
        
        const route = await calculateRoute(startPoint, endPoint);
        if (route) {
          routes.push(route);
          
          // Mettre à jour les estimations de temps et de distance pour l'activité suivante
          const updatedActivity = {
            ...next,
            timeEstimate: route.duration,
            distanceEstimate: route.distance
          };
          
          // Mettre à jour l'activité dans le planning
          setPlanning(prev => {
            const updatedActivities = prev[date].map(a => 
              a.id === next.id ? updatedActivity : a
            );
            return {
              ...prev,
              [date]: updatedActivities
            };
          });
        }
      }
    }
    
    // Mettre à jour les itinéraires pour cette journée
    setMapRoutes(prev => ({
      ...prev,
      [date]: routes
    }));
  };

  // Fonction pour rechercher des restaurants près d'une activité
  const searchNearbyRestaurants = async (activity: TravelResult) => {
    if (!activity.location) return;
    
    setLoadingRestaurants(true);
    try {
      // Simuler une API de restaurants (à remplacer par une vraie API)
      // Dans un cas réel, vous utiliseriez une API comme Google Places, Yelp, etc.
      setTimeout(async () => {
        // Générer des restaurants fictifs autour de l'emplacement de l'activité
        const restaurants: TravelResult[] = [];
        
        for (let i = 0; i < 5; i++) {
          // Générer des coordonnées aléatoires autour de l'activité
          const randomLat = activity.location!.lat + (Math.random() - 0.5) * 0.01;
          const randomLng = activity.location!.lng + (Math.random() - 0.5) * 0.01;
          
          const restaurantNames = [
            "Le Petit Bistro", "Chez Marcel", "La Bonne Table", 
            "Saveurs du Monde", "L'Étoile Gourmande", "Le Gourmet",
            "La Trattoria", "Sushi Palace", "Tapas & Co", "Le Comptoir"
          ];
          
          const cuisineTypes = [
            "Française", "Italienne", "Japonaise", "Méditerranéenne",
            "Mexicaine", "Indienne", "Thaïlandaise", "Végétarienne"
          ];
          
          const name = restaurantNames[Math.floor(Math.random() * restaurantNames.length)];
          const cuisine = cuisineTypes[Math.floor(Math.random() * cuisineTypes.length)];
          const rating = Math.floor(Math.random() * 2) + 3; // Entre 3 et 5 étoiles
          
          const image = await searchRestaurantImage(name);
          
          restaurants.push({
            type: 'Restaurant',
            title: name,
            description: `Restaurant de cuisine ${cuisine} près de ${activity.title}`,
            price: '€€',
            rating,
            location: {
              lat: randomLat,
              lng: randomLng
            },
            id: generateId()
          });
        }
        
        setSuggestedRestaurants(restaurants);
        setLoadingRestaurants(false);
      }, 1500);
    } catch (error) {
      console.error('Erreur lors de la recherche de restaurants:', error);
      setLoadingRestaurants(false);
    }
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      setSearchPerformed(true);
      setShowPlanningModal(false);
      setShowRestaurantModal(false);
      setSearchResults([]);
      setError(null);

      // Extraire la destination depuis la description
      const destinationMatch = description.match(/(?:à|à la|au|en|pour) ([A-Za-zÀ-ÖØ-öø-ÿ\s]+?)(?:,|\.|en|pour|du|le|la|les|pendant|durant)/i);
      if (destinationMatch && destinationMatch[1]) {
        setDestination(destinationMatch[1].trim());
      }

      const requestBody = JSON.stringify({ text: description });

      const [flightRes, hotelRes, activityRes] = await Promise.all([
        fetch('http://localhost:8080/api/travel/ask/flight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody
        }),
        fetch('http://localhost:8080/api/travel/ask/hotel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody
        }),
        fetch('http://localhost:8080/api/travel/ask/activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody
        }),
      ]);

      const [flightData, hotelData, activityData] = await Promise.all([
        flightRes.json(),
        hotelRes.json(),
        activityRes.json(),
      ]);

      // Process flights
      const allFlights = flightData.data?.map(async (flight: any, index: number) => {
        const outbound = flight.itineraries?.[0]?.segments?.[0];
        const totalDuration = flight.itineraries?.[0]?.duration;
        const airlineCode = flight.validatingAirlineCodes?.[0];
        
        const possibleImages = [
          `https://images.kiwi.com/airlines/64x64/${airlineCode}.png`,
          `https://content.airhex.com/content/logos/airlines_${airlineCode}_64_64_s.png`,
          `https://logos-world.net/wp-content/uploads/2021/08/${airlineCode}-Logo.png`
        ];
        
        let validImage = null;
        for (const imgUrl of possibleImages) {
          const isValid = await checkImageExists(imgUrl);
          if (isValid) {
            validImage = imgUrl;
            break;
          }
        }
        
        if (!validImage) return null;
        
        return {
          type: 'Vol',
          title: `Vol ${index + 1}: ${outbound?.departure?.iataCode} ➜ ${outbound?.arrival?.iataCode}`,
          description: `Compagnie: ${flight.validatingAirlineCodes?.join(', ')}`,
          price: flight.price?.total,
          currency: flight.price?.currency,
          duration: totalDuration?.replace('PT', '').replace('H', 'h ').replace('M', 'min'),
          departure: outbound?.departure?.iataCode,
          arrival: outbound?.arrival?.iataCode,
          departureTime: outbound?.departure?.at,
          arrivalTime: outbound?.arrival?.at,
          airline: flight.validatingAirlineCodes?.[0],
          stops: outbound?.numberOfStops || 0,
          terminal: outbound?.departure?.terminal,
          image: validImage,
          bookingUrl: flight.bookingUrl,
          rawData: flight
        };
      }) || [];

      // Process hotels (limit to 10) - Enhanced description extraction
      const hotelProcessingPromises = hotelData.data?.slice(0, 10).map(async (hotel: any, index: number) => {
        let hotelImage = hotel.media?.[0]?.uri;
        let isValidImage = hotelImage ? await checkImageExists(hotelImage) : false;
        
        if (!isValidImage && hotel.name) {
          hotelImage = await searchHotelImage(hotel.name);
          isValidImage = !!hotelImage;
        }
        
        if (!isValidImage) {
          const fallbacks = [
            'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop',
            'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&h=600&fit=crop'
          ];
          hotelImage = fallbacks[Math.floor(Math.random() * fallbacks.length)];
          isValidImage = true;
        }
        
        // Enhanced description extraction - prioritize different description sources
        let hotelDescription = '';
        if (hotel.description) {
          hotelDescription = hotel.description;
        } else if (hotel.shortDescription) {
          hotelDescription = hotel.shortDescription;
        } else if (hotel.longDescription) {
          hotelDescription = hotel.longDescription;
        } else if (hotel.summary) {
          hotelDescription = hotel.summary;
        }
        
        // Géolocaliser l'adresse de l'hôtel
        const address = hotel.address?.lines?.join(', ') || hotel.address?.cityName || '';
        let location = null;
        
        if (address) {
          location = await geocodeAddress(address);
        }
        
        return {
          type: 'Hôtel',
          title: hotel.name || `Hôtel ${index + 1}`,
          description: hotelDescription,
          address: address,
          rating: hotel.rating,
          price: hotel.offers?.[0]?.price?.total,
          currency: hotel.offers?.[0]?.price?.currency,
          amenities: hotel.amenities?.map((a: any) => a.description).slice(0, 3),
          image: hotelImage,
          bookingUrl: hotel.bookingUrl || hotel.offers?.[0]?.bookingUrl || `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(hotel.name)}`,
          rawData: hotel,
          location
        };
      }) || [];

      // Process activities (limit to 10 and add image search)
      const activityProcessingPromises = activityData.data?.slice(0, 10).map(async (activity: any, index: number) => {
        let activityImage = activity.pictures?.[0];
        let isValidImage = activityImage ? await checkImageExists(activityImage) : false;
        
        if (!isValidImage && activity.name) {
          activityImage = await searchActivityImage(activity.name);
          isValidImage = !!activityImage;
        }
        
        if (!isValidImage) {
          const fallbacks = [
            'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=600&fit=crop',
            'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
            'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=600&fit=crop'
          ];
          activityImage = fallbacks[Math.floor(Math.random() * fallbacks.length)];
          isValidImage = true;
        }

        // Géolocaliser l'activité
        let location = null;
        if (activity.geoCode?.latitude && activity.geoCode?.longitude) {
          location = {
            lat: activity.geoCode.latitude,
            lng: activity.geoCode.longitude
          };
        } else if (activity.name) {
          // Si pas de coordonnées, essayer de géolocaliser par le nom
          location = await geocodeAddress(`${activity.name} ${destination || ''}`);
        }

        return {
          type: 'Activité',
          title: activity.name || `Activité ${index + 1}`,
          description: activity.shortDescription || activity.description,
          price: activity.price?.amount,
          currency: activity.price?.currencyCode,
          duration: activity.duration,
          address: activity.geoCode?.latitude ? `Lat: ${activity.geoCode.latitude}, Lng: ${activity.geoCode.longitude}` : '',
          rating: activity.rating,
          image: activityImage,
          rawData: activity,
          location
        };
      }) || [];

      const parsedFlights: TravelResult[] = (await Promise.all(allFlights)).filter(Boolean) as TravelResult[];
      const parsedHotels: TravelResult[] = (await Promise.all(hotelProcessingPromises)).filter(Boolean) as TravelResult[];
      const parsedActivities: TravelResult[] = (await Promise.all(activityProcessingPromises)).filter(Boolean) as TravelResult[];

      setFlights(parsedFlights);
      setHotels(parsedHotels);
      setActivities(parsedActivities);

      if (parsedFlights.length > 0) setSelectedType('Vol');
      else if (parsedHotels.length > 0) setSelectedType('Hôtel');
      else if (parsedActivities.length > 0) setSelectedType('Activité');

      // Si nous avons des hôtels avec des coordonnées, centrer la carte sur le premier
      if (parsedHotels.length > 0 && parsedHotels[0].location) {
        setMapCenter([parsedHotels[0].location.lat, parsedHotels[0].location.lng]);
      }
      // Sinon, si nous avons des activités avec des coordonnées, centrer sur la première
      else if (parsedActivities.length > 0 && parsedActivities[0].location) {
        setMapCenter([parsedActivities[0].location.lat, parsedActivities[0].location.lng]);
      }

      // Mettre à jour la météo avec la localisation des activités favorites
      const favoriteActivities = [...favorites.hotels, ...favorites.activities, ...favorites.restaurants];
      if (favoriteActivities.length > 0) {
        const firstActivity = favoriteActivities.find(activity => activity.location);
        if (firstActivity?.location) {
          await fetchWeather(firstActivity.location.lat + ',' + firstActivity.location.lng);
        }
      } else {
        await fetchWeather(destination);
      }
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      setError('Une erreur est survenue lors de la recherche. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  // Load favorites and planning from localStorage on component mount
  useEffect(() => {
    const savedFavorites = localStorage.getItem('travelFavorites');
    const savedPlanning = localStorage.getItem('travelPlanning');
    const savedDates = localStorage.getItem('travelDates');
    
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
    if (savedPlanning) {
      setPlanning(JSON.parse(savedPlanning));
    }
    if (savedDates) {
      setTravelDates(JSON.parse(savedDates));
    }
  }, []);

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('travelFavorites', JSON.stringify(favorites));
  }, [favorites]);

  // Save planning to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('travelPlanning', JSON.stringify(planning));
  }, [planning]);

  // Save travel dates to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('travelDates', JSON.stringify(travelDates));
  }, [travelDates]);

  // Generate routes when selectedDayForMap changes
  useEffect(() => {
    if (selectedDayForMap && planning[selectedDayForMap]) {
      generateDayRoutes(selectedDayForMap);
    }
  }, [selectedDayForMap, planning]);

  // Generate unique ID for items
  const generateId = () => {
    return Math.random().toString(36).substr(2, 9);
  };

  // Add to favorites
  const toggleFavorite = (item: TravelResult, type: 'Hôtel' | 'Vol' | 'Activité' | 'Restaurant') => {
    const itemWithId = { ...item, id: item.id || generateId() };
    setFavorites(prev => {
      const key = type === 'Hôtel' ? 'hotels' : 
                 type === 'Vol' ? 'flights' : 
                 type === 'Restaurant' ? 'restaurants' : 'activities';
      const exists = prev[key].some(f => f.id === itemWithId.id);
      
      if (exists) {
        // Remove from favorites
        return {
          ...prev,
          [key]: prev[key].filter(f => f.id !== itemWithId.id)
        };
      } else {
        // Add to favorites
        return {
          ...prev,
          [key]: [...prev[key], itemWithId]
        };
      }
    });
  };

  // Check if item is in favorites
  const isFavorite = (item: TravelResult, type: 'Hôtel' | 'Vol' | 'Activité' | 'Restaurant') => {
    const key = type === 'Hôtel' ? 'hotels' : 
               type === 'Vol' ? 'flights' : 
               type === 'Restaurant' ? 'restaurants' : 'activities';
    return favorites[key].some(f => f.id === item.id);
  };

  // Add activity to planning
  const addToPlanning = (activity: TravelResult, date: string) => {
    if (!date) return;

    setPlanning(prev => {
      const dayActivities = prev[date] || [];
      
      // Check if activity is already planned for this day
      if (dayActivities.some(a => a.id === activity.id)) {
        alert('Cette activité est déjà planifiée pour ce jour !');
        return prev;
      }

      return {
        ...prev,
        [date]: [...dayActivities, activity]
      };
    });
  };

  // Remove activity from planning
  const removeFromPlanning = (activityId: string, date: string) => {
    setPlanning(prev => ({
      ...prev,
      [date]: prev[date].filter(a => a.id !== activityId)
    }));
  };

  // Handle drag and drop reordering
  const handleDragEnd = (result: any, date: string) => {
    if (!result.destination) return;
    
    const items = Array.from(planning[date]);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setPlanning(prev => ({
      ...prev,
      [date]: items
    }));
    
    // Recalculer les itinéraires après réorganisation
    if (selectedDayForMap === date) {
      generateDayRoutes(date);
    }
  };

  // Render favorite button
  const renderFavoriteButton = (item: TravelResult, type: 'Hôtel' | 'Vol' | 'Activité' | 'Restaurant') => (
    <button
      onClick={() => toggleFavorite(item, type)}
      className={`absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center
                 transition-all duration-300 z-20 ${
                   isFavorite(item, type)
                   ? 'bg-red-500 text-white'
                   : 'bg-white/50 backdrop-blur-sm text-gray-700 hover:bg-white'
                 }`}
    >
      {isFavorite(item, type) ? '❤️' : '🤍'}
    </button>
  );

  // Render planning section for activities
  const renderPlanningSection = (activity: TravelResult) => (
    <div className="bg-white rounded-lg p-4 shadow-md mb-4">
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-4">
          {activity.type === 'Hôtel' && <span className="text-2xl">🏨</span>}
          {activity.type === 'Activité' && <span className="text-2xl">🎯</span>}
          {activity.type === 'Restaurant' && <span className="text-2xl">🍽️</span>}
        </div>
        <div className="flex-grow">
          <h4 className="font-semibold text-lg mb-2">{activity.title}</h4>
          {activity.image && (
            <div className="relative h-32 mb-3 rounded-lg overflow-hidden">
              <img 
                src={activity.image} 
                alt={activity.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <p className="text-sm text-gray-600 mb-2">
            {activity.description?.substring(0, 100)}
            {activity.description && activity.description.length > 100 ? '...' : ''}
          </p>
          
          {/* Informations sur l'itinéraire */}
          {activity.timeEstimate && (
            <div className="text-sm text-blue-600 mb-1">
              ⏱️ Temps de trajet: {formatDuration(activity.timeEstimate)}
            </div>
          )}
          {activity.distanceEstimate && (
            <div className="text-sm text-green-600 mb-1">
              📏 Distance: {formatDistance(activity.distanceEstimate)}
            </div>
          )}
          
          {/* Autres informations spécifiques au type */}
          {activity.type === 'Hôtel' && activity.address && (
            <div className="text-sm text-gray-500 mb-1">
              📍 {activity.address}
            </div>
          )}
          {activity.type === 'Activité' && activity.duration && (
            <div className="text-sm text-purple-600 mb-1">
              ⏱️ Durée: {activity.duration}
            </div>
          )}
          {activity.type === 'Restaurant' && (
            <div className="text-sm text-red-600 mb-1">
              💰 {activity.price || '€€'}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Render favorites section
  const renderFavoritesSection = () => (
    <div className="mt-16 bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl">
      <h2 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
        Mes Favoris ❤️
      </h2>

      <div className="space-y-8">
        {/* Favorite Hotels */}
        {favorites.hotels.length > 0 && (
          <div>
            <h3 className="text-2xl font-semibold mb-4">Hôtels</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.hotels.map(hotel => renderHotelCard(hotel, 0))}
            </div>
          </div>
        )}

        {/* Favorite Flights */}
        {favorites.flights.length > 0 && (
          <div>
            <h3 className="text-2xl font-semibold mb-4">Vols</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.flights.map(flight => renderFlightCard(flight, 0))}
            </div>
          </div>
        )}

        {/* Favorite Activities */}
        {favorites.activities.length > 0 && (
          <div>
            <h3 className="text-2xl font-semibold mb-4">Activités</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.activities.map(activity => renderActivityCard(activity, 0))}
            </div>
          </div>
        )}

        {/* Favorite Restaurants */}
        {favorites.restaurants.length > 0 && (
          <div>
            <h3 className="text-2xl font-semibold mb-4">Restaurants</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.restaurants.map(restaurant => renderRestaurantCard(restaurant, 0))}
            </div>
          </div>
        )}

        {Object.keys(favorites).every(key => favorites[key].length === 0) && (
          <p className="text-center text-gray-500 py-8">
            Vous n'avez pas encore de favoris. Cliquez sur le cœur ❤️ pour en ajouter !
          </p>
        )}
      </div>
    </div>
  );

  // Fonction pour obtenir un tableau de dates entre début et fin
  const getDatesInRange = (startDate: string, endDate: string): string[] => {
    const dates: string[] = [];
    const currentDate = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Inclure le dernier jour

    while (currentDate <= end) {
      dates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  };

  // Fonction améliorée pour distribuer les activités
  const distributeActivities = (activities: TravelResult[]) => {
    console.log("Activités à distribuer:", activities); // Debug

    if (!travelDates.startDate || !travelDates.endDate) {
      alert('Veuillez d\'abord définir les dates de votre voyage !');
      setShowPlanningModal(true);
      return;
    }

    const startDate = new Date(travelDates.startDate);
    const endDate = new Date(travelDates.endDate);

    if (endDate < startDate) {
      alert('Les dates du voyage sont invalides');
      return;
    }

    // Vérifier si nous avons des activités à distribuer
    if (!activities || activities.length === 0) {
      alert('Aucune activité à planifier. Ajoutez d\'abord des activités à vos favoris.');
      return;
    }

    const dates = getDatesInRange(travelDates.startDate, travelDates.endDate);
    console.log("Dates disponibles:", dates); // Debug

    if (dates.length === 0) {
      alert('Aucune date valide dans la plage sélectionnée');
      return;
    }

    // Nouveau planning vide avec toutes les dates
    const newPlanning: PlanningType = {};
    dates.forEach(date => {
      newPlanning[date] = [];
    });

    // Ajouter les hôtels au planning (un hôtel pour tout le séjour)
    if (favorites.hotels.length > 0) {
      const mainHotel = favorites.hotels[0];
      
      // Ajouter l'hôtel à chaque jour
      dates.forEach(date => {
        newPlanning[date].push({
          ...mainHotel,
          id: mainHotel.id || generateId()
        });
      });
    }

    // Copie et tri des activités par priorité
    const sortedActivities = activities.map(activity => ({
      ...activity,
      id: activity.id || generateId(),
      priority: activity.priority || Math.random(),
      type: 'Activité' as const // Assurer que le type est correct
    }));

    console.log("Activités triées:", sortedActivities); // Debug

    // Distribution équilibrée des activités
    let dateIndex = 0;
    sortedActivities.forEach(activity => {
      let placed = false;
      let attempts = 0;
      const maxAttempts = dates.length;

      while (!placed && attempts < maxAttempts) {
        const currentDate = dates[dateIndex];
        // Limiter à 3 activités par jour (en plus de l'hôtel)
        const activitiesCount = newPlanning[currentDate].filter(a => a.type === 'Activité').length;
        
        if (activitiesCount < 3) {
          const activityWithDate = {
            ...activity,
            date: currentDate
          };
          newPlanning[currentDate].push(activityWithDate);
          placed = true;
          console.log(`Activité ${activity.title} placée le ${currentDate}`); // Debug
        }
        dateIndex = (dateIndex + 1) % dates.length;
        attempts++;
      }
    });

    // Ajouter les restaurants favoris (si disponibles)
    if (favorites.restaurants.length > 0) {
      let restaurantIndex = 0;
      
      dates.forEach(date => {
        // Ajouter un restaurant par jour
        if (restaurantIndex < favorites.restaurants.length) {
          const restaurant = favorites.restaurants[restaurantIndex];
          newPlanning[date].push({
            ...restaurant,
            id: restaurant.id || generateId(),
            date
          });
          restaurantIndex = (restaurantIndex + 1) % favorites.restaurants.length;
        }
      });
    }

    console.log("Nouveau planning:", newPlanning); // Debug

    // Mettre à jour le planning
    setPlanning(newPlanning);

    // Sauvegarder dans localStorage
    localStorage.setItem('travelPlanning', JSON.stringify(newPlanning));
  };

  // Fonction pour calculer les temps de trajet et distances entre les activités
  const calculateTravelTimes = async (activities: TravelResult[]) => {
    const updatedActivities = [...activities];
    
    for (let i = 0; i < updatedActivities.length - 1; i++) {
      const currentActivity = updatedActivities[i];
      const nextActivity = updatedActivities[i + 1];
      
      if (currentActivity.location && nextActivity.location) {
        try {
          const route = await calculateRoute(
            [currentActivity.location.lat, currentActivity.location.lng],
            [nextActivity.location.lat, nextActivity.location.lng]
          );
          
          if (route) {
            // Mettre à jour l'activité suivante avec les informations de trajet
            nextActivity.timeEstimate = route.duration;
            nextActivity.distanceEstimate = route.distance;
          }
        } catch (error) {
          console.error('Erreur lors du calcul de l\'itinéraire:', error);
        }
      }
    }
    
    return updatedActivities;
  };

  // Fonction pour formater la durée en format lisible
  const formatDuration = (duration: string): string => {
    const minutes = parseInt(duration);
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h${remainingMinutes}` : `${hours}h`;
  };

  // Fonction pour formater la distance en format lisible
  const formatDistance = (distance: string): string => {
    const meters = parseFloat(distance);
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  // Mettre à jour la fonction handleDistributeActivities pour inclure les temps de trajet
  const handleDistributeActivities = async () => {
    if (!travelDates.startDate || !travelDates.endDate) {
      alert('Veuillez sélectionner des dates de voyage');
      return;
    }

    const dates = getDatesInRange(travelDates.startDate, travelDates.endDate);
    const distributedActivities = distributeActivities(favorites.activities);
    
    // Calculer les temps de trajet pour chaque jour
    const updatedPlanning: PlanningType = {};
    
    for (const date of dates) {
      const dayActivities = distributedActivities[date] || [];
      if (dayActivities.length > 0) {
        // Calculer les temps de trajet pour les activités de ce jour
        const activitiesWithTravelTimes = await calculateTravelTimes(dayActivities);
        updatedPlanning[date] = activitiesWithTravelTimes;
      }
    }
    
    setPlanning(updatedPlanning);
    setShowPlanningModal(true);
  };

  // Fonction pour rendre la carte interactive
  const renderMap = () => {
    if (!selectedDayForMap || !planning[selectedDayForMap]) return null;
    
    const dayActivities = planning[selectedDayForMap];
    const validActivities = dayActivities.filter(activity => activity.location);
    
    if (validActivities.length === 0) {
      return (
        <div className="bg-yellow-50 p-4 rounded-xl text-yellow-800 text-center">
          Aucune activité avec des coordonnées géographiques pour cette journée.
        </div>
      );
    }
    
    // Calculer le centre de la carte
    let centerLat = 0;
    let centerLng = 0;
    validActivities.forEach(activity => {
      if (activity.location) {
        centerLat += activity.location.lat;
        centerLng += activity.location.lng;
      }
    });
    centerLat /= validActivities.length;
    centerLng /= validActivities.length;
    
    const center: [number, number] = [centerLat, centerLng];
    const routes = mapRoutes[selectedDayForMap] || [];
    
    return (
      <div className="h-96 rounded-xl overflow-hidden shadow-lg">
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {validActivities.map((activity, index) => {
            if (!activity.location) return null;
            
            let icon;
            if (activity.type === 'Hôtel') icon = hotelIcon;
            else if (activity.type === 'Activité') icon = activityIcon;
            else if (activity.type === 'Restaurant') icon = restaurantIcon;
            else return null;
            
            return (
              <Marker 
                key={activity.id} 
                position={[activity.location.lat, activity.location.lng]}
                icon={icon}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold">{activity.title}</h3>
                    <p className="text-sm">{activity.type}</p>
                    {activity.timeEstimate && (
                      <p className="text-sm text-blue-600">⏱️ {activity.timeEstimate}</p>
                    )}
                    {activity.distanceEstimate && (
                      <p className="text-sm text-green-600">📏 {activity.distanceEstimate}</p>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
          
          {/* Afficher les itinéraires */}
          {routes.map((route, index) => (
            <Polyline 
              key={`route-${index}`}
              positions={route.points}
              color="#3388ff"
              weight={4}
              opacity={0.7}
              dashArray="10, 10"
            />
          ))}
        </MapContainer>
      </div>
    );
  };

  // Mise à jour du rendu du planning pour afficher plus d'informations de débogage
  const renderPlanningOverview = () => (
    <div className="mt-16 bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
          Mon Planning 📅
        </h2>
        <div className="flex space-x-4">
          <button
            onClick={() => setShowPlanningModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Définir les dates
          </button>
          {travelDates.startDate && travelDates.endDate && favorites.activities.length > 0 && (
            <button
              onClick={() => distributeActivities(favorites.activities)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Réorganiser
            </button>
          )}
        </div>
      </div>

      {/* Affichage des dates du voyage */}
      {travelDates.startDate && travelDates.endDate ? (
        <div className="mb-6 p-4 bg-blue-50 rounded-xl">
          <p className="text-blue-800">
            Voyage du {new Date(travelDates.startDate).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })} au {new Date(travelDates.endDate).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </p>
        </div>
      ) : (
        <div className="mb-6 p-4 bg-yellow-50 rounded-xl">
          <p className="text-yellow-800">
            ⚠️ Définissez les dates de votre voyage pour organiser automatiquement vos activités
          </p>
        </div>
      )}

      {/* Affichage du planning */}
      {Object.keys(planning).length > 0 ? (
        <div className="space-y-6">
          {/* Debug info */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg text-sm">
            <p>Nombre total d'activités dans les favoris: {favorites.activities.length}</p>
            <p>Nombre de jours dans le planning: {Object.keys(planning).length}</p>
            <p>Activités planifiées: {Object.values(planning).flat().length}</p>
          </div>

          {Object.entries(planning)
            .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
            .map(([date, activities]) => (
              <div key={date} className="bg-white/50 backdrop-blur-sm rounded-xl p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-blue-800">
                    {new Date(date).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedDayForMap(date);
                        setShowMap(true);
                      }}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      🗺️ Voir la carte
                    </button>
                    <button
                      onClick={() => {
                        // Trouver une activité pour ce jour
                        const dayActivity = activities.find(a => a.type === 'Activité');
                        if (dayActivity && dayActivity.location) {
                          setShowRestaurantModal(true);
                          searchNearbyRestaurants(dayActivity);
                        } else {
                          alert('Aucune activité avec emplacement pour ce jour');
                        }
                      }}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      🍽️ Restaurants
                    </button>
                  </div>
                </div>

                {activities.length > 0 ? (
                  <DragDropContext onDragEnd={(result: any) => handleDragEnd(result, date)}>
                    <Droppable droppableId={`droppable-${date}`}>
                      {(provided: { droppableProps: JSX.IntrinsicAttributes & React.ClassAttributes<HTMLDivElement> & React.HTMLAttributes<HTMLDivElement>; innerRef: React.LegacyRef<HTMLDivElement> | undefined; placeholder: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | null | undefined; }) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="space-y-4"
                        >
                          {activities.map((activity, index) => (
                            <Draggable key={activity.id} draggableId={activity.id || `activity-${index}`} index={index}>
                              {(provided: { innerRef: React.LegacyRef<HTMLDivElement> | undefined; draggableProps: JSX.IntrinsicAttributes & React.ClassAttributes<HTMLDivElement> & React.HTMLAttributes<HTMLDivElement>; dragHandleProps: JSX.IntrinsicAttributes & React.ClassAttributes<HTMLDivElement> & React.HTMLAttributes<HTMLDivElement>; }) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`relative bg-white rounded-lg p-4 shadow-md hover:shadow-lg transition-all
                                             border-l-4 ${
                                               activity.type === 'Hôtel' ? 'border-blue-500' : 
                                               activity.type === 'Activité' ? 'border-purple-500' :
                                               activity.type === 'Restaurant' ? 'border-red-500' : 'border-gray-500'
                                             }`}
                                >
                                  <div className="flex items-start">
                                    <div className="flex-shrink-0 mr-4">
                                      {activity.type === 'Hôtel' && <span className="text-2xl">🏨</span>}
                                      {activity.type === 'Activité' && <span className="text-2xl">🎯</span>}
                                      {activity.type === 'Restaurant' && <span className="text-2xl">🍽️</span>}
                                    </div>
                                    <div className="flex-grow">
                                      <h4 className="font-semibold text-lg mb-2">{activity.title}</h4>
                                      {activity.image && (
                                        <div className="relative h-32 mb-3 rounded-lg overflow-hidden">
                                          <img 
                                            src={activity.image} 
                                            alt={activity.title}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                      )}
                                      <p className="text-sm text-gray-600 mb-2">
                                        {activity.description?.substring(0, 100)}
                                        {activity.description && activity.description.length > 100 ? '...' : ''}
                                      </p>
                                      
                                      {/* Informations sur l'itinéraire */}
                                      {activity.timeEstimate && (
                                        <div className="text-sm text-blue-600 mb-1">
                                          ⏱️ Temps de trajet: {formatDuration(activity.timeEstimate)}
                                        </div>
                                      )}
                                      {activity.distanceEstimate && (
                                        <div className="text-sm text-green-600 mb-1">
                                          📏 Distance: {formatDistance(activity.distanceEstimate)}
                                        </div>
                                      )}
                                      
                                      {/* Autres informations spécifiques au type */}
                                      {activity.type === 'Hôtel' && activity.address && (
                                        <div className="text-sm text-gray-500 mb-1">
                                          📍 {activity.address}
                                        </div>
                                      )}
                                      {activity.type === 'Activité' && activity.duration && (
                                        <div className="text-sm text-purple-600 mb-1">
                                          ⏱️ Durée: {activity.duration}
                                        </div>
                                      )}
                                      {activity.type === 'Restaurant' && (
                                        <div className="text-sm text-red-600 mb-1">
                                          💰 {activity.price || '€€'}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => removeFromPlanning(activity.id!, date)}
                                    className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center
                                           bg-red-100 text-red-500 rounded-full hover:bg-red-200 
                                           hover:text-red-600 transition-colors"
                                  >
                                    ✕
                                  </button>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                ) : (
                  <p className="text-gray-500 italic text-center py-4 bg-gray-50 rounded-lg">
                    Aucune activité prévue ce jour
                  </p>
                )}

                {/* Afficher la carte si ce jour est sélectionné */}
                {showMap && selectedDayForMap === date && (
                  <div className="mt-6">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-semibold text-lg">Carte de l'itinéraire</h4>
                      <button
                        onClick={() => setShowMap(false)}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Fermer la carte
                      </button>
                    </div>
                    {renderMap()}
                    
                    {/* Résumé de l'itinéraire */}
                    {mapRoutes[date] && mapRoutes[date].length > 0 && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-xl">
                        <h5 className="font-semibold mb-2">Résumé de l'itinéraire</h5>
                        <div className="space-y-2">
                          {mapRoutes[date].map((route, index) => (
                            <div key={`summary-${index}`} className="flex justify-between items-center">
                              <div className="text-sm">
                                Étape {index + 1}
                              </div>
                              <div className="flex space-x-4">
                                <span className="text-sm text-blue-600">⏱️ {route.duration}</span>
                                <span className="text-sm text-green-600">📏 {route.distance}</span>
                              </div>
                            </div>
                          ))}
                          <div className="pt-2 border-t border-blue-100">
                            <div className="flex justify-between items-center font-semibold">
                              <span>Total</span>
                              <div className="flex space-x-4">
                                <span className="text-blue-600">
                                  ⏱️ {mapRoutes[date].reduce((sum, route) => {
                                    const minutes = parseInt(route.duration.split(' ')[0]);
                                    return sum + minutes;
                                  }, 0)} min
                                </span>
                                <span className="text-green-600">
                                  📏 {mapRoutes[date].reduce((sum, route) => {
                                    const km = parseFloat(route.distance.split(' ')[0]);
                                    return sum + km;
                                  }, 0).toFixed(1)} km
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <p className="text-gray-500 mb-4">
            {favorites.activities.length > 0 
              ? 'Définissez les dates de votre voyage pour organiser vos activités !'
              : 'Ajoutez d\'abord des activités à vos favoris pour créer votre planning.'}
          </p>
          {favorites.activities.length > 0 && (
            <button
              onClick={() => setShowPlanningModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                       transition-colors inline-flex items-center space-x-2"
            >
              <span>Définir les dates maintenant</span>
              <span>→</span>
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderFlightCard = (flight: TravelResult, index: number) => (
    <div key={flight.id || index} className="group relative p-6 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 border border-gray-100/50 overflow-hidden">
      {renderFavoriteButton(flight, 'Vol')}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 group-hover:text-blue-700 transition-colors duration-300">{flight.title}</h2>
          <div className="text-right">
            <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              {flight.price} {flight.currency}
            </div>
            <div className="text-sm text-gray-500">Prix par personne</div>
          </div>
        </div>
        
        <div className="relative h-40 mb-6 rounded-xl overflow-hidden">
          <img 
            src={flight.image} 
            alt={flight.title} 
            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
          <div className="absolute bottom-3 left-3 text-white">
            <div className="font-semibold">{flight.airline}</div>
            <div className="text-sm opacity-90">Compagnie aérienne</div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between bg-blue-50 p-4 rounded-xl transform group-hover:scale-105 transition-transform duration-300">
            <div className="text-center">
              <div className="text-sm text-blue-600">Départ</div>
              <div className="font-bold text-xl text-blue-800">{flight.departure}</div>
              <div className="text-sm text-gray-500">{flight.departureTime ? formatTime(flight.departureTime) : ''}</div>
              {flight.terminal && (
                <div className="text-xs text-gray-500 mt-1">Terminal {flight.terminal}</div>
              )}
            </div>
            
            <div className="flex-1 px-4">
              <div className="relative">
                <div className="h-0.5 bg-blue-200 w-full absolute top-1/2"></div>
                <div className="flex justify-between relative">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                </div>
              </div>
              <div className="text-center text-sm text-blue-600 mt-2">{flight.duration}</div>
              <div className="text-center text-xs text-gray-500">
                {flight.stops === 0 ? 'Vol direct' : `${flight.stops} escale(s)`}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-sm text-blue-600">Arrivée</div>
              <div className="font-bold text-xl text-blue-800">{flight.arrival}</div>
              <div className="text-sm text-gray-500">{flight.arrivalTime ? formatTime(flight.arrivalTime) : ''}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">Type de vol</div>
              <div className="font-medium text-gray-800">
                {flight.stops === 0 ? '✈️ Vol direct' : '🛬 Vol avec escale'}
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">Classe</div>
              <div className="font-medium text-gray-800">Économique</div>
            </div>
          </div>

          <button
            onClick={() => openBookingLink(flight.bookingUrl || '')}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white py-4 px-6 rounded-xl
                     hover:from-blue-700 hover:to-blue-900 transform hover:scale-[1.02] transition-all duration-300
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg"
          >
            Réserver ce vol ✈️
          </button>
        </div>
      </div>
    </div>
  );

  const renderHotelCard = (hotel: TravelResult, index: number) => {
    const isExpanded = expandedDescriptions[index];
    const hasLongDescription = hotel.description && hotel.description.length > 150;
    
    return (
      <div key={hotel.id || index} className="group relative p-6 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 border border-gray-100/50 overflow-hidden">
        {renderFavoriteButton(hotel, 'Hôtel')}
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        <div className="relative z-10">
          <div className="relative h-64 -mx-6 -mt-6 mb-6 overflow-hidden">
            <img 
              src={hotel.image} 
              alt={hotel.title} 
              className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            <div className="absolute bottom-4 left-4 right-4">
              <h2 className="text-2xl font-bold text-white mb-2">{hotel.title}</h2>
              {hotel.rating && (
                <div className="flex items-center gap-1">
                  {[...Array(Math.floor(hotel.rating))].map((_, i) => (
                    <span key={i} className="text-yellow-400 text-xl transform group-hover:scale-110 transition-transform">★</span>
                  ))}
                  <span className="text-white text-sm ml-1">({hotel.rating}/5)</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                {hotel.price} {hotel.currency}
              </div>
              <div className="text-sm text-gray-500">par nuit</div>
            </div>

            {hotel.address && (
              <div className="flex items-start p-4 bg-green-50 rounded-xl transform group-hover:scale-105 transition-transform duration-300">
                <span className="text-green-600 mr-2">📍</span>
                <div>
                  <span className="text-gray-700">{hotel.address}</span>
                  {hotel.location && (
                    <div className="text-xs text-gray-500 mt-1">
                      Coordonnées: {hotel.location.lat.toFixed(4)}, {hotel.location.lng.toFixed(4)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {hotel.description && (
              <div className={`bg-gray-50 p-4 rounded-xl overflow-hidden transition-all duration-300 ${
                isExpanded ? 'max-h-[500px]' : 'max-h-[100px]'
              }`}>
                <p className="text-gray-600 leading-relaxed">
                  {hasLongDescription && !isExpanded 
                    ? `${hotel.description.substring(0, 150)}...`
                    : hotel.description
                  }
                </p>
                {hasLongDescription && (
                  <button
                    onClick={() => toggleDescription(index)}
                    className="mt-2 text-green-600 hover:text-green-800 font-medium transition-colors"
                  >
                    {isExpanded ? 'Voir moins ↑' : 'Voir plus ↓'}
                  </button>
                )}
              </div>
            )}

            {hotel.amenities && hotel.amenities.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Équipements et services</h3>
                <div className="flex flex-wrap gap-2">
                  {hotel.amenities.map((amenity, i) => (
                    <span key={i} className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm
                                           transform hover:scale-105 transition-transform duration-300">
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">Type d'hébergement</div>
                <div className="font-medium text-gray-800">Hôtel</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">Catégorie</div>
                <div className="font-medium text-gray-800">
                  {hotel.rating ? `${hotel.rating} étoiles` : 'Non classé'}
                </div>
              </div>
            </div>

            <button
              onClick={() => openBookingLink(hotel.bookingUrl || '')}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-700 text-white py-4 px-6 rounded-xl
                       hover:from-green-700 hover:to-emerald-800 transform hover:scale-[1.02] transition-all duration-300
                       focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 shadow-lg"
            >
              Réserver cet hôtel 🏨
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderActivityCard = (activity: TravelResult, index: number) => (
    <div key={activity.id || index} className="group relative p-6 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 border border-gray-100/50 overflow-hidden">
      {renderFavoriteButton(activity, 'Activité')}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      <div className="relative z-10">
        <div className="relative h-64 -mx-6 -mt-6 mb-6 overflow-hidden">
          <img 
            src={activity.image} 
            alt={activity.title} 
            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          <div className="absolute bottom-4 left-4 right-4">
            <h2 className="text-2xl font-bold text-white mb-2">{activity.title}</h2>
            {activity.rating && (
              <div className="flex items-center gap-1">
                {[...Array(Math.floor(activity.rating))].map((_, i) => (
                  <span key={i} className="text-yellow-400 text-xl transform group-hover:scale-110 transition-transform">★</span>
                ))}
                <span className="text-white text-sm ml-1">({activity.rating}/5)</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex justify-between items-center">
            {activity.price && (
              <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {activity.price} {activity.currency}
              </div>
            )}
            {activity.duration && (
              <div className="flex items-center px-3 py-1 bg-purple-50 text-purple-700 rounded-full">
                <span className="mr-2">⏱️</span>
                {activity.duration}
              </div>
            )}
          </div>

          {activity.location && (
            <div className="flex items-start p-4 bg-purple-50 rounded-xl transform group-hover:scale-105 transition-transform duration-300">
              <span className="text-purple-600 mr-2">📍</span>
              <div>
                <span className="text-gray-700">Emplacement</span>
                <div className="text-sm text-gray-500 mt-1">
                  Coordonnées: {activity.location.lat.toFixed(4)}, {activity.location.lng.toFixed(4)}
                </div>
              </div>
            </div>
          )}

          {activity.description && (
            <div className="bg-gray-50 p-4 rounded-xl">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
              <p className="text-gray-600 leading-relaxed line-clamp-3">
                {activity.description}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">Type d'activité</div>
              <div className="font-medium text-gray-800">Touristique</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">Niveau</div>
              <div className="font-medium text-gray-800">Tous niveaux</div>
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={() => openGoogleImages(activity.title)}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 px-6 rounded-xl
                       hover:from-purple-700 hover:to-pink-700 transform hover:scale-[1.02] transition-all duration-300
                       focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 shadow-lg"
            >
              Découvrir 🎯
            </button>
            
            {selectedDate && (
              <button
                onClick={() => selectedDate && addToPlanning(activity, selectedDate)}
                className="px-4 bg-green-600 text-white rounded-xl hover:bg-green-700 
                         transform hover:scale-[1.02] transition-all duration-300"
              >
                Planifier 📅
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderRestaurantCard = (restaurant: TravelResult, index: number) => (
    <div key={restaurant.id || index} className="group relative p-6 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 border border-gray-100/50 overflow-hidden">
      {renderFavoriteButton(restaurant, 'Restaurant')}
      <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      <div className="relative z-10">
        <div className="relative h-64 -mx-6 -mt-6 mb-6 overflow-hidden">
          <img 
            src={restaurant.image} 
            alt={restaurant.title} 
            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          <div className="absolute bottom-4 left-4 right-4">
            <h2 className="text-2xl font-bold text-white mb-2">{restaurant.title}</h2>
            {restaurant.rating && (
              <div className="flex items-center gap-1">
                {[...Array(Math.floor(restaurant.rating))].map((_, i) => (
                  <span key={i} className="text-yellow-400 text-xl transform group-hover:scale-110 transition-transform">★</span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex justify-between items-center">
            {restaurant.price && (
              <div className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                {restaurant.price}
              </div>
            )}
          </div>

          {restaurant.address && (
            <div className="flex items-start p-4 bg-red-50 rounded-xl transform group-hover:scale-105 transition-transform duration-300">
              <span className="text-red-600 mr-2">📍</span>
              <span className="text-gray-700">{restaurant.address}</span>
            </div>
          )}

          {restaurant.description && (
            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="text-gray-600 leading-relaxed line-clamp-3">
                {restaurant.description}
              </p>
            </div>
          )}

          <div className="flex space-x-4">
            <button
              onClick={() => openGoogleImages(restaurant.title)}
              className="flex-1 bg-gradient-to-r from-red-600 to-orange-600 text-white py-4 px-6 rounded-xl
                     hover:from-red-700 hover:to-orange-700 transform hover:scale-[1.02] transition-all duration-300
                     focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 shadow-lg"
            >
              Voir le restaurant 🍽️
            </button>
            
            {selectedDate && (
              <button
                onClick={() => selectedDate && addToPlanning(restaurant, selectedDate)}
                className="px-4 bg-green-600 text-white rounded-xl hover:bg-green-700 
                         transform hover:scale-[1.02] transition-all duration-300"
              >
                Planifier 📅
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Modal pour définir les dates du voyage
  const renderPlanningModal = () => (
    <div className={`fixed inset-0 z-50 ${showPlanningModal ? 'block' : 'hidden'}`}>
      {/* Overlay sombre */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
           onClick={() => setShowPlanningModal(false)} />
      
      {/* Modal */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
                    bg-white rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl">
        <div className="relative">
          {/* Bouton fermer */}
          <button
            onClick={() => setShowPlanningModal(false)}
            className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full
                     flex items-center justify-center hover:bg-red-600 transition-colors"
          >
            ✕
          </button>

          <h3 className="text-2xl font-bold mb-6 text-gray-800">
            Dates du voyage
          </h3>

          <div className="space-y-6">
            {/* Date de début */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de début
              </label>
              <input
                type="date"
                value={travelDates.startDate}
                onChange={(e) => {
                  const newStartDate = e.target.value;
                  setTravelDates(prev => ({
                    ...prev,
                    startDate: newStartDate,
                    // Si la date de fin est avant la nouvelle date de début, on l'ajuste
                    endDate: prev.endDate && new Date(prev.endDate) < new Date(newStartDate) 
                      ? newStartDate 
                      : prev.endDate
                  }));
                }}
                min={new Date().toISOString().split('T')[0]}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 
                         focus:ring-blue-500 focus:border-blue-500 transition-all"
                required
              />
            </div>

            {/* Date de fin */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de fin
              </label>
              <input
                type="date"
                value={travelDates.endDate}
                onChange={(e) => {
                  setTravelDates(prev => ({
                    ...prev,
                    endDate: e.target.value
                  }));
                }}
                min={travelDates.startDate || new Date().toISOString().split('T')[0]}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 
                         focus:ring-blue-500 focus:border-blue-500 transition-all"
                required
              />
            </div>

            {/* Message d'erreur si les dates sont invalides */}
            {travelDates.startDate && travelDates.endDate && 
             new Date(travelDates.endDate) < new Date(travelDates.startDate) && (
              <p className="text-red-500 text-sm">
                La date de fin doit être après la date de début
              </p>
            )}

            {/* Boutons d'action */}
            <div className="flex justify-end space-x-4 pt-4">
              <button
                onClick={() => setShowPlanningModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDistributeActivities}
                disabled={!travelDates.startDate || !travelDates.endDate || 
                         new Date(travelDates.endDate) < new Date(travelDates.startDate)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg 
                         hover:bg-blue-700 transition-colors disabled:bg-gray-400
                         disabled:cursor-not-allowed"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Modal pour les restaurants à proximité
  const renderRestaurantModal = () => (
    <div className={`fixed inset-0 z-50 ${showRestaurantModal ? 'block' : 'hidden'}`}>
      {/* Overlay sombre */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
           onClick={() => setShowRestaurantModal(false)} />
      
      {/* Modal */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
                    bg-white rounded-2xl p-8 w-full max-w-4xl mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="relative">
          {/* Bouton fermer */}
          <button
            onClick={() => setShowRestaurantModal(false)}
            className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full
                     flex items-center justify-center hover:bg-red-600 transition-colors"
          >
            ✕
          </button>

          <h3 className="text-2xl font-bold mb-6 text-gray-800">
            Restaurants à proximité 🍽️
          </h3>

          {loadingRestaurants ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600">Recherche de restaurants...</p>
            </div>
          ) : suggestedRestaurants.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {suggestedRestaurants.map((restaurant, index) => (
                <div key={restaurant.id} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                  <div className="relative h-40">
                    <img 
                      src={restaurant.image} 
                      alt={restaurant.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute bottom-2 left-3">
                      <h4 className="text-white font-bold text-lg">{restaurant.title}</h4>
                      {restaurant.rating && (
                        <div className="flex items-center">
                          {[...Array(Math.floor(restaurant.rating))].map((_, i) => (
                            <span key={i} className="text-yellow-400">★</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-gray-600 mb-3 line-clamp-2">{restaurant.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-red-600 font-medium">{restaurant.price}</span>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            toggleFavorite(restaurant, 'Restaurant');
                            if (!isFavorite(restaurant, 'Restaurant')) {
                              setShowRestaurantModal(false);
                            }
                          }}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                        >
                          {isFavorite(restaurant, 'Restaurant') ? '❤️ Favori' : '🤍 Ajouter'}
                        </button>
                        <button
                          onClick={() => {
                            if (selectedDayForMap) {
                              addToPlanning(restaurant, selectedDayForMap);
                              setShowRestaurantModal(false);
                            }
                          }}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                        >
                          Planifier
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-xl">
              <p className="text-gray-500">Aucun restaurant trouvé à proximité.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const handleLogout = () => {
    // Supprimer les données de session/localStorage si nécessaire
    localStorage.removeItem('travelFavorites');
    localStorage.removeItem('travelPlanning');
    localStorage.removeItem('travelDates');
    localStorage.removeItem('userToken'); // Si vous utilisez un token
    navigate('/login'); // Redirection vers la page de connexion
  };

  // Add these functions in the TravelPlanner component
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const newMessage: ChatMessage = {
      id: generateId(),
      type: 'user',
      content: userInput,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, newMessage]);
    setUserInput('');

    try {
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MISTRAL_API_KEY}`
        },
        body: JSON.stringify({
          model: 'mistral-tiny',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful travel assistant. Provide concise and relevant travel advice.'
            },
            ...chatMessages.map(msg => ({
              role: msg.type === 'user' ? 'user' : 'assistant',
              content: msg.content
            })),
            {
              role: 'user',
              content: userInput
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response from Mistral API');
      }

      const data = await response.json();
      const assistantMessage: ChatMessage = {
        id: generateId(),
        type: 'assistant',
        content: data.choices[0].message.content,
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error in chat:', error);
      const errorMessage: ChatMessage = {
        id: generateId(),
        type: 'assistant',
        content: 'Désolé, je ne peux pas répondre pour le moment. Veuillez réessayer plus tard.',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    }
  };

  const generateTravelSummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const summaryData = {
        destination,
        travelDates,
        planning,
        favorites,
        weatherInfo
      };

      const response = await fetch('http://localhost:8080/api/travel/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(summaryData)
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `voyage-${destination}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error generating summary:', error);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Add this component inside the TravelPlanner component
  const renderTravelAssistant = () => (
    <div className={`fixed bottom-4 right-4 z-50 transition-all duration-300 transform ${
      isChatOpen ? 'translate-y-0' : 'translate-y-[calc(100%-60px)]'
    }`}>
      <div className="bg-white rounded-2xl shadow-2xl w-96 overflow-hidden">
        {/* Chat header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Assistant de Voyage ✈️</h3>
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="text-white hover:text-gray-200 transition-colors"
            >
              {isChatOpen ? '▼' : '▲'}
            </button>
          </div>
          {weatherInfo && (
            <div className="mt-2 flex items-center space-x-2 text-sm">
              <span>{weatherInfo.icon}</span>
              <span>{weatherInfo.location}: {weatherInfo.condition}, {weatherInfo.temperature}°C</span>
            </div>
          )}
        </div>

        {/* Chat messages */}
        <div className="h-96 overflow-y-auto p-4 space-y-4">
          {chatMessages.map(message => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl p-3 ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <p>{message.content}</p>
                <span className="text-xs opacity-70 mt-1 block">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Chat input */}
        <form onSubmit={handleChatSubmit} className="p-4 border-t">
          <div className="flex space-x-2">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Posez votre question..."
              className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Envoyer
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Fonction pour obtenir les recommandations vestimentaires basées sur la météo
  const getClothingRecommendations = (temperature: number, condition: string): string[] => {
    const recommendations: string[] = [];
    
    // Recommandations basées sur la température
    if (temperature < 10) {
      recommendations.push('Manteau chaud', 'Écharpe', 'Gants', 'Bonnet');
    } else if (temperature < 15) {
      recommendations.push('Veste', 'Pull', 'Pantalon long');
    } else if (temperature < 20) {
      recommendations.push('Pull léger', 'Veste légère', 'Pantalon long');
    } else if (temperature < 25) {
      recommendations.push('T-shirt', 'Pantalon léger', 'Veste légère');
    } else {
      recommendations.push('T-shirt', 'Short', 'Lunettes de soleil', 'Chapeau');
    }

    // Recommandations basées sur les conditions météo
    if (condition.toLowerCase().includes('pluie')) {
      recommendations.push('Imperméable', 'Parapluie', 'Chaussures imperméables');
    } else if (condition.toLowerCase().includes('neige')) {
      recommendations.push('Bottes de neige', 'Vêtements chauds', 'Gants');
    } else if (condition.toLowerCase().includes('vent')) {
      recommendations.push('Veste coupe-vent', 'Écharpe');
    }

    return [...new Set(recommendations)]; // Éliminer les doublons
  };

  // Fonction pour calculer le coût total du voyage
  const calculateTotalCost = () => {
    const costs: TravelCost = {
      flights: 0,
      hotels: 0,
      activities: 0,
      transport: 0,
      meals: 0,
      total: 0
    };

    // Calculer le coût des vols
    if (favorites.flights.length > 0) {
      costs.flights = favorites.flights.reduce((sum, flight) => {
        const price = parseFloat(flight.price?.toString() || '0');
        return sum + price;
      }, 0);
    }

    // Calculer le coût des hôtels
    if (favorites.hotels.length > 0 && travelDates.startDate && travelDates.endDate) {
      const startDate = new Date(travelDates.startDate);
      const endDate = new Date(travelDates.endDate);
      const nights = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      costs.hotels = favorites.hotels.reduce((sum, hotel) => {
        const price = parseFloat(hotel.price?.toString() || '0');
        return sum + (price * nights);
      }, 0);
    }

    // Calculer le coût des activités
    costs.activities = favorites.activities.reduce((sum, activity) => {
      const price = parseFloat(activity.price?.toString() || '0');
      return sum + price;
    }, 0);

    // Estimation des coûts de transport local (20€ par jour)
    if (travelDates.startDate && travelDates.endDate) {
      const startDate = new Date(travelDates.startDate);
      const endDate = new Date(travelDates.endDate);
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      costs.transport = days * 20;
    }

    // Estimation des coûts de repas (50€ par jour par personne)
    if (travelDates.startDate && travelDates.endDate) {
      const startDate = new Date(travelDates.startDate);
      const endDate = new Date(travelDates.endDate);
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      costs.meals = days * 50;
    }

    // Calculer le total
    costs.total = costs.flights + costs.hotels + costs.activities + costs.transport + costs.meals;

    setTravelCost(costs);
  };

  // Mettre à jour le coût total quand les favoris ou les dates changent
  useEffect(() => {
    calculateTotalCost();
  }, [favorites, travelDates]);

  const getWeatherDescription = (code: number) => {
    const weatherCodes: { [key: number]: string } = {
      0: 'Ciel dégagé',
      1: 'Peu nuageux',
      2: 'Partiellement nuageux',
      3: 'Couvert',
      45: 'Brumeux',
      48: 'Brouillard givrant',
      51: 'Bruine légère',
      53: 'Bruine modérée',
      55: 'Bruine dense',
      61: 'Pluie légère',
      63: 'Pluie modérée',
      65: 'Pluie forte',
      71: 'Neige légère',
      73: 'Neige modérée',
      75: 'Neige forte',
      77: 'Grains de neige',
      80: 'Averses de pluie légères',
      81: 'Averses de pluie modérées',
      82: 'Averses de pluie fortes',
      85: 'Averses de neige légères',
      86: 'Averses de neige fortes',
      95: 'Orage',
      96: 'Orage avec grêle légère',
      99: 'Orage avec grêle forte'
    };
    return weatherCodes[code] || 'Inconnu';
  };

  const getWeatherIcon = (code: number) => {
    const weatherIcons: { [key: number]: string } = {
      0: '☀️', // Ciel dégagé
      1: '🌤️', // Peu nuageux
      2: '⛅', // Partiellement nuageux
      3: '☁️', // Couvert
      45: '🌫️', // Brumeux
      48: '🌫️', // Brouillard givrant
      51: '🌧️', // Bruine légère
      53: '🌧️', // Bruine modérée
      55: '🌧️', // Bruine dense
      61: '🌧️', // Pluie légère
      63: '🌧️', // Pluie modérée
      65: '🌧️', // Pluie forte
      71: '🌨️', // Neige légère
      73: '🌨️', // Neige modérée
      75: '🌨️', // Neige forte
      77: '🌨️', // Grains de neige
      80: '🌧️', // Averses de pluie légères
      81: '🌧️', // Averses de pluie modérées
      82: '🌧️', // Averses de pluie fortes
      85: '🌨️', // Averses de neige légères
      86: '🌨️', // Averses de neige fortes
      95: '⛈️', // Orage
      96: '⛈️', // Orage avec grêle légère
      99: '⛈️'  // Orage avec grêle forte
    };
    return weatherIcons[code] || '❓';
  };

  const fetchWeather = async (location: string) => {
    try {
      // Utiliser la localisation des activités favorites si disponible
      const favoriteActivities = [...favorites.hotels, ...favorites.activities, ...favorites.restaurants];
      if (favoriteActivities.length > 0) {
        // Prendre la localisation du premier hôtel ou activité
        const firstActivity = favoriteActivities.find(activity => activity.location);
        if (firstActivity?.location) {
          const { lat, lng } = firstActivity.location;
          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&timezone=auto&forecast_days=5`
          );
          const data = await response.json();
          
          // Mettre à jour les informations météo
          setWeatherInfo({
            location: firstActivity.title,
            condition: getWeatherDescription(data.daily.weathercode[0]),
            temperature: Math.round((data.daily.temperature_2m_max[0] + data.daily.temperature_2m_min[0]) / 2),
            icon: getWeatherIcon(data.daily.weathercode[0]),
            forecast: data.daily.time.map((date: string, index: number) => ({
              date: new Date(date).toLocaleDateString('fr-FR'),
              condition: getWeatherDescription(data.daily.weathercode[index]),
              temperature: Math.round((data.daily.temperature_2m_max[index] + data.daily.temperature_2m_min[index]) / 2),
              icon: getWeatherIcon(data.daily.weathercode[index])
            })),
            clothingRecommendations: getClothingRecommendations(
              Math.round((data.daily.temperature_2m_max[0] + data.daily.temperature_2m_min[0]) / 2),
              getWeatherDescription(data.daily.weathercode[0])
            )
          });
          return;
        }
      }
      
      // Fallback sur la localisation de recherche si pas d'activités favorites
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=48.8566&longitude=2.3522&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&timezone=auto&forecast_days=5`
      );
      const data = await response.json();
      
      setWeatherInfo({
        location: location,
        condition: getWeatherDescription(data.daily.weathercode[0]),
        temperature: Math.round((data.daily.temperature_2m_max[0] + data.daily.temperature_2m_min[0]) / 2),
        icon: getWeatherIcon(data.daily.weathercode[0]),
        forecast: data.daily.time.map((date: string, index: number) => ({
          date: new Date(date).toLocaleDateString('fr-FR'),
          condition: getWeatherDescription(data.daily.weathercode[index]),
          temperature: Math.round((data.daily.temperature_2m_max[index] + data.daily.temperature_2m_min[index]) / 2),
          icon: getWeatherIcon(data.daily.weathercode[index])
        })),
        clothingRecommendations: getClothingRecommendations(
          Math.round((data.daily.temperature_2m_max[0] + data.daily.temperature_2m_min[0]) / 2),
          getWeatherDescription(data.daily.weathercode[0])
        )
      });
    } catch (error) {
      console.error('Erreur lors de la récupération de la météo:', error);
    }
  };

  // Mettre à jour la météo quand la destination change
  useEffect(() => {
    if (destination) {
      fetchWeather(destination);
    }
  }, [destination]);

  // Ajouter le rendu de la météo et du coût total dans le composant
  const renderWeatherAndCost = () => (
    <div className="mt-16 bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Section Météo */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-6 text-white">
          <h3 className="text-2xl font-bold mb-4">Météo à {destination}</h3>
          {weatherInfo ? (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-4xl mb-2">{weatherInfo.icon}</div>
                  <div className="text-3xl font-bold">{weatherInfo.temperature}°C</div>
                  <div className="text-lg">{weatherInfo.condition}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm opacity-80">Prévisions sur 3 jours</div>
                  <div className="flex space-x-4 mt-2">
                    {weatherInfo.forecast.map((day, index) => (
                      <div key={index} className="text-center">
                        <div className="text-2xl">{day.icon}</div>
                        <div className="text-sm">{day.temperature}°C</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <h4 className="text-lg font-semibold mb-2">Vêtements recommandés</h4>
                <div className="flex flex-wrap gap-2">
                  {weatherInfo.clothingRecommendations.map((item, index) => (
                    <span key={index} className="bg-white/20 px-3 py-1 rounded-full text-sm">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🌤️</div>
              <p>Chargement de la météo...</p>
            </div>
          )}
        </div>

        {/* Section Coût total */}
        <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-2xl p-6 text-white">
          <h3 className="text-2xl font-bold mb-4">Budget estimé</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Vols</span>
              <span className="font-semibold">{travelCost.flights}€</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Hébergement</span>
              <span className="font-semibold">{travelCost.hotels}€</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Activités</span>
              <span className="font-semibold">{travelCost.activities}€</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Transport local</span>
              <span className="font-semibold">{travelCost.transport}€</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Repas</span>
              <span className="font-semibold">{travelCost.meals}€</span>
            </div>
            <div className="border-t border-white/20 pt-4 mt-4">
              <div className="flex justify-between items-center text-xl font-bold">
                <span>Total</span>
                <span>{travelCost.total}€</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Fonction pour rafraîchir la météo
  const refreshWeather = useCallback(() => {
    const favoriteActivities = [...favorites.hotels, ...favorites.activities, ...favorites.restaurants];
    if (favoriteActivities.length > 0) {
      const firstActivity = favoriteActivities.find(activity => activity.location);
      if (firstActivity?.location) {
        fetchWeather(firstActivity.location.lat + ',' + firstActivity.location.lng);
      }
    } else if (destination) {
      fetchWeather(destination);
    }
  }, [favorites, destination]);

  // Configurer le rafraîchissement automatique
  useEffect(() => {
    // Rafraîchir immédiatement
    refreshWeather();

    // Configurer l'intervalle de rafraîchissement
    const interval = setInterval(refreshWeather, 30000); // 30 secondes
    setWeatherRefreshInterval(interval);

    // Nettoyer l'intervalle quand le composant est démonté
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [refreshWeather]);

  return (
    <div className="min-h-screen relative">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo et titre */}
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => navigate('/')}
                className="flex items-center space-x-2 text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
              >
                <span className="text-3xl">✈️</span>
                <span>TravelWise</span>
              </button>
            </div>

            {/* Boutons de droite */}
            <div className="flex items-center space-x-4">
              <button
                onClick={generateTravelSummary}
                disabled={isGeneratingSummary || !travelDates.startDate}
                className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors
                         flex items-center space-x-2 shadow-md hover:shadow-lg disabled:bg-gray-400"
              >
                {isGeneratingSummary ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Génération...</span>
                  </>
                ) : (
                  <>
                    <span>📋 Résumé</span>
                    <span>→</span>
                  </>
                )}
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors
                         flex items-center space-x-2 shadow-md hover:shadow-lg"
              >
                <span>Déconnexion</span>
                <span className="text-lg">→</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Ajuster le padding-top du contenu principal pour compenser la navbar fixe */}
      <div className="pt-16">
        {/* 3D Globe Background */}
        <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 overflow-hidden">
          {/* Globe Container */}
          <div className="absolute left-[10%] top-[5%] w-[80vh] h-[80vh] opacity-20">
            {/* Main Globe Circle */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 animate-globe-rotate">
              {/* Meridians */}
              {[...Array(8)].map((_, i) => (
                <div
                  key={`meridian-${i}`}
                  className="absolute inset-0 border-2 border-blue-200/20 rounded-full"
                  style={{
                    transform: `rotateY(${i * 22.5}deg)`
                  }}
                />
              ))}
              
              {/* Parallels */}
              {[...Array(6)].map((_, i) => (
                <div
                  key={`parallel-${i}`}
                  className="absolute w-full border-2 border-blue-200/20"
                  style={{
                    top: `${(i + 1) * 16.66}%`,
                    height: '1px',
                    transform: 'rotateX(60deg)'
                  }}
                />
              ))}

              {/* Continents */}
              <div className="absolute inset-0 continent-shapes"></div>
            </div>
          </div>

          {/* Animated Travel Elements */}
          <div className="absolute inset-0">
            {/* Planes flying around */}
            {[...Array(5)].map((_, i) => (
              <div
                key={`plane-path-${i}`}
                className="absolute"
                style={{
                  top: `${20 + i * 15}%`,
                  left: '-10%',
                  width: '120%',
                  height: '2px',
                  transform: `rotate(${-20 + i * 10}deg)`
                }}
              >
                <div
                  className="absolute h-8 w-8 text-white plane-icon animate-fly-path"
                  style={{
                    animationDelay: `${i * 3}s`,
                    animationDuration: '15s'
                  }}
                >
                  ✈️
                </div>
              </div>
            ))}

            {/* Location Markers */}
            {[...Array(12)].map((_, i) => (
              <div
                key={`marker-${i}`}
                className="absolute animate-location-pulse"
                style={{
                  left: `${Math.random() * 80 + 10}%`,
                  top: `${Math.random() * 80 + 10}%`
                }}
              >
                <div className="relative">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <div className="absolute inset-0 bg-red-400 rounded-full animate-ping"></div>
                </div>
              </div>
            ))}

            {/* Floating Icons */}
            <div className="absolute top-[15%] right-[10%] text-4xl animate-float-icon" style={{ animationDelay: '0s' }}>🗺️</div>
            <div className="absolute top-[45%] left-[15%] text-4xl animate-float-icon" style={{ animationDelay: '1s' }}>🌴</div>
            <div className="absolute bottom-[20%] right-[20%] text-4xl animate-float-icon" style={{ animationDelay: '2s' }}>⛱️</div>
            <div className="absolute top-[30%] right-[30%] text-4xl animate-float-icon" style={{ animationDelay: '3s' }}>🏰</div>
            <div className="absolute bottom-[30%] left-[25%] text-4xl animate-float-icon" style={{ animationDelay: '4s' }}>🎡</div>
          </div>

          {/* Light Effects */}
          <div className="absolute inset-0">
            {/* Northern Lights Effect */}
            <div className="absolute top-0 left-0 right-0 h-[30%] bg-gradient-to-b from-teal-500/10 via-blue-500/5 to-transparent"></div>
            
            {/* Star field */}
            {[...Array(50)].map((_, i) => (
              <div
                key={`star-${i}`}
                className="absolute rounded-full bg-white animate-twinkle"
                style={{
                  width: `${Math.random() * 2 + 1}px`,
                  height: `${Math.random() * 2 + 1}px`,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`
                }}
              />
            ))}
          </div>
        </div>

        {/* Content overlay with increased blur for better readability */}
        <div className="relative z-10 backdrop-blur-sm">
          {/* Header section with enhanced design */}
          <header className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-blue-600/20 to-transparent"></div>
            
            <div className="container mx-auto px-4 pt-20 pb-32">
              <div className="text-center relative">
                {/* Decorative elements */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
                
                <h1 className="text-7xl font-bold mb-6 relative">
                  <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent
                                 animate-gradient-x relative z-10">
                    Planifiez votre voyage
                  </span>
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-6xl">
                    🧳
                  </span>
                </h1>
                
                <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed mb-8">
                  Découvrez des destinations extraordinaires et créez des souvenirs inoubliables
                </p>

                {/* Search section with enhanced glass effect */}
                <div className="max-w-3xl mx-auto relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-3xl blur opacity-30 group-hover:opacity-40 transition duration-1000"></div>
                  <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl 
                                border border-white/50 hover:shadow-2xl transition-all duration-500">
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Décrivez votre voyage idéal (ex: Je veux aller à Tokyo en juillet pour 1 semaine...)"
                      className="w-full h-40 p-6 rounded-2xl border-2 border-gray-100 focus:border-blue-400
                               bg-white/90 backdrop-blur-sm text-lg resize-none transition-all duration-300
                               focus:ring-4 focus:ring-blue-200 shadow-inner placeholder-gray-400"
                    />
                    <button
                      onClick={handleSearch}
                      disabled={loading}
                      className="mt-6 w-full relative group"
                    >
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 
                                    rounded-xl blur opacity-60 group-hover:opacity-80 transition duration-500"></div>
                      <div className="relative px-8 py-4 bg-black rounded-xl leading-none flex items-center justify-center">
                        {loading ? (
                          <div className="flex items-center space-x-3 text-white">
                            <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Recherche en cours...</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-3 text-white">
                            <span className="text-lg font-semibold">Commencer l'aventure</span>
                            <span className="text-2xl group-hover:rotate-12 transition-transform duration-300">✨</span>
                          </div>
                        )}
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative wave */}
            <div className="absolute bottom-0 left-0 right-0">
              <svg className="w-full h-24 fill-white/80" viewBox="0 0 1440 74" xmlns="http://www.w3.org/2000/svg">
                <path d="M0,32L48,37.3C96,43,192,53,288,58.7C384,64,480,64,576,58.7C672,53,768,43,864,42.7C960,43,1056,53,1152,53.3C1248,53,1344,43,1392,37.3L1440,32L1440,74L1392,74C1344,74,1248,74,1152,74C1056,74,960,74,864,74C768,74,672,74,576,74C480,74,384,74,288,74C192,74,96,74,48,74L0,74Z"></path>
              </svg>
            </div>
          </header>

          {/* Rest of the content with enhanced styling */}
          <main className="bg-white/80 backdrop-blur-sm relative z-20 pt-16 pb-20 px-4">
            <div className="container mx-auto">
              {/* Filter buttons */}
              {(flights.length > 0 || hotels.length > 0 || activities.length > 0 || restaurants.length > 0) && (
                <div className="mb-16">
                  <div className="flex justify-center gap-6 flex-wrap">
                    {flights.length > 0 && (
                      <button 
                        onClick={() => setSelectedType('Vol')} 
                        className={`group relative px-8 py-4 rounded-2xl transition-all duration-500 overflow-hidden
                          ${selectedType === 'Vol'
                            ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg scale-105'
                            : 'bg-white/90 text-gray-700 hover:bg-white hover:scale-105'
                          } border-2 border-white/50`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-blue-700/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="relative flex items-center space-x-3">
                          <span className="text-2xl group-hover:animate-bounce">✈️</span>
                          <span className="font-semibold">Vols ({flights.length})</span>
                        </div>
                      </button>
                    )}
                    {hotels.length > 0 && (
                      <button 
                        onClick={() => setSelectedType('Hôtel')} 
                        className={`group relative px-8 py-4 rounded-2xl transition-all duration-500 overflow-hidden
                          ${selectedType === 'Hôtel'
                            ? 'bg-gradient-to-r from-green-500 to-emerald-700 text-white shadow-lg scale-105'
                            : 'bg-white/90 text-gray-700 hover:bg-white hover:scale-105'
                          } border-2 border-white/50`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-700/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="relative flex items-center space-x-3">
                          <span className="text-2xl group-hover:animate-bounce">🏨</span>
                          <span className="font-semibold">Hôtels ({hotels.length})</span>
                        </div>
                      </button>
                    )}
                    {activities.length > 0 && (
                      <button 
                        onClick={() => setSelectedType('Activité')} 
                        className={`group relative px-8 py-4 rounded-2xl transition-all duration-500 overflow-hidden
                          ${selectedType === 'Activité'
                            ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg scale-105'
                            : 'bg-white/90 text-gray-700 hover:bg-white hover:scale-105'
                          } border-2 border-white/50`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="relative flex items-center space-x-3">
                          <span className="text-2xl group-hover:animate-bounce">🎯</span>
                          <span className="font-semibold">Activités ({activities.length})</span>
                        </div>
                      </button>
                    )}
                    {restaurants.length > 0 && (
                      <button 
                        onClick={() => setSelectedType('Restaurant')} 
                        className={`group relative px-8 py-4 rounded-2xl transition-all duration-500 overflow-hidden
                          ${selectedType === 'Restaurant'
                            ? 'bg-gradient-to-r from-red-500 to-orange-600 text-white shadow-lg scale-105'
                            : 'bg-white/90 text-gray-700 hover:bg-white hover:scale-105'
                          } border-2 border-white/50`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-orange-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="relative flex items-center space-x-3">
                          <span className="text-2xl group-hover:animate-bounce">🍽️</span>
                          <span className="font-semibold">Restaurants ({restaurants.length})</span>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Results section */}
              {selectedType && displayedResults.length > 0 && (
                <div className="animate-fadeIn">
                  <h2 className="text-4xl font-bold text-center mb-12">
                    <span className="bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
                      {selectedType === 'Vol' && `✈️ ${flights.length} vol(s) trouvé(s)`}
                      {selectedType === 'Hôtel' && `🏨 ${hotels.length} hôtel(s) trouvé(s)`}
                      {selectedType === 'Activité' && `🎯 ${activities.length} activité(s) trouvé(s)`}
                      {selectedType === 'Restaurant' && `🍽️ ${restaurants.length} restaurant(s) trouvé(s)`}
                    </span>
                  </h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 px-4">
                    {selectedType === 'Vol' && displayedResults.map((flight, index) => renderFlightCard(flight, index))}
                    {selectedType === 'Hôtel' && displayedResults.map((hotel, index) => renderHotelCard(hotel, index))}
                    {selectedType === 'Activité' && displayedResults.map((activity, index) => renderActivityCard(activity, index))}
                    {selectedType === 'Restaurant' && displayedResults.map((restaurant, index) => renderRestaurantCard(restaurant, index))}
                  </div>
                </div>
              )}

              {/* Afficher les sections Favoris et Planning uniquement après une recherche */}
              {searchPerformed && (
                <>
                  {/* Favorites Section */}
                  {renderFavoritesSection()}

                  {/* Planning Section */}
                  {renderPlanningOverview()}
                </>
              )}

              {/* Ajouter la section météo et coût après la section de recherche */}
              {searchPerformed && renderWeatherAndCost()}
            </div>
          </main>

          {/* Modals */}
          {renderPlanningModal()}
          {renderRestaurantModal()}
        </div>
      </div>
      {renderTravelAssistant()}
    </div>
  );
};

// Updated styles with new animations
const styles = `
@keyframes globe-rotate {
  0% { transform: rotate3d(1, 1, 1, 0deg); }
  100% { transform: rotate3d(1, 1, 1, 360deg); }
}

@keyframes fly-path {
  0% { transform: translateX(0) scale(0.8); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translateX(100vw) scale(0.8); opacity: 0; }
}

@keyframes float-icon {
  0%, 100% { transform: translateY(0) rotate(0); }
  50% { transform: translateY(-20px) rotate(5deg); }
}

@keyframes location-pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.5); opacity: 0.5; }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes twinkle {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.animate-globe-rotate {
  animation: globe-rotate 20s linear infinite;
  transform-style: preserve-3d;
}

.animate-fly-path {
  animation: fly-path linear infinite;
}

.animate-float-icon {
  animation: float-icon 3s ease-in-out infinite;
}

.animate-location-pulse {
  animation: location-pulse 2s ease-in-out infinite;
}

.animate-twinkle {
  animation: twinkle 2s ease-in-out infinite;
}

.continent-shapes {
  background-image: url("data:image/svg+xml,%3Csvg width='800' height='800' viewBox='0 0 800 800' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='rgba(255,255,255,0.2)' d='M300,200 C350,150 400,180 450,200 C500,220 550,200 600,150 C650,100 700,150 750,200 L750,600 C700,650 650,630 600,600 C550,570 500,580 450,600 C400,620 350,600 300,550 L300,200 Z'/%3E%3C/svg%3E");
  background-size: cover;
  background-position: center;
  mix-blend-mode: soft-light;
}

.plane-icon {
  transform-origin: center;
  transform: rotate(90deg);
}

/* Existing animations */
.animate-gradient-x {
  animation: gradient-x 15s ease infinite;
}

@keyframes gradient-x {
  0% { background-size: 100% 100%; }
  50% { background-size: 200% 100%; }
  100% { background-size: 100% 100%; }
}
`;

export default TravelPlanner;
