import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { NavLink } from "react-router-dom";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface DraggableNavItemProps {
  id: string;
  to: string;
  icon: React.ElementType;
  label: string;
  exact?: boolean;
  isDragMode?: boolean;
}

export function DraggableNavItem({ 
  id, 
  to, 
  icon: Icon, 
  label, 
  exact,
  isDragMode = false 
}: DraggableNavItemProps) {
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
        "relative group flex items-center",
        isDragging && "z-50 opacity-90"
      )}
    >
      {isDragMode && (
        <div
          {...attributes}
          {...listeners}
          className="absolute -left-1 p-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="w-3 h-3 text-muted-foreground" />
        </div>
      )}
      <NavLink
        to={to}
        end={exact}
        className={({ isActive }) =>
          cn(
            "flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
            isDragMode && "pl-6",
            isActive
              ? "bg-gradient-to-r from-[#4f7df3] via-[#5b8af5] to-[#3b6ce8] text-white shadow-lg shadow-[#4f7df3]/25"
              : "text-[#718096] hover:bg-[#f8f9ff] hover:text-[#2d3748]"
          )
        }
      >
        <Icon className="w-4 h-4" />
        <span>{label}</span>
      </NavLink>
    </div>
  );
}
