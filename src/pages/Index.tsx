import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileSearch, Target, TrendingUp, Sparkles, Shield, Zap } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";

const features = [
  {
    icon: FileSearch,
    title: "Smart Resume Parsing",
    description: "Upload PDF or DOCX resumes. Our AI extracts and understands your experience, skills, and qualifications.",
  },
  {
    icon: Target,
    title: "ATS Score Analysis",
    description: "Get an instant compatibility score against job descriptions or industry-standard role templates.",
  },
  {
    icon: TrendingUp,
    title: "Actionable Improvements",
    description: "Receive copy-ready bullet points and a skill gap roadmap to boost your resume's impact.",
  },
  {
    icon: Sparkles,
    title: "Dual Input Mode",
    description: "Paste a structured job description or simply describe your target role — we handle both.",
  },
  {
    icon: Shield,
    title: "Privacy First",
    description: "Your resume data is encrypted and never shared. Analyze with confidence.",
  },
  {
    icon: Zap,
    title: "Predicted Score",
    description: "See how your score would improve if you applied our suggestions. Plan your next move.",
  },
];

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden py-24 md:py-32">
        <div className="absolute inset-0 gradient-surface opacity-50" />
        <div className="absolute -top-40 right-0 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 left-0 h-[400px] w-[400px] rounded-full bg-primary/5 blur-3xl" />

        <div className="container relative mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground">
              <Sparkles className="h-4 w-4" />
              AI-Powered Resume Analysis
            </div>
            <h1 className="mx-auto max-w-4xl font-display text-4xl font-extrabold leading-tight tracking-tight text-foreground md:text-6xl lg:text-7xl">
              Land Your Dream Job with a{" "}
              <span className="text-gradient">Perfect Resume</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
              Analyze your resume against job descriptions or role templates.
              Get your ATS score, missing skills, and copy-ready improvements — all in seconds.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                className="gradient-primary text-primary-foreground px-8 text-base shadow-glow"
                onClick={() => navigate(user ? "/analyze" : "/auth?mode=register")}
              >
                Analyze Your Resume
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="px-8 text-base"
                onClick={() => navigate(user ? "/dashboard" : "/auth")}
              >
                {user ? "View Dashboard" : "Sign In"}
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
              Everything you need to optimize your resume
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Simple, clear, and encouraging — like a career mentor in your pocket.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="group rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground transition-colors group-hover:gradient-primary group-hover:text-primary-foreground">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-lg font-semibold text-card-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="relative overflow-hidden rounded-3xl gradient-hero p-12 text-center md:p-20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)]" />
            <div className="relative">
              <h2 className="font-display text-3xl font-bold text-primary-foreground md:text-4xl">
                Ready to stand out?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">
                Join thousands of job seekers who improved their resumes and landed interviews faster.
              </p>
              <Button
                size="lg"
                className="mt-8 bg-primary-foreground px-8 text-base text-primary hover:bg-primary-foreground/90"
                onClick={() => navigate(user ? "/analyze" : "/auth?mode=register")}
              >
                Start Free Analysis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} SmartATS. Built to help you succeed.
        </div>
      </footer>
    </div>
  );
};

export default Index;
