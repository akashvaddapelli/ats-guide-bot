import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowRight, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Analyze = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [inputMode, setInputMode] = useState<"jd" | "role">("role");
  const [jobDescription, setJobDescription] = useState("");
  const [roleQuery, setRoleQuery] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!file) {
      toast({ title: "Please upload your resume", variant: "destructive" });
      return;
    }
    if (inputMode === "jd" && !jobDescription.trim()) {
      toast({ title: "Please paste a job description", variant: "destructive" });
      return;
    }
    if (inputMode === "role" && !roleQuery.trim()) {
      toast({ title: "Please describe your target role", variant: "destructive" });
      return;
    }

    setAnalyzing(true);

    try {
      const reader = new FileReader();
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke("analyze-resume", {
        body: {
          fileBase64,
          fileName: file.name,
          fileType: file.type,
          inputMode,
          jobDescription: inputMode === "jd" ? jobDescription : undefined,
          roleQuery: inputMode === "role" ? roleQuery : undefined,
        },
      });

      if (error) throw error;

      if (data.analysisId) {
        // Logged-in user — navigate to saved analysis
        navigate(`/analysis/${data.analysisId}`);
      } else {
        // Guest — navigate with result in state
        navigate("/analysis/guest", { state: { result: data.result } });
      }
    } catch (err: any) {
      toast({
        title: "Analysis failed",
        description: err.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">Analyze Your Resume</h1>
          <p className="mt-1 text-muted-foreground">
            Upload your resume and tell us what you're targeting
          </p>
        </div>

        {!user && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-primary/20 bg-accent/50 p-4">
            <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
            <div className="text-sm text-muted-foreground">
              You're using SmartATS as a guest. Your results won't be saved.{" "}
              <button
                className="font-medium text-primary underline-offset-4 hover:underline"
                onClick={() => navigate("/auth?mode=register")}
              >
                Sign up
              </button>{" "}
              to save your analyses and track progress.
            </div>
          </div>
        )}

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Step 1 — Upload Resume</CardTitle>
            </CardHeader>
            <CardContent>
              <FileUpload file={file} onFileSelect={setFile} onClear={() => setFile(null)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Step 2 — What are you targeting?</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "jd" | "role")}>
                <TabsList className="mb-4 w-full">
                  <TabsTrigger value="role" className="flex-1">Describe a Role</TabsTrigger>
                  <TabsTrigger value="jd" className="flex-1">Paste Job Description</TabsTrigger>
                </TabsList>

                <TabsContent value="role">
                  <div className="space-y-2">
                    <Label>Describe your target role and experience level</Label>
                    <Textarea
                      placeholder="e.g., I am a fresher looking for a Full Stack Developer role"
                      value={roleQuery}
                      onChange={(e) => setRoleQuery(e.target.value)}
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      We'll match your resume against industry-standard requirements for that role.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="jd">
                  <div className="space-y-2">
                    <Label>Paste the full job description</Label>
                    <Textarea
                      placeholder="Paste the job description here..."
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      rows={8}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Button
            size="lg"
            className="w-full gradient-primary text-primary-foreground text-base shadow-glow"
            onClick={handleAnalyze}
            disabled={analyzing}
          >
            {analyzing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Analyzing your resume...
              </>
            ) : (
              <>
                Analyze Resume
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Analyze;
