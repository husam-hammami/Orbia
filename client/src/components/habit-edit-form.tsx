import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Habit, Category, Frequency } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil } from "lucide-react";

const formSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().optional(),
  category: z.enum(["Health", "Work", "Mindfulness", "Creativity", "Social", "Finance", "Recovery"] as [string, ...string[]]),
  frequency: z.enum(["daily", "weekly"] as [string, ...string[]]),
  target: z.coerce.number().min(1, "Target must be at least 1"),
  unit: z.string().min(1, "Unit is required"),
  color: z.string(),
});

interface HabitEditFormProps {
  habit: Habit;
  onSubmit: (id: string, data: Partial<Omit<Habit, "id" | "streak" | "completedToday" | "history">>) => void;
  trigger?: React.ReactNode;
}

export function HabitEditForm({ habit, onSubmit, trigger }: HabitEditFormProps) {
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: habit.title,
      description: habit.description || "",
      category: habit.category,
      frequency: habit.frequency,
      target: habit.target,
      unit: habit.unit || "times",
      color: habit.color,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: habit.title,
        description: habit.description || "",
        category: habit.category,
        frequency: habit.frequency,
        target: habit.target,
        unit: habit.unit || "times",
        color: habit.color,
      });
    }
  }, [open, habit, form]);

  const handleSubmit = (data: z.infer<typeof formSchema>) => {
    onSubmit(habit.id, {
      ...data,
      category: data.category as Category,
      frequency: data.frequency as Frequency,
    });
    setOpen(false);
  };

  const colors = [
    { name: "Bamboo Green", value: "hsl(142 40% 45%)" },
    { name: "Ocean Teal", value: "hsl(180 30% 50%)" },
    { name: "Sunset Orange", value: "hsl(32 60% 60%)" },
    { name: "Deep Purple", value: "hsl(260 20% 60%)" },
    { name: "Soft Red", value: "hsl(0 40% 70%)" },
    { name: "Sky Blue", value: "hsl(200 60% 60%)" },
    { name: "Slate", value: "hsl(220 10% 40%)" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-edit-habit-${habit.id}`}>
            <Pencil className="w-4 h-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Habit</DialogTitle>
          <DialogDescription>
            Update your habit details. Your history will be preserved.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Habit Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Morning Meditation" {...field} data-testid="input-edit-habit-title" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-habit-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Health">Health</SelectItem>
                        <SelectItem value="Work">Work</SelectItem>
                        <SelectItem value="Mindfulness">Mindfulness</SelectItem>
                        <SelectItem value="Creativity">Creativity</SelectItem>
                        <SelectItem value="Social">Social</SelectItem>
                        <SelectItem value="Finance">Finance</SelectItem>
                        <SelectItem value="Recovery">Recovery & Mobility</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-habit-color">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: field.value }} />
                            <SelectValue placeholder="Select color" />
                          </div>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {colors.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.value }} />
                              {c.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <FormField
                control={form.control}
                name="target"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Daily Target</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} data-testid="input-edit-habit-target" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. min, pages" {...field} data-testid="input-edit-habit-unit" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="submit" data-testid="button-save-habit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
