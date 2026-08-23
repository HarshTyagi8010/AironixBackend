#!/usr/bin/env bash
# ==============================================================================
# Multi-Endpoint Production Health Check Monitor
# ==============================================================================

echo "================================================="
echo "🏥 Production Health Check Monitor"
echo "================================================="

SERVICES=(
    "Frontend Storefront|http://localhost:3000|200"
    "Admin Panel|http://localhost:3001/login|200"
    "Backend Health API|http://localhost:5000/api/v1/health|200"
    "Hero Frames Manifest|http://localhost:5000/api/v1/assets/hero-frames|200"
    "Products API|http://localhost:5000/api/v1/products|200"
)

FAILED=0

for item in "${SERVICES[@]}"; do
    IFS="|" read -r name url expected <<< "$item"
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url" || true)
    
    if [ "$status" -eq "$expected" ]; then
        echo "  [PASS] $name ($url) -> HTTP $status"
    else
        echo "  [FAIL] $name ($url) -> HTTP $status (Expected $expected)"
        FAILED=$((FAILED + 1))
    fi
done

echo "================================================="
if [ "$FAILED" -eq 0 ]; then
    echo "✅ ALL PRODUCTION HEALTH CHECKS PASSED"
    exit 0
else
    echo "❌ $FAILED SERVICES UNHEALTHY"
    exit 1
fi
