import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) throw new Error("Invalid authentication");

    const { fileBase64, fileName, fileType, inputMode, jobDescription, roleQuery } = await req.json();

    if (!fileBase64 || !fileName) throw new Error("No file provided");

    // Extract text from resume (send to AI for extraction)
    const resumeText = await extractResumeText(fileBase64, fileName, fileType);

    // Save resume
    const { data: resume } = await supabase
      .from("resumes")
      .insert({ user_id: user.id, file_name: fileName, parsed_text: resumeText })
      .select("id")
      .single();

    // Analyze with AI
    const analysisResult = await analyzeWithAI(resumeText, inputMode, jobDescription, roleQuery);

    // Save analysis
    const { data: analysis } = await supabase
      .from("analyses")
      .insert({
        user_id: user.id,
        resume_id: resume?.id,
        input_mode: inputMode,
        role_detected: analysisResult.role_detected,
        experience_level: analysisResult.experience_level,
        ats_score: analysisResult.ats_score,
        score_label: analysisResult.score_label,
        missing_skills: analysisResult.missing_skills,
        suggestions: analysisResult.suggestions,
        improvements: analysisResult.improvements,
        skill_roadmap: analysisResult.skill_roadmap,
        predicted_score: analysisResult.predicted_score,
        explanation: analysisResult.explanation,
      })
      .select("id")
      .single();

    return new Response(
      JSON.stringify({ analysisId: analysis?.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function extractResumeText(fileBase64: string, fileName: string, fileType: string): Promise<string> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY")!;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content: "You are a resume text extractor. Extract all text content from the provided resume document. Return ONLY the raw text content, preserving structure like sections, bullet points, and formatting. Do not add any commentary.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract all text from this resume file named "${fileName}" (type: ${fileType}). Return the complete text content.`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${fileType || "application/pdf"};base64,${fileBase64}`,
              },
            },
          ],
        },
      ],
    }),
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "Could not extract text from resume.";
}

async function analyzeWithAI(
  resumeText: string,
  inputMode: string,
  jobDescription?: string,
  roleQuery?: string
) {
  const apiKey = Deno.env.get("LOVABLE_API_KEY")!;

  const prompt = inputMode === "jd"
    ? `Analyze this resume against the following job description.

JOB DESCRIPTION:
${jobDescription}

RESUME:
${resumeText}`
    : `Analyze this resume for someone who describes themselves as: "${roleQuery}"

Detect the target role and experience level from their description. Use industry-standard skill requirements for that role and experience level.

RESUME:
${resumeText}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content: `You are an expert ATS (Applicant Tracking System) resume analyzer and career mentor. You speak in simple, encouraging human language. You NEVER show technical scoring internals, cosine similarity values, weight distributions, or internal math.

Your task is to analyze a resume and return a JSON object with the following structure:

{
  "role_detected": "The detected target role (e.g., Full Stack Developer)",
  "experience_level": "Detected experience level (e.g., Fresher, 1-3 years, Senior)",
  "ats_score": <number 0-100>,
  "score_label": "One of: Needs Improvement (0-40), Moderate Match (41-60), Strong Match (61-80), Excellent Match (81-100)",
  "explanation": "2-3 simple sentences explaining why the score is what it is. Be encouraging and constructive. No technical jargon.",
  "missing_skills": {
    "Frontend": ["skill1", "skill2"],
    "Backend": ["skill1"],
    "Database": [],
    "Tools": ["tool1"],
    "Concepts": ["concept1"]
  },
  "suggestions": [
    "Clear bullet-point instruction of what to add to the resume",
    "Another suggestion"
  ],
  "improvements": [
    {
      "before": "A weak bullet from the resume or a generic example",
      "after": "An improved, specific, achievement-oriented version"
    }
  ],
  "skill_roadmap": [
    "Learn X to fill the most critical gap",
    "Practice Y through projects"
  ],
  "predicted_score": <number 0-100, the estimated score if suggestions are applied>
}

Rules:
- Only include skill categories that are relevant. Remove empty categories from missing_skills.
- Do NOT assume missing requirements. Only evaluate against what's actually specified or standard for the role.
- Penalize keyword stuffing — if the same skill is repeated excessively, don't give extra credit.
- Provide 2-4 realistic before/after improvements.
- Be encouraging and mentor-like. Focus on helping the person understand what to improve.
- Return ONLY valid JSON. No markdown, no code blocks, no explanation outside the JSON.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
    }),
  });

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "{}";

  // Parse JSON from response (handle potential markdown code blocks)
  const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try {
    return JSON.parse(jsonStr);
  } catch {
    return {
      role_detected: "Unknown",
      experience_level: "Unknown",
      ats_score: 0,
      score_label: "Needs Improvement",
      explanation: "We had trouble analyzing your resume. Please try again.",
      missing_skills: {},
      suggestions: ["Please try uploading your resume again."],
      improvements: [],
      skill_roadmap: [],
      predicted_score: null,
    };
  }
}
