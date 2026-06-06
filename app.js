"""
╔══════════════════════════════════════════════════════════════════════╗
║        ETHEREUM FRAUD INTELLIGENCE DASHBOARD  v2.0                  ║
║        Production-Ready | DynamoDB Live Stream | Leaflet Maps        ║
╚══════════════════════════════════════════════════════════════════════╝

Requirements:
    pip install streamlit boto3 pandas plotly requests python-dotenv

Run:
    streamlit run dashboard.py
"""

import json
import math
import time
import traceback
from datetime import datetime, timezone
from decimal import Decimal

import boto3
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import requests
import streamlit as st
import streamlit.components.v1 as components
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError, NoCredentialsError

# ─────────────────────────────────────────────────────────────────────────────
# PAGE CONFIG  (must be first Streamlit call)
# ─────────────────────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="ETH Fraud Intelligence",
    page_icon="🔐",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# ─────────────────────────────────────────────────────────────────────────────
# GLOBAL CSS  – high-end corporate daytime theme
# ─────────────────────────────────────────────────────────────────────────────
st.markdown(
    """
<style>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Sora:wght@300;400;600;700&display=swap');

/* ── Reset & root ── */
:root {
    --bg:         #F4F6FA;
    --surface:    #FFFFFF;
    --surface2:   #EEF1F8;
    --border:     #D8DDE8;
    --accent:     #1A56DB;
    --accent2:    #E53E3E;
    --accent3:    #D97706;
    --text:       #111827;
    --text2:      #4B5563;
    --text3:      #9CA3AF;
    --green:      #059669;
    --mono:       'IBM Plex Mono', monospace;
    --sans:       'Sora', sans-serif;
    --radius:     10px;
    --shadow:     0 2px 12px rgba(0,0,0,0.08);
    --shadow-lg:  0 8px 32px rgba(0,0,0,0.12);
}

html, body, [data-testid="stAppViewContainer"] {
    background: var(--bg) !important;
    font-family: var(--sans);
    color: var(--text);
}

[data-testid="stHeader"] { background: transparent !important; }
[data-testid="stToolbar"] { display: none; }
.block-container { padding: 1.2rem 2rem 2rem !important; max-width: 100% !important; }

/* ── Metric cards ── */
.stat-ribbon {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 14px;
    margin-bottom: 1.4rem;
}
.stat-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px 20px;
    box-shadow: var(--shadow);
    position: relative;
    overflow: hidden;
}
.stat-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    border-radius: var(--radius) var(--radius) 0 0;
}
.stat-card.blue::before  { background: var(--accent); }
.stat-card.red::before   { background: var(--accent2); }
.stat-card.amber::before { background: var(--accent3); }
.stat-card.green::before { background: var(--green); }
.stat-card.gray::before  { background: var(--text3); }

.stat-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text2);
    margin-bottom: 6px;
}
.stat-value {
    font-family: var(--mono);
    font-size: 26px;
    font-weight: 600;
    color: var(--text);
    line-height: 1.1;
}
.stat-sub {
    font-size: 11px;
    color: var(--text3);
    margin-top: 4px;
    font-family: var(--mono);
}
.badge-live {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    padding: 3px 10px;
    border-radius: 20px;
    margin-top: 6px;
}
.badge-live.online  { background:#DCFCE7; color:#166534; border:1px solid #BBF7D0; }
.badge-live.offline { background:#FEE2E2; color:#991B1B; border:1px solid #FECACA; }
.pulse { width:7px; height:7px; border-radius:50%; }
.pulse.green { background:#22C55E; animation: pulse 1.4s infinite; }
.pulse.red   { background:#EF4444; }
@keyframes pulse {
    0%,100% { opacity:1; transform:scale(1); }
    50%      { opacity:.5; transform:scale(1.3); }
}

/* ── Section headers ── */
.section-header {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--text2);
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 2px solid var(--border);
}
.section-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: var(--accent); flex-shrink: 0;
}

/* ── Audit feed cards ── */
.audit-feed {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-height: 560px;
    overflow-y: auto;
    padding-right: 4px;
}
.audit-feed::-webkit-scrollbar { width: 5px; }
.audit-feed::-webkit-scrollbar-track { background: var(--surface2); border-radius:4px; }
.audit-feed::-webkit-scrollbar-thumb { background: var(--border); border-radius:4px; }

.audit-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-left: 4px solid var(--accent2);
    border-radius: var(--radius);
    padding: 12px 14px;
    box-shadow: var(--shadow);
    font-size: 12px;
    line-height: 1.6;
}
.audit-card.whale { border-left-color: var(--accent3); }
.tx-hash {
    font-family: var(--mono);
    font-size: 10.5px;
    color: var(--accent);
    word-break: break-all;
    font-weight: 600;
    margin-bottom: 4px;
}
.wallet {
    font-family: var(--mono);
    font-size: 10px;
    color: var(--text2);
    word-break: break-all;
}
.addr-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--text3);
}
.geo-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 2px 7px;
    font-size: 10px;
    font-weight: 600;
    color: var(--text2);
    margin-top: 4px;
}
.value-badge {
    display: inline-block;
    background: #FEF3C7;
    border: 1px solid #FDE68A;
    color: #92400E;
    border-radius: 4px;
    padding: 1px 7px;
    font-size: 10.5px;
    font-weight: 700;
    font-family: var(--mono);
}
.value-badge.whale {
    background: #FEE2E2;
    border-color: #FECACA;
    color: #991B1B;
}
.ai-block {
    margin-top: 8px;
    background: #F0F4FF;
    border: 1px solid #C7D7FD;
    border-radius: 6px;
    padding: 7px 10px;
    font-size: 11px;
    color: #1E3A8A;
    line-height: 1.5;
}
.ai-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #3B82F6;
    margin-bottom: 3px;
}
.timestamp-tag {
    font-family: var(--mono);
    font-size: 10px;
    color: var(--text3);
}

/* ── Chart containers ── */
.chart-container {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px;
    box-shadow: var(--shadow);
}

/* ── Data table ── */
.stDataFrame { border-radius: var(--radius) !important; }
[data-testid="stDataFrameContainer"] {
    border: 1px solid var(--border) !important;
    border-radius: var(--radius) !important;
    box-shadow: var(--shadow) !important;
}

/* ── Streamlit widget overrides ── */
.stTextInput > div > div > input {
    background: var(--surface) !important;
    border: 1px solid var(--border) !important;
    border-radius: 8px !important;
    color: var(--text) !important;
    font-family: var(--mono) !important;
    font-size: 12px !important;
}
.stSelectbox > div > div {
    background: var(--surface) !important;
    border: 1px solid var(--border) !important;
}
.stButton > button {
    background: var(--accent) !important;
    color: #fff !important;
    border: none !important;
    border-radius: 8px !important;
    font-family: var(--sans) !important;
    font-weight: 600 !important;
}
div[data-testid="stMetric"] {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 12px 16px;
}

/* ── Divider ── */
hr { border-color: var(--border) !important; margin: 1.4rem 0 !important; }

/* ── Page title bar ── */
.title-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.4rem;
    padding-bottom: 12px;
    border-bottom: 2px solid var(--border);
}
.title-main {
    font-size: 20px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.02em;
}
.title-sub {
    font-size: 12px;
    color: var(--text2);
    margin-top: 2px;
    font-family: var(--mono);
}
.refresh-info {
    font-size: 11px;
    color: var(--text3);
    font-family: var(--mono);
}
</style>
""",
    unsafe_allow_html=True,
)

