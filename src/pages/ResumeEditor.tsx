import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import ScoreCircle from "@/components/ScoreCircle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Download,
  RefreshCw,
  Loader2,
  Check,
  Wand2,
  Plus,
  Trash2,
  FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AnalysisData {
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
}

interface ResumeSection {
  id: string;
  title: string;
  content: string;
}

const DEFAULT_SECTIONS: ResumeSection[] = [
  { id: "summary", title: "Professional Summary", content: "" },
  { id: "experience", title: "Work Experience", content: "" },
  { id: "skills", title: "Skills", content: "" },
  { id: "education", title: "Education", content: "" },
  { id: "projects", title: "Projects", content: "" },
  { id: "certifications", title: "Certifications", content: "" },
];

function parseResumeIntoSections(text: string): ResumeSection[] {
  const sectionPatterns = [
    { id: "summary", patterns: /^(professional\s*summary|summary|objective|about\s*me|profile)/im },
    { id: "experience", patterns: /^(work\s*experience|experience|employment|professional\s*experience|work\s*history)/im },
    { id: "skills", patterns: /^(skills|technical\s*skills|core\s*competencies|competencies|technologies)/im },
    { id: "education", patterns: /^(education|academic|qualifications|academic\s*qualifications)/im },
    { id: "projects", patterns: /^(projects|personal\s*projects|academic\s*projects|key\s*projects)/im },
    { id: "certifications", patterns: /^(certifications|certificates|licenses|awards|achievements)/im },
  ];

  const lines = text.split("\n");
  const sections: ResumeSection[] = DEFAULT_SECTIONS.map((s) => ({ ...s }));
  let currentSectionId = "summary";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let matched = false;
    for (const sp of sectionPatterns) {
      if (sp.patterns.test(trimmed)) {
        currentSectionId = sp.id;
        matched = true;
        break;
      }
    }
    if (!matched) {
      const section = sections.find((s) => s.id === currentSectionId);
      if (section) {
        section.content += (section.content ? "\n" : "") + trimmed;
      }
    }
  }

  return sections.filter((s) => s.content.trim().length > 0 || ["summary", "experience", "skills", "education"].includes(s.id));
}

