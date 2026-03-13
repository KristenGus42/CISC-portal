// CODE REFERENCE
// Will not be in final project, used for reference on how to use dnd-kit
// Other examples: https://codesandbox.io/examples/package/@dnd-kit/core

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";

export default function DndExample() {
  // Items on page - shows where the items are and when 
  const [items, setItems] = useState({
    container1: ["Item 1", "Item 2"],
    container2: ["Item 3"],
  });

  const [extraText, setExtraText] = useState("");
  const [activeItem, setActiveItem] = useState(null);

  // Is called upon draffing 
  const handleDragStart = (event) => {
    setActiveItem(event.active.id);
  };

  // Fires on the end of draging
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;

    const sourceContainer = Object.keys(items).find((key) =>
      items[key].includes(active.id)
    );
    const destContainer = over.id;

    if (sourceContainer === destContainer) return;

    setItems((prev) => ({
      ...prev,
      [sourceContainer]: prev[sourceContainer].filter((i) => i !== active.id),
      [destContainer]: [...prev[destContainer], active.id],
    }));

    setActiveItem(null);

    setExtraText("snapped");
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="d-flex gap-4 p-4">
        <Container id="container1" items={items.container1} extraText={extraText} />
        <Container id="container2" items={items.container2} extraText={extraText} />
      </div>
      <DragOverlay>
        {activeItem ? <Card id={activeItem} text={extraText}/> : null}
      </DragOverlay>
    </DndContext>
  );
}

function Container({ id, items, extraText }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        background: isOver ? "lightgreen" : "lightgray",
        padding: "1rem",
        minWidth: "200px",
        minHeight: "200px",
      }}
    >
      <h5>{id}</h5>
      {items.map((item) => (
        <Card key={item} id={item} text={extraText} />
      ))}
    </div>
  );
}

function Card({ id, text }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : {};

  return (
    <div
      ref={setNodeRef}
      style={{
        background: "white",
        padding: "0.5rem",
        marginBottom: "0.5rem",
        cursor: "grab",
        ...style,
      }}
      {...listeners}
      {...attributes}
    >
      {id} {text}
    </div>
  );
}