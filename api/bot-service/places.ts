import { fetchWithRetry, type RetryFetchOptions } from "./http";

export type PlaceSuggestion = {
  name: string;
  address: string;
  mapsUri?: string;
  rating?: number;
  userRatingsTotal?: number;
};

export async function findNearbyPlaces(
  apiKey: string,
  location: { lat: number; lng: number },
  query: string,
  options: RetryFetchOptions = {},
): Promise<PlaceSuggestion[]> {
  const response = await fetchWithRetry(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
        "x-goog-fieldmask":
          "places.displayName,places.formattedAddress,places.googleMapsUri,places.rating,places.userRatingCount",
      },
      body: JSON.stringify({
        textQuery: query || "good group venue",
        maxResultCount: 5,
        locationBias: {
          circle: {
            center: { latitude: location.lat, longitude: location.lng },
            radius: 5_000,
          },
        },
      }),
    },
    options,
  );
  if (!response.ok)
    throw new Error(`Google Places request failed (${response.status})`);
  const data = (await response.json()) as {
    places?: Array<{
      displayName?: { text?: string };
      formattedAddress?: string;
      googleMapsUri?: string;
      rating?: number;
      userRatingCount?: number;
    }>;
  };
  return (data.places ?? []).map((place) => ({
    name: place.displayName?.text ?? "Unnamed place",
    address: place.formattedAddress ?? "Address unavailable",
    mapsUri: place.googleMapsUri,
    rating: place.rating,
    userRatingsTotal: place.userRatingCount,
  }));
}
