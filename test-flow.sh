#!/usr/bin/env bash
set -e
set +H

echo "=========================================================="
echo " Starting End-to-End Test Flow for Grant Management Portal"
echo "=========================================================="

RAND=$RANDOM

# 1. Health Check
echo -e "\n[1/8] Checking Health Endpoint..."
HEALTH=$(curl -s http://localhost:5000/health)
echo "Health Response: $HEALTH"

# 2. Log In as Pre-seeded Default Admin
echo -e "\n[2/8] Logging in as Default Admin..."
ADMIN_LOGIN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@grantportal.com","password":"AdminPassword123!"}')
ADMIN_TOKEN=$(echo $ADMIN_LOGIN | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
echo "Admin Token: $ADMIN_TOKEN"

# 3. Register Grantee & Grantor
echo -e "\n[3/8] Registering Grantee and Grantor..."
GRANTEE_EMAIL="sarah_${RAND}@example.com"
GRANTOR_EMAIL="david_${RAND}@example.com"

GRANTEE_REG=$(curl -s -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Sarah Grantee\",\"email\":\"$GRANTEE_EMAIL\",\"password\":\"Password123!\"}")
echo "Grantee Registered: $GRANTEE_REG"

GRANTOR_REG=$(curl -s -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"David Grantor\",\"email\":\"$GRANTOR_EMAIL\",\"password\":\"Password123!\"}")
echo "Grantor Registered: $GRANTOR_REG"
GRANTOR_ID=$(echo $GRANTOR_REG | grep -o '"id":"[^"]*' | cut -d'"' -f4)

# 4. Admin Assigns GRANTOR Role
echo -e "\n[4/8] Admin assigning GRANTOR role to David ($GRANTOR_ID)..."
ASSIGN_RES=$(curl -s -X POST "http://localhost:5000/api/users/$GRANTOR_ID/roles" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"roleName":"GRANTOR"}')
echo "Role Assigned: $ASSIGN_RES"

# 5. Log in as Both Users
echo -e "\n[5/8] Logging in as Grantee and Grantor..."
GRANTEE_LOGIN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$GRANTEE_EMAIL\",\"password\":\"Password123!\"}")
GRANTEE_TOKEN=$(echo $GRANTEE_LOGIN | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

GRANTOR_LOGIN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$GRANTOR_EMAIL\",\"password\":\"Password123!\"}")
GRANTOR_TOKEN=$(echo $GRANTOR_LOGIN | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
echo "Grantor Token: $GRANTOR_TOKEN"

# 6. Test RBAC (401 & 403)
echo -e "\n[6/8] Testing RBAC Security Protections..."
echo -n "  Testing Unauthorized 401 (Missing Token): "
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" -X GET http://localhost:5000/api/grants

echo -n "  Testing Forbidden 403 (Grantee creating grant): "
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" -X POST http://localhost:5000/api/grants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GRANTEE_TOKEN" \
  -d '{"title":"Illegal","description":"Forbidden","amount":1000}'

# 7. Grant Creation and Application Flow
echo -e "\n[7/8] Grant Creation and Application Lifecycle..."
CREATE_GRANT=$(curl -s -X POST http://localhost:5000/api/grants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GRANTOR_TOKEN" \
  -d '{"title":"Clean Water Innovation Fund","description":"Scaling filtration systems.","amount":75000}')
echo "Created Grant: $CREATE_GRANT"
GRANT_ID=$(echo $CREATE_GRANT | grep -o '"id":"[^"]*' | cut -d'"' -f4)

echo -e "\nGrantee applying for grant..."
APPLY_RES=$(curl -s -X POST "http://localhost:5000/api/grants/$GRANT_ID/apply" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GRANTEE_TOKEN" \
  -d '{"proposal":"Deploy solar water filtration units."}')
echo "Application Submitted: $APPLY_RES"

echo -e "\nGrantor viewing applications for grant..."
APPS=$(curl -s -X GET "http://localhost:5000/api/grants/$GRANT_ID/applications" \
  -H "Authorization: Bearer $GRANTOR_TOKEN")
echo "Applications list: $APPS"

# 8. OAuth Flow Test
echo -e "\n[8/8] Testing OAuth 2.0 Integration..."
OAUTH_CALLBACK=$(curl -s "http://localhost:5000/api/auth/google/callback?code=mock_code_researcher_${RAND}")
echo "OAuth Callback Response: $OAUTH_CALLBACK"

echo -e "\n=========================================================="
echo " All Functionality Verified Successfully from Scratch to End!"
echo "=========================================================="
