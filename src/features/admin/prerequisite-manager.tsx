"use client";
import { useState, useTransition } from "react";
import { ChevronDown, LoaderCircle, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteCategoryAction,
  deletePrerequisiteAction,
  upsertCategoryAction,
  upsertPrerequisiteAction,
} from "@/features/prerequisites/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
type Item = {
  id: string;
  title: string;
  description: string;
  verification: string;
  sortOrder: number;
  isActive: boolean;
};
type Category = {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
  items: Item[];
};
function ItemEditor({ categoryId, item }: { categoryId: string; item: Item }) {
  const [data, setData] = useState(item);
  const [pending, start] = useTransition();
  return (
    <div className="border-t border-white/[.05] py-4">
      <div className="grid gap-3 lg:grid-cols-[4rem_1fr_auto]">
        <Input
          aria-label="Sort order"
          type="number"
          min={1}
          value={data.sortOrder}
          onChange={(e) =>
            setData({ ...data, sortOrder: Number(e.target.value) })
          }
        />
        <Input
          aria-label="Prerequisite title"
          value={data.title}
          onChange={(e) => setData({ ...data, title: e.target.value })}
        />
        <label className="text-muted flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={data.isActive}
            onChange={(e) => setData({ ...data, isActive: e.target.checked })}
            className="accent-[#d6401a]"
          />
          Enabled
        </label>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Textarea
          className="min-h-16"
          value={data.description}
          onChange={(e) => setData({ ...data, description: e.target.value })}
          placeholder="Description (optional)"
        />
        <Textarea
          className="min-h-16 font-mono text-xs"
          value={data.verification}
          onChange={(e) => setData({ ...data, verification: e.target.value })}
          placeholder="Verification instructions (optional)"
        />
      </div>
      <div className="mt-3 flex justify-end gap-2">
        {data.id && (
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              if (
                confirm(
                  "Delete this prerequisite? Student checklist history for it will also be removed.",
                )
              )
                start(async () => {
                  await deletePrerequisiteAction(data.id);
                  toast.success("Prerequisite deleted.");
                });
            }}
          >
            <Trash2 size={13} />
          </Button>
        )}
        <Button
          size="sm"
          disabled={pending || !data.title}
          onClick={() =>
            start(async () => {
              const result = await upsertPrerequisiteAction({
                ...data,
                categoryId,
              });
              if (result.error) toast.error(result.error);
              else
                toast.success(
                  data.id ? "Prerequisite updated." : "Prerequisite created.",
                );
            })
          }
        >
          {pending ? (
            <LoaderCircle size={13} className="animate-spin" />
          ) : (
            <Save size={13} />
          )}
          Save
        </Button>
      </div>
    </div>
  );
}
function CategoryEditor({ category }: { category: Category }) {
  const [data, setData] = useState(category);
  const [adding, setAdding] = useState(false);
  const [pending, start] = useTransition();
  const nextOrder = Math.max(0, ...category.items.map((i) => i.sortOrder)) + 1;
  return (
    <Card className="overflow-hidden">
      <details open className="group">
        <summary className="flex cursor-pointer list-none items-center gap-3 p-5">
          <span className="bg-accent/10 grid size-9 place-items-center rounded-xl text-xs font-bold text-[#ff987e]">
            {data.sortOrder}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-white">
              {data.name}
            </h2>
            <p className="text-muted mt-1 text-[11px]">
              {data.items.length} items ·{" "}
              {data.isActive ? "active" : "disabled"}
            </p>
          </div>
          <ChevronDown
            size={16}
            className="text-muted transition group-open:rotate-180"
          />
        </summary>
        <div className="border-t border-white/[.06] p-5">
          <div className="grid gap-3 lg:grid-cols-[5rem_1fr_2fr_auto]">
            <Input
              type="number"
              min={1}
              value={data.sortOrder}
              onChange={(e) =>
                setData({ ...data, sortOrder: Number(e.target.value) })
              }
            />
            <Input
              value={data.name}
              onChange={(e) => setData({ ...data, name: e.target.value })}
            />
            <Input
              value={data.description}
              onChange={(e) =>
                setData({ ...data, description: e.target.value })
              }
              placeholder="Category description"
            />
            <label className="text-muted flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={data.isActive}
                onChange={(e) =>
                  setData({ ...data, isActive: e.target.checked })
                }
                className="accent-[#d6401a]"
              />
              Active
            </label>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (
                  confirm(
                    "Delete this category and every prerequisite inside it?",
                  )
                )
                  start(async () => {
                    await deleteCategoryAction(data.id);
                    toast.success("Category deleted.");
                  });
              }}
            >
              <Trash2 size={13} />
            </Button>
            <Button
              size="sm"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const result = await upsertCategoryAction(data);
                  if (result.error) toast.error(result.error);
                  else toast.success("Category updated.");
                })
              }
            >
              {pending ? (
                <LoaderCircle size={13} className="animate-spin" />
              ) : (
                <Save size={13} />
              )}
              Save category
            </Button>
          </div>
          <div className="mt-5">
            {category.items.map((item) => (
              <ItemEditor key={item.id} categoryId={category.id} item={item} />
            ))}
          </div>
          {adding && (
            <ItemEditor
              categoryId={category.id}
              item={{
                id: "",
                title: "",
                description: "",
                verification: "",
                sortOrder: nextOrder,
                isActive: true,
              }}
            />
          )}
          <Button
            className="mt-4"
            variant="secondary"
            size="sm"
            onClick={() => setAdding(!adding)}
          >
            <Plus size={13} />
            Add prerequisite
          </Button>
        </div>
      </details>
    </Card>
  );
}
export function PrerequisiteManager({
  categories,
  currentVersion,
}: {
  categories: Category[];
  currentVersion: number;
}) {
  const [adding, setAdding] = useState(false);
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const nextOrder = Math.max(0, ...categories.map((c) => c.sortOrder)) + 1;
  return (
    <>
      <div className="mb-5 flex flex-col items-start justify-between gap-3 rounded-2xl border border-white/[.07] bg-white/[.025] p-4 sm:flex-row sm:items-center">
        <p className="text-muted text-xs">
          Active configuration version{" "}
          <b className="text-white">v{currentVersion}</b>. Every definition
          change increments the version.
        </p>
        <Button onClick={() => setAdding(!adding)}>
          <Plus size={15} />
          Create Category
        </Button>
      </div>
      {adding && (
        <Card className="mb-4 p-5">
          <div className="flex gap-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Category name"
            />
            <Button
              disabled={pending || !name.trim()}
              onClick={() =>
                start(async () => {
                  const result = await upsertCategoryAction({
                    name,
                    description: "",
                    sortOrder: nextOrder,
                    isActive: true,
                  });
                  if (result.error) toast.error(result.error);
                  else {
                    toast.success("Category created.");
                    setAdding(false);
                  }
                })
              }
            >
              {pending && <LoaderCircle size={14} className="animate-spin" />}
              Create
            </Button>
          </div>
        </Card>
      )}
      <div className="space-y-4">
        {categories.map((category) => (
          <CategoryEditor key={category.id} category={category} />
        ))}
      </div>
    </>
  );
}
