// routes/transcripts.js - Enhanced with ML approaches (fixed)
import express from "express";
import multer from "multer";
import Tesseract from "tesseract.js";

const router = express.Router();

/* ---------- middleware: request timing FIRST so it's set for all routes ---------- */
router.use((req, _res, next) => {
  req.startTime = Date.now();
  next();
});

/* ---------- optional: debug content-type ---------- */
router.use((req, _res, next) => {
  if (process.env.NODE_ENV !== "production") {
    console.log("CT:", req.headers["content-type"]);
  }
  next();
});

/* ---------- multer: you forgot to define this ---------- */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB, tweak as needed
  },
});

/* ================== ML extractor ================== */
class MLCourseExtractor {
  constructor() {
    this.coursePatterns = [
      {
        pattern: /\b([A-Z]{2,6})\s*[-–—]?\s*(\d{2,4}[A-Z]?)\b/gi,
        confidence: 0.9,
      },
      { pattern: /\b([A-Z]{2,6})(\d{2,4}[A-Z]?)\b/gi, confidence: 0.8 },
      { pattern: /\b([A-Z]{2,6})\s+(\d{2,4}[A-Z]?)\b/gi, confidence: 0.95 },
    ];

    this.departmentMappings = {
      CPSC: "Computer Science",
      CS: "Computer Science",
      COSC: "Computer Science",
      MATH: "Mathematics",
      STAT: "Statistics",
      PHYS: "Physics",
      CHEM: "Chemistry",
      BIOL: "Biology",
      ENGL: "English",
      HIST: "History",
      PSYC: "Psychology",
      ECON: "Economics",
      PHIL: "Philosophy",
      SOCI: "Sociology",
      POLI: "Political Science",
      ENGR: "Engineering",
      MECH: "Mechanical Engineering",
      ELEC: "Electrical Engineering",
      COMM: "Communications",
    };

    this.contextClues = [
      "transcript",
      "grade",
      "credit",
      "gpa",
      "semester",
      "term",
      "course",
      "units",
      "hours",
      "degree",
      "major",
      "minor",
      "cumulative",
      "attempted",
      "earned",
      "quality points",
    ];

    this.gradePatterns = [
      /\b(A\+|A\-|A|B\+|B\-|B|C\+|C\-|C|D\+|D\-|D|F)\b/gi,
      /\b(P|CR|NC|W|I|IP|AU)\b/gi,
      /\b(\d\.\d{1,2})\b/g,
    ];

    this.pdfParseFn = null;
  }

  async enhancedOCR(buffer, mimetype) {
    if (mimetype === "application/pdf") {
      return await this.extractFromPDF(buffer);
    } else if (mimetype.startsWith("image/")) {
      return await this.extractFromImage(buffer);
    }
    throw new Error("Unsupported file type");
  }

  async extractFromPDF(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new Error("Empty PDF buffer");
    }

    if (!this.pdfParseFn) {
      let mod;
      try {
        mod = await import("pdf-parse/lib/pdf-parse.js");
      } catch {
        // some versions expose the function at the root, but that file reads a test pdf on import in others
        mod = await import("pdf-parse");
      }
      this.pdfParseFn = mod.default || mod;
    }

    const parsed = await this.pdfParseFn(buffer);
    const text = parsed?.text || "";

    console.log(
      "[ML] PDF text extracted:",
      Buffer.byteLength(text, "utf8"),
      "bytes"
    );

    if (!text || text.trim().length < 20) {
      throw new Error("PDF has no selectable text (likely a scan)");
    }

