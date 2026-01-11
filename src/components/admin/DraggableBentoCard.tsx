import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface DraggableBentoCardProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  isDragMode?: boolean;
}

export function DraggableBentoCard({ 
  id, 
  children, 
  className,
  isDragMode = false 
}: DraggableBentoCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group",
        isDragging && "z-50 opacity-90 scale-[1.02]",
        className
      )}
    >
      {isDragMode && (
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-secondary/80 backdrop-blur-sm cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
      {children}
    </div>
  );
}
