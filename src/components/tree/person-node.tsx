import { Handle, Position, type NodeProps } from "@xyflow/react";
import { displayName, givenFamily, lifespan } from "@/lib/tree/nasab";
import type { PersonNodeData } from "@/lib/tree/graph";
import { NODE_W, type NodeColor } from "@/lib/tree/types";
import { cn } from "@/lib/utils";
import { PersonGlyph } from "./person-icon";

// Circle-shape footprint: 76px avatar + 2 × 10px (p-2.5) ring padding.
const CIRCLE_D = 96;
const CIRCLE_INSET = (NODE_W - CIRCLE_D) / 2;

const FILL: Record<NodeColor, string> = {
  lime: "bg-block-lime text-ink",
  lilac: "bg-block-lilac text-ink",
  cream: "bg-block-cream text-ink",
  mint: "bg-block-mint text-ink",
  pink: "bg-block-pink text-ink",
  coral: "bg-block-coral text-ink",
  navy: "bg-block-navy text-inverse-ink",
  ink: "bg-primary text-on-primary",
};

function Avatar({
  person,
  size,
  inverse,
}: {
  person: PersonNodeData["person"];
  size: number;
  inverse: boolean;
}) {
  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full",
        inverse ? "bg-on-inverse-soft/20" : "bg-canvas/55",
      )}
      style={{ width: size, height: size }}
    >
      {person.photo ? (
        <img src={person.photo} alt="" className="size-full object-cover" draggable={false} />
      ) : (
        <PersonGlyph
          name={person.icon ?? "user"}
          className={cn("size-8", inverse ? "text-inverse-ink" : "text-ink")}
        />
      )}
    </div>
  );
}

export function PersonNode({ data, selected }: NodeProps) {
  const { person } = data as PersonNodeData;
  const color = person.color ?? "cream";
  const { given, family } = givenFamily(person.name);
  const years = lifespan(person);
  const inverse = color === "navy" || color === "ink";
  const detail = person.title || person.notes || person.birthPlace;
  const isCircle = person.shape === "circle";
  const handles = (
    <>
      <Handle type="target" position={Position.Top} id="parent" />
      <Handle type="source" position={Position.Bottom} id="child" />
      <Handle
        type="source"
        position={Position.Right}
        id="spouse-source"
        style={isCircle ? { top: CIRCLE_D / 2, right: CIRCLE_INSET } : undefined}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="spouse-target"
        style={isCircle ? { top: CIRCLE_D / 2, left: CIRCLE_INSET } : undefined}
      />
    </>
  );

  if (isCircle) {
    return (
      <div className="flex w-full flex-col items-center gap-2">
        {handles}
        <div
          className={cn(
            "grid place-items-center rounded-full",
            selected ? "ring-2 ring-ink ring-offset-2 ring-offset-canvas" : "",
          )}
        >
          <div className={cn("rounded-full p-2.5 ring-1 ring-hairline", FILL[color])}>
            <Avatar person={person} size={76} inverse={inverse} />
          </div>
        </div>
        <div className="flex w-full flex-col items-center">
          <p className="w-full truncate text-center text-[14px] leading-tight font-medium tracking-tight">
            {displayName({ ...person, name: given || person.name })}
          </p>
          {family ? (
            <p className="caption mt-0.5 w-full truncate text-center opacity-70">{family}</p>
          ) : null}
          {years ? (
            <p className="mt-1 text-center text-[11px] font-normal tabular-nums opacity-70">
              {years}
            </p>
          ) : null}
          {detail ? (
            <p className="mt-1.5 line-clamp-2 w-full min-w-0 text-center text-[11px] leading-snug font-normal opacity-70">
              {detail}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-[104px] w-full flex-col items-center rounded-lg px-3 pt-4 pb-3",
        FILL[color],
        selected ? "ring-2 ring-ink ring-offset-2 ring-offset-canvas" : "",
      )}
    >
      {handles}
      <Avatar person={person} size={72} inverse={inverse} />

      <p className="mt-3 w-full truncate text-center text-[15px] leading-tight font-medium tracking-tight">
        {displayName({ ...person, name: given || person.name })}
      </p>
      {family ? (
        <p className="caption mt-1 w-full truncate text-center opacity-80">{family}</p>
      ) : null}
      {years ? (
        <p className="mt-2 text-center text-[12px] font-normal tabular-nums opacity-80">
          {years}
        </p>
      ) : null}
      {detail ? (
        <p className="mt-2 line-clamp-2 w-full min-w-0 text-center text-[11px] leading-snug font-normal opacity-70">
          {detail}
        </p>
      ) : null}
    </div>
  );
}

export function UnionNode({ data }: NodeProps) {
  const { label } = data as { label?: string };
  return (
    <div className="grid size-9 place-items-center rounded-full bg-primary text-on-primary transition-transform duration-150 ease-out hover:scale-110">
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <span className="caption text-[8px] tracking-normal text-on-primary">
        {label ? label.slice(0, 4) : "·"}
      </span>
    </div>
  );
}
