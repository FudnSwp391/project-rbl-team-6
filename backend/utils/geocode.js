/**
 * Geocode an address using OpenStreetMap Nominatim API.
 * @param {string} address - The address to geocode
 * @returns {Promise<{latitude: number, longitude: number}|null>}
 */
const geocodeAddress = async (address) => {
  if (!address) return null;
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`, {
      headers: {
        'User-Agent': 'EduX-Tutor-App/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data && data.length > 0) {
      const location = data[0];
      return {
        latitude: parseFloat(location.lat),
        longitude: parseFloat(location.lon)
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error.message);
    return null;
  }
};

module.exports = {
  geocodeAddress
};