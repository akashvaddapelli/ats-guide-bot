import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import ScoreCircle from "@/components/ScoreCircle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowLeft, Copy, Check, TrendingUp, AlertTriangle, Lightbulb, BookOpen, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AnalysisData {
  id: string;
  role_detected: string | null;
  experience_level: string | null;
  ats_score: number;
  score_label: string;
  explanation: string | null;
  missing_skills: Record<string, string[]>;
  suggestions: string[];
  improvements: Array<{ before: string; after: string }>;
  skill_roadmap: string[];
  predicted_score: number | null;
  created_at: string;
}

const AnalysisResult = () => {
  const { id } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user || !id) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("analyses")
        .select("*")
        .eq("id", id)
        .single();
      if (data) {
        setAnalysis({
          ...data,
          missing_skills: (data.missing_skills as Record<string, string[]>) || {},
          suggestions: (data.suggestions as string[]) || [],
          improvements: (data.improvements as Array<{ before: string; after: string }>) || [],
          skill_roadmap: (data.skill_roadmap as string[]) || [],
        });
      }
    };
    fetch();
  }, [user, id]);

  const copyText = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopied(index);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: "Copied to clipboard!" });
  };

  if (!analysis) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  const skillCategories = Object.entries(analysis.missing_skills).filter(
    ([, skills]) => skills.length > 0
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto max-w-4xl px-4 py-10">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col items-center gap-6 md:flex-row md:items-start"
        >
          <ScoreCircle score={analysis.ats_score} />
          <div className="flex-1 text-center md:text-left">
            <h1 className="font-display text-3xl font-bold text-foreground">
              {analysis.role_detected || "Resume Analysis"}
            </h1>
            {analysis.experience_level && (
              <span className="mt-2 inline-block rounded-full bg-accent px-3 py-1 text-sm font-medium text-accent-foreground">
                {analysis.experience_level}
              </span>
            )}
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              {analysis.score_label}
            </p>
          </div>
        </motion.div>

        <div className="space-y-6">
          {/* Why Your Score */}
          {analysis.explanation && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    Why Your Score Is {analysis.ats_score < 61 ? "Low" : "What It Is"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{analysis.explanation}</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Missing Skills */}
          {skillCategories.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="h-5 w-5 text-destructive" />
                    Missing or Weak Skills
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {skillCategories.map(([category, skills]) => (
                      <div key={category} className="rounded-xl border border-border bg-muted/30 p-4">
                        <h4 className="mb-2 font-display text-sm font-semibold text-foreground">
                          {category}
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {skills.map((skill) => (
                            <span
                              key={skill}
                              className="rounded-full border border-destructive/20 bg-destructive/5 px-2.5 py-0.5 text-xs font-medium text-destructive"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Suggestions */}
          {analysis.suggestions.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Lightbulb className="h-5 w-5 text-warning" />
                    What You Should Add to Your Resume
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.suggestions.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="mt-1 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Improvements */}
          {analysis.improvements.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="h-5 w-5 text-success" />
                    Example Resume Improvements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analysis.improvements.map((imp, i) => (
                    <div key={i} className="rounded-xl border border-border p-4">
                      <div className="mb-3">
                        <span className="text-xs font-medium text-destructive">Before:</span>
                        <p className="mt-1 text-sm text-muted-foreground line-through">{imp.before}</p>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-success">After:</span>
                        <p className="mt-1 text-sm text-foreground">{imp.after}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2"
                        onClick={() => copyText(imp.after, i)}
                      >
                        {copied === i ? (
                          <Check className="mr-1 h-3.5 w-3.5" />
                        ) : (
                          <Copy className="mr-1 h-3.5 w-3.5" />
                        )}
                        {copied === i ? "Copied!" : "Copy"}
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Skill Roadmap */}
          {analysis.skill_roadmap.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Skill Gap Roadmap
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2">
                    {analysis.skill_roadmap.map((step, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Predicted Score */}
          {analysis.predicted_score && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
              <Card className="border-primary/20 bg-accent/50">
                <CardContent className="flex items-center justify-between py-6">
                  <div>
                    <h3 className="font-display text-lg font-semibold text-foreground">
                      Predicted Score After Improvements
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      If you apply the suggestions above
                    </p>
                  </div>
                  <span className="font-display text-4xl font-bold text-success">
                    {analysis.predicted_score}%
                  </span>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AnalysisResult;