# ─────────────────────────────────────────────────────────────────────────────
# CONSTANTS & CONFIG
# ─────────────────────────────────────────────────────────────────────────────
DYNAMO_TABLE   = "crypto-fraud-alerts"
AWS_REGION     = "us-east-1"          # ← change if needed
REFRESH_SECS   = 10                   # auto-refresh interval
WHALE_THRESHOLD = 50.0                # ETH
COINBASE_URL   = "https://api.coinbase.com/v2/prices/ETH-USD/spot"
MAX_AUDIT_CARDS = 30                  # cards shown in feed


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS – safe type conversion
# ─────────────────────────────────────────────────────────────────────────────
def safe_float(val, default=0.0) -> float:
    """Convert any DynamoDB value (str, Decimal, float, None) to float safely."""
    if val is None:
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def safe_str(val, default="—") -> str:
    if val is None or str(val).strip() == "":
        return default
    return str(val).strip()


def truncate(s: str, n: int = 18) -> str:
    s = safe_str(s)
    return s if len(s) <= n else f"{s[:n]}…"


def fmt_eth(val) -> str:
    v = safe_float(val)
    return f"{v:,.4f} ETH"


def fmt_gwei(val) -> str:
    v = safe_float(val)
    return f"{v:,.2f} Gwei"


def is_whale(val) -> bool:
    return safe_float(val) >= WHALE_THRESHOLD


# ─────────────────────────────────────────────────────────────────────────────
# DYNAMODB  – connection & data fetch
# ─────────────────────────────────────────────────────────────────────────────
@st.cache_resource(show_spinner=False)
def get_dynamodb_table():
    """Return a DynamoDB Table resource; raises on auth failure."""
    dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
    return dynamodb.Table(DYNAMO_TABLE)


def fetch_all_records(table) -> list[dict]:
    """Full table scan with pagination."""
    items = []
    try:
        resp = table.scan()
        items.extend(resp.get("Items", []))
        while "LastEvaluatedKey" in resp:
            resp = table.scan(ExclusiveStartKey=resp["LastEvaluatedKey"])
            items.extend(resp.get("Items", []))
    except ClientError as e:
        st.error(f"DynamoDB ClientError: {e.response['Error']['Message']}")
    except Exception as e:
        st.error(f"Unexpected fetch error: {e}")
    return items


