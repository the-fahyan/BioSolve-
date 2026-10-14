import "server-only";
import RBush from "rbush";
import { LatLng } from "@/lib/schemas";
import { pointToSegmentDistance } from "@/lib/geo";
import { RoadSegment } from "../providers/types";

export interface RoadRBushItem {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  segment: RoadSegment;
}

export class RoadSpatialIndex {
  private tree: RBush<RoadRBushItem>;

  constructor(segments: RoadSegment[] = []) {
    this.tree = new RBush<RoadRBushItem>();
    if (segments.length > 0) {
      this.load(segments);
    }
  }

  public load(segments: RoadSegment[]): void {
    const items: RoadRBushItem[] = segments.map((seg) => ({
      minX: seg.minX,
      minY: seg.minY,
      maxX: seg.maxX,
      maxY: seg.maxY,
      segment: seg,
    }));
    this.tree.load(items);
  }

  /**
   * Find road segments within radiusM of coordinate p.
   * Performs coarse R-Tree bounding-box query, then filters by exact equirectangular point-to-segment distance.
   */
  public findNearbyRoads(
    p: LatLng,
    radiusM: number = 250
  ): Array<{ segment: RoadSegment; distanceM: number }> {
    // Degree bounding box approximation
    const latDelta = radiusM / 111000;
    const cosLat = Math.cos((p.lat * Math.PI) / 180);
    const lngDelta = radiusM / (111000 * Math.max(0.1, cosLat));

    const candidates = this.tree.search({
      minX: p.lng - lngDelta,
      minY: p.lat - latDelta,
      maxX: p.lng + lngDelta,
      maxY: p.lat + latDelta,
    });

    const results: Array<{ segment: RoadSegment; distanceM: number }> = [];

    for (const item of candidates) {
      const seg = item.segment;
      const dist = pointToSegmentDistance(p, seg.start, seg.end);
      if (dist <= radiusM) {
        results.push({ segment: seg, distanceM: dist });
      }
    }

    return results;
  }
}
