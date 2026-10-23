import { Vector3 } from "@babylonjs/core";

export interface NavNode {
  id: string;
  pos: Vector3;
  /** Phòng chứa điểm này — dùng để thực thể "đánh hơi" phòng người chơi đang ở. */
  room: string;
  /** Điểm thực thể sẽ ghé khi đi tuần. */
  patrol: boolean;
}

export interface Waypoint {
  pos: Vector3;
  /** Cửa phải mở trước khi đi tới điểm này. */
  door?: string;
}

interface NavEdge {
  to: string;
  cost: number;
  /** Cửa nằm trên cạnh này; thực thể phải mở nếu cửa đang đóng. */
  door?: string;
}

/**
 * Đồ thị điểm dẫn đường đặt tay cho căn nhà. Nhà chỉ có vài phòng nên đồ thị nhỏ
 * đáng tin hơn navmesh (Recast) và không cần thêm WASM; khi dựng lại nhà bằng glTF
 * với nhiều đồ đạc thì mới cần chuyển sang navmesh.
 */
export class NavGraph {
  readonly nodes = new Map<string, NavNode>();
  private readonly edges = new Map<string, NavEdge[]>();

  node(id: string, x: number, z: number, room: string, patrol = false): this {
    this.nodes.set(id, { id, pos: new Vector3(x, 0, z), room, patrol });
    this.edges.set(id, []);
    return this;
  }

  link(a: string, b: string, door?: string): this {
    const cost = Vector3.Distance(this.nodes.get(a)!.pos, this.nodes.get(b)!.pos);
    this.edges.get(a)!.push({ to: b, cost, door });
    this.edges.get(b)!.push({ to: a, cost, door });
    return this;
  }

  doorBetween(a: string, b: string): string | undefined {
    return this.edges.get(a)?.find((e) => e.to === b)?.door;
  }

  /** Điểm gần nhất mà `reachable` cho phép (thường là: không có tường chắn giữa hai điểm). */
  nearest(p: Vector3, reachable?: (node: NavNode) => boolean): NavNode {
    let best: NavNode | undefined;
    let bestFallback: NavNode | undefined;
    let d = Infinity;
    let dFallback = Infinity;
    for (const n of this.nodes.values()) {
      const dist = Math.hypot(n.pos.x - p.x, n.pos.z - p.z);
      if (dist < dFallback) {
        dFallback = dist;
        bestFallback = n;
      }
      if (dist < d && (!reachable || reachable(n))) {
        d = dist;
        best = n;
      }
    }
    return (best ?? bestFallback)!;
  }

  /**
   * Đường đi từ `from` tới `to` trên sàn. `clear(a, b)`: không có vật cản giữa hai điểm.
   * Thấy thẳng thì đi thẳng; không thì bám điểm dẫn đường gần nhất mỗi đầu.
   */
  route(from: Vector3, to: Vector3, clear: (a: Vector3, b: Vector3) => boolean): Waypoint[] {
    if (clear(from, to)) return [{ pos: to }];
    const start = this.nearest(from, (n) => clear(from, n.pos));
    const end = this.nearest(to, (n) => clear(to, n.pos));
    const nodes = this.path(start.id, end.id);
    const route: Waypoint[] = nodes.map((n, i) => ({ pos: n.pos, door: i ? this.doorBetween(nodes[i - 1].id, n.id) : undefined }));
    route.push({ pos: to });
    return route;
  }

  /** Dijkstra — đồ thị chỉ vài chục điểm nên không cần heap. */
  path(from: string, to: string): NavNode[] {
    const dist = new Map<string, number>([[from, 0]]);
    const prev = new Map<string, string>();
    const open = new Set([from]);
    while (open.size) {
      let cur = "";
      let best = Infinity;
      for (const id of open) {
        const d = dist.get(id)!;
        if (d < best) {
          best = d;
          cur = id;
        }
      }
      open.delete(cur);
      if (cur === to) break;
      for (const e of this.edges.get(cur)!) {
        const nd = best + e.cost;
        if (nd < (dist.get(e.to) ?? Infinity)) {
          dist.set(e.to, nd);
          prev.set(e.to, cur);
          open.add(e.to);
        }
      }
    }
    if (!dist.has(to)) return [];
    const ids = [to];
    while (ids[0] !== from) ids.unshift(prev.get(ids[0])!);
    return ids.map((id) => this.nodes.get(id)!);
  }
}
