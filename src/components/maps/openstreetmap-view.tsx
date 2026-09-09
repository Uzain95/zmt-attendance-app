import { useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';

type Coordinate = {
  latitude: number;
  longitude: number;
};

type MapRegion = Coordinate & {
  latitudeDelta: number;
  longitudeDelta: number;
};

export type OpenStreetMapMarker = Coordinate & {
  id: string;
  title?: string;
  description?: string;
  color?: string;
  glyph?: string;
  draggable?: boolean;
};

export type OpenStreetMapCircle = Coordinate & {
  radius: number;
  strokeColor?: string;
  fillColor?: string;
};

export type OpenStreetMapPolyline = {
  id: string;
  coordinates: Coordinate[];
  color?: string;
  dashed?: boolean;
};

type OpenStreetMapMessage =
  | { type: 'map-press'; latitude: number; longitude: number }
  | { type: 'marker-drag'; markerId: string; latitude: number; longitude: number };

type OpenStreetMapViewProps = {
  circles?: OpenStreetMapCircle[];
  initialRegion: MapRegion;
  interactive?: boolean;
  markers?: OpenStreetMapMarker[];
  onMapPress?: (coordinate: Coordinate) => void;
  onMarkerDragEnd?: (payload: { markerId: string; coordinate: Coordinate }) => void;
  polylines?: OpenStreetMapPolyline[];
  style: StyleProp<ViewStyle>;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const sanitizePopupText = (value?: string) => (value ? escapeHtml(value) : '');

const buildHtml = ({
  payload,
}: {
  payload: string;
}) => {
  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <style>
        html, body, #map { height: 100%; margin: 0; padding: 0; background: #e7f1f0; }
        .leaflet-container { font-family: sans-serif; }
        .clinic-marker {
          align-items: center;
          border-radius: 999px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.18);
          color: #ffffff;
          display: flex;
          font-size: 12px;
          font-weight: 700;
          height: 28px;
          justify-content: center;
          width: 28px;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script>
        const props = ${payload};
        const map = L.map('map', {
          zoomControl: true,
          attributionControl: true,
          preferCanvas: true,
        }).setView(
          [props.initialRegion.latitude, props.initialRegion.longitude],
          11
        );

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
          maxZoom: 19,
          keepBuffer: 1,
          noWrap: true,
          subdomains: 'abcd',
          updateWhenIdle: true,
          updateWhenZooming: false,
        }).addTo(map);

        const bounds = [];

        const sendMessage = (message) => {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify(message));
          }
        };

        props.circles.forEach((circle) => {
          bounds.push([circle.latitude, circle.longitude]);
          L.circle([circle.latitude, circle.longitude], {
            color: circle.strokeColor || 'rgba(56, 156, 149, 0.66)',
            fillColor: circle.fillColor || 'rgba(56, 156, 149, 0.14)',
            fillOpacity: 0.28,
            radius: circle.radius,
            weight: 2,
          }).addTo(map);
        });

        props.markers.forEach((marker) => {
          bounds.push([marker.latitude, marker.longitude]);

          const icon = L.divIcon({
            className: '',
            html: '<div class="clinic-marker" style="background:' + (marker.color || '#389c95') + '">' + (marker.glyph || '•') + '</div>',
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });

          const leafletMarker = L.marker([marker.latitude, marker.longitude], {
            draggable: Boolean(marker.draggable),
            icon,
          }).addTo(map);

          const popupParts = [marker.title, marker.description]
            .filter(Boolean)
            .map((part) => String(part));

          if (popupParts.length > 0) {
            leafletMarker.bindPopup(popupParts.join('<br/>'));
          }

          if (marker.draggable) {
            leafletMarker.on('dragend', (event) => {
              const nextCoordinate = event.target.getLatLng();
              sendMessage({
                type: 'marker-drag',
                markerId: marker.id,
                latitude: nextCoordinate.lat,
                longitude: nextCoordinate.lng,
              });
            });
          }
        });

        props.polylines.forEach((polyline) => {
          if (!polyline.coordinates || polyline.coordinates.length < 2) {
            return;
          }

          polyline.coordinates.forEach((point) => bounds.push([point.latitude, point.longitude]));

          L.polyline(
            polyline.coordinates.map((point) => [point.latitude, point.longitude]),
            {
              color: polyline.color || '#389c95',
              dashArray: polyline.dashed ? '8 6' : undefined,
              opacity: 0.92,
              weight: 3,
            },
          ).addTo(map);
        });

        if (props.interactive) {
          map.on('click', (event) => {
            sendMessage({
              type: 'map-press',
              latitude: event.latlng.lat,
              longitude: event.latlng.lng,
            });
          });
        }

        if (bounds.length > 1) {
          map.fitBounds(bounds, { padding: [24, 24] });
        }
      </script>
    </body>
  </html>`;
};

export const OpenStreetMapView = ({
  circles,
  initialRegion,
  interactive,
  markers,
  onMapPress,
  onMarkerDragEnd,
  polylines,
  style,
}: OpenStreetMapViewProps) => {
  const serializedPayload = JSON.stringify({
    circles: circles ?? [],
    initialRegion,
    interactive: interactive ?? false,
    markers: (markers ?? []).map((marker) => ({
      ...marker,
      description: sanitizePopupText(marker.description),
      title: sanitizePopupText(marker.title),
    })),
    polylines: polylines ?? [],
  }).replace(/</g, '\\u003c');

  const source = useMemo(
    () => ({
      html: buildHtml({ payload: serializedPayload }),
    }),
    [serializedPayload],
  );

  return (
    <WebView
      androidLayerType="software"
      cacheEnabled={false}
      setSupportMultipleWindows={false}
      originWhitelist={['*']}
      source={source}
      style={style}
      javaScriptEnabled
      domStorageEnabled
      scrollEnabled={false}
      nestedScrollEnabled={false}
      onMessage={(event) => {
        const payload = JSON.parse(event.nativeEvent.data) as OpenStreetMapMessage;

        if (payload.type === 'map-press') {
          onMapPress?.({ latitude: payload.latitude, longitude: payload.longitude });
          return;
        }

        onMarkerDragEnd?.({
          markerId: payload.markerId,
          coordinate: { latitude: payload.latitude, longitude: payload.longitude },
        });
      }}
    />
  );
};