def records_to_df(items: list[dict]) -> pd.DataFrame:
    """Normalise raw DynamoDB items into a typed DataFrame."""
    rows = []
    for item in items:
        try:
            row = {
                "transaction_hash": safe_str(item.get("transaction_hash")),
                "timestamp":        safe_str(item.get("timestamp")),
                "from_address":     safe_str(item.get("from_address")),
                "to_address":       safe_str(item.get("to_address")),
                "value_eth":        safe_float(item.get("value_eth")),
                "gas_price_gwei":   safe_float(item.get("gas_price_gwei")),
                "sender_lat":       safe_float(item.get("sender_lat"),  default=math.nan),
                "sender_lon":       safe_float(item.get("sender_lon"),  default=math.nan),
                "sender_city":      safe_str(item.get("sender_city")),
                "sender_country":   safe_str(item.get("sender_country")),
                "lat":              safe_float(item.get("lat"),         default=math.nan),
                "lon":              safe_float(item.get("lon"),         default=math.nan),
                "node_city":        safe_str(item.get("node_city")),
                "node_country":     safe_str(item.get("node_country")),
                "node_ip":          safe_str(item.get("node_ip")),
                "node_isp":         safe_str(item.get("node_isp")),
                "ai_analysis":      safe_str(item.get("ai_analysis")),
                "is_whale":         safe_float(item.get("value_eth")) >= WHALE_THRESHOLD,
            }
            rows.append(row)
        except Exception:
            pass  # silently skip malformed records
    df = pd.DataFrame(rows)
    if not df.empty and "timestamp" in df.columns:
        df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce", utc=True)
        df = df.sort_values("timestamp", ascending=False)
    return df


# ─────────────────────────────────────────────────────────────────────────────
# COINBASE PRICE FETCH
# ─────────────────────────────────────────────────────────────────────────────
@st.cache_data(ttl=60, show_spinner=False)
def fetch_eth_price() -> tuple[float, bool]:
    """Return (price_usd, success_bool)."""
    try:
        r = requests.get(COINBASE_URL, timeout=5)
        r.raise_for_status()
        price = float(r.json()["data"]["amount"])
        return price, True
    except Exception:
        return 0.0, False


# ─────────────────────────────────────────────────────────────────────────────
# LEAFLET MAP  – full HTML/JS component with arc animations
# ─────────────────────────────────────────────────────────────────────────────
def build_map_html(df: pd.DataFrame, height: int = 560) -> str:
    """
    Generate a self-contained Leaflet HTML component.
    Each row in df that has valid coords fires an animated arc
    (particle meteor) from sender → receiver, then drops a red marker.
    """
    # Build JSON payload – only rows with valid coords
    geo_df = df.dropna(subset=["sender_lat", "sender_lon", "lat", "lon"]).copy()
    geo_df = geo_df[
        geo_df["sender_lat"].between(-90, 90)
        & geo_df["sender_lon"].between(-180, 180)
        & geo_df["lat"].between(-90, 90)
        & geo_df["lon"].between(-180, 180)
    ]

    transactions = []
    for _, row in geo_df.iterrows():
        transactions.append({
            "hash":           row["transaction_hash"],
            "from_addr":      row["from_address"],
            "to_addr":        row["to_address"],
            "value_eth":      round(safe_float(row["value_eth"]), 6),
            "gas_price_gwei": round(safe_float(row["gas_price_gwei"]), 4),
            "sender_lat":     row["sender_lat"],
            "sender_lon":     row["sender_lon"],
            "sender_city":    row["sender_city"],
            "sender_country": row["sender_country"],
            "lat":            row["lat"],
            "lon":            row["lon"],
            "node_city":      row["node_city"],
            "node_country":   row["node_country"],
            "node_ip":        row["node_ip"],
            "node_isp":       row["node_isp"],
            "ai_analysis":    row["ai_analysis"],
            "timestamp":      str(row["timestamp"]),
            "is_whale":       bool(row["is_whale"]),
        })

    tx_json = json.dumps(transactions)

    html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<link rel="stylesheet"
  href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  * {{ margin:0; padding:0; box-sizing:border-box; }}
  html, body, #map {{ width:100%; height:{height}px; font-family:'Sora',sans-serif; }}

  /* ── Tooltip ── */
  .tx-tooltip {{
    background:#fff;
    border:1.5px solid #D8DDE8;
    border-radius:10px;
    padding:14px 16px;
    min-width:310px;
    max-width:380px;
    box-shadow:0 8px 32px rgba(0,0,0,0.14);
    font-size:12px;
    line-height:1.7;
    color:#111827;
  }}
  .tx-tooltip .tt-hash {{
    font-family:'IBM Plex Mono',monospace;
    font-size:10px;
    word-break:break-all;
    color:#1A56DB;
    font-weight:600;
    margin-bottom:8px;
    border-bottom:1px solid #EEF1F8;
    padding-bottom:6px;
  }}
  .tx-tooltip .tt-row {{
    display:flex;
    gap:6px;
    margin-bottom:3px;
  }}
  .tx-tooltip .tt-label {{
    font-size:10px;
    font-weight:700;
    text-transform:uppercase;
    letter-spacing:0.07em;
    color:#9CA3AF;
    min-width:72px;
    flex-shrink:0;
  }}
  .tx-tooltip .tt-val {{
    font-family:'IBM Plex Mono',monospace;
    font-size:10.5px;
    word-break:break-all;
    color:#111827;
  }}
  .tx-tooltip .tt-ai {{
    margin-top:8px;
    background:#F0F4FF;
    border:1px solid #C7D7FD;
    border-radius:6px;
    padding:7px 10px;
    font-size:11px;
    color:#1E3A8A;
    line-height:1.5;
  }}
  .tx-tooltip .tt-badge {{
    display:inline-block;
    background:#FEE2E2;
    border:1px solid #FECACA;
    color:#991B1B;
    border-radius:4px;
    padding:0 6px;
    font-size:10px;
    font-weight:700;
    margin-left:6px;
    vertical-align:middle;
  }}

  /* ── Animated arc canvas ── */
  #arc-canvas {{
    position:absolute;
    top:0; left:0;
    width:100%; height:{height}px;
    pointer-events:none;
    z-index:500;
  }}
