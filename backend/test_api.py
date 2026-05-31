import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app
import json

# Print all registered routes
print("=== Registered Routes ===")
for route in app.routes:
    print(f"{route.path} - {route.methods if hasattr(route, 'methods') else 'N/A'}")

print("\n=== Testing Route Calculation ===")

# Test the calculate function directly
from app.api.routes import calculate_route
from app.schemas.route import RouteCalculateRequest, Waypoint

async def test_calculate():
    request = RouteCalculateRequest(
        waypoints=[
            Waypoint(lat=-7.5568, lng=110.8316),
            Waypoint(lat=-7.5600, lng=110.8350)
        ]
    )
    try:
        result = await calculate_route(request)
        print("Success!")
        print(json.dumps(result, indent=2, default=str))
    except Exception as e:
        print(f"Error: {e}")

import asyncio
asyncio.run(test_calculate())
