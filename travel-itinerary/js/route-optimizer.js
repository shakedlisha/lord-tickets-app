/* ================================================
   ROUTE OPTIMIZER - Reorder day stops for shortest path
   ================================================
   Uses a nearest-neighbor heuristic with haversine distance
   between known coordinates, or Google Maps geocoding for
   unknown locations.

   Since we don't have a Google Maps API key, we use a
   built-in database of popular Japan locations + the
   Gemini AI to estimate optimal ordering.
   ================================================ */

const RouteOptimizer = {

    /* ---- Known coordinates for popular Japan locations ---- */
    _knownLocations: {
        // Tokyo
        'shibuya crossing': { lat: 35.6595, lng: 139.7004 },
        'shibuya': { lat: 35.6595, lng: 139.7004 },
        'shinjuku': { lat: 35.6938, lng: 139.7034 },
        'shinjuku gyoen': { lat: 35.6852, lng: 139.7100 },
        'harajuku': { lat: 35.6702, lng: 139.7027 },
        'takeshita street': { lat: 35.6716, lng: 139.7030 },
        'meiji shrine': { lat: 35.6764, lng: 139.6993 },
        'akihabara': { lat: 35.7023, lng: 139.7745 },
        'asakusa': { lat: 35.7148, lng: 139.7967 },
        'senso-ji': { lat: 35.7148, lng: 139.7967 },
        'sensoji': { lat: 35.7148, lng: 139.7967 },
        'ueno': { lat: 35.7141, lng: 139.7774 },
        'ueno park': { lat: 35.7141, lng: 139.7774 },
        'tokyo tower': { lat: 35.6586, lng: 139.7454 },
        'tokyo skytree': { lat: 35.7101, lng: 139.8107 },
        'ginza': { lat: 35.6717, lng: 139.7649 },
        'tsukiji': { lat: 35.6654, lng: 139.7707 },
        'toyosu market': { lat: 35.6463, lng: 139.7810 },
        'roppongi': { lat: 35.6627, lng: 139.7311 },
        'odaiba': { lat: 35.6267, lng: 139.7762 },
        'ikebukuro': { lat: 35.7295, lng: 139.7109 },
        'shimokitazawa': { lat: 35.6613, lng: 139.6680 },
        'yanaka': { lat: 35.7245, lng: 139.7685 },
        'teamlab borderless': { lat: 35.6267, lng: 139.7762 },
        'teamlab planets': { lat: 35.6463, lng: 139.7810 },
        'imperial palace': { lat: 35.6852, lng: 139.7528 },
        'nakameguro': { lat: 35.6442, lng: 139.6987 },
        'tokyo station': { lat: 35.6812, lng: 139.7671 },

        // Kyoto
        'fushimi inari': { lat: 34.9671, lng: 135.7727 },
        'kinkaku-ji': { lat: 35.0394, lng: 135.7292 },
        'kinkakuji': { lat: 35.0394, lng: 135.7292 },
        'arashiyama': { lat: 35.0094, lng: 135.6670 },
        'bamboo grove': { lat: 35.0170, lng: 135.6713 },
        'kiyomizu-dera': { lat: 34.9949, lng: 135.7850 },
        'kiyomizudera': { lat: 34.9949, lng: 135.7850 },
        'gion': { lat: 34.9987, lng: 135.7747 },
        'nishiki market': { lat: 35.0050, lng: 135.7649 },
        'kyoto station': { lat: 34.9858, lng: 135.7588 },
        'philosopher path': { lat: 35.0232, lng: 135.7944 },
        'nijo castle': { lat: 35.0142, lng: 135.7481 },

        // Osaka
        'dotonbori': { lat: 34.6687, lng: 135.5013 },
        'osaka castle': { lat: 34.6873, lng: 135.5262 },
        'shinsekai': { lat: 34.6527, lng: 135.5063 },
        'namba': { lat: 34.6659, lng: 135.5013 },
        'umeda': { lat: 34.7055, lng: 135.4983 },
        'universal studios japan': { lat: 34.6654, lng: 135.4323 },
        'kuromon market': { lat: 34.6687, lng: 135.5068 },
        'tennoji': { lat: 34.6527, lng: 135.5063 },
        'osaka station': { lat: 34.7024, lng: 135.4959 },

        // Nara
        'nara park': { lat: 34.6851, lng: 135.8430 },
        'todai-ji': { lat: 34.6891, lng: 135.8398 },
        'todaiji': { lat: 34.6891, lng: 135.8398 },
        'kasuga taisha': { lat: 34.6812, lng: 135.8497 },

        // Hiroshima
        'peace memorial park': { lat: 34.3955, lng: 132.4536 },
        'atomic bomb dome': { lat: 34.3955, lng: 132.4536 },
        'miyajima': { lat: 34.2961, lng: 132.3196 },
        'itsukushima shrine': { lat: 34.2961, lng: 132.3196 },

        // Fuji
        'mount fuji': { lat: 35.3606, lng: 138.7274 },
        'lake kawaguchi': { lat: 35.5162, lng: 138.7520 },
        'kawaguchiko': { lat: 35.5162, lng: 138.7520 },
        'chureito pagoda': { lat: 35.5005, lng: 138.7988 },

        // Kanazawa
        'kenroku-en': { lat: 36.5624, lng: 136.6625 },
        'kenrokuen': { lat: 36.5624, lng: 136.6625 },
        'higashi chaya': { lat: 36.5734, lng: 136.6684 },

        // Nikko
        'toshogu shrine': { lat: 36.7581, lng: 139.5991 },
        'nikko': { lat: 36.7581, lng: 139.5991 },
    },

    /* ---- Haversine distance (km) ---- */
    _haversine(lat1, lng1, lat2, lng2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    },

    /* ---- Resolve coordinates for an item ---- */
    _getCoords(item) {
        if (item.lat && item.lng) return { lat: item.lat, lng: item.lng };

        const searchTerms = [
            item.mapsQuery,
            item.titleEn,
            item.title,
        ].filter(Boolean);

        for (const term of searchTerms) {
            const lower = term.toLowerCase().trim();
            for (const [key, coords] of Object.entries(this._knownLocations)) {
                if (lower.includes(key) || key.includes(lower)) {
                    return coords;
                }
            }
        }

        return null;
    },

    /* ---- Build distance matrix ---- */
    _buildDistanceMatrix(items) {
        const coords = items.map(item => this._getCoords(item));
        const n = items.length;
        const matrix = Array.from({ length: n }, () => Array(n).fill(Infinity));

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (i === j) {
                    matrix[i][j] = 0;
                } else if (coords[i] && coords[j]) {
                    matrix[i][j] = this._haversine(
                        coords[i].lat, coords[i].lng,
                        coords[j].lat, coords[j].lng
                    );
                }
            }
        }

        return { matrix, coords, resolvedCount: coords.filter(Boolean).length };
    },

    /* ---- Nearest-neighbor TSP heuristic ---- */
    _nearestNeighborOrder(matrix, startIdx = 0) {
        const n = matrix.length;
        const visited = new Set([startIdx]);
        const order = [startIdx];

        let current = startIdx;
        while (order.length < n) {
            let bestDist = Infinity;
            let bestIdx = -1;

            for (let j = 0; j < n; j++) {
                if (!visited.has(j) && matrix[current][j] < bestDist) {
                    bestDist = matrix[current][j];
                    bestIdx = j;
                }
            }

            if (bestIdx === -1) {
                // Remaining items have no known coordinates, append in order
                for (let j = 0; j < n; j++) {
                    if (!visited.has(j)) {
                        order.push(j);
                        visited.add(j);
                    }
                }
                break;
            }

            order.push(bestIdx);
            visited.add(bestIdx);
            current = bestIdx;
        }

        return order;
    },

    /* ---- Calculate route stats ---- */
    _calculateRouteStats(items, order, matrix) {
        let totalDistance = 0;
        const segments = [];

        for (let i = 0; i < order.length - 1; i++) {
            const from = order[i];
            const to = order[i + 1];
            const dist = matrix[from][to];

            if (dist !== Infinity) {
                totalDistance += dist;
                segments.push({
                    from: items[from].title,
                    to: items[to].title,
                    distance: dist,
                    walkingMinutes: Math.round(dist / 0.08),
                });
            }
        }

        return {
            totalDistanceKm: Math.round(totalDistance * 10) / 10,
            totalWalkingMinutes: Math.round(totalDistance / 0.08),
            segments,
        };
    },

    /* ---- Main: Optimize a day's items ---- */
    optimize(day) {
        const items = day.items || [];
        if (items.length < 3) {
            return { optimized: false, reason: 'צריך לפחות 3 פעילויות כדי לבצע אופטימיזציה', items };
        }

        // Separate transport items (keep them, but don't optimize their position)
        const activityItems = [];
        const transportIndices = new Set();

        items.forEach((item, idx) => {
            if (item.type === 'transport') {
                transportIndices.add(idx);
            } else {
                activityItems.push({ ...item, _originalIdx: idx });
            }
        });

        if (activityItems.length < 3) {
            return { optimized: false, reason: 'צריך לפחות 3 אטרקציות (לא כולל תחבורה) לאופטימיזציה', items };
        }

        const { matrix, resolvedCount } = this._buildDistanceMatrix(activityItems);

        if (resolvedCount < 2) {
            return {
                optimized: false,
                reason: 'לא נמצאו מספיק מיקומים ידועים. הוסיפו שמות מקומות באנגלית (mapsQuery) לפעילויות.',
                items,
            };
        }

        const order = this._nearestNeighborOrder(matrix);
        const stats = this._calculateRouteStats(activityItems, order, matrix);

        // Reorder activity items
        const reorderedActivities = order.map(i => activityItems[i]);

        // Rebuild full items list: interleave transport between activities
        const newItems = [];
        reorderedActivities.forEach((item, idx) => {
            // Remove internal tracking field
            const { _originalIdx, ...cleanItem } = item;
            newItems.push(cleanItem);

            // Add route note between consecutive items
            if (idx < reorderedActivities.length - 1 && stats.segments[idx]) {
                const seg = stats.segments[idx];
                if (seg.distance < 2) {
                    cleanItem.route_note = `${seg.distance.toFixed(1)} ק"מ הליכה (כ-${seg.walkingMinutes} דקות) ל${reorderedActivities[idx + 1].title}`;
                } else {
                    cleanItem.route_note = `${seg.distance.toFixed(1)} ק"מ ל${reorderedActivities[idx + 1].title} - מומלץ תחבורה ציבורית`;
                }
            }
        });

        return {
            optimized: true,
            items: newItems,
            stats,
            resolvedCount,
            totalItems: activityItems.length,
        };
    },

    /* ---- Get distance summary for a day (without reordering) ---- */
    getRouteInfo(day) {
        const items = (day.items || []).filter(i => i.type !== 'transport');
        if (items.length < 2) return null;

        const { matrix, resolvedCount } = this._buildDistanceMatrix(items);
        if (resolvedCount < 2) return null;

        let totalDistance = 0;
        const segments = [];

        for (let i = 0; i < items.length - 1; i++) {
            const dist = matrix[i][i + 1];
            if (dist !== Infinity) {
                totalDistance += dist;
                segments.push({
                    from: items[i].title,
                    to: items[i + 1].title,
                    distance: dist,
                    walkingMinutes: Math.round(dist / 0.08),
                });
            }
        }

        return {
            totalDistanceKm: Math.round(totalDistance * 10) / 10,
            totalWalkingMinutes: Math.round(totalDistance / 0.08),
            segments,
            resolvedCount,
            totalItems: items.length,
        };
    },
};
