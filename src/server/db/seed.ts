/**
 * DEMO SEED — every person, company, schedule, price and question below is
 * FICTIONAL sample data for demonstration. Nothing here represents a real
 * accreditation, qualification, customer or reviewed safety assessment.
 */
import { hashPassword } from "better-auth/crypto";
import type { Db } from "./client";
import {
  account,
  attendance,
  certificates,
  courses,
  courseSessions,
  enrollments,
  examAttempts,
  exams,
  inquiries,
  instructors,
  invitations,
  memberships,
  orders,
  organizations,
  questions,
  seatPurchases,
  user,
} from "./schema";
import type { QuestionOption } from "./schema";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../config";
import { computeTotals } from "../services/orders";
import { generateCertificateNumber } from "../services/certificates";
import { hashToken } from "../services/company";

/** A moment `days` from now at the given Riyadh wall-clock hour (UTC+3, no DST). */
function riyadh(days: number, hour: number, minute = 0) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hour - 3, minute, 0, 0);
  return d;
}

type Q = [en: string, ar: string, options: [en: string, ar: string][], correctIndex: number];

const sampleCredential = {
  title: { en: "Sample credential — replace with a verified qualification", ar: "مؤهل تجريبي — يُستبدل بمؤهل موثّق" },
  issuer: "—",
  verified: false,
};

