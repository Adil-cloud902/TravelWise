import React, { useState } from 'react';

interface TravelResult {
  type: 'Hôtel' | 'Vol' | 'Activité';
  title: string;
  image?: string;
  description?: string;
}

const TravelPlanner = () => {
  const [description, setDescription] = useState('');
  const [hotels, setHotels] = useState<TravelResult[]>([]);
  const [flights, setFlights] = useState<TravelResult[]>([]);
  const [activities, setActivities] = useState<TravelResult[]>([]);
  const [selectedType, setSelectedType] = useState<'Hôtel' | 'Vol' | 'Activité' | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    setHotels([]);
    setFlights([]);
    setActivities([]);
    setSelectedType(null);

    try {
      const requestBody = JSON.stringify({ text: description });

      const [flightRes, hotelRes, activityRes] = await Promise.all([
        fetch('/api/travel/ask/flight', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: requestBody }),
        fetch('/api/travel/ask/hotel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: requestBody }),
        fetch('/api/travel/ask/activity', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: requestBody }),
      ]);

      const [flightData, hotelData, activityData] = await Promise.all([
        flightRes.json(),
        hotelRes.json(),
        activityRes.json(),
      ]);

      const parsedFlights: TravelResult[] = flightData.data?.map((flight: any) => ({
        type: 'Vol',
        title: `Vol ${flight.itineraries[0]?.segments[0]?.departure?.iataCode} ➜ ${flight.itineraries[0]?.segments[0]?.arrival?.iataCode}`,
        description: `Compagnie: ${flight.validatingAirlineCodes?.join(', ')}, Prix: ${flight.price?.total} ${flight.price?.currency}`,
        image: '/flight.jpg' // Une image par défaut pour les vols
      })) || [];

      const parsedHotels: TravelResult[] = hotelData.data?.map((hotel: any) => ({
        type: 'Hôtel',
        title: hotel.name,
        description: hotel.address?.lines?.join(', ') || '',
        image: hotel.media?.[0]?.uri || '/hotel.jpg' // Image depuis API ou par défaut
      })) || [];

      const parsedActivities: TravelResult[] = activityData.data?.map((activity: any) => ({
        type: 'Activité',
        title: activity.name,
        description: activity.shortDescription || '',
        image: activity.pictures?.[0] || '/activity.jpg'
      })) || [];

      setFlights(parsedFlights);
      setHotels(parsedHotels);
      setActivities(parsedActivities);

    } catch (error) {
      console.error("Erreur lors de la récupération des données :", error);
    } finally {
      setLoading(false);
    }
  };

  const displayedResults = selectedType === 'Hôtel' ? hotels
    : selectedType === 'Vol' ? flights
    : selectedType === 'Activité' ? activities
    : [];

  return (
    <div className="min-h-screen bg-travel-pattern bg-cover bg-center flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-5xl p-8 rounded-2xl shadow-xl glass-effect animate-fade-in">
        <h1 className="text-4xl font-bold text-center mb-6">Planifiez votre voyage 🧳</h1>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Décrivez votre voyage (ex: Je veux aller à Tokyo en juillet pour 1 semaine...)"
          className="w-full h-40 p-4 rounded-lg border border-gray-300 input-focus-ring resize-none mb-6"
        />
        <div className="flex justify-center gap-4">
          <button
            onClick={handleSearch}
            className="px-8 py-3 bg-blue-600 text-white text-lg rounded-lg hover:bg-blue-700 form-transition"
          >
            {loading ? 'Chargement...' : 'Rechercher'}
          </button>
        </div>

        {(flights.length > 0 || hotels.length > 0 || activities.length > 0) && (
          <div className="mt-6 flex justify-center gap-4 flex-wrap">
            <button onClick={() => setSelectedType('Hôtel')} className={`px-6 py-2 rounded-lg border ${selectedType === 'Hôtel' ? 'bg-blue-500 text-white' : 'bg-white'}`}>Hôtels</button>
            <button onClick={() => setSelectedType('Vol')} className={`px-6 py-2 rounded-lg border ${selectedType === 'Vol' ? 'bg-blue-500 text-white' : 'bg-white'}`}>Vols</button>
            <button onClick={() => setSelectedType('Activité')} className={`px-6 py-2 rounded-lg border ${selectedType === 'Activité' ? 'bg-blue-500 text-white' : 'bg-white'}`}>Activités</button>
          </div>
        )}

        {selectedType && displayedResults.length > 0 && (
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedResults.map((item, index) => (
              <div key={index} className="p-4 bg-white rounded-xl shadow hover:shadow-lg transition">
                <img src={item.image} alt={item.title} className="w-full h-40 object-cover rounded-lg mb-4" />
                <h2 className="text-xl font-semibold">{item.title}</h2>
                <p className="text-gray-600 mt-1">{item.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TravelPlanner;