const ResumeEditor = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const resumeRef = useRef<HTMLDivElement>(null);

  const state = location.state as {
    analysis: AnalysisData;
    resumeText: string;
    inputMode: string;
    jobDescription?: string;
    roleQuery?: string;
  } | null;

  const [sections, setSections] = useState<ResumeSection[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<number>>(new Set());
  const [appliedImprovements, setAppliedImprovements] = useState<Set<number>>(new Set());
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  useEffect(() => {
    if (!state) {
      navigate("/analyze");
      return;
    }
    setAnalysis(state.analysis);
    setSections(parseResumeIntoSections(state.resumeText));
  }, [state, navigate]);

  const updateSection = (id: string, content: string) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, content } : s)));
  };

  const addSection = () => {
    const newId = `custom-${Date.now()}`;
    setSections((prev) => [...prev, { id: newId, title: "New Section", content: "" }]);
  };

  const removeSection = (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
  };

  const updateSectionTitle = (id: string, title: string) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)));
  };

  const applySuggestion = (suggestion: string, index: number) => {
    // Add suggestion to skills or summary section
    const skillsSection = sections.find((s) => s.id === "skills");
    if (skillsSection) {
      updateSection("skills", skillsSection.content + "\n• " + suggestion);
    } else {
      setSections((prev) => [...prev, { id: "skills", title: "Skills", content: "• " + suggestion }]);
    }
    setAppliedSuggestions((prev) => new Set(prev).add(index));
    toast({ title: "Suggestion applied to Skills section" });
  };

  const applyImprovement = (improvement: { before: string; after: string }, index: number) => {
    // Search all sections for the "before" text and replace, or append to experience
    let found = false;
    setSections((prev) =>
      prev.map((s) => {
        if (s.content.includes(improvement.before)) {
          found = true;
          return { ...s, content: s.content.replace(improvement.before, improvement.after) };
        }
        return s;
      })
    );
    if (!found) {
      const expSection = sections.find((s) => s.id === "experience");
      if (expSection) {
        updateSection("experience", expSection.content + "\n• " + improvement.after);
      }
    }
    setAppliedImprovements((prev) => new Set(prev).add(index));
    toast({ title: "Improvement applied!" });
  };

  const getFullResumeText = () => {
    return sections
      .filter((s) => s.content.trim())
      .map((s) => `${s.title}\n${s.content}`)
      .join("\n\n");
  };

  const handleReanalyze = async () => {
    if (!state) return;
    setReanalyzing(true);
    try {
      const resumeText = getFullResumeText();
      const fakeBase64 = btoa(unescape(encodeURIComponent(resumeText)));

      const { data, error } = await supabase.functions.invoke("analyze-resume", {
        body: {
          fileBase64: fakeBase64,
          fileName: "edited-resume.txt",
          fileType: "text/plain",
          inputMode: state.inputMode,
          jobDescription: state.jobDescription,
          roleQuery: state.roleQuery,
        },
      });

      if (error) throw error;
      setAnalysis(data.result);
      setAppliedSuggestions(new Set());
      setAppliedImprovements(new Set());
      toast({ title: "Re-analysis complete!", description: `New ATS Score: ${data.result.ats_score}%` });
    } catch (err: any) {
      toast({ title: "Re-analysis failed", description: err.message, variant: "destructive" });
    } finally {
      setReanalyzing(false);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const element = resumeRef.current;
      if (!element) throw new Error("Resume content not found");

      // Make it visible temporarily for rendering
      element.style.display = "block";

      await html2pdf()
        .set({
          margin: [0.5, 0.6, 0.5, 0.6],
          filename: "updated-resume.pdf",
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
        })
        .from(element)
        .save();

      element.style.display = "none";
      toast({ title: "Resume downloaded!" });
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    } finally {
      setDownloading(false);
    }
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto max-w-6xl px-4 py-10">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Results
        </Button>

        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Resume Editor</h1>
            <p className="text-muted-foreground">Edit your resume, apply suggestions, and re-check your score</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleReanalyze} disabled={reanalyzing}>
              {reanalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Re-analyze
            </Button>
            <Button onClick={handleDownloadPDF} disabled={downloading} className="gradient-primary text-primary-foreground shadow-glow">
              {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Download PDF
            </Button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Editor - Left 2 columns */}
          <div className="space-y-4 lg:col-span-2">
            {/* Contact Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4 text-primary" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <Label className="text-xs">Full Name</Label>
                    <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="John Doe" />
                  </div>
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="john@example.com" />
                  </div>
                  <div>
                    <Label className="text-xs">Phone</Label>
                    <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+1 234 567 890" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resume Sections */}
            {sections.map((section) => (
              <motion.div key={section.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Input
                        value={section.title}
                        onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                        className="h-8 border-none bg-transparent p-0 font-display text-base font-semibold shadow-none focus-visible:ring-0"
                      />
                      {!["summary", "experience", "skills", "education"].includes(section.id) && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeSection(section.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={section.content}
                      onChange={(e) => updateSection(section.id, e.target.value)}
                      rows={Math.max(3, section.content.split("\n").length + 1)}
                      className="resize-none font-mono text-sm"
                      placeholder={`Add your ${section.title.toLowerCase()} here...`}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            ))}

            <Button variant="outline" onClick={addSection} className="w-full border-dashed">
              <Plus className="mr-2 h-4 w-4" />
              Add Section
            </Button>
          </div>

          {/* Sidebar - Right column */}
          <div className="space-y-4">
            {/* Current Score */}
            <Card className="border-primary/20 bg-accent/30">
              <CardContent className="flex flex-col items-center py-6">
                <ScoreCircle score={analysis.ats_score} size={100} />
                <p className="mt-3 text-sm font-medium text-foreground">{analysis.score_label}</p>
                {analysis.predicted_score && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Potential: <span className="font-semibold text-primary">{analysis.predicted_score}%</span>
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Suggestions */}
            {analysis.suggestions.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">💡 Suggestions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {analysis.suggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-2.5 text-xs">
                      <span className="flex-1 text-muted-foreground">{s}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 flex-shrink-0"
                        onClick={() => applySuggestion(s, i)}
                        disabled={appliedSuggestions.has(i)}
                      >
                        {appliedSuggestions.has(i) ? (
                          <Check className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <Wand2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Improvements */}
            {analysis.improvements.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">✍️ Improvements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {analysis.improvements.map((imp, i) => (
                    <div key={i} className="rounded-lg border border-border bg-muted/30 p-2.5">
                      <p className="text-xs text-destructive line-through">{imp.before}</p>
                      <p className="mt-1 text-xs font-medium text-foreground">{imp.after}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-1.5 h-6 px-2 text-xs"
                        onClick={() => applyImprovement(imp, i)}
                        disabled={appliedImprovements.has(i)}
                      >
                        {appliedImprovements.has(i) ? (
                          <><Check className="mr-1 h-3 w-3" /> Applied</>
                        ) : (
                          <><Wand2 className="mr-1 h-3 w-3" /> Apply</>
                        )}
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Missing Skills */}
            {Object.entries(analysis.missing_skills).filter(([, s]) => s.length > 0).length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">🎯 Missing Skills</CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.entries(analysis.missing_skills)
                    .filter(([, skills]) => skills.length > 0)
                    .map(([cat, skills]) => (
                      <div key={cat} className="mb-2 last:mb-0">
                        <p className="text-xs font-semibold text-foreground">{cat}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {skills.map((skill) => (
                            <span key={skill} className="rounded-full border border-destructive/20 bg-destructive/5 px-2 py-0.5 text-[10px] text-destructive">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Hidden PDF template */}
      <div ref={resumeRef} style={{ display: "none" }}>
        <div style={{ fontFamily: "Arial, sans-serif", color: "#1a1a1a", padding: "0", lineHeight: "1.5" }}>
          {(contactName || contactEmail || contactPhone) && (
            <div style={{ marginBottom: "16px", borderBottom: "2px solid #2563eb", paddingBottom: "12px" }}>
              {contactName && <h1 style={{ fontSize: "22px", fontWeight: "bold", margin: "0 0 4px 0" }}>{contactName}</h1>}
              <p style={{ fontSize: "12px", color: "#555", margin: 0 }}>
                {[contactEmail, contactPhone].filter(Boolean).join(" • ")}
              </p>
            </div>
          )}
          {sections
            .filter((s) => s.content.trim())
            .map((section) => (
              <div key={section.id} style={{ marginBottom: "14px" }}>
                <h2 style={{ fontSize: "14px", fontWeight: "bold", textTransform: "uppercase", color: "#2563eb", borderBottom: "1px solid #ddd", paddingBottom: "3px", marginBottom: "6px" }}>
                  {section.title}
                </h2>
                <div style={{ fontSize: "12px", whiteSpace: "pre-wrap" }}>{section.content}</div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default ResumeEditor;