    return { text, source: "pdf" };
  }

  async extractFromImage(buffer) {
    try {
      const ocrConfig = {
        logger: () => {},
        tessedit_pageseg_mode: "1",
        preserve_interword_spaces: "1",
        tessedit_char_whitelist:
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,;:()[]{}/-+*=",
      };

      const ocr = await Tesseract.recognize(buffer, "eng", ocrConfig);
      const text = ocr.data?.text || "";
      const confidence = ocr.data?.confidence || 0;

      console.log(
        "[ML] OCR confidence:",
        confidence,
        "text bytes:",
        Buffer.byteLength(text, "utf8")
      );

      return { text, source: "ocr", confidence };
    } catch (e) {
      console.error("[ML] OCR error:", e);
      throw new Error("OCR failed. Use a clearer image or upload a PDF.");
    }
  }

  preprocessText(text) {
    let processed = text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\s+/g, " ")
      .trim();

    processed = processed
      .replace(/[|_]{2,}/g, " ")
      .replace(/\.{3,}/g, " ")
      .replace(/[-–—]{3,}/g, " ")
      .replace(/\s*\n\s*/g, "\n");

    return processed;
  }

  detectAcademicContext(text) {
    const lowerText = text.toLowerCase();
    let contextScore = 0;
    const foundClues = [];

    for (const clue of this.contextClues) {
      const matches = (lowerText.match(new RegExp(clue, "gi")) || []).length;
      if (matches > 0) {
        contextScore += matches * 0.1;
        foundClues.push(clue);
      }
    }

    contextScore += foundClues.length * 0.05;

    return {
      score: Math.min(contextScore, 1.0),
      clues: foundClues,
      isAcademic: contextScore > 0.3,
    };
  }

  extractCoursesML(text) {
    const processed = this.preprocessText(text);
    const context = this.detectAcademicContext(processed);

    console.log("[ML] Context analysis:", context);

    const courses = new Map();
    const lines = processed.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.length < 5) continue;

      const lineContext = this.analyzeLineContext(line, i, lines);
      const extractedCourses = this.extractCoursesFromLine(line, lineContext);

      for (const course of extractedCourses) {
        const key = course.code.toUpperCase();

        if (
          !courses.has(key) ||
          courses.get(key).confidence < course.confidence
        ) {
          course.department = this.getDepartmentInfo(course.dept);
          course.academicLevel = this.getAcademicLevel(course.num);
          courses.set(key, course);
        }
      }
    }

    const result = Array.from(courses.values()).sort(
      (a, b) => b.confidence - a.confidence
    );

    console.log("[ML] Extracted", result.length, "unique courses");

    return {
      courses: result,
      contextScore: context.score,
      confidence: this.calculateOverallConfidence(result, context),
    };
  }

  analyzeLineContext(line, index, allLines) {
    const context = {
      hasGrade: false,
      hasCredits: false,
      hasSemester: false,
      position: index / allLines.length,
      surroundingText: "",
    };

    for (const gradePattern of this.gradePatterns) {
      if (gradePattern.test(line)) {
        context.hasGrade = true;
        break;
      }
    }

    context.hasCredits =
      /\b(\d(?:\.\d)?)\s*(?:cr|credits?|units?|hrs?)\b/i.test(line);
    context.hasSemester =
      /\b(fall|spring|summer|winter|semester|term|session)\b/i.test(line);

    const start = Math.max(0, index - 2);
    const end = Math.min(allLines.length, index + 3);
    context.surroundingText = allLines
      .slice(start, end)
      .join(" ")
      .toLowerCase();

    return context;
  }

  extractCoursesFromLine(line, context) {
    const courses = [];

    for (const patternInfo of this.coursePatterns) {
      const { pattern, confidence: baseConfidence } = patternInfo;
      let match;

      pattern.lastIndex = 0;

      while ((match = pattern.exec(line)) !== null) {
        const [fullMatch, dept, num] = match;
        const code = `${dept} ${num}`.trim();

        let confidence = baseConfidence;

        if (this.departmentMappings[dept.toUpperCase()]) confidence += 0.1;
        if (context.hasGrade) confidence += 0.15;
        if (context.hasCredits) confidence += 0.1;
        if (context.hasSemester) confidence += 0.05;

        const courseInfo = this.extractCourseDetails(line, fullMatch, context);

        courses.push({
          code,
          dept: dept.toUpperCase(),
          num: String(num).toUpperCase(),
          confidence: Math.min(confidence, 1.0),
          ...courseInfo,
        });
      }
    }

    return courses;
  }

  extractCourseDetails(line, courseMatch, _context) {
    const details = {};

    const titleMarked = line.replace(courseMatch, "|||COURSE|||");
    const parts = titleMarked.split("|||COURSE|||");

    if (parts.length === 2) {
      const afterCourse = parts[1].trim();
      if (afterCourse.length > 3 && afterCourse.length < 100) {
        details.title = afterCourse
          .replace(/^[-–—:•·\s]+/, "")
          .replace(/[-–—:•·\s]+$/, "")
          .slice(0, 140);
      }
    }

    const creditsMatch = line.match(
      /\b(\d(?:\.\d)?)\s*(?:cr|credits?|units?|hrs?)\b/i
    );
    if (creditsMatch) {
      details.credits = parseFloat(creditsMatch[1]);
    }

    for (const gradePattern of this.gradePatterns) {
      const gradeMatch = line.match(gradePattern);
      if (gradeMatch && gradeMatch[0].length <= 3) {
        details.grade = gradeMatch[0].toUpperCase();
        break;
      }
    }

    return details;
  }

  getDepartmentInfo(deptCode) {
    return {
      code: deptCode,
      name: this.departmentMappings[deptCode] || "Unknown Department",
    };
  }

  getAcademicLevel(courseNum) {
    const num = parseInt(courseNum, 10);
    if (Number.isNaN(num)) return "Unknown";
    if (num < 100) return "Developmental";
    if (num < 200) return "Freshman";
    if (num < 300) return "Sophomore";
    if (num < 400) return "Junior";
    if (num < 500) return "Senior";
    if (num < 600) return "Graduate";
    return "Advanced Graduate";
  }

  calculateOverallConfidence(courses, context) {
    if (!courses.length) return 0.1;
    const avg =
      courses.reduce((sum, c) => sum + c.confidence, 0) / courses.length;
    const contextWeight = Math.min(context.score, 0.3);
    return Math.min(avg + contextWeight, 1.0);
  }

  formatOutput(extraction) {
    const { courses, contextScore, confidence } = extraction;

    const creditsBlock = courses
      .map((course) => {
        const parts = [course.code];
        if (course.title) parts.push(course.title);
        if (course.credits != null) parts.push(`${course.credits} cr`);
        if (course.grade) parts.push(`grade ${course.grade}`);
        if (course.department?.name !== "Unknown Department") {
          parts.push(`(${course.department.name})`);
        }
        return parts.join(" — ");
      })
      .join("\n");

    const notes = [];
    if (confidence < 0.5) notes.push("Low confidence extraction");
    if (contextScore < 0.3) notes.push("Weak academic context detected");
    if (courses.length === 0) notes.push("No courses detected");

    return {
      extracted: courses.map((c) => ({
        code: c.code,
        title: c.title || "",
        credits: c.credits,
        grade: c.grade,
        department: c.department?.name,
        academicLevel: c.academicLevel,
        confidence: c.confidence,
      })),
      creditsBlock,
      confidence,
      contextScore,
      notes,
    };
  }
}

