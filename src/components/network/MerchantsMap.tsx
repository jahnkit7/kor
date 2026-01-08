import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Map, Navigation, Search, X, Loader2 } from "lucide-react";
import { type MerchantProfile, MERCHANT_TYPES, SPECIALTIES } from "@/hooks/use-merchant-profile";
import { TrustScoreBadge } from "./TrustScoreBadge";
import { cn } from "@/lib/utils";

interface MerchantsMapProps {
  merchants: MerchantProfile[];
  onMerchantClick?: (merchant: MerchantProfile) => void;
}

export function MerchantsMap({ merchants, onMerchantClick }: MerchantsMapProps) {
  const [mapboxToken, setMapboxToken] = useState("");
  const [tokenSubmitted, setTokenSubmitted] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState<MerchantProfile | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Merchants with GPS coordinates
  const geoMerchants = merchants.filter(
    (m) => m.location_lat && m.location_lng
  );

  const getUserLocation = () => {
    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLoadingLocation(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        setLoadingLocation(false);
      }
    );
  };

  useEffect(() => {
    if (!tokenSubmitted || !mapContainer.current || !mapboxToken) return;

    const initMap = async () => {
      // Dynamically import mapbox
      const mapboxgl = (await import("mapbox-gl")).default;
      await import("mapbox-gl/dist/mapbox-gl.css");

      mapboxgl.accessToken = mapboxToken;

      // Default center (Lomé, Togo)
      const defaultCenter = { lng: 1.2227, lat: 6.1319 };
      
      // Use user location or first merchant location or default
      const center = userLocation 
        ? [userLocation.lng, userLocation.lat]
        : geoMerchants.length > 0 
          ? [Number(geoMerchants[0].location_lng), Number(geoMerchants[0].location_lat)]
          : [defaultCenter.lng, defaultCenter.lat];

      mapRef.current = new mapboxgl.Map({
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/streets-v12",
        center: center as [number, number],
        zoom: 13,
      });

      mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");

      // Add user location marker
      if (userLocation) {
        new mapboxgl.Marker({ color: "#3b82f6" })
          .setLngLat([userLocation.lng, userLocation.lat])
          .addTo(mapRef.current);
      }

      // Add merchant markers
      geoMerchants.forEach((merchant) => {
        const merchantType = MERCHANT_TYPES.find(t => t.value === merchant.merchant_type);
        
        const el = document.createElement("div");
        el.className = "merchant-marker";
        el.innerHTML = `<span style="font-size: 24px; cursor: pointer;">${merchantType?.emoji || "🏪"}</span>`;
        el.onclick = () => setSelectedMerchant(merchant);

        const marker = new mapboxgl.Marker(el)
          .setLngLat([Number(merchant.location_lng), Number(merchant.location_lat)])
          .addTo(mapRef.current);

        markersRef.current.push(marker);
      });
    };

    initMap();

    return () => {
      mapRef.current?.remove();
      markersRef.current = [];
    };
  }, [tokenSubmitted, mapboxToken, geoMerchants, userLocation]);

  // Token input view
  if (!tokenSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Map className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Carte des marchands
        </h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-xs">
          Pour afficher la carte, entrez votre token Mapbox public. 
          Obtenez-le sur <a href="https://mapbox.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">mapbox.com</a>
        </p>
        <div className="w-full max-w-sm space-y-3">
          <Input
            type="text"
            value={mapboxToken}
            onChange={(e) => setMapboxToken(e.target.value)}
            placeholder="pk.eyJ1IjoiLi4uIiwiYSI6Ii4uLiJ9..."
            className="h-12 rounded-xl text-sm"
          />
          <Button
            onClick={() => mapboxToken && setTokenSubmitted(true)}
            disabled={!mapboxToken}
            className="w-full h-12 rounded-xl"
          >
            <Map className="w-4 h-4 mr-2" />
            Afficher la carte
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          {geoMerchants.length} marchand{geoMerchants.length !== 1 ? "s" : ""} avec position GPS
        </p>
      </div>
    );
  }

  const selectedType = selectedMerchant 
    ? MERCHANT_TYPES.find(t => t.value === selectedMerchant.merchant_type)
    : null;

  return (
    <div className="relative h-[400px] rounded-2xl overflow-hidden border border-border">
      {/* Map Container */}
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Controls Overlay */}
      <div className="absolute top-3 left-3 z-10">
        <Button
          size="sm"
          variant="secondary"
          onClick={getUserLocation}
          disabled={loadingLocation}
          className="rounded-xl shadow-md"
        >
          {loadingLocation ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4" />
          )}
          <span className="ml-1.5">Ma position</span>
        </Button>
      </div>

      {/* Selected Merchant Card */}
      {selectedMerchant && (
        <div className="absolute bottom-3 left-3 right-3 z-10">
          <div className="bg-card rounded-xl border border-border p-3 shadow-lg">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-xl">{selectedType?.emoji || "🏪"}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">
                      {selectedType?.label}
                    </span>
                    <TrustScoreBadge userId={selectedMerchant.user_id} size="sm" />
                  </div>
                  {selectedMerchant.location_name && (
                    <p className="text-xs text-muted-foreground">
                      {selectedMerchant.location_name}
                    </p>
                  )}
                  {selectedMerchant.market_address && (
                    <p className="text-xs text-primary font-medium">
                      🏪 {selectedMerchant.market_address}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedMerchant(null)}
                className="p-1 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Specialties */}
            {selectedMerchant.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedMerchant.specialties.slice(0, 3).map((s) => {
                  const spec = SPECIALTIES.find(sp => sp.value === s);
                  return (
                    <span 
                      key={s}
                      className="px-2 py-0.5 bg-secondary rounded-md text-xs font-medium"
                    >
                      {spec?.emoji} {spec?.label}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
