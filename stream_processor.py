import boto3
import random
import time
import datetime
import json

# 1. Initialize the AWS DynamoDB Resource Client
# Ensure your AWS CLI is configured with 'aws configure' in your terminal
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('crypto-fraud-alerts')

# 2. Curated Global Infrastructure Node Network Pool
# Provides precise, diverse matching coordinate points for seamless global arc mapping
GLOBAL_VALIDATOR_HUBS = [
    {"city": "New York", "country": "United States", "lat": 40.7128, "lon": -74.0060},
    {"city": "Karachi", "country": "Pakistan", "lat": 24.8607, "lon": 67.0011},
    {"city": "London", "country": "United Kingdom", "lat": 51.5074, "lon": -0.1278},
    {"city": "Tokyo", "country": "Japan", "lat": 35.6762, "lon": 139.6503},
    {"city": "Frankfurt", "country": "Germany", "lat": 50.1109, "lon": 8.6821},
    {"city": "Sydney", "country": "Australia", "lat": -33.8688, "lon": 151.2093},
    {"city": "São Paulo", "country": "Brazil", "lat": -23.5505, "lon": -46.6333},
    {"city": "Cape Town", "country": "South Africa", "lat": -33.9249, "lon": 18.4241},
    {"city": "Singapore", "country": "Singapore", "lat": 1.3521, "lon": 103.8198}
]

# AI Cognitive Assessment Templates to provide variety in the audit stream log
AI_ANOMALY_TEMPLATES = [
    "SUSPICIOUS ACTIVITY: High-volume capital movement detected across validation nodes.",
    "NETWORK ANOMALY: Gas fee spike correlates with intense automated MEV front-run bidding war.",
    "LIQUIDITY SHIFT INTERCEPT: Whale asset relocation hitting multi-signature regional custody frames.",
    "EXPLOIT ALERT: Flash-loan telemetry matches pattern of decentralized pool draining attempt.",
    "ROUTING DRIFT: Uncharacteristic low-latency relay route chosen by node validator structure."
]

def generate_blockchain_telemetry():
    """Generates an authentic multi-node Web3 transaction telemetry packet."""
    # Ensure sender and receiver locations are completely distinct for the geographic arcs
    sender = random.choice(GLOBAL_VALIDATOR_HUBS)
    receiver = random.choice([hub for hub in GLOBAL_VALIDATOR_HUBS if hub != sender])
    
    # Generate mock 66-character transaction hashes and 42-character wallet addresses
    tx_hash = "0x" + "".join(random.choices("0123456789abcdef", k=64))
    from_wallet = "0x" + "".join(random.choices("0123456789abcdef", k=40))
    to_wallet = "0x" + "".join(random.choices("0123456789abcdef", k=40))
    
    # Build complete corporate-grade data payload profile
    payload = {
        # Core Transaction Attributes
        "transaction_hash": tx_hash,
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "from_address": from_wallet,
        "to_address": to_wallet,
        "value_eth": str(round(random.uniform(0.05, 175.0), 4)),
        "gas_price_gwei": str(round(random.uniform(15.0, 320.0), 1)),
        
        # SENDER GEOGRAPHIC METADATA (New Fields for Dual-Node Mapping)
        "sender_lat": str(sender["lat"]),
        "sender_lon": str(sender["lon"]),
        "sender_city": sender["city"],
        "sender_country": sender["country"],
        
        # RECEIVER GEOGRAPHIC METADATA
        "lat": str(receiver["lat"]),
        "lon": str(receiver["lon"]),
        "node_city": receiver["city"],
        "node_country": receiver["country"],
        
        # Technical Node Network Telemetry
        "node_ip": f"{random.randint(12,240)}.{random.randint(10,254)}.{random.randint(1,254)}.{random.randint(1,254)}",
        "node_isp": random.choice(["AWS Cloud Infrastructure", "DigitalOcean LLC", "Google Cloud Platform", "Equinix Metal"]),
        "ai_analysis": random.choice(AI_ANOMALY_TEMPLATES)
    }
    return payload

def main():
    print("=======================================================")
    print(" EtherShield Telemetry Streaming Engine Engine Active  ")
    print(" Forwarding live dual-node JSON events directly to DB  ")
    print("=======================================================")
    
    while True:
        try:
            # Generate the transaction packet
            event_data = generate_blockchain_telemetry()
            
            # Push item directly into the DynamoDB Table cluster
            table.put_item(Item=event_data)
            
            print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] Broadcast Success -> Hash: {event_data['transaction_hash'][:15]}... | Route: {event_data['sender_city']} -> {event_data['node_city']} ({event_data['value_eth']} ETH)")
            
        except Exception as e:
            print(f"🚨 Target Transmission Failure: {str(e)}")
            
        # Generates a new transaction increment packet every 5 seconds to simulate real-time workflow
        time.sleep(5)

if __name__ == "__main__":
    main()