</style>
</head>
<body>
<div style="position:relative;">
  <div id="map"></div>
  <canvas id="arc-canvas"></canvas>
</div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
// ── Data ──────────────────────────────────────────────────────────────────
const TRANSACTIONS = {tx_json};
const WHALE_THRESHOLD = 50;

// ── Map init ─────────────────────────────────────────────────────────────
const map = L.map('map', {{ zoomControl:true, attributionControl:true }})
            .setView([20, 10], 2);

L.tileLayer(
  'https://{{s}}.basemaps.cartocdn.com/rastertiles/voyager/{{z}}/{{x}}/{{y}}{{r}}.png',
  {{
    attribution:'&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap contributors',
    subdomains:'abcd',
    maxZoom:19
  }}
).addTo(map);

// ── Canvas arc engine ─────────────────────────────────────────────────────
const canvas  = document.getElementById('arc-canvas');
const ctx     = canvas.getContext('2d');
let   animations = [];   // active arc animations
let   raf;

function resizeCanvas() {{
  canvas.width  = map.getContainer().offsetWidth;
  canvas.height = map.getContainer().offsetHeight;
}}
resizeCanvas();
map.on('resize', resizeCanvas);
map.on('move',   resizeCanvas);
map.on('zoom',   resizeCanvas);

function latLngToCanvas(lat, lng) {{
  const pt  = map.latLngToContainerPoint([lat, lng]);
  return {{ x: pt.x, y: pt.y }};
}}

// Cubic bezier arc midpoint lifted above the chord
function bezierPoint(p0, p1, t) {{
  const mx  = (p0.x + p1.x) / 2;
  const my  = (p0.y + p1.y) / 2;
  const dx  = p1.x - p0.x;
  const dy  = p1.y - p0.y;
  const len = Math.sqrt(dx*dx + dy*dy);
  // Control point elevated perpendicular to mid
  const ctrl = {{ x: mx - dy*0.45, y: my + dx*0.45 - len*0.38 }};
  return {{
    x: (1-t)*(1-t)*p0.x + 2*(1-t)*t*ctrl.x + t*t*p1.x,
    y: (1-t)*(1-t)*p0.y + 2*(1-t)*t*ctrl.y + t*t*p1.y,
  }};
}}

function renderLoop() {{
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  animations = animations.filter(a => a.progress <= 1.02);

  for (const arc of animations) {{
    arc.progress += arc.speed;
    const t = Math.min(arc.progress, 1);

    const src = latLngToCanvas(arc.srcLat, arc.srcLng);
    const dst = latLngToCanvas(arc.dstLat, arc.dstLng);

    // Draw trail (faded path behind head)
    const trailLen = 0.18;
    const trailStart = Math.max(0, t - trailLen);
    const steps = 28;
    for (let i = 0; i < steps; i++) {{
      const ta = trailStart + (t - trailStart) * (i / steps);
      const tb = trailStart + (t - trailStart) * ((i+1) / steps);
      const pa = bezierPoint(src, dst, ta);
      const pb = bezierPoint(src, dst, tb);
      const alpha = (i / steps) * 0.85;
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.strokeStyle = arc.isWhale
        ? `rgba(217,119,6,${{alpha}})`
        : `rgba(26,86,219,${{alpha}})`;
      ctx.lineWidth = arc.isWhale ? 2.8 : 2.2;
      ctx.stroke();
    }}

    // Draw head glow
    const head = bezierPoint(src, dst, t);
    const grad = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, arc.isWhale ? 14 : 11);
    if (arc.isWhale) {{
      grad.addColorStop(0,   'rgba(251,191,36,0.95)');
      grad.addColorStop(0.4, 'rgba(245,158,11,0.6)');
      grad.addColorStop(1,   'rgba(217,119,6,0)');
    }} else {{
      grad.addColorStop(0,   'rgba(99,179,237,0.95)');
      grad.addColorStop(0.4, 'rgba(59,130,246,0.55)');
      grad.addColorStop(1,   'rgba(26,86,219,0)');
    }}
    ctx.beginPath();
    ctx.arc(head.x, head.y, arc.isWhale ? 14 : 11, 0, Math.PI*2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Inner bright core
    ctx.beginPath();
    ctx.arc(head.x, head.y, arc.isWhale ? 4 : 3, 0, Math.PI*2);
    ctx.fillStyle = arc.isWhale ? '#FEF3C7' : '#EFF6FF';
    ctx.fill();

    // Impact flash when arc completes
    if (t >= 1 && !arc.impactDrawn) {{
      arc.impactDrawn = true;
      drawImpact(dst, arc.isWhale);
    }}
  }}

  raf = requestAnimationFrame(renderLoop);
}}

