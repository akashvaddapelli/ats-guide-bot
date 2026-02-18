import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FileText, TrendingUp, Clock } from "lucide-react";
import { motion } from "framer-motion";

interface Analysis {
  id: string;
  role_detected: string | null;
  experience_level: string | null;
  ats_score: number;
  score_label: string;
  created_at: string;
}

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchAnalyses = async () => {
      const { data } = await supabase
        .from("analyses")
        .select("id, role_detected, experience_level, ats_score, score_label, created_at")
        .order("created_at", { ascending: false });
      setAnalyses(data || []);
      setFetching(false);
    };
    fetchAnalyses();
  }, [user]);

  const getScoreColor = (score: number) => {
    if (score >= 81) return "text-success";
    if (score >= 61) return "text-primary";
    if (score >= 41) return "text-warning";
    return "text-destructive";
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="mt-1 text-muted-foreground">Your resume analysis history</p>
          </div>
          <Button onClick={() => navigate("/analyze")} className="gradient-primary text-primary-foreground">
            <Plus className="mr-2 h-4 w-4" />
            New Analysis
          </Button>
        </div>

        {fetching ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="h-32 p-6" />
              </Card>
            ))}
          </div>
        ) : analyses.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="font-display text-lg font-semibold text-foreground">No analyses yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">Upload your resume to get started</p>
              <Button onClick={() => navigate("/analyze")} className="mt-6 gradient-primary text-primary-foreground">
                Start Your First Analysis
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {analyses.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card
                  className="cursor-pointer transition-all hover:border-primary/30 hover:shadow-md"
                  onClick={() => navigate(`/analysis/${a.id}`)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span className="truncate">{a.role_detected || "Resume Analysis"}</span>
                      <span className={`font-display text-2xl font-bold ${getScoreColor(a.ats_score)}`}>
                        {a.ats_score}%
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5" />
                        {a.score_label}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(a.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {a.experience_level && (
                      <span className="mt-3 inline-block rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
                        {a.experience_level}
                      </span>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