export async function seedDemo(db: Db) {
  const pw = await hashPassword(DEMO_PASSWORD);

  async function addUser(email: string, name: string, nameAr: string, role: "learner" | "instructor" | "admin", phone: string) {
    const id = crypto.randomUUID();
    await db.insert(user).values({ id, email, name, nameAr, role, phone, emailVerified: true, isDemo: true, locale: "ar" });
    await db.insert(account).values({ id: crypto.randomUUID(), accountId: id, providerId: "credential", userId: id, password: pw });
    return id;
  }

  /* ---------- People ---------- */
  const learnerId = await addUser(DEMO_ACCOUNTS.learner, "Noura Al-Harbi", "نورة الحربي", "learner", "+966500000001");
  const managerId = await addUser(DEMO_ACCOUNTS.manager, "Faisal Al-Otaibi", "فيصل العتيبي", "learner", "+966500000002");
  const instructorUserId = await addUser(DEMO_ACCOUNTS.instructor, "Khalid Al-Mansour", "خالد المنصور", "instructor", "+966500000003");
  await addUser(DEMO_ACCOUNTS.admin, "Aman Administrator", "مسؤول أمان", "admin", "+966500000004");
  const emp1 = await addUser("maha@demo.aman.example", "Maha Al-Qahtani", "مها القحطاني", "learner", "+966500000011");
  const emp2 = await addUser("yousef@demo.aman.example", "Yousef Al-Zahrani", "يوسف الزهراني", "learner", "+966500000012");
  const emp3 = await addUser("reem@demo.aman.example", "Reem Al-Dossari", "ريم الدوسري", "learner", "+966500000013");
  const emp4 = await addUser("omar@demo.aman.example", "Omar Al-Ghamdi", "عمر الغامدي", "learner", "+966500000014");

  /* ---------- Instructors (sample profiles) ---------- */
  const [insKhalid, insLayla, insTariq] = await db
    .insert(instructors)
    .values([
      {
        userId: instructorUserId,
        nameEn: "Khalid Al-Mansour",
        nameAr: "خالد المنصور",
        titleEn: "Lead instructor, fire safety (sample profile)",
        titleAr: "مدرب رئيسي، السلامة من الحرائق (ملف تجريبي)",
        bioEn: "Sample instructor profile used for demonstration. Real biographies and verified credentials will be published here before launch.",
        bioAr: "ملف مدرب تجريبي لأغراض العرض. ستُنشر هنا السير الذاتية الحقيقية والمؤهلات الموثّقة قبل الإطلاق.",
        credentials: [sampleCredential],
        isSample: true,
      },
      {
        nameEn: "Layla Al-Shehri",
        nameAr: "ليلى الشهري",
        titleEn: "Instructor, first aid (sample profile)",
        titleAr: "مدربة، الإسعافات الأولية (ملف تجريبي)",
        bioEn: "Sample instructor profile used for demonstration. Real biographies and verified credentials will be published here before launch.",
        bioAr: "ملف مدربة تجريبي لأغراض العرض. ستُنشر هنا السير الذاتية الحقيقية والمؤهلات الموثّقة قبل الإطلاق.",
        credentials: [sampleCredential],
        isSample: true,
      },
      {
        nameEn: "Tariq Al-Anazi",
        nameAr: "طارق العنزي",
        titleEn: "Instructor, defensive driving (sample profile)",
        titleAr: "مدرب، القيادة الوقائية (ملف تجريبي)",
        bioEn: "Sample instructor profile used for demonstration. Real biographies and verified credentials will be published here before launch.",
        bioAr: "ملف مدرب تجريبي لأغراض العرض. ستُنشر هنا السير الذاتية الحقيقية والمؤهلات الموثّقة قبل الإطلاق.",
        credentials: [sampleCredential],
        isSample: true,
      },
    ])
    .returning();

  /* ---------- Courses ---------- */
  const [firstAid, fire, driving] = await db
    .insert(courses)
    .values([
      {
        slug: "first-aid",
        createdAt: new Date(Date.now() - 3 * 60_000),
        code: "FA-101",
        icon: "heart",
        titleEn: "First Aid",
        titleAr: "الإسعافات الأولية",
        summaryEn: "Recognise an emergency, keep yourself safe, and take the right first steps until professional help arrives.",
        summaryAr: "تعرّف على الحالة الطارئة، حافظ على سلامتك، واتخذ الخطوات الأولى الصحيحة حتى وصول المساعدة المتخصصة.",
        overviewEn:
          "A live, instructor-led online course that builds the knowledge and judgement needed in the first minutes of a medical emergency at home, at work or on the road. You will work through realistic scenarios with the instructor, ask questions, and learn when and how to call for help in Saudi Arabia.",
        overviewAr:
          "دورة مباشرة عن بُعد يقدّمها مدرب، تبني المعرفة وحسن التقدير اللازمين في الدقائق الأولى من أي حالة طبية طارئة في المنزل أو العمل أو على الطريق. ستناقش مع المدرب مواقف واقعية، وتطرح أسئلتك، وتتعلم متى وكيف تطلب المساعدة داخل المملكة العربية السعودية.",
        outcomes: {
          en: [
            "Assess a scene for danger before approaching a casualty",
            "Describe the steps of a primary survey and when to call emergency services",
            "Explain the principles of CPR and the purpose of an AED",
            "Describe first-response actions for bleeding, burns, choking and fractures",
            "Recognise warning signs of heart attack, stroke and heat illness",
          ],
          ar: [
            "تقييم موقع الحادث والتأكد من خلوّه من الخطر قبل الاقتراب من المصاب",
            "وصف خطوات الفحص الأولي ومتى يجب الاتصال بخدمات الطوارئ",
            "شرح مبادئ الإنعاش القلبي الرئوي والغرض من جهاز مزيل الرجفان الآلي",
            "وصف إجراءات الاستجابة الأولى للنزيف والحروق والاختناق والكسور",
            "تمييز العلامات التحذيرية للنوبة القلبية والسكتة الدماغية والإجهاد الحراري",
          ],
        },
        audience: {
          en: ["Individuals and families", "Office and retail staff", "Workplace first-aid volunteers"],
          ar: ["الأفراد والعائلات", "موظفو المكاتب والمتاجر", "المتطوعون للإسعافات الأولية في بيئة العمل"],
        },
        prerequisites: {
          en: ["No prior training required", "A device with a stable internet connection, microphone and speakers"],
          ar: ["لا يُشترط تدريب سابق", "جهاز متصل بإنترنت مستقر مع ميكروفون وسماعات"],
        },
        syllabus: [
          {
            title: { en: "Staying safe and assessing the scene", ar: "السلامة الشخصية وتقييم الموقع" },
            topics: {
              en: ["Dangers to rescuer and casualty", "Calling for help: what to say", "Consent and reassurance"],
              ar: ["المخاطر على المسعف والمصاب", "طلب المساعدة: ماذا تقول", "أخذ الإذن وطمأنة المصاب"],
            },
          },
          {
            title: { en: "The unresponsive casualty", ar: "المصاب فاقد الاستجابة" },
            topics: {
              en: ["Primary survey", "Recovery position", "CPR principles and AED awareness"],
              ar: ["الفحص الأولي", "وضعية الإفاقة", "مبادئ الإنعاش القلبي الرئوي والتعريف بمزيل الرجفان"],
            },
          },
          {
            title: { en: "Injuries", ar: "الإصابات" },
            topics: {
              en: ["Severe bleeding", "Burns and scalds", "Fractures and sprains"],
              ar: ["النزيف الشديد", "الحروق والسمط", "الكسور والالتواءات"],
            },
          },
          {
            title: { en: "Sudden illness", ar: "الحالات المرضية المفاجئة" },
            topics: {
              en: ["Choking", "Heart attack and stroke", "Heat exhaustion and heat stroke"],
              ar: ["الاختناق", "النوبة القلبية والسكتة الدماغية", "الإنهاك الحراري وضربة الشمس"],
            },
          },
        ],
        practicalNoteEn:
          "This course is delivered live online and assesses knowledge only. Hands-on skills such as chest compressions and using an AED need supervised in-person practice and assessment, which this course does not include. If your employer or a regulator requires a practical first-aid qualification, confirm what they accept before enrolling.",
        practicalNoteAr:
          "تُقدَّم هذه الدورة مباشرة عن بُعد وتقيّم الجانب المعرفي فقط. المهارات العملية مثل الضغطات الصدرية واستخدام مزيل الرجفان تتطلب تدريباً وتقييماً حضورياً تحت الإشراف، وهو غير مشمول في هذه الدورة. إذا كانت جهة عملك أو جهة تنظيمية تشترط مؤهلاً عملياً في الإسعافات الأولية، فتأكد مما تقبله قبل التسجيل.",
        durationMinutes: 240,
        priceHalalas: 45_000,
        minAttendancePercent: 80,
        certificateValidityMonths: 24,
      },
      {
        slug: "fire-fighting",
        createdAt: new Date(Date.now() - 2 * 60_000),
        code: "FF-201",
        icon: "flame",
        titleEn: "Fire Fighting",
        titleAr: "مكافحة الحرائق",
        summaryEn: "Understand how fires start and spread, how to prevent them, and how to respond and evacuate safely.",
        summaryAr: "افهم كيف تنشأ الحرائق وتنتشر، وكيف تُمنع، وكيف تستجيب لها وتُخلي المكان بأمان.",
        overviewEn:
          "A live online course on fire prevention and first response for workplaces and homes. With your instructor you will study how fire behaves, the classes of fire, how extinguishers are selected, and how to make the decision that matters most: fight a small fire or get everyone out.",
        overviewAr:
          "دورة مباشرة عن بُعد في الوقاية من الحرائق والاستجابة الأولى لها في أماكن العمل والمنازل. ستدرس مع المدرب سلوك النار وأصناف الحرائق وكيفية اختيار الطفاية المناسبة، وكيف تتخذ القرار الأهم: مكافحة حريق صغير أم إخلاء الجميع.",
        outcomes: {
          en: [
            "Explain the fire triangle and how fires spread",
            "Identify common workplace and household fire hazards",
            "Match extinguisher types to classes of fire",
            "Describe the PASS technique and its limits",
            "Outline an evacuation: alarm, routes, assembly point and roll call",
          ],
          ar: [
            "شرح مثلث الحريق وكيفية انتشار النار",
            "تحديد مخاطر الحريق الشائعة في العمل والمنزل",
            "ربط أنواع الطفايات بأصناف الحرائق",
            "وصف طريقة استخدام الطفاية (اسحب، صوّب، اضغط، حرّك) وحدودها",
            "تلخيص خطوات الإخلاء: الإنذار، المسارات، نقطة التجمع، والتمام",
          ],
        },
        audience: {
          en: ["Employees in offices, warehouses and retail", "Fire wardens and facility coordinators", "Homeowners"],
          ar: ["الموظفون في المكاتب والمستودعات والمتاجر", "مراقبو السلامة ومنسقو المرافق", "أصحاب المنازل"],
        },
        prerequisites: {
          en: ["No prior training required", "A device with a stable internet connection, microphone and speakers"],
          ar: ["لا يُشترط تدريب سابق", "جهاز متصل بإنترنت مستقر مع ميكروفون وسماعات"],
        },
        syllabus: [
          {
            title: { en: "How fire works", ar: "كيف تعمل النار" },
            topics: {
              en: ["Fire triangle", "Heat transfer and smoke", "Classes of fire"],
              ar: ["مثلث الحريق", "انتقال الحرارة والدخان", "أصناف الحرائق"],
            },
          },
          {
            title: { en: "Prevention", ar: "الوقاية" },
            topics: {
              en: ["Electrical and cooking hazards", "Housekeeping and storage", "Detection and alarms"],
              ar: ["مخاطر الكهرباء والطهي", "النظافة والتخزين", "أنظمة الكشف والإنذار"],
            },
          },
          {
            title: { en: "First response", ar: "الاستجابة الأولى" },
            topics: {
              en: ["Fight or leave: making the decision", "Extinguisher types", "The PASS technique"],
              ar: ["المكافحة أم المغادرة: اتخاذ القرار", "أنواع الطفايات", "طريقة استخدام الطفاية"],
            },
          },
          {
            title: { en: "Evacuation", ar: "الإخلاء" },
            topics: {
              en: ["Raising the alarm", "Escape routes and assembly points", "Helping people who need assistance"],
              ar: ["إطلاق الإنذار", "مسارات الهروب ونقاط التجمع", "مساعدة من يحتاجون إلى عون"],
            },
          },
        ],
        practicalNoteEn:
          "This course is delivered live online and assesses knowledge only. Discharging an extinguisher or using a fire hose requires supervised in-person practice, which this course does not include. If your site requires a practical fire-warden or fire-fighting qualification, confirm the requirement with your employer or the relevant authority.",
        practicalNoteAr:
          "تُقدَّم هذه الدورة مباشرة عن بُعد وتقيّم الجانب المعرفي فقط. تشغيل الطفاية أو استخدام خرطوم الحريق يتطلب تدريباً حضورياً تحت الإشراف، وهو غير مشمول في هذه الدورة. إذا كان موقع عملك يشترط مؤهلاً عملياً لمراقب السلامة أو مكافحة الحرائق، فتأكد من المتطلب لدى جهة عملك أو الجهة المختصة.",
        durationMinutes: 300,
        priceHalalas: 55_000,
        minAttendancePercent: 80,
        certificateValidityMonths: 24,
      },
      {
        slug: "defensive-driving",
        createdAt: new Date(Date.now() - 1 * 60_000),
        code: "DD-301",
        icon: "car",
        titleEn: "Defensive Driving",
        titleAr: "القيادة الوقائية",
        summaryEn: "Anticipate hazards, manage speed and space, and build the habits that prevent collisions.",
        summaryAr: "توقّع المخاطر، وتحكّم بالسرعة والمسافة، واكتسب العادات التي تمنع الحوادث.",
        overviewEn:
          "A live online course in the thinking behind safe driving. Using discussion and road scenarios, you will practise spotting hazards early, managing following distance and speed, handling fatigue and distraction, and adapting to conditions common on Saudi roads such as heat, sand and long highway journeys.",
        overviewAr:
          "دورة مباشرة عن بُعد في أسلوب التفكير الذي تقوم عليه القيادة الآمنة. عبر النقاش ومواقف من الطريق، ستتدرب على اكتشاف المخاطر مبكراً، وضبط مسافة الأمان والسرعة، والتعامل مع الإرهاق والتشتت، والتكيف مع ظروف شائعة على طرق المملكة مثل الحرارة والرمال والرحلات الطويلة على الطرق السريعة.",
        outcomes: {
          en: [
            "Apply a see–think–do routine to anticipate hazards",
            "Explain following distance and how speed changes stopping distance",
            "Identify the main forms of distraction and how to remove them",
            "Recognise fatigue and plan long journeys safely",
            "Describe adjustments for heat, sandstorms, rain and night driving",
          ],
          ar: [
            "تطبيق أسلوب «انظر – فكّر – تصرّف» لتوقّع المخاطر",
            "شرح مسافة الأمان وكيف تؤثر السرعة في مسافة التوقف",
            "تحديد أبرز أشكال التشتت وكيفية تجنبها",
            "تمييز علامات الإرهاق والتخطيط الآمن للرحلات الطويلة",
            "وصف ما يلزم تعديله عند الحرارة والعواصف الرملية والمطر والقيادة الليلية",
          ],
        },
        audience: {
          en: ["Licensed drivers of any experience level", "Employees who drive for work", "Fleet and logistics teams"],
          ar: ["حاملو رخص القيادة بمختلف مستويات الخبرة", "الموظفون الذين يقودون ضمن مهام العمل", "فرق الأساطيل والخدمات اللوجستية"],
        },
        prerequisites: {
          en: ["A valid driving licence is recommended", "A device with a stable internet connection, microphone and speakers"],
          ar: ["يُفضّل وجود رخصة قيادة سارية", "جهاز متصل بإنترنت مستقر مع ميكروفون وسماعات"],
        },
        syllabus: [
          {
            title: { en: "The defensive mindset", ar: "عقلية القيادة الوقائية" },
            topics: {
              en: ["What causes collisions", "See–think–do", "Attitude and patience"],
              ar: ["أسباب الحوادث", "انظر – فكّر – تصرّف", "السلوك والتحلي بالصبر"],
            },
          },
          {
            title: { en: "Space and speed", ar: "المسافة والسرعة" },
            topics: {
              en: ["Following distance", "Stopping distance", "Blind spots and lane changes"],
              ar: ["مسافة الأمان", "مسافة التوقف", "النقاط العمياء وتغيير المسار"],
            },
          },
          {
            title: { en: "The driver", ar: "السائق" },
            topics: {
              en: ["Distraction and phones", "Fatigue", "Seat belts and child restraints"],
              ar: ["التشتت والهاتف", "الإرهاق", "أحزمة الأمان ومقاعد الأطفال"],
            },
          },
          {
            title: { en: "Conditions", ar: "ظروف الطريق" },
            topics: {
              en: ["Heat and tyre care", "Sandstorms and rain", "Night and highway driving"],
              ar: ["الحرارة والعناية بالإطارات", "العواصف الرملية والمطر", "القيادة الليلية وعلى الطرق السريعة"],
            },
          },
        ],
        practicalNoteEn:
          "This course is delivered live online and assesses knowledge only. It does not include an on-road driving assessment and is not a driving licence, licence renewal or a substitute for any official driver training.",
        practicalNoteAr:
          "تُقدَّم هذه الدورة مباشرة عن بُعد وتقيّم الجانب المعرفي فقط. لا تتضمن تقييماً عملياً للقيادة على الطريق، وليست رخصة قيادة أو تجديداً لها ولا بديلاً عن أي تدريب رسمي للسائقين.",
        durationMinutes: 240,
        priceHalalas: 40_000,
        minAttendancePercent: 80,
        certificateValidityMonths: null,
      },
    ])
    .returning();

  /* ---------- Sessions ---------- */
  const join = {
    joinInstructionsEn:
      "Join 10 minutes early to test your audio. Use your full name as shown on your account so attendance can be recorded. Keep your camera available if the instructor asks for it.",
    joinInstructionsAr:
      "انضم قبل الموعد بعشر دقائق لاختبار الصوت. استخدم اسمك الكامل كما هو في حسابك ليتم تسجيل حضورك. أبقِ الكاميرا جاهزة إذا طلب المدرب تشغيلها.",
  };
  const teams = (n: number) => `https://teams.microsoft.com/l/meetup-join/demo-sample-link-${n}`;
  const zoom = (n: number) => `https://zoom.us/j/0000000000?demo=sample-${n}`;
  const ses = (
    courseId: string,
    instructorId: string,
    language: "ar" | "en",
    day: number,
    hour: number,
    minutes: number,
    maxSeats: number,
    provider: "teams" | "zoom",
    n: number,
    status: "scheduled" | "completed" = "scheduled",
  ) => ({
    courseId,
    instructorId,
    language,
    startsAt: riyadh(day, hour),
    endsAt: new Date(riyadh(day, hour).getTime() + minutes * 60_000),
    maxSeats,
    provider,
    joinUrl: provider === "teams" ? teams(n) : zoom(n),
    status,
    ...join,
  });

  const S = await db
    .insert(courseSessions)
    .values([
      /* 0 */ ses(firstAid.id, insLayla.id, "ar", -6, 17, 240, 20, "teams", 1, "completed"),
      /* 1 */ ses(fire.id, insKhalid.id, "ar", -1, 16, 300, 20, "zoom", 2, "completed"),
      /* 2 */ ses(driving.id, insTariq.id, "ar", 3, 18, 240, 20, "teams", 3),
      /* 3 */ ses(firstAid.id, insLayla.id, "ar", 5, 17, 240, 20, "teams", 4),
      /* 4 */ ses(firstAid.id, insLayla.id, "en", 9, 18, 240, 16, "zoom", 5),
      /* 5 */ ses(fire.id, insKhalid.id, "ar", 7, 16, 300, 20, "teams", 6),
      /* 6 */ ses(fire.id, insKhalid.id, "en", 14, 17, 300, 2, "zoom", 7),
      /* 7 */ ses(driving.id, insTariq.id, "en", 11, 18, 240, 18, "zoom", 8),
      /* 8 */ ses(driving.id, insKhalid.id, "ar", 18, 17, 240, 20, "teams", 9),
      /* 9 */ ses(firstAid.id, insLayla.id, "ar", 21, 17, 240, 20, "teams", 10),
    ])
    .returning();

  /* ---------- Exams and SAMPLE question banks ---------- */
  const banks: Record<string, Q[]> = {
    [firstAid.id]: [
      ["What is the first thing to do when you arrive at an emergency scene?", "ما أول ما تفعله عند وصولك إلى موقع حالة طارئة؟", [["Check the scene for danger", "التأكد من خلوّ الموقع من الخطر"], ["Move the casualty immediately", "تحريك المصاب فوراً"], ["Give the casualty water", "إعطاء المصاب ماءً"], ["Take photos for the report", "التقاط صور للتقرير"]], 0],
      ["Which number reaches the Saudi Red Crescent ambulance service?", "ما رقم الاتصال بخدمة إسعاف الهلال الأحمر السعودي؟", [["997", "997"], ["940", "940"], ["933", "933"], ["920", "920"]], 0],
      ["A casualty is unresponsive but breathing normally. What is generally recommended?", "مصاب فاقد الاستجابة لكنه يتنفس بشكل طبيعي. ما الإجراء الموصى به عموماً؟", [["Place them in the recovery position and monitor breathing", "وضعه في وضعية الإفاقة ومراقبة تنفسه"], ["Start chest compressions", "بدء الضغطات الصدرية"], ["Sit them upright and give a drink", "إجلاسه وإعطاؤه مشروباً"], ["Leave them and wait outside", "تركه والانتظار في الخارج"]], 0],
      ["What is the main purpose of an AED?", "ما الغرض الرئيسي من جهاز مزيل الرجفان الآلي؟", [["To deliver a shock that can restore a normal heart rhythm", "إعطاء صدمة قد تعيد نظم القلب الطبيعي"], ["To measure blood pressure", "قياس ضغط الدم"], ["To supply oxygen", "تزويد المصاب بالأكسجين"], ["To stop bleeding", "إيقاف النزيف"]], 0],
      ["What is the first step to control severe external bleeding?", "ما الخطوة الأولى للسيطرة على نزيف خارجي شديد؟", [["Apply firm direct pressure to the wound", "الضغط المباشر بقوة على الجرح"], ["Wash the wound for ten minutes", "غسل الجرح لعشر دقائق"], ["Apply ice only", "وضع الثلج فقط"], ["Raise the casualty's head", "رفع رأس المصاب"]], 0],
      ["How should a minor burn be cooled?", "كيف يُبرَّد حرق بسيط؟", [["With cool running water for an extended period", "بماء جارٍ فاتر البرودة لمدة كافية"], ["With ice directly on the skin", "بوضع الثلج مباشرة على الجلد"], ["With toothpaste", "بمعجون الأسنان"], ["With butter or oil", "بالزبدة أو الزيت"]], 0],
      ["An adult is choking and cannot cough, speak or breathe. What should happen first?", "شخص بالغ يختنق ولا يستطيع السعال أو الكلام أو التنفس. ما الذي يجب فعله أولاً؟", [["Give back blows and call for help", "إعطاء ضربات على الظهر وطلب المساعدة"], ["Offer a glass of water", "تقديم كوب ماء"], ["Lay them flat and wait", "تمديده والانتظار"], ["Ask them to walk it off", "الطلب منه أن يمشي حتى يتحسن"]], 0],
      ["Which is a common warning sign of a stroke?", "أيٌّ مما يلي علامة تحذيرية شائعة للسكتة الدماغية؟", [["Sudden facial drooping on one side", "ارتخاء مفاجئ في أحد جانبي الوجه"], ["Itchy skin", "حكة في الجلد"], ["Sneezing", "العطاس"], ["Hunger", "الجوع"]], 0],
      ["A person with suspected heat stroke should be…", "الشخص المشتبه بإصابته بضربة شمس يجب…", [["Moved to a cool place and cooled while help is called", "نقله إلى مكان بارد وتبريده مع طلب المساعدة"], ["Wrapped in blankets", "تغطيته بالبطانيات"], ["Given hot tea", "إعطاؤه شاياً ساخناً"], ["Encouraged to keep working", "تشجيعه على مواصلة العمل"]], 0],
      ["When should you avoid moving an injured person?", "متى يجب تجنّب تحريك المصاب؟", [["When a spinal injury is suspected and there is no immediate danger", "عند الاشتباه بإصابة في العمود الفقري وعدم وجود خطر مباشر"], ["Whenever they are awake", "كلما كان مستيقظاً"], ["Only at night", "في الليل فقط"], ["Never — always move them", "لا يوجد — يُحرَّك دائماً"]], 0],
      ["Why do first aiders wear disposable gloves?", "لماذا يرتدي المسعف قفازات تُستعمل مرة واحدة؟", [["To reduce the risk of infection for both people", "لتقليل خطر العدوى على الطرفين"], ["To keep hands warm", "لتدفئة اليدين"], ["To improve grip strength", "لتقوية القبضة"], ["It is only for appearance", "للمظهر فقط"]], 0],
      ["What information is most useful when calling emergency services?", "ما أهم معلومة عند الاتصال بخدمات الطوارئ؟", [["Exact location and what has happened", "الموقع بدقة وما الذي حدث"], ["The casualty's favourite hospital", "المستشفى المفضل للمصاب"], ["Your job title", "مسمّاك الوظيفي"], ["The weather forecast", "حالة الطقس المتوقعة"]], 0],
    ],
    [fire.id]: [
      ["Which three elements make up the fire triangle?", "ما العناصر الثلاثة التي يتكوّن منها مثلث الحريق؟", [["Heat, fuel and oxygen", "الحرارة والوقود والأكسجين"], ["Heat, smoke and water", "الحرارة والدخان والماء"], ["Fuel, water and air", "الوقود والماء والهواء"], ["Smoke, flame and ash", "الدخان واللهب والرماد"]], 0],
      ["What should you do first on discovering a fire in a building?", "ما أول ما تفعله عند اكتشاف حريق في مبنى؟", [["Raise the alarm", "إطلاق الإنذار"], ["Collect your belongings", "جمع أغراضك"], ["Open all the windows", "فتح جميع النوافذ"], ["Finish your current task", "إكمال المهمة التي بيدك"]], 0],
      ["Which number reaches Civil Defense in Saudi Arabia?", "ما رقم الدفاع المدني في المملكة العربية السعودية؟", [["998", "998"], ["993", "993"], ["996", "996"], ["990", "990"]], 0],
      ["Why should water not be used on a fire involving live electrical equipment?", "لماذا لا يُستخدم الماء على حريق يشمل معدات كهربائية موصولة بالتيار؟", [["It conducts electricity and can cause electric shock", "لأنه موصل للكهرباء وقد يسبب صعقة"], ["It is too cold", "لأنه بارد جداً"], ["It makes too much noise", "لأنه يحدث ضجيجاً"], ["It evaporates too slowly", "لأنه يتبخر ببطء"]], 0],
      ["What does the first letter of the PASS technique stand for?", "ما الخطوة الأولى في طريقة استخدام الطفاية؟", [["Pull the pin", "اسحب مسمار الأمان"], ["Push the door", "ادفع الباب"], ["Point at the flames' top", "صوّب نحو أعلى اللهب"], ["Press the alarm", "اضغط زر الإنذار"]], 0],
      ["Where should an extinguisher be aimed?", "إلى أين تُوجَّه الطفاية؟", [["At the base of the fire", "إلى قاعدة النار"], ["At the top of the flames", "إلى أعلى اللهب"], ["At the smoke", "إلى الدخان"], ["At the ceiling", "إلى السقف"]], 0],
      ["When is it right to leave rather than fight a fire?", "متى يكون الصواب المغادرة بدلاً من مكافحة الحريق؟", [["When it is spreading, the exit is threatened, or you are unsure", "عندما ينتشر أو يتهدد المخرج أو عندما تكون غير متأكد"], ["Only when told by a manager", "فقط عندما يطلب المدير ذلك"], ["Never — always fight it", "لا يوجد — تجب المكافحة دائماً"], ["Only if the fire is outdoors", "فقط إذا كان الحريق في الخارج"]], 0],
      ["Why should lifts not be used during a fire evacuation?", "لماذا لا تُستخدم المصاعد أثناء الإخلاء عند الحريق؟", [["They may stop or open onto the fire floor", "قد تتوقف أو تُفتح على الطابق المشتعل"], ["They are too slow", "لأنها بطيئة جداً"], ["They use too much power", "لأنها تستهلك كهرباء كثيرة"], ["They are reserved for managers", "لأنها مخصصة للمديرين"]], 0],
      ["What is the purpose of an assembly point?", "ما الغرض من نقطة التجمع؟", [["To account for everyone after evacuating", "التأكد من وجود الجميع بعد الإخلاء"], ["To store extinguishers", "تخزين الطفايات"], ["To park vehicles", "إيقاف المركبات"], ["To hold meetings", "عقد الاجتماعات"]], 0],
      ["In smoke, why is it safer to stay low?", "لماذا يكون البقاء منخفضاً أكثر أماناً عند وجود الدخان؟", [["Cleaner, cooler air is nearer the floor", "الهواء الأنقى والأبرد يكون أقرب إلى الأرض"], ["It is faster to crawl", "لأن الزحف أسرع"], ["Smoke cannot be seen from below", "لأن الدخان لا يُرى من الأسفل"], ["Alarms are quieter there", "لأن صوت الإنذار أخف هناك"]], 0],
      ["Which is a common cause of fires in offices?", "أيٌّ مما يلي سبب شائع للحرائق في المكاتب؟", [["Overloaded electrical sockets", "تحميل المقابس الكهربائية فوق طاقتها"], ["Closed fire doors", "أبواب الحريق المغلقة"], ["Clear corridors", "الممرات الخالية"], ["Tested alarms", "أجهزة الإنذار المفحوصة"]], 0],
      ["What should be done before opening a door during a fire?", "ماذا يجب أن يُفعل قبل فتح باب أثناء الحريق؟", [["Check it for heat with the back of the hand", "تحسّس حرارته بظهر اليد"], ["Kick it open", "ركله لفتحه"], ["Lock it", "إقفاله"], ["Remove the handle", "نزع المقبض"]], 0],
    ],
    [driving.id]: [
      ["What does defensive driving mainly involve?", "ما الذي تقوم عليه القيادة الوقائية أساساً؟", [["Anticipating hazards and leaving room to react", "توقّع المخاطر وترك مجال للتصرف"], ["Driving as fast as traffic allows", "القيادة بأقصى سرعة يسمح بها السير"], ["Using the horn often", "استخدام المنبه كثيراً"], ["Staying in the left lane", "البقاء في المسار الأيسر"]], 0],
      ["When speed doubles, what happens to braking distance?", "عندما تتضاعف السرعة، ماذا يحدث لمسافة الكبح؟", [["It increases to about four times", "تزداد إلى نحو أربعة أضعاف"], ["It stays the same", "تبقى كما هي"], ["It doubles exactly", "تتضاعف تماماً"], ["It halves", "تنخفض إلى النصف"]], 0],
      ["What is a simple way to keep a safe following distance in good conditions?", "ما الطريقة البسيطة للحفاظ على مسافة أمان في الظروف الجيدة؟", [["Keep a time gap of several seconds from the vehicle ahead", "ترك فاصل زمني من عدة ثوانٍ عن المركبة التي أمامك"], ["Stay one car length away at any speed", "ترك طول سيارة واحدة مهما كانت السرعة"], ["Follow the lights of the car ahead", "اتباع أضواء السيارة التي أمامك"], ["Match the speed of the fastest car", "مجاراة أسرع سيارة"]], 0],
      ["Which is the safest way to handle a phone call while driving?", "ما الطريقة الأكثر أماناً للتعامل مع مكالمة أثناء القيادة؟", [["Let it wait until you have stopped safely", "تأجيلها إلى أن تتوقف في مكان آمن"], ["Hold the phone at eye level", "إمساك الهاتف في مستوى النظر"], ["Type quickly at red lights", "الكتابة بسرعة عند الإشارة الحمراء"], ["Slow down slightly and answer", "تخفيف السرعة قليلاً والرد"]], 0],
      ["Which is a sign of driver fatigue?", "أيٌّ مما يلي من علامات إرهاق السائق؟", [["Drifting between lanes and frequent yawning", "الانحراف بين المسارات وكثرة التثاؤب"], ["Checking mirrors regularly", "تفقّد المرايا بانتظام"], ["Keeping a steady speed", "الحفاظ على سرعة ثابتة"], ["Feeling alert", "الشعور باليقظة"]], 0],
      ["What is the best response to feeling sleepy on a long drive?", "ما أفضل تصرف عند الشعور بالنعاس في رحلة طويلة؟", [["Stop somewhere safe and rest", "التوقف في مكان آمن وأخذ قسط من الراحة"], ["Open the window and continue", "فتح النافذة والمتابعة"], ["Turn up the radio", "رفع صوت المذياع"], ["Drive faster to arrive sooner", "زيادة السرعة للوصول أبكر"]], 0],
      ["In a sandstorm with very poor visibility, what is safest?", "في عاصفة رملية والرؤية ضعيفة جداً، ما التصرف الأكثر أماناً؟", [["Slow down and, if needed, pull well off the road and stop", "تخفيف السرعة والتوقف بعيداً عن الطريق عند الحاجة"], ["Keep speed and use high beams", "الحفاظ على السرعة واستخدام النور العالي"], ["Follow closely behind another vehicle", "السير ملتصقاً بمركبة أخرى"], ["Stop in the driving lane", "التوقف في مسار السير"]], 0],
      ["Before changing lanes, mirrors are checked and then…", "قبل تغيير المسار تُفحص المرايا ثم…", [["The blind spot is checked and the indicator used", "تُفحص النقطة العمياء وتُستخدم الإشارة"], ["The horn is sounded", "يُطلق المنبه"], ["Speed is increased sharply", "تُزاد السرعة فجأة"], ["Hazard lights are switched on", "تُشغَّل أضواء التحذير"]], 0],
      ["Why are seat belts important even on short trips?", "لماذا يُعدّ حزام الأمان مهماً حتى في المشاوير القصيرة؟", [["Many collisions happen close to home at low speeds", "كثير من الحوادث يقع قرب المنزل وبسرعات منخفضة"], ["They are only needed on highways", "لا يُحتاج إليه إلا على الطرق السريعة"], ["They improve fuel economy", "يحسّن استهلاك الوقود"], ["They are only for passengers", "مخصص للركاب فقط"]], 0],
      ["Why does very hot weather increase tyre risk?", "لماذا يزيد الطقس شديد الحرارة من مخاطر الإطارات؟", [["Heat raises pressure and stresses worn or under-inflated tyres", "الحرارة ترفع الضغط وتجهد الإطارات المتآكلة أو ناقصة الهواء"], ["Tyres shrink in heat", "الإطارات تنكمش بالحرارة"], ["Heat makes tyres heavier", "الحرارة تزيد وزن الإطارات"], ["It does not", "لا يزيدها"]], 0],
      ["How should you respond to an aggressive driver behind you?", "كيف تتصرف مع سائق عدواني خلفك؟", [["Stay calm and let them pass when it is safe", "حافظ على هدوئك ودعه يتجاوز عندما يكون ذلك آمناً"], ["Brake suddenly", "اضغط المكابح فجأة"], ["Speed up to stay ahead", "زد سرعتك لتبقى أمامه"], ["Block the lane", "أغلق المسار عليه"]], 0],
      ["At night, when should high beams be dipped?", "في الليل، متى يجب خفض النور العالي؟", [["When approaching or following other vehicles", "عند الاقتراب من مركبات أخرى أو السير خلفها"], ["Never", "لا يُخفض أبداً"], ["Only in cities", "في المدن فقط"], ["Only when it rains", "عند المطر فقط"]], 0],
    ],
  };

  const examByCourse: Record<string, string> = {};
  const questionIds: Record<string, { id: string; options: QuestionOption[]; correct: string }[]> = {};
  for (const c of [firstAid, fire, driving]) {
    const [exam] = await db
      .insert(exams)
      .values({ courseId: c.id, durationMinutes: 20, passingScorePercent: 70, maxAttempts: 2, questionsPerAttempt: 10, retakeCooldownHours: 0 })
      .returning();
    examByCourse[c.id] = exam.id;
    const rows = banks[c.id].map(([en, ar, opts, correct]) => {
      const options = opts.map(([oen, oar]) => ({ id: crypto.randomUUID().slice(0, 8), en: oen, ar: oar }));
      return { examId: exam.id, textEn: en, textAr: ar, options, correctOptionId: options[correct].id, isSample: true };
    });
    const inserted = await db.insert(questions).values(rows).returning();
    questionIds[c.id] = inserted.map((q) => ({ id: q.id, options: q.options, correct: q.correctOptionId }));
  }

  /* ---------- Sample company ---------- */
  const [org] = await db
    .insert(organizations)
    .values({
      name: "Rawasi Logistics Co. (sample)",
      contactName: "Faisal Al-Otaibi",
      contactEmail: DEMO_ACCOUNTS.manager,
      phone: "+966500000002",
      isDemo: true,
    })
    .returning();
  await db.insert(memberships).values([
    { orgId: org.id, userId: managerId, role: "manager" },
    { orgId: org.id, userId: emp1, role: "employee" },
    { orgId: org.id, userId: emp2, role: "employee" },
    { orgId: org.id, userId: emp3, role: "employee" },
    { orgId: org.id, userId: emp4, role: "employee" },
  ]);

  let orderSeq = 100;
  async function paidOrder(v: { userId: string; orgId?: string; kind: "individual" | "company_seats"; course: typeof firstAid; sessionId?: string; quantity: number; daysAgo: number }) {
    const totals = computeTotals(v.course.priceHalalas, v.quantity, 1500);
    const [o] = await db
      .insert(orders)
      .values({
        number: `AO-DEMO-${String(orderSeq++).padStart(6, "0")}`,
        userId: v.userId,
        orgId: v.orgId ?? null,
        kind: v.kind,
        courseId: v.course.id,
        sessionId: v.sessionId ?? null,
        quantity: v.quantity,
        unitPriceHalalas: v.course.priceHalalas,
        ...totals,
        status: "paid",
        paidAt: riyadh(-v.daysAgo, 12),
        createdAt: riyadh(-v.daysAgo, 12),
      })
      .returning();
    return o;
  }

  const seatOrders = [
    await paidOrder({ userId: managerId, orgId: org.id, kind: "company_seats", course: firstAid, quantity: 5, daysAgo: 12 }),
    await paidOrder({ userId: managerId, orgId: org.id, kind: "company_seats", course: fire, quantity: 3, daysAgo: 12 }),
    await paidOrder({ userId: managerId, orgId: org.id, kind: "company_seats", course: driving, quantity: 4, daysAgo: 10 }),
  ];
  const [spFirstAid, spFire, spDriving] = await db
    .insert(seatPurchases)
    .values(seatOrders.map((o) => ({ orgId: org.id, courseId: o.courseId, orderId: o.id, seatsTotal: o.quantity })))
    .returning();

  await db.insert(invitations).values([
    { orgId: org.id, email: "maha@demo.aman.example", name: "Maha Al-Qahtani", tokenHash: hashToken(crypto.randomUUID()), status: "accepted", invitedBy: managerId, acceptedUserId: emp1, expiresAt: riyadh(4, 12) },
    { orgId: org.id, email: "new.colleague@demo.aman.example", name: "Abdullah Al-Shammari", tokenHash: hashToken("demo-invite-token"), status: "pending", invitedBy: managerId, expiresAt: riyadh(12, 12) },
  ]);

  /* ---------- Enrollments, attendance, attempts, certificates ---------- */
  async function enrol(userId: string, s: (typeof S)[number], extra: { orgId?: string; seatPurchaseId?: string; orderId?: string } = {}) {
    const [e] = await db.insert(enrollments).values({ userId, sessionId: s.id, courseId: s.courseId, ...extra, createdAt: riyadh(-9, 10) }).returning();
    return e;
  }
  async function present(enrollmentId: string, percent: number, s: (typeof S)[number]) {
    await db.insert(attendance).values({ enrollmentId, status: "present", percent, markedBy: instructorUserId, markedAt: s.endsAt });
  }
  async function passedWithCertificate(e: Awaited<ReturnType<typeof enrol>>, s: (typeof S)[number], nameEn: string, nameAr: string, correctCount: number, validityMonths: number | null) {
    const qs = questionIds[s.courseId].slice(0, 10);
    const answers: Record<string, string> = {};
    qs.forEach((q, i) => (answers[q.id] = i < correctCount ? q.correct : q.options.find((o) => o.id !== q.correct)!.id));
    const submittedAt = new Date(s.endsAt.getTime() + 3 * 3_600_000);
    await db.insert(examAttempts).values({
      enrollmentId: e.id,
      userId: e.userId,
      examId: examByCourse[s.courseId],
      attemptNumber: 1,
      status: "submitted",
      questionOrder: qs.map((q) => ({ questionId: q.id, optionOrder: q.options.map((o) => o.id) })),
      answers,
      startedAt: new Date(submittedAt.getTime() - 14 * 60_000),
      expiresAt: new Date(submittedAt.getTime() + 6 * 60_000),
      submittedAt,
      correctCount,
      scorePercent: correctCount * 10,
      passed: true,
    });
    const expiresAt = validityMonths ? new Date(new Date(submittedAt).setUTCMonth(submittedAt.getUTCMonth() + validityMonths)) : null;
    await db.insert(certificates).values({
      number: generateCertificateNumber(submittedAt),
      enrollmentId: e.id,
      userId: e.userId,
      courseId: s.courseId,
      instructorId: s.instructorId,
      learnerNameEn: nameEn,
      learnerNameAr: nameAr,
      completedAt: submittedAt,
      issuedAt: submittedAt,
      expiresAt,
    });
  }

  // Individual learner (Noura): one certificate, one exam available, one upcoming session.
  const o1 = await paidOrder({ userId: learnerId, kind: "individual", course: firstAid, sessionId: S[0].id, quantity: 1, daysAgo: 10 });
  const o2 = await paidOrder({ userId: learnerId, kind: "individual", course: fire, sessionId: S[1].id, quantity: 1, daysAgo: 8 });
  const o3 = await paidOrder({ userId: learnerId, kind: "individual", course: driving, sessionId: S[2].id, quantity: 1, daysAgo: 2 });
  const n1 = await enrol(learnerId, S[0], { orderId: o1.id });
  await present(n1.id, 100, S[0]);
  await passedWithCertificate(n1, S[0], "Noura Al-Harbi", "نورة الحربي", 9, 24);
  const n2 = await enrol(learnerId, S[1], { orderId: o2.id });
  await present(n2.id, 95, S[1]);
  await enrol(learnerId, S[2], { orderId: o3.id });

  // Company employees.
  const m1 = await enrol(emp1, S[0], { orgId: org.id, seatPurchaseId: spFirstAid.id });
  await present(m1.id, 100, S[0]);
  await passedWithCertificate(m1, S[0], "Maha Al-Qahtani", "مها القحطاني", 8, 24);
  await enrol(emp2, S[1], { orgId: org.id, seatPurchaseId: spFire.id }); // attendance not yet recorded
  await enrol(emp3, S[2], { orgId: org.id, seatPurchaseId: spDriving.id }); // upcoming

  /* ---------- A sample inquiry ---------- */
  await db.insert(inquiries).values({
    kind: "company",
    name: "Sample Enquirer",
    email: "enquiry@demo.aman.example",
    company: "Sample Contracting Est.",
    headcount: "51-200",
    message: "Sample inquiry: we would like private Arabic sessions for around 60 employees across two branches.",
  });
}