function drawImpact(pt, isWhale) {{
  // Ripple ring expanding from impact point
  let r = 4, maxR = isWhale ? 55 : 40, opacity = 0.9;
  const color = isWhale ? '217,119,6' : '229,62,62';
  function ring() {{
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, r, 0, Math.PI*2);
    ctx.strokeStyle = `rgba(${{color}},${{opacity}})`;
    ctx.lineWidth = isWhale ? 2.5 : 2;
    ctx.stroke();
    r       += isWhale ? 2.5 : 2;
    opacity -= 0.045;
    if (r < maxR) requestAnimationFrame(ring);
  }}
  ring();
}}

renderLoop();

// ── Markers & tooltip ─────────────────────────────────────────────────────
const receiverLayer = L.layerGroup().addTo(map);
const senderLayer   = L.layerGroup().addTo(map);

function makeTooltipHTML(tx) {{
  const wb = tx.is_whale ? '<span class="tt-badge">🐋 WHALE</span>' : '';
  return `
  <div class="tx-tooltip">
    <div class="tt-hash">⬡ ${{tx.hash}} ${{wb}}</div>
    <div class="tt-row"><span class="tt-label">FROM</span><span class="tt-val">${{tx.from_addr}}</span></div>
    <div class="tt-row"><span class="tt-label">TO</span><span class="tt-val">${{tx.to_addr}}</span></div>
    <div class="tt-row"><span class="tt-label">VALUE</span><span class="tt-val">${{tx.value_eth.toFixed(6)}} ETH</span></div>
    <div class="tt-row"><span class="tt-label">GAS</span><span class="tt-val">${{tx.gas_price_gwei.toFixed(4)}} Gwei</span></div>
    <div class="tt-row"><span class="tt-label">SENDER</span><span class="tt-val">📍 ${{tx.sender_city}}, ${{tx.sender_country}}</span></div>
    <div class="tt-row"><span class="tt-label">RECEIVER</span><span class="tt-val">🎯 ${{tx.node_city}}, ${{tx.node_country}}</span></div>
    <div class="tt-row"><span class="tt-label">NODE IP</span><span class="tt-val">${{tx.node_ip}}</span></div>
    <div class="tt-row"><span class="tt-label">ISP</span><span class="tt-val">${{tx.node_isp}}</span></div>
    <div class="tt-row"><span class="tt-label">TIME</span><span class="tt-val">${{tx.timestamp}}</span></div>
    <div class="tt-ai"><strong style="font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:#3B82F6">AI Analysis</strong><br>${{tx.ai_analysis}}</div>
  </div>`;
}}

const senderIcon   = L.divIcon({{
  html: `<div style="width:10px;height:10px;background:#1A56DB;border:2px solid #fff;border-radius:50%;box-shadow:0 0 6px rgba(26,86,219,.5)"></div>`,
  className:'', iconSize:[10,10], iconAnchor:[5,5]
}});

function receiverIcon(isWhale) {{
  const c = isWhale ? '#D97706' : '#E53E3E';
  const glow = isWhale ? 'rgba(217,119,6,.45)' : 'rgba(229,62,62,.45)';
  return L.divIcon({{
    html: `<div style="width:14px;height:14px;background:${{c}};border:2.5px solid #fff;border-radius:50%;box-shadow:0 0 10px ${{glow}}"></div>`,
    className:'', iconSize:[14,14], iconAnchor:[7,7]
  }});
}}

function addTransaction(tx, delay) {{
  setTimeout(() => {{
    // Enqueue arc animation
    animations.push({{
      srcLat:tx.sender_lat, srcLng:tx.sender_lon,
      dstLat:tx.lat,        dstLng:tx.lon,
      progress:0,
      speed: 0.006 + Math.random()*0.003,
      isWhale: tx.is_whale,
      impactDrawn: false,
    }});

    // Sender marker
    const sm = L.marker([tx.sender_lat, tx.sender_lon], {{ icon:senderIcon }})
                .bindPopup(makeTooltipHTML(tx), {{ maxWidth:400, className:'tx-popup' }});
    senderLayer.addLayer(sm);

    // Receiver marker appears after arc lands (~speed 0.007 → ~143 frames → ~2.4s)
    const landMs = Math.round(1 / 0.007 * (1000/60));
    setTimeout(() => {{
      const rm = L.marker([tx.lat, tx.lon], {{ icon:receiverIcon(tx.is_whale) }})
                  .bindPopup(makeTooltipHTML(tx), {{ maxWidth:400 }});
      receiverLayer.addLayer(rm);
    }}, landMs);

  }}, delay);
}}

