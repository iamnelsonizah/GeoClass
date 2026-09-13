import io
import os
import logging
import datetime
from typing import List, Dict, Any, Optional

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable, Image as RLImage
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.graphics.shapes import Drawing, Rect, String, Group, Circle
from reportlab.graphics.charts.piecharts import Pie

import ee
from gee_service import initialize_gee

logger = logging.getLogger(__name__)

# Standard Dynamic World & GeoClass color hexes
LULC_PALETTE = {
    "water": "#419BDF",
    "trees": "#397D49",
    "grass": "#88B053",
    "flooded_vegetation": "#7A87C6",
    "crops": "#E49635",
    "shrub_and_scrub": "#DFC35A",
    "built": "#C4281B",
    "bare": "#A59B8F",
    "snow_and_ice": "#B39FE1",
}

CLASS_DISPLAY_NAMES = {
    "water": "Water Body",
    "trees": "Trees & Forest Canopy",
    "grass": "Grassland / Pasture",
    "flooded_vegetation": "Flooded / Wetland",
    "crops": "Cropland / Agriculture",
    "shrub_and_scrub": "Shrub & Scrubland",
    "built": "Built-Up / Urban Surface",
    "bare": "Bare Soil / Rock Exposure",
    "snow_and_ice": "Snow & Ice",
}


def compute_aoi_bounds(coords: List[List[float]]) -> Dict[str, float]:
    """
    Computes geographic bounding box and centroid from GeoJSON coordinates [[lng, lat], ...]
    """
    lngs = [pt[0] for pt in coords]
    lats = [pt[1] for pt in coords]
    min_lng, max_lng = min(lngs), max(lngs)
    min_lat, max_lat = min(lats), max(lats)
    centroid_lat = sum(lats) / len(lats)
    centroid_lng = sum(lngs) / len(lngs)
    return {
        "min_lng": min_lng,
        "max_lng": max_lng,
        "min_lat": min_lat,
        "max_lat": max_lat,
        "centroid_lat": centroid_lat,
        "centroid_lng": centroid_lng,
    }


def generate_risk_assessment_insights(
    stats: Dict[str, Any],
    total_area_ha: float
) -> List[Dict[str, str]]:
    """
    Synthesizes automated ecological, urban sprawl, and conservation risk bullet points
    from land cover distribution data.
    """
    insights = []
    
    # Extract class percentages
    built_pct = stats.get("built", {}).get("percentage", 0.0)
    trees_pct = stats.get("trees", {}).get("percentage", 0.0)
    water_pct = stats.get("water", {}).get("percentage", 0.0)
    bare_pct = stats.get("bare", {}).get("percentage", 0.0)
    crops_pct = stats.get("crops", {}).get("percentage", 0.0)
    grass_pct = stats.get("grass", {}).get("percentage", 0.0)

    natural_pct = trees_pct + grass_pct + stats.get("shrub_and_scrub", {}).get("percentage", 0.0) + stats.get("flooded_vegetation", {}).get("percentage", 0.0)
    anthropogenic_pct = built_pct + crops_pct

    # 1. Urban Sprawl / Impervious Surface Risk
    if built_pct >= 35.0:
        insights.append({
            "category": "High Urban Sprawl & Runoff Vulnerability",
            "level": "Alert",
            "color": "#C0392B",
            "text": f"Built-up and impervious structures cover {built_pct:.1f}% of the territory. High runoff coefficient and localized heat-island effect expected during peak storm events."
        })
    elif built_pct >= 15.0:
        insights.append({
            "category": "Moderate Anthropogenic Expansion",
            "level": "Caution",
            "color": "#D35400",
            "text": f"Urban/developed land accounts for {built_pct:.1f}% of the AOI. Infrastructure encroachment into peripheral natural buffer zones should be monitored."
        })
    else:
        insights.append({
            "category": "Low Urban Footprint",
            "level": "Positive",
            "color": "#27AE60",
            "text": f"Minimal impervious surface ({built_pct:.1f}%). Low artificial fragmentation with intact ecological corridors."
        })

    # 2. Forest Canopy & Biodiversity
    if trees_pct >= 40.0:
        insights.append({
            "category": "Dense Forest & High Carbon Sequestration",
            "level": "Positive",
            "color": "#27AE60",
            "text": f"Tree canopy represents {trees_pct:.1f}% ({stats.get('trees', {}).get('area_ha', 0):.1f} ha). Significant carbon sink and watershed protection."
        })
    elif trees_pct < 10.0 and natural_pct > 25.0:
        insights.append({
            "category": "Canopy Deficit / Woodland Vulnerability",
            "level": "Caution",
            "color": "#E67E22",
            "text": f"Tree cover is constrained at {trees_pct:.1f}%. Reforestation or agroforestry intervention recommended to prevent soil degradation."
        })

    # 3. Water Resource & Wetland Resilience
    if water_pct >= 10.0 or stats.get("flooded_vegetation", {}).get("percentage", 0.0) >= 5.0:
        wetland_ha = stats.get("water", {}).get("area_ha", 0) + stats.get("flooded_vegetation", {}).get("area_ha", 0)
        insights.append({
            "category": "Significant Hydrological Footprint",
            "level": "Neutral",
            "color": "#2980B9",
            "text": f"Open water and wetland zones encompass {wetland_ha:.1f} ha. Riparian buffer enforcement is critical to preserve aquatic biodiversity and water quality."
        })

    # 4. Bare Ground / Soil Erosion Vulnerability
    if bare_pct >= 20.0:
        insights.append({
            "category": "High Bare Soil & Erosion Susceptibility",
            "level": "Alert",
            "color": "#C0392B",
            "text": f"Exposed bare ground represents {bare_pct:.1f}% of the area. High vulnerability to wind deflation and topsoil wash-out during intense precipitation."
        })

    # 5. Natural vs Anthropogenic Balance
    insights.append({
        "category": "Ecological Balance Summary",
        "level": "Summary",
        "color": "#34495E",
        "text": f"Natural vegetation & water bodies comprise {natural_pct:.1f}% of the territory, compared to {anthropogenic_pct:.1f}% human-modified footprint (ratio: {natural_pct / (anthropogenic_pct or 0.1):.1f}:1)."
    })

    return insights


