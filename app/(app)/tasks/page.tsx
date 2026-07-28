import type { Metadata } from "next";
import { TodoBoard } from "@/components/app/todo-board";
import { getTodos } from "@/lib/mock/data";

export const metadata: Metadata = { title: "To-dos" };

export default async function TasksPage() {
  const todos = await getTodos();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h1">To-dos</h1>
        <p className="mt-1 text-muted-foreground">
          Everything anyone committed to, across every meeting.
        </p>
      </div>
      <TodoBoard initial={todos} />
    </div>
  );
}
