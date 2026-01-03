import { Layout } from "@/components/layout";
import { MoodTracker } from "@/components/mood-tracker";
import { RoutineTimeline } from "@/components/routine-timeline";
import { RoutineEditor } from "@/components/routine-editor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Activity, Calendar } from "lucide-react";

export default function TrackerPage() {
  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div>
          <p className="text-muted-foreground font-medium mb-1">{format(new Date(), "EEEE, MMMM do")}</p>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
            Daily Tracker
          </h1>
        </div>

        <Tabs defaultValue="mood" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="mood" className="gap-2" data-testid="tab-mood">
              <Activity className="w-4 h-4" />
              Mood & Metrics
            </TabsTrigger>
            <TabsTrigger value="routine" className="gap-2" data-testid="tab-routine">
              <Calendar className="w-4 h-4" />
              Routine
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="mood" className="mt-6" data-testid="content-mood">
            <MoodTracker />
          </TabsContent>
          
          <TabsContent value="routine" className="mt-6 space-y-4" data-testid="content-routine">
            <div className="flex justify-end">
              <RoutineEditor />
            </div>
            <RoutineTimeline />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
