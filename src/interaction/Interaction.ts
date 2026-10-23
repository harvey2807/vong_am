import type { AbstractMesh, Node, Scene, UniversalCamera } from "../babylon";
import type { Hud } from "../ui/Hud";

export interface Interactable {
  /** Chữ hiển thị khi nhìn vào vật; null = hiện không tương tác được. */
  prompt(): string | null;
  interact(): void;
}

const REACH = 2.2;

export function makeInteractable(mesh: AbstractMesh, interactable: Interactable): void {
  mesh.metadata = { ...(mesh.metadata ?? {}), interactable };
}

function findInteractable(node: Node | null): Interactable | null {
  for (let n = node; n; n = n.parent) {
    const i = (n.metadata as { interactable?: Interactable } | null)?.interactable;
    if (i) return i;
  }
  return null;
}

/** Raycast từ tâm màn hình; vật đầu tiên trúng tia (kể cả tường) chặn mọi thứ phía sau. */
export class InteractionSystem {
  private current: Interactable | null = null;

  constructor(
    private readonly scene: Scene,
    private readonly camera: UniversalCamera,
    private readonly hud: Hud,
  ) {}

  update(): void {
    const ray = this.camera.getForwardRay(REACH);
    const hit = this.scene.pickWithRay(ray, (m) => m.isPickable && m.isEnabled() && m.isVisible);
    this.current = hit?.hit ? findInteractable(hit.pickedMesh) : null;
    this.hud.setPrompt(this.current?.prompt() ?? null);
  }

  clear(): void {
    this.current = null;
    this.hud.setPrompt(null);
  }

  tryInteract(): void {
    if (this.current?.prompt()) this.current.interact();
  }
}