const mlExtractor = new MLCourseExtractor();

/* ---------- route: /extract ---------- */
router.post("/extract", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Missing file" });
    }

    const { mimetype, buffer, originalname } = req.file;
    console.log(
      "[ML] Processing file:",
      originalname,
      mimetype,
      buffer.length,
      "bytes"
    );

    const textData = await mlExtractor.enhancedOCR(buffer, mimetype);
    const extraction = mlExtractor.extractCoursesML(textData.text);
    const output = mlExtractor.formatOutput(extraction);

    const processingTime =
      typeof req.startTime === "number" ? Date.now() - req.startTime : 0;

    console.log("[ML] Final results:", {
      coursesFound: output.extracted.length,
      confidence: output.confidence,
      contextScore: output.contextScore,
      processingTime,
    });

    return res.json({
      source: textData.source,
      ...output,
      mlEnhanced: true,
      processingTime,
    });
  } catch (err) {
    console.error("[ML] Extraction error:", err);

    if (err.message.includes("PDF has no selectable text")) {
      return res.status(422).json({
        message:
          "PDF contains scanned images with no selectable text. Please upload as an image file for OCR processing.",
        notes: ["Scanned PDF detected"],
      });
    }

    if (err.message.includes("OCR failed")) {
      return res.status(422).json({
        message:
          "OCR processing failed. Please ensure the image is clear and contains readable text.",
        notes: ["OCR processing failed"],
      });
    }

    return res.status(500).json({
      message: "Extraction failed",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

export default router;
