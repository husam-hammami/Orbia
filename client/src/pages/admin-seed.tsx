import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Database, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function AdminSeed() {
  const [seedKey, setSeedKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; seeded?: Record<string, number>; error?: string } | null>(null);

  const handleSeed = async () => {
    if (!seedKey.trim()) {
      toast.error("Please enter the seed key");
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/admin/seed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-seed-key": seedKey.trim(),
        },
      });

      const data = await response.json();

      if (response.ok) {
        setResult({ success: true, seeded: data.seeded });
        toast.success("Database seeded successfully!");
      } else {
        setResult({ success: false, error: data.error || "Failed to seed" });
        toast.error(data.error || "Failed to seed database");
      }
    } catch (error) {
      setResult({ success: false, error: "Network error" });
      toast.error("Failed to connect to server");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Admin: Seed Database
            </CardTitle>
            <CardDescription>
              Populate the database with initial data (habits, routines, states, career projects).
              This is a one-time operation for new deployments.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="seedKey">Seed Key</Label>
              <Input
                id="seedKey"
                type="password"
                value={seedKey}
                onChange={(e) => setSeedKey(e.target.value)}
                placeholder="Enter the admin seed key"
                data-testid="input-seed-key"
              />
            </div>

            <Button
              onClick={handleSeed}
              disabled={isLoading}
              className="w-full"
              data-testid="button-seed"
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Seed Database
            </Button>

            {result && (
              <div className={`p-4 rounded-lg border ${result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                {result.success ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-green-700 font-medium">
                      <CheckCircle className="w-5 h-5" />
                      Database seeded successfully!
                    </div>
                    {result.seeded && (
                      <ul className="text-sm text-green-600 space-y-1 ml-7">
                        {Object.entries(result.seeded).map(([key, count]) => (
                          <li key={key}>{key}: {count} records</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="w-5 h-5" />
                    {result.error}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