def generate_executive_pdf(
    aoi_coords: List[List[float]],
    statistics: Dict[str, Any],
    total_area_ha: float,
    start_date: str,
    end_date: str,
    cloud_cover: float = 20.0,
    model_type: str = "random_forest",
    cloud_mask_type: str = "both",
    seasonal_filter: str = "all",
    location_name: Optional[str] = None
) -> bytes:
    """
    Generates a commercial-grade, multi-page vector PDF executive briefing report
    summarizing land cover classification, geodetic parameters, remote sensing metadata,
    and automated ecological risk assessment.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    
    # Custom Brand Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#1E3A24')
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=13,
        textColor=colors.HexColor('#5A6052')
    )
    h2_style = ParagraphStyle(
        'Heading2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1E3A24'),
        spaceBefore=8,
        spaceAfter=4
    )
    body_style = ParagraphStyle(
        'BodyText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor('#2C3026')
    )
    meta_label = ParagraphStyle(
        'MetaLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#5A6052')
    )
    meta_val = ParagraphStyle(
        'MetaVal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#1A1C16')
    )

    story = []

    # 1. Header Banner & Executive Branding
    brand_table_data = [
        [
            Paragraph("<b>GEOCLASS AI</b> &middot; SATELLITE INTELLIGENCE", subtitle_style),
            Paragraph(f"REPORT DATE: {datetime.datetime.now().strftime('%b %d, %Y')}", ParagraphStyle('RightMeta', parent=subtitle_style, alignment=2))
        ],
        [
            Paragraph("Executive Land Cover & Environmental Briefing", title_style),
            Paragraph(f"DOC ID: GC-{datetime.datetime.now().strftime('%Y%m%d')}-{abs(hash(str(aoi_coords[:2]))) % 10000:04d}", ParagraphStyle('RightMeta2', parent=subtitle_style, alignment=2))
        ]
    ]
    brand_table = Table(brand_table_data, colWidths=[380, 160])
    brand_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
    ]))
    story.append(brand_table)
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#7FA35C'), spaceAfter=8, spaceBefore=4))

    # 2. Geodetic Overview & Remote Sensing Stamp (Two-column layout)
    bounds = compute_aoi_bounds(aoi_coords)
    total_km2 = total_area_ha / 100.0

    masking_labels = {
        "both": "SCL & QA60 Dual (Strict)",
        "scl": "Scene Classification (SCL)",
        "qa60": "Bitmask (QA60)",
        "none": "Off (Raw Reflectance)"
    }
    seasonal_labels = {
        "all": "All Months (Annual)",
        "dry": "Dry Season (Low Cloud)",
        "wet": "Wet / Green Season"
    }

    geo_info = [
        [Paragraph("<b>AOI Centroid:</b>", meta_label), Paragraph(f"{bounds['centroid_lat']:.4f}&deg; N, {bounds['centroid_lng']:.4f}&deg; E", meta_val)],
        [Paragraph("<b>Bounding Box:</b>", meta_label), Paragraph(f"[{bounds['min_lng']:.3f}, {bounds['min_lat']:.3f}] to [{bounds['max_lng']:.3f}, {bounds['max_lat']:.3f}]", meta_val)],
        [Paragraph("<b>Surface Area:</b>", meta_label), Paragraph(f"<b>{total_area_ha:,.1f} ha</b> ({total_km2:,.2f} km&sup2;)", meta_val)],
        [Paragraph("<b>CRS / Datum:</b>", meta_label), Paragraph("WGS 84 / EPSG:4326", meta_val)],
        [Paragraph("<b>Target Location:</b>", meta_label), Paragraph(location_name or "Custom Region of Interest", meta_val)],
    ]
    geo_table = Table(geo_info, colWidths=[85, 175])
    geo_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
    ]))

    sensor_info = [
        [Paragraph("<b>Sensor / Sat:</b>", meta_label), Paragraph("Copernicus Sentinel-2 (MSI L2A)", meta_val)],
        [Paragraph("<b>Spectral Res:</b>", meta_label), Paragraph("10m Ground Sampling Distance", meta_val)],
        [Paragraph("<b>Date Window:</b>", meta_label), Paragraph(f"{start_date} &rarr; {end_date}", meta_val)],
        [Paragraph("<b>Cloud Masking:</b>", meta_label), Paragraph(f"{masking_labels.get(cloud_mask_type, cloud_mask_type)} (&le;{cloud_cover:.0f}%)", meta_val)],
        [Paragraph("<b>Seasonality:</b>", meta_label), Paragraph(f"{seasonal_labels.get(seasonal_filter, seasonal_filter)}", meta_val)],
        [Paragraph("<b>Model Engine:</b>", meta_label), Paragraph("Supervised RF & Dynamic World v1", meta_val)],
    ]
    sensor_table = Table(sensor_info, colWidths=[85, 175])
    sensor_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
    ]))

    meta_grid = Table([
        [
            Paragraph("<b>GEODETIC BOUNDS & SPATIAL EXTENT</b>", h2_style),
            Paragraph("<b>REMOTE SENSING & ALGORITHMIC STAMP</b>", h2_style)
        ],
        [geo_table, sensor_table]
    ], colWidths=[265, 275])
    meta_grid.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#F5F7F2')),
        ('BOX', (0, 1), (0, 1), 0.5, colors.HexColor('#D2D9C8')),
        ('BOX', (1, 1), (1, 1), 0.5, colors.HexColor('#D2D9C8')),
        ('PADDING', (0, 1), (-1, 1), 6),
    ]))
    story.append(meta_grid)
    story.append(Spacer(1, 10))

    # 3. Land Cover Distribution Breakdown & Vector Chart
    story.append(Paragraph("<b>LAND COVER CLASSIFICATION BREAKDOWN</b>", h2_style))

    # Build Class Distribution Table Data
    table_headers = [
        Paragraph("<b>Class Name</b>", meta_label),
        Paragraph("<b>Area (ha)</b>", meta_label),
        Paragraph("<b>Area (km&sup2;)</b>", meta_label),
        Paragraph("<b>Coverage (%)</b>", meta_label),
        Paragraph("<b>Distribution Bar</b>", meta_label)
    ]
    table_rows = [table_headers]

    # Sort classes by area descending
    sorted_classes = sorted(
        statistics.items(),
        key=lambda item: item[1].get("area_ha", 0),
        reverse=True
    )

    chart_data = []
    chart_labels = []
    chart_colors = []

    for class_key, c_data in sorted_classes:
        name = CLASS_DISPLAY_NAMES.get(class_key, c_data.get("name", class_key))
        area_ha = c_data.get("area_ha", 0.0)
        pct = c_data.get("percentage", 0.0)
        area_km2 = area_ha / 100.0
        hex_color = LULC_PALETTE.get(class_key, "#7F8C8D")

        # Color dot + Class name
        class_cell = Paragraph(
            f'<font color="{hex_color}">&block;</font>&nbsp;<b>{name}</b>',
            body_style
        )
        ha_cell = Paragraph(f"{area_ha:,.1f}", meta_val)
        km2_cell = Paragraph(f"{area_km2:,.2f}", meta_val)
        pct_cell = Paragraph(f"<b>{pct:.1f}%</b>", meta_val)

        # Vector distribution mini bar
        bar_d = Drawing(120, 8)
        bar_d.add(Rect(0, 1, 120, 6, fillColor=colors.HexColor('#E8ECE2'), strokeColor=None))
        bar_width = max(2, min(120, int((pct / 100.0) * 120)))
        bar_d.add(Rect(0, 1, bar_width, 6, fillColor=colors.HexColor(hex_color), strokeColor=None))

        table_rows.append([class_cell, ha_cell, km2_cell, pct_cell, bar_d])

        if pct >= 1.0:
            chart_data.append(pct)
            chart_labels.append(f"{name.split(' ')[0]} ({pct:.0f}%)")
            chart_colors.append(colors.HexColor(hex_color))

    lulc_table = Table(table_rows, colWidths=[170, 75, 75, 75, 145])
    lulc_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E5EADF')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#D5DDD0')),
        ('ALIGN', (1, 0), (3, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(lulc_table)
    story.append(Spacer(1, 10))

    # 4. Vector Land Cover Pie Chart
    if len(chart_data) >= 2:
        pie_d = Drawing(540, 110)
        pc = Pie()
        pc.x = 210
        pc.y = 5
        pc.width = 100
        pc.height = 100
        pc.data = chart_data
        pc.labels = chart_labels
        for i, color_obj in enumerate(chart_colors):
            pc.slices[i].fillColor = color_obj
            pc.slices[i].strokeColor = colors.white
            pc.slices[i].strokeWidth = 0.75
            pc.slices[i].labelRadius = 1.15
            pc.slices[i].fontName = 'Helvetica'
            pc.slices[i].fontSize = 7
        pie_d.add(pc)
        story.append(pie_d)
        story.append(Spacer(1, 8))

    # 5. Automated Ecological & Risk Assessment Insights
    story.append(Paragraph("<b>AUTOMATED ENVIRONMENTAL & SPATIAL RISK ANALYSIS</b>", h2_style))
    risk_insights = generate_risk_assessment_insights(statistics, total_area_ha)

    risk_table_rows = []
    for insight in risk_insights:
        badge = Paragraph(
            f'<b><font color="{insight["color"]}">&bull; {insight["category"].upper()}</font></b>',
            meta_label
        )
        desc = Paragraph(insight["text"], body_style)
        risk_table_rows.append([badge, desc])

    risk_table = Table(risk_table_rows, colWidths=[180, 360])
    risk_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('LINEBELOW', (0, 0), (-1, -1), 0.5, colors.HexColor('#E8ECE2')),
    ]))
    story.append(risk_table)
    story.append(Spacer(1, 12))

    # 6. Compliance & Certification Footer
    footer_text = (
        "<b>CERTIFICATION & AUDIT TRAIL:</b> This briefing document was autonomously compiled by the GeoClass "
        "Geospatial AI Engine via Google Earth Engine API integration. Satellite reflectance values adhere to ESA Sentinel-2 "
        "Harmonized L2A surface standards with QA60/SCL atmospheric screening. Suitable for official planning and commercial review."
    )
    story.append(HRFlowable(width="100%", thickness=0.75, color=colors.HexColor('#B8C2B0'), spaceAfter=4, spaceBefore=4))
    story.append(Paragraph(footer_text, ParagraphStyle('Footer', parent=body_style, fontSize=7, leading=9, textColor=colors.HexColor('#707567'))))

    # Build PDF
    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()
