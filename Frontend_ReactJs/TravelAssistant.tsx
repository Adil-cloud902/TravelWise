import React, { useState } from 'react';
import api from '../project/src/services/api';

const TravelPage = () => {
  const [text, setText] = useState('');
  const [result, setResult] = useState<any>(null);

  const askTravel = async () => {
    try {
      const response = await api.post('/travel/ask', { text });
      setResult(response.data);
    } catch (error) {
      console.error('Erreur lors de la demande de voyage :', error);
    }
  };

  return (
    <div>
      <h2>Planifier un voyage</h2>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Décrivez votre voyage ici..."
      />
      <button onClick={askTravel}>Envoyer</button>

      {result && (
        <div>
          <h3>Vols</h3>
          <pre>{JSON.stringify(result.flights, null, 2)}</pre>

          <h3>Hôtels</h3>
          <pre>{JSON.stringify(result.hotels, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default TravelPage;
