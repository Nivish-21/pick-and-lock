import { describe, expect, it } from "vitest";
import { findNearbyPlaces } from "./places";

function mockedFetch(payload: unknown) {
  const fetchImpl = (async () =>
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "content-type": "application/json" },
    })) as unknown as typeof fetch;
  return { fetchImpl };
}

describe("findNearbyPlaces", () => {
  it("surfaces ratings returned by Nearby Search", async () => {
    const { fetchImpl } = mockedFetch({
      places: [
        {
          displayName: { text: "Arcade" },
          formattedAddress: "1 Main Street",
          googleMapsUri: "https://maps.google.com/?q=arcade",
          rating: 4.7,
          userRatingCount: 381,
        },
      ],
    });

    await expect(
      findNearbyPlaces("test-key", { lat: 12.97, lng: 77.59 }, "arcade", {
        fetchImpl,
      }),
    ).resolves.toEqual([
      {
        name: "Arcade",
        address: "1 Main Street",
        mapsUri: "https://maps.google.com/?q=arcade",
        rating: 4.7,
        userRatingsTotal: 381,
      },
    ]);
  });

  it("leaves absent ratings undefined", async () => {
    const { fetchImpl } = mockedFetch({
      places: [{ displayName: { text: "Arcade" } }],
    });

    await expect(
      findNearbyPlaces("test-key", { lat: 12.97, lng: 77.59 }, "arcade", {
        fetchImpl,
      }),
    ).resolves.toEqual([
      {
        name: "Arcade",
        address: "Address unavailable",
        mapsUri: undefined,
        rating: undefined,
        userRatingsTotal: undefined,
      },
    ]);
  });
});
