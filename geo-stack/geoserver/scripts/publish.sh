#!/usr/bin/env bash
set -euo pipefail

GS=http://geoserver-custom-production.up.railway.app/geoserver
AUTH=admin:geoserver
WS=gis
STORE=ibaan_mysql
DB=gis
DBHOST=host.docker.internal    # if MySQL runs on host; else use container name/IP
DBPORT=3306
DBUSER=root
DBPASS=
LAYER=ibaan                     # table or view name (e.g., v_ibaan_simple)
SRID=4326

# 1) workspace
curl -fsS -u "$AUTH" -H "Content-type: application/json"       -d "{\"workspace\":{\"name\":\"$WS\"}}"       "$GS/rest/workspaces" || true

# 2) store (JDBC MySQL)
curl -fsS -u "$AUTH" -H "Content-type: application/json"       -d "{
        \"dataStore\": {
          \"name\": \"$STORE\",
          \"connectionParameters\": {
            \"entry\": [
              {\"@key\":\"dbtype\",\"$\":\"mysql\"},
              {\"@key\":\"host\",\"$\":\"$DBHOST\"},
              {\"@key\":\"port\",\"$\":\"$DBPORT\"},
              {\"@key\":\"database\",\"$\":\"$DB\"},
              {\"@key\":\"user\",\"$\":\"$DBUSER\"},
              {\"@key\":\"passwd\",\"$\":\"$DBPASS\"},
              {\"@key\":\"validate connections\",\"$\":\"true\"}
            ]
          }
        }
      }"       "$GS/rest/workspaces/$WS/datastores" || true

# 3) feature type (layer)
curl -fsS -u "$AUTH" -H "Content-type: application/json"       -d "{
        \"featureType\": {
          \"name\": \"$LAYER\",
          \"nativeName\": \"$LAYER\",
          \"title\": \"Ibaan Parcels\",
          \"srs\": \"EPSG:$SRID\"
        }
      }"       "$GS/rest/workspaces/$WS/datastores/$STORE/featuretypes" || true

# 4) attach style
curl -fsS -u "$AUTH" -H "Content-type: application/vnd.ogc.sld+xml"       --data-binary @../styles/ibaan_parcels.sld       "$GS/rest/styles/ibaan_parcels?raw=true" || true

curl -fsS -u "$AUTH" -X PUT -H "Content-type: application/json"       -d "{\"layer\": {\"defaultStyle\": {\"name\": \"ibaan_parcels\"}}}"       "$GS/rest/layers/$WS:$LAYER"
echo "Published $WS:$LAYER"
