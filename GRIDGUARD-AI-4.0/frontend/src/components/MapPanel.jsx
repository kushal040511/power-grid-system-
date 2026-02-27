import { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const riskColors = {
  green: "#1ec88b",
  yellow: "#f6c344",
  red: "#ff5d5d",
  nodata: "#4b5563"
};

const normalize = (v) => String(v || "").trim().toLowerCase();

const getFeatureName = (feature) =>
  feature?.properties?.name ||
  feature?.properties?.NAME_1 ||
  feature?.properties?.st_nm ||
  feature?.properties?.state ||
  "";

const findRegionData = (featureName, riskByRegion) => {
  const key = normalize(featureName);
  if (!key) return null;

  if (riskByRegion[key]) return riskByRegion[key];

  const entries = Object.entries(riskByRegion || {});
  for (const [name, value] of entries) {
    if (key.includes(name) || name.includes(key)) return value;
  }
  return null;
};

export default function MapPanel({ riskByRegion, onRegionClick, selectedRegionName }) {
  const [indiaGeo, setIndiaGeo] = useState(null);
  const selectedKey = normalize(selectedRegionName);

  useEffect(() => {
    let mounted = true;
    fetch("/data/india.geo.json")
      .then((res) => res.json())
      .then((geo) => {
        if (mounted) setIndiaGeo(geo);
      })
      .catch(() => {
        if (mounted) setIndiaGeo({ type: "FeatureCollection", features: [] });
      });

    return () => {
      mounted = false;
    };
  }, []);

  const styleFeature = (feature) => {
    const regionKey = getFeatureName(feature);
    const regionData = findRegionData(regionKey, riskByRegion || {});
    const risk = regionData?.risk || "nodata";
    const isSelected = selectedKey && selectedKey === normalize(regionData?.name || regionKey);
    return {
      color: "#1c2230",
      weight: isSelected ? 2.5 : 1,
      fillColor: riskColors[risk],
      fillOpacity: isSelected ? 0.85 : 0.65
    };
  };

  const onEach = (feature, layer) => {
    const regionKey = getFeatureName(feature);
    const data = findRegionData(regionKey, riskByRegion || {});
    layer.on({
      click: () => onRegionClick?.(feature, data)
    });
    layer.bindTooltip(
      data
        ? `${regionKey}<br/>Theft: ${data?.theft_score?.toFixed?.(1) || 0}%<br/>Loss: ${data?.loss_percent?.toFixed?.(1) || 0}%<br/>Transformer: ${data?.transformer_risk?.toFixed?.(1) || 0}%`
        : `${regionKey}<br/>No live data yet`,
      { sticky: true }
    );
  };

  const mapKey = Object.values(riskByRegion || {})
    .map((r) => `${r.name}:${r.theft_score}:${r.loss_percent}:${r.transformer_risk}`)
    .join("|");

  return (
    <div className="glass rounded-2xl overflow-hidden h-[520px]">
      <MapContainer center={[22.5, 79]} zoom={4.5} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {indiaGeo && <GeoJSON key={mapKey} data={indiaGeo} style={styleFeature} onEachFeature={onEach} />}
      </MapContainer>
    </div>
  );
}