// Fire all transactions with staggered delays for cinematic effect
TRANSACTIONS.forEach((tx, i) => {{
  addTransaction(tx, i * 120);
}});
</script>
</body>
</html>"""
    return html


# ─────────────────────────────────────────────────────────────────────────────
# AUDIT FEED CARD  – one card per transaction
# ─────────────────────────────────────────────────────────────────────────────
def render_audit_card(row: dict) -> str:
    whale_cls  = "whale" if row.get("is_whale") else ""
    val_cls    = "whale" if row.get("is_whale") else ""
    whale_flag = "🐋 WHALE ALERT &nbsp;" if row.get("is_whale") else ""
    ts = row.get("timestamp", "")
    ts_str = ts.strftime("%Y-%m-%d %H:%M:%S UTC") if hasattr(ts, "strftime") else str(ts)[:25]

    return f"""
<div class="audit-card {whale_cls}">
  <div class="tx-hash">{whale_flag}{safe_str(row.get('transaction_hash'))}</div>
  <div class="addr-label">FROM</div>
  <div class="wallet">{safe_str(row.get('from_address'))}</div>
  <div class="addr-label" style="margin-top:4px">TO</div>
  <div class="wallet">{safe_str(row.get('to_address'))}</div>
  <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:6px;align-items:center">
    <span class="value-badge {val_cls}">{fmt_eth(row.get('value_eth'))}</span>
    <span class="value-badge" style="background:#F0FDF4;border-color:#BBF7D0;color:#166534">{fmt_gwei(row.get('gas_price_gwei'))}</span>
    <span class="geo-tag">📍 {safe_str(row.get('sender_city'))}, {safe_str(row.get('sender_country'))}</span>
    <span style="font-size:12px;color:#9CA3AF">→</span>
    <span class="geo-tag">🎯 {safe_str(row.get('node_city'))}, {safe_str(row.get('node_country'))}</span>
  </div>
  <div class="ai-block">
    <div class="ai-label">AI Analysis</div>
    {safe_str(row.get('ai_analysis'))}
  </div>
  <div class="timestamp-tag" style="margin-top:6px">{ts_str}</div>
</div>"""


# ─────────────────────────────────────────────────────────────────────────────
# CHARTS
# ─────────────────────────────────────────────────────────────────────────────
CHART_LAYOUT = dict(
    plot_bgcolor="#FFFFFF",
    paper_bgcolor="#FFFFFF",
    font=dict(family="Sora, sans-serif", color="#111827", size=11),
    margin=dict(l=10, r=10, t=30, b=10),
    height=280,
)


def gas_trend_chart(df: pd.DataFrame) -> go.Figure:
    if df.empty or "timestamp" not in df.columns:
        return go.Figure(layout=CHART_LAYOUT)
    tmp = df[df["gas_price_gwei"].notna()].copy()
    tmp = tmp.sort_values("timestamp")
    tmp["ts_str"] = tmp["timestamp"].dt.strftime("%H:%M:%S")
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=tmp["ts_str"], y=tmp["gas_price_gwei"],
        mode="lines+markers",
        line=dict(color="#1A56DB", width=2),
        marker=dict(size=4, color="#1A56DB"),
        fill="tozeroy",
        fillcolor="rgba(26,86,219,0.07)",
        name="Gas Price",
        hovertemplate="<b>%{y:.2f} Gwei</b><br>%{x}<extra></extra>",
    ))
    fig.update_layout(
        **CHART_LAYOUT,
        title=dict(text="Gas Price Trend (Gwei)", font=dict(size=12, color="#4B5563"), x=0.01),
        xaxis=dict(showgrid=False, tickfont=dict(size=9), color="#9CA3AF"),
        yaxis=dict(showgrid=True, gridcolor="#EEF1F8", tickfont=dict(size=9), color="#9CA3AF"),
        showlegend=False,
    )
    return fig


def country_volume_chart(df: pd.DataFrame) -> go.Figure:
    if df.empty or "node_country" not in df.columns:
        return go.Figure(layout=CHART_LAYOUT)
    grouped = (
        df.groupby("node_country")["value_eth"]
        .sum()
        .reset_index()
        .sort_values("value_eth", ascending=True)
        .tail(15)
    )
    fig = go.Figure(go.Bar(
        x=grouped["value_eth"],
        y=grouped["node_country"],
        orientation="h",
        marker=dict(
            color=grouped["value_eth"],
            colorscale=[[0, "#EBF5FF"], [0.5, "#60A5FA"], [1, "#1A56DB"]],
            showscale=False,
        ),
        hovertemplate="<b>%{y}</b><br>%{x:.4f} ETH<extra></extra>",
    ))
    fig.update_layout(
        **CHART_LAYOUT,
        title=dict(text="Transaction Volume by Target Country (ETH)", font=dict(size=12, color="#4B5563"), x=0.01),
        xaxis=dict(showgrid=True, gridcolor="#EEF1F8", tickfont=dict(size=9), color="#9CA3AF"),
        yaxis=dict(showgrid=False, tickfont=dict(size=9), color="#111827"),
        showlegend=False,
    )
    return fig


# ─────────────────────────────────────────────────────────────────────────────
# MAIN APP
# ─────────────────────────────────────────────────────────────────────────────
def main():
    # ── Session state init ──────────────────────────────────────────────────
    if "last_count" not in st.session_state:
        st.session_state.last_count = 0
    if "connected" not in st.session_state:
        st.session_state.connected = False
    if "df" not in st.session_state:
        st.session_state.df = pd.DataFrame()

    # ── Title bar ───────────────────────────────────────────────────────────
    st.markdown(
        f"""
