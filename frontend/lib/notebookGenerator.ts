/**
 * GeoClass Jupyter Notebook (.ipynb) Generator
 * Creates an executable Python notebook with Folium, Earth Engine (geemap),
 * and Matplotlib for reproducible remote sensing research and publication-grade study area maps.
 */

export interface NotebookExportParams {
  title: string;
  coords: number[][];
  aoiAreaHa?: number | null;
  startDate: string;
  endDate: string;
  cloudCover: number;
  selectedSensor?: string;
  statistics?: Record<string, { area_ha: number; percentage: number; pixel_count: number }>;
  mapCenter: [number, number];
  mapZoom: number;
}

export function generateJupyterNotebook(params: NotebookExportParams): string {
  const {
    title,
    coords,
    aoiAreaHa,
    startDate,
    endDate,
    cloudCover,
    selectedSensor = 'sentinel2',
    statistics = {},
    mapCenter,
    mapZoom
  } = params;

  const aoiGeoJson = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          name: title,
          area_ha: aoiAreaHa || 0,
          start_date: startDate,
          end_date: endDate,
          sensor: selectedSensor === 'landsat' ? 'Landsat 8/9 OLI-2' : 'Sentinel-2 MSI Level-2A'
        },
        geometry: {
          type: "Polygon",
          coordinates: [coords]
        }
      }
    ]
  };

  const notebook = {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      kernelspec: {
        display_name: "Python 3 (ipykernel)",
        language: "python",
        name: "python3"
      },
      language_info: {
        codemirror_mode: {
          name: "ipython",
          version: 3
        },
        file_extension: ".py",
        mimetype: "text/x-python",
        name: "python",
        nbconvert_exporter: "python",
        pygments_lexer: "ipython3",
        version: "3.11.0"
      },
      geoclass_export: {
        exported_at: new Date().toISOString(),
        version: "2.5.0"
      }
    },
    cells: [
      {
        cell_type: "markdown",
        metadata: {},
        source: [
          `# ${title}\n`,
          `### GeoClass Earth Observation & Land Cover Study Area Analysis\n`,
          `\n`,
          `- **Sensor Platform**: ${selectedSensor === 'landsat' ? 'USGS Landsat 8/9 OLI-2' : 'ESA Copernicus Sentinel-2 MSI Level-2A'}\n`,
          `- **Acquisition Window**: ${startDate} → ${endDate}\n`,
          `- **Cloud Masking Tolerance**: < ${cloudCover}%\n`,
          `- **Calculated Area**: ${aoiAreaHa ? `${aoiAreaHa.toFixed(2)} ha (${(aoiAreaHa / 100).toFixed(2)} km²)` : 'Custom AOI'}\n`,
          `- **Coordinate Reference System**: EPSG:4326 (WGS 84)\n`,
          `\n`,
          `This notebook reproduces the spatial analysis, interactive **Folium** mapping, and publication-ready cartographic study area figures executed in **GeoClass**.\n`
        ]
      },
      {
        cell_type: "code",
        execution_count: null,
        metadata: {},
        outputs: [],
        source: [
          `# Cell 1: Environment Setup & Library Imports\n`,
          `# Run this cell to install and import required geospatial libraries\n`,
          `try:\n`,
          `    import folium\n`,
          `    import ee\n`,
          `    import geemap\n`,
          `    import geopandas as gpd\n`,
          `    import matplotlib.pyplot as plt\n`,
          `    from shapely.geometry import Polygon\n`,
          `except ImportError:\n`,
          `    !pip install folium geemap earthengine-api geopandas matplotlib shapely\n`,
          `    import folium\n`,
          `    import ee\n`,
          `    import geemap\n`,
          `    import geopandas as gpd\n`,
          `    import matplotlib.pyplot as plt\n`,
          `    from shapely.geometry import Polygon\n`,
          `\n`,
          `print("✓ Geospatial libraries imported successfully.")\n`
        ]
      },
      {
        cell_type: "code",
        execution_count: null,
        metadata: {},
        outputs: [],
        source: [
          `# Cell 2: Earth Engine Authentication & AOI Boundary\n`,
          `try:\n`,
          `    ee.Initialize()\n`,
          `    print("✓ Google Earth Engine initialized.")\n`,
          `except Exception as e:\n`,
          `    print("Authenticating Google Earth Engine...")\n`,
          `    ee.Authenticate()\n`,
          `    ee.Initialize()\n`,
          `\n`,
          `# Define Study Area Polygon Geometry from GeoClass Session\n`,
          `aoi_coordinates = ${JSON.stringify(coords)}\n`,
          `ee_geometry = ee.Geometry.Polygon(aoi_coordinates)\n`,
          `\n`,
          `# Create GeoPandas GeoDataFrame\n`,
          `aoi_polygon = Polygon(aoi_coordinates)\n`,
          `gdf_aoi = gpd.GeoDataFrame([{'name': '${title}', 'area_ha': ${aoiAreaHa || 0}}], geometry=[aoi_polygon], crs="EPSG:4326")\n`,
          `print(f"✓ Study area defined: {gdf_aoi.shape[0]} polygon feature, centroid: {gdf_aoi.geometry.centroid.iloc[0]}")\n`
        ]
      },
      {
        cell_type: "code",
        execution_count: null,
        metadata: {},
        outputs: [],
        source: [
          `# Cell 3: Interactive Folium Map with Sentinel-2 & Classification Overlays\n`,
          `map_center = [${mapCenter[0]}, ${mapCenter[1]}]\n`,
          `m = folium.Map(location=map_center, zoom_start=${mapZoom}, tiles=None)\n`,
          `\n`,
          `# Base Layers\n`,
          `folium.TileLayer(\n`,
          `    tiles="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",\n`,
          `    attr="Esri World Imagery",\n`,
          `    name="Satellite Imagery (Esri)",\n`,
          `    overlay=False,\n`,
          `    control=True\n`,
          `).add_to(m)\n`,
          `\n`,
          `folium.TileLayer(\n`,
          `    tiles="OpenStreetMap",\n`,
          `    name="OpenStreetMap",\n`,
          `    overlay=False,\n`,
          `    control=True\n`,
          `).add_to(m)\n`,
          `\n`,
          `# Add Study Area Vector Boundary Outline\n`,
          `folium.GeoJson(\n`,
          `    gdf_aoi,\n`,
          `    name="Study Area Boundary",\n`,
          `    style_function=lambda x: {\n`,
          `        'fillColor': '#D9622B',\n`,
          `        'color': '#D9622B',\n`,
          `        'weight': 3,\n`,
          `        'fillOpacity': 0.15\n`,
          `    }\n`,
          `).add_to(m)\n`,
          `\n`,
          `# Add Cartographic Centroid Marker\n`,
          `folium.Marker(\n`,
          `    location=map_center,\n`,
          `    popup=folium.Popup(f"<b>${title}</b><br>Area: ${aoiAreaHa ? aoiAreaHa.toFixed(1) : '—'} ha", max_width=300),\n`,
          `    tooltip="${title} Centroid",\n`,
          `    icon=folium.Icon(color="red", icon="info-sign")\n`,
          `).add_to(m)\n`,
          `\n`,
          `folium.LayerControl(position="topright").add_to(m)\n`,
          `m\n`
        ]
      },
      {
        cell_type: "code",
        execution_count: null,
        metadata: {},
        outputs: [],
        source: [
          `# Cell 4: Publication-Grade Study Area Map with Matplotlib & Coordinate Graticules\n`,
          `fig, ax = plt.subplots(figsize=(10, 8), dpi=300)\n`,
          `\n`,
          `# Plot Study Area Boundary\n`,
          `gdf_aoi.boundary.plot(ax=ax, color='#D9622B', linewidth=2.5, label='Study Area Extent')\n`,
          `gdf_aoi.plot(ax=ax, color='#D9622B', alpha=0.15)\n`,
          `\n`,
          `# Map Styling\n`,
          `ax.set_title('${title} — Study Area Map\\nSentinel-2 MSI Level-2A (${startDate} to ${endDate})', fontsize=13, fontweight='bold', pad=15)\n`,
          `ax.set_xlabel('Longitude (°E)', fontsize=10, fontweight='semibold')\n`,
          `ax.set_ylabel('Latitude (°N)', fontsize=10, fontweight='semibold')\n`,
          `ax.grid(True, linestyle='--', alpha=0.5, color='#888888')\n`,
          `\n`,
          `# Add North Arrow Annotation\n`,
          `x, y, arrow_length = 0.95, 0.95, 0.08\n`,
          `ax.annotate('N', xy=(x, y), xytext=(x, y - arrow_length),\n`,
          `            arrowprops=dict(facecolor='black', width=3, headwidth=10),\n`,
          `            ha='center', va='center', fontsize=12, fontweight='bold',\n`,
          `            xycoords=ax.transAxes)\n`,
          `\n`,
          `plt.tight_layout()\n`,
          `plt.savefig('study_area_map.png', dpi=300, bbox_inches='tight')\n`,
          `plt.show()\n`,
          `print("✓ Saved high-resolution publication map to study_area_map.png (300 DPI).")\n`
        ]
      },
      {
        cell_type: "code",
        execution_count: null,
        metadata: {},
        outputs: [],
        source: [
          `# Cell 5: Land Cover Statistics Table & Area Distribution Chart\n`,
          `stats_data = ${JSON.stringify(statistics, null, 2)}\n`,
          `\n`,
          `if stats_data:\n`,
          `    import pandas as pd\n`,
          `    df_stats = pd.DataFrame.from_dict(stats_data, orient='index')\n`,
          `    df_stats.index.name = 'Class'\n`,
          `    df_stats = df_stats.reset_index()\n`,
          `    \n`,
          `    print("=== GeoClass Classification Summary ===")\n`,
          `    display(df_stats)\n`,
          `    \n`,
          `    # Plot Bar Chart\n`,
          `    plt.figure(figsize=(9, 4), dpi=150)\n`,
          `    bars = plt.bar(df_stats['Class'], df_stats['area_ha'], color='#306840', edgecolor='#1F2C33')\n`,
          `    plt.title('${title} — Land Cover Class Distribution (Hectares)', fontsize=12, fontweight='bold')\n`,
          `    plt.ylabel('Area (ha)', fontsize=10)\n`,
          `    plt.xticks(rotation=30, ha='right', fontsize=9)\n`,
          `    plt.grid(axis='y', linestyle='--', alpha=0.5)\n`,
          `    plt.tight_layout()\n`,
          `    plt.show()\n`,
          `else:\n`,
          `    print("No classification statistics recorded for this session.")\n`
        ]
      }
    ]
  };

  return JSON.stringify(notebook, null, 2);
}
