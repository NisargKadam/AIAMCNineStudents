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
import { Field, Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Confirm } from "@/components/ui/dialog";
import { pluralize } from "@/lib/utils";

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

function ItemEditor({
  categoryId,
  item,
  onDone,
}: {
  categoryId: string;
  item: Item;
  onDone?: () => void;
}) {
  const [data, setData] = useState(item);
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="border-t border-[var(--line)] py-4">
      <div className="grid gap-3 lg:grid-cols-[5rem_1fr_auto] lg:items-end">
        <Field label="Order" htmlFor={`item-order-${data.id}`}>
          <Input
            id={`item-order-${data.id}`}
            type="number"
            min={1}
            value={data.sortOrder}
            onChange={(event) =>
              setData({ ...data, sortOrder: Number(event.target.value) })
            }
          />
        </Field>
        <Field label="Check" htmlFor={`item-title-${data.id}`}>
          <Input
            id={`item-title-${data.id}`}
            value={data.title}
            onChange={(event) =>
              setData({ ...data, title: event.target.value })
            }
            placeholder="What must be true before day one?"
          />
        </Field>
        <label className="text-dim flex h-11 cursor-pointer items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={data.isActive}
            onChange={(event) =>
              setData({ ...data, isActive: event.target.checked })
            }
            className="accent-ember size-4"
          />
          Enabled
        </label>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Textarea
          aria-label="Description"
          className="min-h-16"
          value={data.description}
          onChange={(event) =>
            setData({ ...data, description: event.target.value })
          }
          placeholder="Description shown under the check (optional)"
        />
        <Textarea
          aria-label="How to verify"
          className="min-h-16 font-mono text-xs"
          value={data.verification}
          onChange={(event) =>
            setData({ ...data, verification: event.target.value })
          }
          placeholder="How to verify it, e.g. run `python --version`"
        />
      </div>

      <div className="mt-3 flex justify-end gap-2">
        {data.id && (
          <Button
            variant="danger"
            size="sm"
            aria-label="Delete this check"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 size={13} />
          </Button>
        )}
        <Button
          size="sm"
          disabled={pending || !data.title.trim()}
          onClick={() =>
            start(async () => {
              const result = await upsertPrerequisiteAction({
                ...data,
                categoryId,
              });
              if (result.error) toast.error(result.error);
              else {
                toast.success(data.id ? "Check saved." : "Check added.");
                onDone?.();
              }
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

      <Confirm
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this check?"
        description="Student progress recorded against it is removed too, and everyone will be asked to reconfirm."
        confirmLabel="Delete check"
        pending={pending}
        onConfirm={() => {
          setConfirmDelete(false);
          start(async () => {
            await deletePrerequisiteAction(data.id);
            toast.success("Check deleted.");
          });
        }}
      />
    </div>
  );
}

function CategoryEditor({ category }: { category: Category }) {
  const [data, setData] = useState(category);
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const nextOrder =
    Math.max(0, ...category.items.map((item) => item.sortOrder)) + 1;

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <span className="text-faint num grid size-9 shrink-0 place-items-center rounded-xl border border-[var(--line)] bg-[var(--sunken)] font-mono text-[11px]">
          {String(data.sortOrder).padStart(2, "0")}
        </span>
        <span className="min-w-0 flex-1">
          <span className="font-display text-ink block truncate text-sm font-semibold">
            {data.name}
          </span>
          <span className="text-faint mt-0.5 block text-[11px]">
            {category.items.length} {pluralize(category.items.length, "check")}
          </span>
        </span>
        {!data.isActive && <Badge tone="neutral">Hidden</Badge>}
        <ChevronDown
          size={16}
          className={`text-faint shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="rise border-t border-[var(--line)] p-5">
          <div className="grid gap-3 lg:grid-cols-[5rem_1fr_1.6fr_auto] lg:items-end">
            <Field label="Order" htmlFor={`cat-order-${data.id}`}>
              <Input
                id={`cat-order-${data.id}`}
                type="number"
                min={1}
                value={data.sortOrder}
                onChange={(event) =>
                  setData({ ...data, sortOrder: Number(event.target.value) })
                }
              />
            </Field>
            <Field label="Name" htmlFor={`cat-name-${data.id}`}>
              <Input
                id={`cat-name-${data.id}`}
                value={data.name}
                onChange={(event) =>
                  setData({ ...data, name: event.target.value })
                }
              />
            </Field>
            <Field label="Description" htmlFor={`cat-desc-${data.id}`}>
              <Input
                id={`cat-desc-${data.id}`}
                value={data.description}
                onChange={(event) =>
                  setData({ ...data, description: event.target.value })
                }
                placeholder="What this group of checks covers"
              />
            </Field>
            <label className="text-dim flex h-11 cursor-pointer items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={data.isActive}
                onChange={(event) =>
                  setData({ ...data, isActive: event.target.checked })
                }
                className="accent-ember size-4"
              />
              Active
            </label>
          </div>

          <div className="mt-3 flex justify-end gap-2">
            <Button
              variant="danger"
              size="sm"
              aria-label="Delete this category"
              onClick={() => setConfirmDelete(true)}
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
                  else toast.success("Category saved.");
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
              onDone={() => setAdding(false)}
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
            Add a check
          </Button>
        </div>
      )}

      <Confirm
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete “${data.name}”?`}
        description="Every check inside it goes too, along with the progress students recorded against them."
        confirmLabel="Delete category"
        pending={pending}
        onConfirm={() => {
          setConfirmDelete(false);
          start(async () => {
            await deleteCategoryAction(data.id);
            toast.success("Category deleted.");
          });
        }}
      />
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
  const nextOrder =
    Math.max(0, ...categories.map((category) => category.sortOrder)) + 1;
  const totalChecks = categories.reduce(
    (sum, category) => sum + category.items.length,
    0,
  );

  return (
    <>
      <Card className="mb-4 flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center">
        <p className="text-dim text-xs leading-5">
          {categories.length} {pluralize(categories.length, "category")} and{" "}
          {totalChecks} {pluralize(totalChecks, "check")} at version{" "}
          <b className="text-ink num">{currentVersion}</b>. Editing any
          definition asks every student to reconfirm.
        </p>
        <Button onClick={() => setAdding(!adding)}>
          <Plus size={15} />
          New category
        </Button>
      </Card>

      {adding && (
        <Card className="rise mb-3 p-4">
          <div className="flex gap-2">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Category name"
              aria-label="New category name"
              autoFocus
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
                    setName("");
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

      <div className="space-y-2.5">
        {categories.map((category) => (
          <CategoryEditor key={category.id} category={category} />
        ))}
      </div>
    </>
  );
}
