// 1. Map Setup centered on Pennsylvania
const PA_CENTER = [40.9, -77.5];
const INITIAL_ZOOM = 7;

// Wait for the DOM to be fully loaded before initializing the map
document.addEventListener('DOMContentLoaded', function() {
    const map = L.map('map').setView(PA_CENTER, INITIAL_ZOOM);

    // 2. Add Base Map (CartoDB Positron - clean and grey, good for data viz)
    // L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    //     attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    //     subdomains: 'abcd',
    //     maxZoom: 19
    // }).addTo(map);

    L.tileLayer(
        `https://api.mapbox.com/styles/v1/mapbox/navigation-night-v1/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoieHp5d2lzZGlsaSIsImEiOiJjbWZvODlrdmwwMzExMmxweGZmb285a202In0.AmX10MfI_c6jVFe5Uz8TeQ`,
        { tileSize: 512, zoomOffset: -1 }
    ).addTo(map);

// 3. Layer Configuration
// We define color, size (radius), and file path for each type
const LAYERS_CONFIG = [
    {
        name: "Hospitals",
        file: "data/DOH_Hospitals202311.geojson",
        color: "#d63031", // Red
        radius: 8,
        id: "hospitals"
    },
    {
        name: "Mental Health Centers",
        file: "data/DOH_CommunityMentalHealthCenters202106.geojson",
        color: "#e67e22", // Orange
        radius: 7,
        id: "mental_health"
    },
    {
        name: "Intermediate Care",
        file: "data/DOH_IntermediateCareFacilities202212.geojson",
        color: "#6c5ce7", // Purple
        radius: 6,
        id: "inter_care"
    },
    {
        name: "Home Health Agencies",
        file: "data/DOH_HomeHealthAgencies202208.geojson",
        color: "#00b894", // Green
        radius: 4, // Smaller because there are many points
        id: "home_health"
    }
];

// 自定义图标（根据你自己的图片路径调整）
const ICONS = {
    hospitals: L.icon({
        iconUrl: 'img/hospital.svg',
        iconSize: [22, 22],
        iconAnchor: [14, 28]
    }),
    mental_health: L.icon({
        iconUrl: 'img/mental.svg',
        iconSize: [28, 28],
        iconAnchor: [14, 28]
    }),
    inter_care: L.icon({
        iconUrl: 'img/intermediate.svg',
        iconSize: [20, 20],
        iconAnchor: [14, 28]
    }),
    home_health: L.icon({
        iconUrl: 'img/homehealth.svg',
        iconSize: [13, 13],
        iconAnchor: [14, 28]
    })
};


// Group to hold all layers
const layerGroups = {};

// 4. Function to Load Data
async function loadData() {
    const legendContainer = document.getElementById('legend-content');
    if (!legendContainer) {
        console.error('Legend container with ID "legend-content" not found.');
        return;
    }

    for (const config of LAYERS_CONFIG) {
        try {
            const response = await fetch(config.file);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();

            // Create the GeoJSON layer with Bubbles (CircleMarkers)
            const layer = L.geoJSON(data, {
                pointToLayer: function (feature, latlng) {
                    // 如果为该类型定义了 ICON，就用图标
                    const icon = ICONS[config.id];
                    if (icon) {
                        return L.marker(latlng, { icon: icon });
                    }

                    // 否则继续用原来的 circleMarker（兼容以后扩展）
                    return L.circleMarker(latlng, {
                        radius: config.radius,
                        fillColor: config.color,
                        color: "#fff",
                        weight: 1,
                        opacity: 1,
                        fillOpacity: 0.7
                    });

                    // return L.circleMarker(latlng, {
                    //     radius: config.radius,
                    //     fillColor: config.color,
                    //     color: "#fff",    // White border
                    //     weight: 1,        // Thin border
                    //     opacity: 1,
                    //     fillOpacity: 0.7  // Slight transparency
                    // });
                },
                onEachFeature: function (feature, layer) {
                    // Normalize data fields (Handle CITY vs CITY_OR_BO, etc.)
                    const props = feature.properties;
                    const name = props.FACILITY_N || "Unknown Facility";
                    const address = props.STREET || "Address N/A";
                    const city = props.CITY || props.CITY_OR_BO || ""; 
                    const county = props.COUNTY || "";
                    const phone = props.TELEPHONE || props.TELEPHONE_ || "N/A";

                    const popupContent = `
                        <div style="font-family: sans-serif;">
                            <h3 style="margin:0 0 5px; color:${config.color}">${name}</h3>
                            <strong>Type:</strong> ${config.name}<br>
                            <strong>Location:</strong> ${city}, ${county}<br>
                            <strong>Address:</strong> ${address}<br>
                            <strong>Phone:</strong> ${phone}
                        </div>
                    `;
                    layer.bindPopup(popupContent);

                    layer.bindTooltip(name, {
                        permanent: false,
                        direction: "top",
                        offset: [0, -10]
                    });

                }
            });

            // Add to map and storage
            layer.addTo(map);
            layerGroups[config.id] = layer;

            // Create Legend Item
            const item = document.createElement('div');
            item.className = 'legend-item';
            const icon = ICONS[config.id];

            item.innerHTML = icon
                ? `<img src="${icon.options.iconUrl}" class="legend-icon-img"> <span>${config.name}</span>`
                : `<div class="legend-icon" style="background-color: ${config.color}"></div><span>${config.name}</span>`;

            
            // Add Click Event to Toggle Layer
            item.addEventListener('click', () => {
                if (map.hasLayer(layer)) {
                    map.removeLayer(layer);
                    item.style.opacity = "0.5"; // Dim logic
                } else {
                    map.addLayer(layer);
                    item.style.opacity = "1";
                }
            });

            legendContainer.appendChild(item);

        } catch (error) {
            console.error(`Error loading ${config.name}:`, error);
        }
    }
}

    // 5. Initialize
    loadData();

    // Reset Button Logic
    const resetButton = document.getElementById('reset-view');
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            map.setView(PA_CENTER, INITIAL_ZOOM);
        });
    } else {
        console.warn('Reset button with ID "reset-view" not found.');
    }

    // Close the outer DOMContentLoaded listener
});