<div class="title-bar">
  <div>
    <div class="title-main">🔐 Ethereum Fraud Intelligence Platform</div>
    <div class="title-sub">Live DynamoDB Stream · crypto-fraud-alerts</div>
  </div>
  <div class="refresh-info">
    Auto-refresh every {REFRESH_SECS}s &nbsp;·&nbsp; {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")}
  </div>
</div>""",
        unsafe_allow_html=True,
    )

    # ── Connect to DynamoDB ─────────────────────────────────────────────────
    table   = None
    db_ok   = False
    db_err  = ""
    try:
        table = get_dynamodb_table()
        # Lightweight probe
        table.load()
        db_ok = True
        st.session_state.connected = True
    except NoCredentialsError:
        db_err = "AWS credentials not found. Configure via environment or ~/.aws/credentials."
    except Exception as e:
        db_err = str(e)

    if not db_ok:
        st.error(f"⚠️ DynamoDB connection failed: {db_err}")
        st.info("Dashboard will display in demo mode with no live data.")

    # ── Fetch data ──────────────────────────────────────────────────────────
    raw_items = []
    if db_ok and table:
        raw_items = fetch_all_records(table)

    df = records_to_df(raw_items)
    st.session_state.df = df

    # ── ETH price ───────────────────────────────────────────────────────────
    eth_price, price_ok = fetch_eth_price()

    # ── Derived stats ───────────────────────────────────────────────────────
    total_records = len(df)
    whale_count   = int(df["is_whale"].sum()) if not df.empty and "is_whale" in df.columns else 0
    avg_gas       = df["gas_price_gwei"].mean() if not df.empty else 0.0
    avg_gas       = 0.0 if math.isnan(avg_gas) else avg_gas

    # ── TOP STATS RIBBON ────────────────────────────────────────────────────
    price_str = f"${eth_price:,.2f}" if price_ok else "Unavailable"
    price_sub = "Coinbase · Live" if price_ok else "API unreachable"

    badge_cls  = "online"  if db_ok else "offline"
    badge_dot  = "green"   if db_ok else "red"
    badge_text = "Connected" if db_ok else "Disconnected"

    st.markdown(
        f"""
<div class="stat-ribbon">

  <div class="stat-card blue">
    <div class="stat-label">Live ETH Price</div>
    <div class="stat-value">{price_str}</div>
    <div class="stat-sub">{price_sub}</div>
  </div>

  <div class="stat-card amber">
    <div class="stat-label">Avg Gas Fee</div>
    <div class="stat-value">{avg_gas:,.2f}</div>
    <div class="stat-sub">Gwei · network average</div>
  </div>

  <div class="stat-card red">
    <div class="stat-label">Whale Alerts</div>
    <div class="stat-value">{whale_count:,}</div>
    <div class="stat-sub">≥ {WHALE_THRESHOLD:.0f} ETH transactions</div>
  </div>

  <div class="stat-card green">
    <div class="stat-label">Total Records</div>
    <div class="stat-value">{total_records:,}</div>
    <div class="stat-sub">DynamoDB · crypto-fraud-alerts</div>
  </div>

  <div class="stat-card gray">
    <div class="stat-label">Network Status</div>
    <div class="stat-value" style="font-size:18px">{badge_text}</div>
    <div>
      <span class="badge-live {badge_cls}">
        <span class="pulse {badge_dot}"></span>
        DynamoDB Stream
      </span>
    </div>
  </div>

</div>""",
        unsafe_allow_html=True,
    )

    # ── MAP + AUDIT FEED ROW ─────────────────────────────────────────────────
    map_col, feed_col = st.columns([2.6, 1], gap="medium")

    with map_col:
        st.markdown(
            '<div class="section-header"><span class="section-dot"></span>Global Transaction Heatmap</div>',
            unsafe_allow_html=True,
        )
        map_html = build_map_html(df, height=560)
        components.html(map_html, height=565, scrolling=False)

    with feed_col:
        st.markdown(
            '<div class="section-header"><span class="section-dot" style="background:#E53E3E"></span>Live Audit Stream</div>',
            unsafe_allow_html=True,
        )
        if df.empty:
            st.info("No transactions yet. Waiting for live data…")
        else:
            cards_html = '<div class="audit-feed">'
            for _, row in df.head(MAX_AUDIT_CARDS).iterrows():
                cards_html += render_audit_card(row.to_dict())
            cards_html += "</div>"
            st.markdown(cards_html, unsafe_allow_html=True)

    st.markdown("<hr/>", unsafe_allow_html=True)

    # ── ANALYTICS ROW ───────────────────────────────────────────────────────
    st.markdown(
        '<div class="section-header"><span class="section-dot" style="background:#059669"></span>Advanced Analytics</div>',
        unsafe_allow_html=True,
    )

    chart_l, chart_r = st.columns(2, gap="medium")

    with chart_l:
        st.markdown('<div class="chart-container">', unsafe_allow_html=True)
        st.plotly_chart(gas_trend_chart(df), use_container_width=True, config={"displayModeBar": False})
        st.markdown("</div>", unsafe_allow_html=True)

    with chart_r:
        st.markdown('<div class="chart-container">', unsafe_allow_html=True)
        st.plotly_chart(country_volume_chart(df), use_container_width=True, config={"displayModeBar": False})
        st.markdown("</div>", unsafe_allow_html=True)

    st.markdown("<hr/>", unsafe_allow_html=True)

    # ── ANOMALY LEDGER ───────────────────────────────────────────────────────
    st.markdown(
        '<div class="section-header"><span class="section-dot" style="background:#D97706"></span>Anomaly Ledger · Searchable Historic Record</div>',
        unsafe_allow_html=True,
    )

    if not df.empty:
        # Search / filter controls
        search_col, filter_col, whale_col = st.columns([3, 2, 1.5], gap="small")
        with search_col:
            search_q = st.text_input(
                "🔍 Search hash, address, or city…",
                placeholder="0x… or city name",
                label_visibility="collapsed",
            )
        with filter_col:
            countries = ["All Countries"] + sorted(df["node_country"].dropna().unique().tolist())
            country_filter = st.selectbox("Country", countries, label_visibility="collapsed")
        with whale_col:
            whale_only = st.checkbox("🐋 Whales only", value=False)

        # Apply filters
        filtered = df.copy()
        if search_q:
            sq = search_q.lower()
            mask = (
                filtered["transaction_hash"].str.lower().str.contains(sq, na=False)
                | filtered["from_address"].str.lower().str.contains(sq, na=False)
                | filtered["to_address"].str.lower().str.contains(sq, na=False)
                | filtered["sender_city"].str.lower().str.contains(sq, na=False)
                | filtered["node_city"].str.lower().str.contains(sq, na=False)
            )
            filtered = filtered[mask]
        if country_filter != "All Countries":
            filtered = filtered[filtered["node_country"] == country_filter]
        if whale_only:
            filtered = filtered[filtered["is_whale"]]

        # Display columns
        display_cols = [
            "timestamp", "transaction_hash", "from_address", "to_address",
            "value_eth", "gas_price_gwei", "sender_city", "sender_country",
            "node_city", "node_country", "node_ip", "node_isp", "is_whale",
        ]
        table_df = filtered[display_cols].rename(columns={
            "transaction_hash": "Tx Hash",
            "from_address":     "From",
            "to_address":       "To",
            "value_eth":        "ETH",
            "gas_price_gwei":   "Gas (Gwei)",
            "sender_city":      "Sender City",
            "sender_country":   "Sender Country",
            "node_city":        "Node City",
            "node_country":     "Node Country",
            "node_ip":          "Node IP",
            "node_isp":         "ISP",
            "is_whale":         "Whale",
            "timestamp":        "Timestamp",
        })

        st.markdown(f"Showing **{len(table_df):,}** records", unsafe_allow_html=False)
        st.dataframe(
            table_df,
            use_container_width=True,
            height=380,
            column_config={
                "ETH": st.column_config.NumberColumn(format="%.6f"),
                "Gas (Gwei)": st.column_config.NumberColumn(format="%.4f"),
                "Whale": st.column_config.CheckboxColumn(),
                "Timestamp": st.column_config.DatetimeColumn(format="YYYY-MM-DD HH:mm:ss"),
            },
            hide_index=True,
        )
    else:
        st.info("No records available yet.")

    # ── AUTO-REFRESH ─────────────────────────────────────────────────────────
    st.markdown(
        f"""
<div style="text-align:center;margin-top:24px;font-size:11px;color:#9CA3AF;font-family:'IBM Plex Mono',monospace">
  Next refresh in {REFRESH_SECS}s &nbsp;·&nbsp; Table: {DYNAMO_TABLE} &nbsp;·&nbsp;
  Region: {AWS_REGION} &nbsp;·&nbsp; Records loaded: {total_records:,}
</div>""",
        unsafe_allow_html=True,
    )
    time.sleep(REFRESH_SECS)
    st.rerun()


# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    main()
